-- Enhanced vocabulary tracking
ALTER TABLE vocabulary_items ADD COLUMN duplicate_count INTEGER DEFAULT 0;
ALTER TABLE vocabulary_items ADD COLUMN is_easily_forgotten INTEGER DEFAULT 0;

ALTER TABLE vocabulary_srs_states ADD COLUMN mastery_threshold INTEGER DEFAULT 3;
