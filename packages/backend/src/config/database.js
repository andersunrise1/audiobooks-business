import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Dia 73-74: node-postgres defaults to max: 10, which the Dia 71-72 load
// test showed queueing badly under concurrent traffic (1000 concurrent
// requests to a route needing 5 simultaneous connections each). EXPLAIN
// ANALYZE on those same queries showed sub-millisecond execution time even
// under load - the bottleneck was pool contention, not slow queries or
// missing indexes. 20 leaves headroom under Postgres's own default
// max_connections (100) for migrations, admin tooling, etc.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX) || 20,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});
