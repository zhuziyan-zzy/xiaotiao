-- Search progress tracking table
CREATE TABLE IF NOT EXISTS search_progress (
    topic_id TEXT PRIMARY KEY,
    total INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    current_source TEXT DEFAULT '',
    status TEXT DEFAULT 'idle',
    updated_at TEXT
);

-- Ensure papers table has content_text column (needed for PDF/Word text extraction)
ALTER TABLE papers ADD COLUMN content_text TEXT;

-- Ensure papers table has docx_path column
ALTER TABLE papers ADD COLUMN docx_path TEXT;
