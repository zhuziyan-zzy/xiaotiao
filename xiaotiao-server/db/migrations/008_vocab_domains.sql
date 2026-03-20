-- Multi-domain classification for vocabulary items
-- A word can belong to multiple professional domains
CREATE TABLE IF NOT EXISTS vocab_domain_tags (
    vocab_id TEXT NOT NULL,
    domain TEXT NOT NULL,
    definition_in_domain TEXT,
    classified_by TEXT DEFAULT 'manual',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (vocab_id, domain),
    FOREIGN KEY (vocab_id) REFERENCES vocabulary_items(id) ON DELETE CASCADE
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_vocab_domain_tags_domain ON vocab_domain_tags(domain);
CREATE INDEX IF NOT EXISTS idx_vocab_domain_tags_vocab_id ON vocab_domain_tags(vocab_id);
CREATE INDEX IF NOT EXISTS idx_target_range_words_word ON target_range_words(word);
CREATE INDEX IF NOT EXISTS idx_vocabulary_items_word_lower ON vocabulary_items(word COLLATE NOCASE);
