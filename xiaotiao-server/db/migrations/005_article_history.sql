-- 文章历史记录表
CREATE TABLE IF NOT EXISTS article_history (
    id              TEXT PRIMARY KEY,
    topic           TEXT NOT NULL,
    domains         TEXT,
    level           TEXT,
    style           TEXT,
    article_length  INTEGER,
    result_text     TEXT,
    translation_text TEXT,
    terms_json      TEXT,
    new_words_json  TEXT,
    notes_json      TEXT,
    confidence_hint TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
