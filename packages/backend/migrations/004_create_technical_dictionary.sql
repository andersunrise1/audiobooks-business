CREATE TABLE technical_dictionary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word VARCHAR NOT NULL UNIQUE,
  part_of_speech VARCHAR,
  portuguese_translation VARCHAR,
  technical_explanation TEXT,
  example_sentence TEXT,
  contexts VARCHAR[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_technical_dictionary_word ON technical_dictionary (lower(word));
