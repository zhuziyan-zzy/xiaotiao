from __future__ import annotations

from typing import Any, Dict, List, Tuple


def split_chunks(text: str, chunk_size: int = 700, overlap: int = 120) -> List[str]:
    normalized = "\n".join(line.rstrip() for line in text.strip().splitlines()).strip()
    if not normalized:
        return []
    if len(normalized) <= chunk_size:
        return [normalized]

    chunks: List[str] = []
    start = 0
    total = len(normalized)
    while start < total:
        end = min(total, start + chunk_size)
        if end < total:
            boundary = max(
                normalized.rfind(". ", start, end),
                normalized.rfind("。", start, end),
                normalized.rfind("\n", start, end),
            )
            if boundary > start + int(chunk_size * 0.55):
                end = boundary + 1
        chunk = normalized[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= total:
            break
        start = max(end - overlap, start + 1)
    return chunks


def build_citations(contexts: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    citations: List[Dict[str, str]] = []
    for idx, item in enumerate(contexts, start=1):
        citations.append(
            {
                "id": str(idx),
                "title": str(item.get("title") or item.get("source_id") or f"source-{idx}"),
                "url": str(item.get("source_url") or ""),
            }
        )
    return citations


def build_grounded_answer(query: str, contexts: List[Dict[str, Any]]) -> str:
    if not contexts:
        return "未检索到可用证据。请先点击“刷新 GitHub 案例”并执行“写入 RAG”。"
    lines: List[str] = [f"问题：{query}", "", "基于检索证据的结论："]
    for idx, item in enumerate(contexts[:3], start=1):
        text = str(item.get("chunk_text") or "").replace("\n", " ").strip()
        title = str(item.get("title") or item.get("source_id") or f"source-{idx}")
        lines.append(f"{idx}. [{title}] {text[:240]}")
    lines.append("")
    lines.append("说明：以上回答基于索引片段抽取，建议点击引用链接核对原始上下文。")
    return "\n".join(lines)


def github_case_to_doc(case: Dict[str, Any]) -> Tuple[str, str, str, str, Dict[str, Any], str]:
    full_name = str(case.get("full_name") or "github/repo")
    query = str(case.get("query") or "")
    language = str(case.get("language") or "")
    stars = int(case.get("stars") or 0)
    description = str(case.get("description") or "")
    source_url = str(case.get("html_url") or "")
    source_id = f"github_case:{full_name}"
    title = full_name
    metadata = {
        "query": query,
        "stars": stars,
        "language": language,
        "fetched_at": case.get("fetched_at"),
    }
    content = (
        f"Repository: {full_name}\n"
        f"Query: {query}\n"
        f"Language: {language}\n"
        f"Stars: {stars}\n"
        f"Description: {description}\n"
        f"URL: {source_url}\n"
    ).strip()
    return source_id, "github_case", title, source_url, metadata, content
