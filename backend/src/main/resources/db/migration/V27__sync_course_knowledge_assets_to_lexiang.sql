ALTER TABLE knowledge_asset
    ADD COLUMN lexiang_sync_status VARCHAR(32) NOT NULL DEFAULT 'NOT_APPLICABLE';

ALTER TABLE knowledge_asset
    ADD COLUMN lexiang_entry_id VARCHAR(64);

ALTER TABLE knowledge_asset
    ADD COLUMN lexiang_synced_sha256 VARCHAR(64);

ALTER TABLE knowledge_asset
    ADD COLUMN lexiang_synced_name VARCHAR(200);

ALTER TABLE knowledge_asset
    ADD COLUMN lexiang_sync_error VARCHAR(500);

ALTER TABLE knowledge_asset
    ADD COLUMN lexiang_synced_at TIMESTAMP(6);

UPDATE knowledge_asset
SET lexiang_sync_status = 'PENDING'
WHERE origin_type = 'COURSE_UPLOAD'
  AND storage_key IS NOT NULL;

CREATE INDEX idx_knowledge_asset_lexiang_sync
    ON knowledge_asset (lexiang_sync_status, created_at);
