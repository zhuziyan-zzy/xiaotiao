from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from db.database import DB_PATH


def _connect(db: Optional[sqlite3.Connection] = None, db_path: Optional[str] = None):
    if db is not None:
        return db, False
    conn = sqlite3.connect(db_path or DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn, True


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def upsert_github_case(
    query: str,
    full_name: str,
    html_url: str,
    stars: int,
    description: Optional[str] = None,
    language: Optional[str] = None,
    db: Optional[sqlite3.Connection] = None,
    db_path: Optional[str] = None,
) -> None:
    conn, should_close = _connect(db, db_path)
    try:
        conn.execute(
            """
            INSERT INTO github_cases (query, full_name, html_url, stars, description, language, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(query, full_name) DO UPDATE SET
              html_url=excluded.html_url,
              stars=excluded.stars,
              description=excluded.description,
              language=excluded.language,
              fetched_at=excluded.fetched_at
            """,
            (query, full_name, html_url, stars, description, language, now_iso()),
        )
        conn.commit()
    finally:
        if should_close:
            conn.close()


def list_github_cases(limit: int = 20, db: Optional[sqlite3.Connection] = None, db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    conn, should_close = _connect(db, db_path)
    try:
        rows = conn.execute(
            """
            SELECT query, full_name, html_url, stars, description, language, fetched_at
            FROM github_cases
            ORDER BY stars DESC, fetched_at DESC
            LIMIT ?
            """,
            (max(1, min(limit, 100)),),
        ).fetchall()
    finally:
        if should_close:
            conn.close()
    return [dict(row) for row in rows]


def list_org_units(db: Optional[sqlite3.Connection] = None, db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    conn, should_close = _connect(db, db_path)
    try:
        rows = conn.execute(
            """
            SELECT unit_key, unit_name, responsibility, owner_role, created_at
            FROM org_units
            ORDER BY id ASC
            """
        ).fetchall()
    finally:
        if should_close:
            conn.close()
    return [dict(row) for row in rows]


def upsert_rag_document(
    source_id: str,
    source_type: str,
    title: str,
    source_url: Optional[str],
    metadata: Optional[Dict[str, Any]] = None,
    db: Optional[sqlite3.Connection] = None,
    db_path: Optional[str] = None,
) -> int:
    metadata_json = json.dumps(metadata or {}, ensure_ascii=False)
    now = now_iso()
    conn, should_close = _connect(db, db_path)
    try:
        conn.execute(
            """
            INSERT INTO rag_documents (source_id, source_type, title, source_url, metadata_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(source_id) DO UPDATE SET
              source_type=excluded.source_type,
              title=excluded.title,
              source_url=excluded.source_url,
              metadata_json=excluded.metadata_json,
              updated_at=excluded.updated_at
            """,
            (source_id, source_type, title, source_url, metadata_json, now, now),
        )
        row = conn.execute("SELECT id FROM rag_documents WHERE source_id = ?", (source_id,)).fetchone()
        conn.commit()
    finally:
        if should_close:
            conn.close()
    if not row:
        raise RuntimeError("Failed to upsert rag document")
    return int(row["id"])


def replace_rag_chunks(document_id: int, chunks: List[str], db: Optional[sqlite3.Connection] = None, db_path: Optional[str] = None) -> int:
    now = now_iso()
    conn, should_close = _connect(db, db_path)
    try:
        old_rows = conn.execute(
            "SELECT id FROM rag_chunks WHERE document_id = ?",
            (document_id,),
        ).fetchall()
        if old_rows:
            conn.executemany(
                "DELETE FROM rag_chunks_fts WHERE chunk_id = ?",
                [(int(row["id"]),) for row in old_rows],
            )
        conn.execute("DELETE FROM rag_chunks WHERE document_id = ?", (document_id,))

        inserted = 0
        for idx, chunk in enumerate(chunks):
            text = chunk.strip()
            if not text:
                continue
            cursor = conn.execute(
                """
                INSERT INTO rag_chunks (document_id, chunk_index, chunk_text, token_count, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (document_id, idx, text, len(text.split()), now),
            )
            chunk_id = int(cursor.lastrowid)
            conn.execute(
                """
                INSERT INTO rag_chunks_fts (rowid, chunk_text, chunk_id, document_id)
                VALUES (?, ?, ?, ?)
                """,
                (chunk_id, text, chunk_id, document_id),
            )
            inserted += 1
        conn.execute("UPDATE rag_documents SET updated_at = ? WHERE id = ?", (now, document_id))
        conn.commit()
    finally:
        if should_close:
            conn.close()
    return inserted


def _fts_query(query: str) -> str:
    cleaned = "".join(ch if ch.isalnum() or ch.isspace() else " " for ch in query.lower())
    terms = [term for term in cleaned.split() if len(term) >= 2]
    return " OR ".join(terms[:12])


def search_rag_chunks(query: str, top_k: int = 5, db: Optional[sqlite3.Connection] = None, db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    fts_q = _fts_query(query)
    if not fts_q:
        return []
    limit = max(1, min(top_k, 10))
    conn, should_close = _connect(db, db_path)
    try:
        try:
            rows = conn.execute(
                """
                SELECT
                  c.id AS chunk_id,
                  c.chunk_text,
                  d.source_id,
                  d.source_type,
                  d.title,
                  d.source_url,
                  bm25(rag_chunks_fts) AS rank
                FROM rag_chunks_fts
                JOIN rag_chunks c ON rag_chunks_fts.chunk_id = c.id
                JOIN rag_documents d ON c.document_id = d.id
                WHERE rag_chunks_fts MATCH ?
                ORDER BY rank
                LIMIT ?
                """,
                (fts_q, limit),
            ).fetchall()
        except sqlite3.OperationalError:
            rows = conn.execute(
                """
                SELECT
                  c.id AS chunk_id,
                  c.chunk_text,
                  d.source_id,
                  d.source_type,
                  d.title,
                  d.source_url,
                  0.0 AS rank
                FROM rag_chunks c
                JOIN rag_documents d ON c.document_id = d.id
                WHERE lower(c.chunk_text) LIKE '%' || lower(?) || '%'
                ORDER BY c.id DESC
                LIMIT ?
                """,
                (query, limit),
            ).fetchall()
    finally:
        if should_close:
            conn.close()
    return [dict(row) for row in rows]


def rag_stats(db: Optional[sqlite3.Connection] = None, db_path: Optional[str] = None) -> Dict[str, int]:
    conn, should_close = _connect(db, db_path)
    try:
        docs = conn.execute("SELECT COUNT(*) AS cnt FROM rag_documents").fetchone()
        chunks = conn.execute("SELECT COUNT(*) AS cnt FROM rag_chunks").fetchone()
    finally:
        if should_close:
            conn.close()
    return {"documents": int(docs["cnt"] if docs else 0), "chunks": int(chunks["cnt"] if chunks else 0)}
