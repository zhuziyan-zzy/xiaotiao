"""通用标注/批注 API — 支持文章、翻译、论文等所有内容类型。"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from db.database import get_db

router = APIRouter(prefix="/annotations", tags=["标注"])


class AnnotationCreate(BaseModel):
    content_type: str  # article / translation / paper
    content_id: str
    type: str = "highlight"  # highlight / annotation
    selected_text: Optional[str] = None
    note: Optional[str] = None
    color: Optional[str] = None
    text_offset_start: Optional[int] = None
    text_offset_end: Optional[int] = None


@router.post("", summary="创建标注或批注")
def create_annotation(body: AnnotationCreate, db=Depends(get_db)):
    ann_id = str(uuid.uuid4())
    db.execute(
        """INSERT INTO content_annotations
           (id, content_type, content_id, type, selected_text, note, color, text_offset_start, text_offset_end)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (ann_id, body.content_type, body.content_id, body.type,
         body.selected_text, body.note, body.color,
         body.text_offset_start, body.text_offset_end)
    )
    db.commit()
    return {
        "id": ann_id,
        "content_type": body.content_type,
        "content_id": body.content_id,
        "type": body.type,
        "selected_text": body.selected_text,
        "note": body.note,
        "color": body.color,
    }


@router.get("", summary="获取某内容的全部标注")
def list_annotations(content_type: str, content_id: str, db=Depends(get_db)):
    rows = db.execute(
        """SELECT * FROM content_annotations
           WHERE content_type=? AND content_id=?
           ORDER BY text_offset_start, created_at""",
        (content_type, content_id)
    ).fetchall()
    return [dict(r) for r in rows]


@router.delete("/{annotation_id}", summary="删除标注")
def delete_annotation(annotation_id: str, db=Depends(get_db)):
    row = db.execute(
        "SELECT id FROM content_annotations WHERE id=?", (annotation_id,)
    ).fetchone()
    if not row:
        raise HTTPException(404, "标注不存在")
    db.execute("DELETE FROM content_annotations WHERE id=?", (annotation_id,))
    db.commit()
    return {"status": "deleted"}
