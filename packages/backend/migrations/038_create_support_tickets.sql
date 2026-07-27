-- Dia 57-58: minimum-viable support ticket system. user_id is nullable so an
-- anonymous visitor (e.g. a pre-purchase question on the pricing page) can
-- still file a ticket with just an email address.
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR NOT NULL,
  subject VARCHAR NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'open', -- open, resolved
  admin_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_tickets_status ON support_tickets(status);
