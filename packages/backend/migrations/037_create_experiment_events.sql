-- Dia 55-56: A/B testing framework. Variant assignment itself is computed
-- deterministically in code (hash of experiment name + subject id), so no
-- "assignments" table is needed - this table only logs what actually
-- happened (a subject was shown a variant, or completed the goal action) so
-- results can be aggregated per variant later.
CREATE TABLE experiment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id VARCHAR NOT NULL, -- anonymous visitor id or authenticated user id
  experiment_name VARCHAR NOT NULL,
  variant VARCHAR NOT NULL,
  event_type VARCHAR NOT NULL, -- 'exposure' or 'conversion'
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_experiment_events_lookup ON experiment_events(experiment_name, event_type);

-- One exposure per subject per experiment - repeat page views shouldn't
-- inflate the denominator of the conversion rate calculation.
CREATE UNIQUE INDEX idx_experiment_events_exposure_unique
  ON experiment_events(subject_id, experiment_name)
  WHERE event_type = 'exposure';
