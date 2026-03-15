from datetime import datetime
from typing import List, Tuple
import math

class SRSEngine:
    def __init__(self, db):
        self.db = db

    def calculate_sm2(self, quality: int, old_ef: float, old_interval: int, old_count: int) -> Tuple[int, float, int]:
        """
        Calculates the new SM-2 interval.
        Quality (0-5 rating):
        - 5: perfect response
        - 4: correct response after a hesitation
        - 3: correct response recalled with serious difficulty
        - 2: incorrect response; where the correct one seemed easy to recall
        - 1: incorrect response; the correct one remembered
        - 0: complete blackout.
        """
        if quality < 3:
            return (0, old_ef, 1) # Reset interval if failed
            
        new_ef = old_ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        new_ef = max(1.3, new_ef) # EF cannot drop below 1.3
        
        if old_count == 0:
            new_interval = 1
        elif old_count == 1:
            new_interval = 6
        else:
            new_interval = math.ceil(old_interval * new_ef)
            
        return (old_count + 1, new_ef, new_interval)

    def select_words_for_topic(self, limit: int = 8) -> List[str]:
        """
        Pulls a mix of 'Due for review' words and 'New' words.
        Prioritizes words whose next_review_date <= NOW.
        """
        now_str = datetime.now().isoformat()
        
        query = """
            SELECT v.word
            FROM vocabulary_items v
            JOIN vocabulary_srs_states s ON v.id = s.vocab_id
            WHERE v.is_active = 1 AND s.is_mastered = 0
            AND (s.traversal_count = 0 OR s.next_review_date <= :now)
            ORDER BY s.next_review_date ASC, s.traversal_count ASC
            LIMIT :limit
        """
        rows = self.db.execute(query, {"now": now_str, "limit": limit}).fetchall()
        
        return [r[0] for r in rows]

    def process_article_exposure(self, article_id: str, words: List[str]):
        """
        When words are included in a generated article, we simulate a 'review'
        with an assumed quality of 4 (passive reading exposure).
        """
        if not words:
            return
            
        now_str = datetime.now().isoformat()
        
        # We need the current states for these words
        placeholders = ", ".join(["?"] * len(words))
        query = f"""
            SELECT s.id, s.vocab_id, s.traversal_count, s.ease_factor, s.interval_days
            FROM vocabulary_srs_states s
            JOIN vocabulary_items v ON s.vocab_id = v.id
            WHERE lower(v.word) IN ({placeholders})
        """
        states = self.db.execute(query, tuple([w.lower() for w in words])).fetchall()
        
        for state in states:
            # Assuming quality 4 for reading exposure
            new_count, new_ef, new_interval = self.calculate_sm2(
                4, state["ease_factor"], state["interval_days"], state["traversal_count"]
            )
            
            from datetime import timedelta
            next_review = datetime.now() + timedelta(days=new_interval)
            
            is_mastered = 1 if new_interval >= 60 else 0
            
            update_query = """
                UPDATE vocabulary_srs_states
                SET traversal_count = :count,
                    ease_factor = :ef,
                    interval_days = :interval,
                    next_review_date = :next_out,
                    is_mastered = :mastered,
                    last_reviewed_at = :now,
                    last_article_id = :aid
                WHERE id = :sid
            """
            
            self.db.execute(update_query, {
                "count": new_count,
                "ef": new_ef,
                "interval": new_interval,
                "next_out": next_review.isoformat(),
                "mastered": is_mastered,
                "now": now_str,
                "aid": article_id,
                "sid": state["id"]
            })
            
        self.db.commit()
