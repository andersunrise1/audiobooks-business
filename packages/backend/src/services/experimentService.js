import crypto from 'node:crypto';
import { pool } from '../config/database.js';

// Dia 55-56: adapted from the plan's "$9.99 vs $12.99" subscription-tier
// draft to what's actually real here - TechSpeak Vitalicio is a one-time
// R$57 purchase (Dia 46), so this tests price anchors PRICING.md itself
// names as the alternatives worth validating (R$47/57/67), plus a UI
// variant on the Dia 49 paywall message. Neither variant is live against a
// real Stripe account yet (no test-mode keys exist), so these are built and
// tested against mocked Stripe calls, same as every other payment path.
export const EXPERIMENTS = {
  pricing_price: {
    variants: {
      control: { priceBrlCents: 5700, badge: null },
      discount: { priceBrlCents: 4700, badge: 'Oferta de lançamento' },
    },
  },
  paywall_message: {
    variants: {
      control: {
        message:
          'Este audiobook faz parte do TechSpeak Vitalicio. Faca login e adquira o acesso para continuar.',
      },
      benefit: {
        message:
          'Desbloqueie os 25 audiobooks do catalogo e o tutor de IA com o TechSpeak Vitalicio - pagamento unico, acesso para sempre.',
      },
    },
  },
};

// Deterministic hash-bucketing (no DB read needed to know a subject's
// variant): the same experiment+subjectId always maps to the same variant,
// so a returning visitor always sees what they saw before.
export function getVariantName(experimentName, subjectId) {
  const experiment = EXPERIMENTS[experimentName];
  if (!experiment || !subjectId) return null;

  const variantNames = Object.keys(experiment.variants);
  const hash = crypto.createHash('sha256').update(`${experimentName}:${subjectId}`).digest();
  const bucket = hash.readUInt32BE(0) % variantNames.length;
  return variantNames[bucket];
}

export function getVariantConfig(experimentName, variantName) {
  return EXPERIMENTS[experimentName]?.variants[variantName] ?? null;
}

export async function logExposure(experimentName, subjectId, variant) {
  await pool.query(
    `INSERT INTO experiment_events (subject_id, experiment_name, variant, event_type)
     VALUES ($1, $2, $3, 'exposure')
     ON CONFLICT (subject_id, experiment_name) WHERE event_type = 'exposure' DO NOTHING`,
    [subjectId, experimentName, variant],
  );
}

export async function logConversion(experimentName, subjectId, variant, metadata = null) {
  await pool.query(
    `INSERT INTO experiment_events (subject_id, experiment_name, variant, event_type, metadata)
     VALUES ($1, $2, $3, 'conversion', $4)`,
    [subjectId, experimentName, variant, metadata ? JSON.stringify(metadata) : null],
  );
}

export async function getExperimentResults(experimentName) {
  const { rows } = await pool.query(
    `SELECT
       variant,
       COUNT(*) FILTER (WHERE event_type = 'exposure')::int AS exposures,
       COUNT(*) FILTER (WHERE event_type = 'conversion')::int AS conversions
     FROM experiment_events
     WHERE experiment_name = $1
     GROUP BY variant
     ORDER BY variant`,
    [experimentName],
  );

  return rows.map((row) => ({
    variant: row.variant,
    exposures: row.exposures,
    conversions: row.conversions,
    conversionRate: row.exposures > 0 ? row.conversions / row.exposures : null,
  }));
}
