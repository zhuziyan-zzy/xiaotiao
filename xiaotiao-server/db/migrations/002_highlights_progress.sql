-- Migration: Add missing columns and tables for highlights, reading progress, folders
-- Safe to run multiple times (uses IF NOT EXISTS / try-add patterns)

-- Add color column to paper_annotations (for highlight persistence)
ALTER TABLE paper_annotations ADD COLUMN color TEXT;

-- Add reading progress columns to papers
ALTER TABLE papers ADD COLUMN pages_read INTEGER DEFAULT 0;
ALTER TABLE papers ADD COLUMN total_pages INTEGER DEFAULT 0;
ALTER TABLE papers ADD COLUMN read_status TEXT DEFAULT 'unread';
ALTER TABLE papers ADD COLUMN folder_id TEXT;

-- Create paper_folders table
CREATE TABLE IF NOT EXISTS paper_folders (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    parent_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create reading_log table
CREATE TABLE IF NOT EXISTS reading_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    paper_id   TEXT NOT NULL,
    pages_read INTEGER DEFAULT 0,
    read_date  DATE DEFAULT (date('now')),
    FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
);

-- Create content_annotations table (global annotations across all content types)
CREATE TABLE IF NOT EXISTS content_annotations (
    id                TEXT PRIMARY KEY,
    content_type      TEXT NOT NULL,
    content_id        TEXT NOT NULL,
    type              TEXT NOT NULL DEFAULT 'highlight',
    selected_text     TEXT,
    note              TEXT,
    color             TEXT,
    text_offset_start INTEGER,
    text_offset_end   INTEGER,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
