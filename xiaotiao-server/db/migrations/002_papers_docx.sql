-- 002_papers_docx.sql — Word 文档支持
ALTER TABLE papers ADD COLUMN docx_path TEXT;
ALTER TABLE papers ADD COLUMN content_text TEXT;
