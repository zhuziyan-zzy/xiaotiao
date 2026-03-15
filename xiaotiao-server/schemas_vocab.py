import uuid
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class VocabItemCreate(BaseModel):
    word: str
    definition_zh: Optional[str] = ""
    part_of_speech: Optional[str] = ""
    domain: Optional[str] = "general"
    source: Optional[str] = "manual"
    example_sentence: Optional[str] = ""

class VocabItemUpdate(BaseModel):
    definition_zh: Optional[str] = None
    part_of_speech: Optional[str] = None
    domain: Optional[str] = None
    is_active: Optional[bool] = None
    example_sentence: Optional[str] = None

class VocabItemResponse(BaseModel):
    id: str
    word: str
    definition_zh: Optional[str]
    part_of_speech: Optional[str]
    domain: Optional[str]
    source: Optional[str]
    example_sentence: Optional[str]
    is_active: bool
    created_at: datetime
    
    # Joined SRS details
    traversal_count: int
    ease_factor: float
    interval_days: int
    next_review_date: Optional[datetime]
    is_mastered: bool

class VocabStatsResponse(BaseModel):
    total: int
    active: int
    mastered: int
    need_review_today: int

class VocabListResponse(BaseModel):
    items: List[VocabItemResponse]
    total_count: int
    page: int
    total_pages: int
