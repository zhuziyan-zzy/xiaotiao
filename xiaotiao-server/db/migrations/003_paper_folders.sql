-- Paper Folders (hierarchical)
CREATE TABLE IF NOT EXISTS paper_folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,
    source TEXT DEFAULT 'manual',
    topic_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reading progress on papers
ALTER TABLE papers ADD COLUMN folder_id TEXT;
ALTER TABLE papers ADD COLUMN total_pages INTEGER DEFAULT 0;
ALTER TABLE papers ADD COLUMN pages_read INTEGER DEFAULT 0;
ALTER TABLE papers ADD COLUMN read_status TEXT DEFAULT 'unread';

-- Reading log for stats
CREATE TABLE IF NOT EXISTS reading_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paper_id TEXT NOT NULL,
    pages_read INTEGER DEFAULT 0,
    read_date DATE DEFAULT (date('now')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
