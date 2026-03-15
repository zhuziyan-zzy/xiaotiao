from pydantic import BaseModel
from typing import List

class ExtractedWord(BaseModel):
    word: str
    definition_zh: str
    part_of_speech: str
    in_sentence: str

class MultimodalExtractResponse(BaseModel):
    extracted_words: List[ExtractedWord]
    summary: str
