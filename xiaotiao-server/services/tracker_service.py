"""Tracker service — topic persistence and ArXiv discovery."""

import asyncio
import json
import os
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import List

from services.llm import call_claude_json


def list_topics(db):
    rows = db.execute("SELECT * FROM topics ORDER BY created_at DESC").fetchall()
    result = []
    for r in rows:
        d = dict(r)
        # Parse sources JSON string back to list
        try:
            d["sources"] = json.loads(d.get("sources") or '["arxiv"]')
        except (json.JSONDecodeError, TypeError):
            d["sources"] = ["arxiv"]
        result.append(d)
    return result


# Available sources registry
AVAILABLE_SOURCES = {
    "arxiv": {"label": "ArXiv", "status": "active"},
    "ssrn": {"label": "SSRN", "status": "coming_soon"},
    "cnki": {"label": "CNKI (中国知网)", "status": "coming_soon"},
    "heinonline": {"label": "HeinOnline", "status": "coming_soon"},
    "google_scholar": {"label": "Google Scholar", "status": "coming_soon"},
}


def create_topic(db, title: str, check_frequency: str, sources: List[str] = None):
    if sources is None:
        sources = ["arxiv"]
    # Validate sources
    valid_sources = [s for s in sources if s in AVAILABLE_SOURCES]
    if not valid_sources:
        valid_sources = ["arxiv"]

    topic_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    sources_json = json.dumps(valid_sources)
    db.execute(
        "INSERT INTO topics (id, title, check_frequency, sources, created_at) VALUES (?, ?, ?, ?, ?)",
        (topic_id, title, check_frequency, sources_json, now),
    )
    db.commit()
    return {
        "id": topic_id,
        "title": title,
        "check_frequency": check_frequency,
        "sources": valid_sources,
        "created_at": now,
    }


def delete_topic(db, topic_id: str):
    db.execute("DELETE FROM topics WHERE id=?", (topic_id,))
    db.commit()
    return {"status": "deleted"}


async def _generate_brief(title: str, abstract: str) -> str:
    if not abstract:
        return title[:120]

    system_prompt = (
        "你是一位学术论文追踪助手。请基于标题与摘要生成一段中文短概要。"
        "要求：50-120字，聚焦核心贡献与结论，只返回 JSON："
        '{"brief":"..."}'
    )
    user_prompt = f"标题：{title}\n摘要：{abstract}"
    try:
        result = await call_claude_json(system_prompt, user_prompt, max_tokens=300)
        brief = (result.get("brief") or result.get("summary") or "").strip()
        if brief:
            return brief
    except Exception:
        pass

    clipped = abstract[:200]
    return clipped + ("..." if len(abstract) > 200 else "")


async def search_arxiv_for_topic(topic_id: str, title: str, max_results: int = 5, db_path: str = None):
    """Search ArXiv for papers related to a topic and auto-import into library folders."""
    import httpx
    import sqlite3

    target_db = db_path or os.getenv("DB_PATH", "./db/xiaotiao.db")
    conn = sqlite3.connect(target_db)
    conn.row_factory = sqlite3.Row

    try:
        query = title.replace(" ", "+")
        api_url = (
            "http://export.arxiv.org/api/query"
            f"?search_query=all:{query}&max_results={max_results}"
            "&sortBy=submittedDate&sortOrder=descending"
        )

        async with httpx.AsyncClient(timeout=30) as client:
            await asyncio.sleep(3)  # Respect ArXiv rate limits
            resp = await client.get(api_url)
            resp.raise_for_status()

        ns = {"atom": "http://www.w3.org/2005/Atom"}
        root = ET.fromstring(resp.text)

        # --- Auto-filing: create folder hierarchy ---
        # Parent folder: topic name (reuse if exists)
        parent_folder = conn.execute(
            "SELECT id FROM paper_folders WHERE topic_id=? AND parent_id IS NULL",
            (topic_id,)
        ).fetchone()
        if parent_folder:
            parent_folder_id = parent_folder["id"]
        else:
            parent_folder_id = str(uuid.uuid4())
            conn.execute(
                "INSERT INTO paper_folders (id, name, parent_id, source, topic_id, created_at) VALUES (?,?,NULL,'tracker',?,?)",
                (parent_folder_id, title, topic_id, datetime.utcnow().isoformat())
            )

        # Sub-folder: date + nth query today
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        existing_today = conn.execute(
            "SELECT COUNT(*) FROM paper_folders WHERE parent_id=? AND name LIKE ?",
            (parent_folder_id, f"{today_str}%")
        ).fetchone()[0]
        nth = existing_today + 1
        sub_folder_name = f"{today_str} 第{nth}次查询"
        sub_folder_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO paper_folders (id, name, parent_id, source, topic_id, created_at) VALUES (?,?,?,'tracker',?,?)",
            (sub_folder_id, sub_folder_name, parent_folder_id, topic_id, datetime.utcnow().isoformat())
        )

        now = datetime.utcnow().isoformat()
        imported_count = 0

        for entry in root.findall("atom:entry", ns):
            entry_title = entry.findtext("atom:title", "", ns).strip().replace("\n", " ")
            summary = entry.findtext("atom:summary", "", ns).strip()

            entry_url = None
            for link in entry.findall("atom:link", ns):
                if link.get("type") == "text/html" or (not link.get("title") and link.get("rel") == "alternate"):
                    entry_url = link.get("href")
                    break
            if not entry_url:
                entry_url = entry.findtext("atom:id", "", ns)

            # Skip if already in topic_papers
            existing = conn.execute(
                "SELECT id FROM topic_papers WHERE topic_id=? AND url=?",
                (topic_id, entry_url),
            ).fetchone()
            if existing:
                continue

            brief = await _generate_brief(entry_title, summary)
            tp_id = str(uuid.uuid4())

            # Save to topic_papers (for tracking)
            conn.execute(
                """INSERT INTO topic_papers (id, topic_id, title, url, brief, status, discovered_at)
                   VALUES (?, ?, ?, ?, ?, 'done', ?)""",
                (tp_id, topic_id, entry_title, entry_url, brief, now),
            )

            # Auto-import into papers table with folder
            paper_exists = conn.execute("SELECT id FROM papers WHERE url=?", (entry_url,)).fetchone()
            if not paper_exists:
                paper_id = str(uuid.uuid4())
                conn.execute(
                    """INSERT INTO papers (id, title, url, source, status, folder_id, read_status, created_at, updated_at)
                       VALUES (?, ?, ?, 'arxiv', 'pending', ?, 'unread', ?, ?)""",
                    (paper_id, entry_title, entry_url, sub_folder_id, now, now)
                )
                imported_count += 1

        conn.execute(
            "UPDATE topics SET last_checked_at=? WHERE id=?",
            (now, topic_id),
        )
        conn.commit()
        print(f"[tracker] Imported {imported_count} papers for topic '{title}' into folder '{sub_folder_name}'")

    except Exception as exc:
        print(f"[tracker] ArXiv search error for topic {topic_id}: {exc}")
    finally:
        conn.close()

