ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE chat_messages ADD COLUMN feedback VARCHAR; -- 'helpful' | 'not_helpful' | null
ALTER TABLE ai_usage_log ADD COLUMN response_time_ms INT;
