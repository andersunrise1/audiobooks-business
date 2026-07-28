// Dia 71-72: load test suite (plan calls for K6/JMeter; adapted to
// autocannon - a pure-Node HTTP benchmarking tool - so it needs no extra
// binary install beyond `npm install`, matching this project's existing
// zero-extra-install testing setup). Run with:
//   npm run test:load --workspace=packages/backend
//
// Targets this machine's real running dev backend (LOADTEST_BASE_URL,
// default http://localhost:3000) - not an ephemeral test server - since
// the point is measuring how the actual server behaves under concurrency,
// the same question K6/JMeter would be answering against a real
// deployment.
//
// Scope, honestly: simulates concurrent READ traffic (catalog browsing,
// authenticated dashboard reads) at real concurrency, since that's what
// "1000 simultaneous users" mostly means for a content app. It does NOT
// blast the AI endpoint at that same concurrency - AI_DAILY_RATE_LIMIT
// (Dia 37) exists specifically to prevent unbounded concurrent AI cost,
// and with no local Redis (same standing gap since Dia 30) that limiter
// fails open here, so 1000 concurrent /api/ai/explain calls would mean
// 1000 real, real-money Anthropic API calls with no informative signal
// beyond "yes, an unthrottled loop can spend money fast." Instead, a
// small number of real AI calls run *concurrently with* the heavy read
// load, to honestly answer "does the AI feature stay responsive when the
// server is otherwise busy" without being reckless with real spend.
import autocannon from 'autocannon';
import { pool } from '../src/config/database.js';
import { BASE_URL, registerTestUser, getFreeAudiobook, cleanupTestUsers } from './helpers.js';

const TEST_USER_COUNT = 5;
const AI_CHECK_WORDS = ['deployed', 'merged', 'refactored'];

function runAutocannon(opts) {
  return new Promise((resolve, reject) => {
    autocannon(opts, (err, result) => (err ? reject(err) : resolve(result)));
  });
}

function summarize(name, result) {
  return {
    scenario: name,
    connections: result.connections,
    durationSec: result.duration,
    requestsTotal: result.requests.total,
    requestsPerSec: Math.round(result.requests.average),
    latencyMs: { p50: result.latency.p50, p99: result.latency.p99, max: result.latency.max },
    errors: result.errors,
    timeouts: result.timeouts,
    non2xx: result.non2xx,
  };
}

async function checkAiUnderLoad(token) {
  const start = Date.now();
  const results = await Promise.all(
    AI_CHECK_WORDS.map(async (word) => {
      const t0 = Date.now();
      try {
        const res = await fetch(`${BASE_URL}/api/ai/explain`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ word, context: `We ${word} the service yesterday.` }),
        });
        return { word, status: res.status, ms: Date.now() - t0 };
      } catch (err) {
        return { word, status: 'error', message: err.message, ms: Date.now() - t0 };
      }
    }),
  );
  return { totalMs: Date.now() - start, calls: results };
}

async function main() {
  console.log(`Load testing ${BASE_URL}\n`);

  const freeBook = await getFreeAudiobook();
  console.log(`Using free audiobook: "${freeBook.title}" (${freeBook.id})`);

  console.log(`Registering ${TEST_USER_COUNT} test users...`);
  const users = [];
  for (let i = 0; i < TEST_USER_COUNT; i += 1) {
    users.push(await registerTestUser(i));
  }
  const token = users[0].accessToken;
  const userIds = users.map((u) => u.id);

  const results = {};

  try {
    console.log('\n--- Scenario 1: public catalog browsing (GET /api/audiobooks) ---');
    results.catalog = summarize(
      'catalog',
      await runAutocannon({ url: `${BASE_URL}/api/audiobooks`, connections: 100, duration: 10 }),
    );
    console.log(results.catalog);

    console.log('\n--- Scenario 2: free audiobook chapters (GET .../chapters) ---');
    results.chapters = summarize(
      'chapters',
      await runAutocannon({
        url: `${BASE_URL}/api/audiobooks/${freeBook.id}/chapters`,
        connections: 100,
        duration: 10,
      }),
    );
    console.log(results.chapters);

    console.log(
      '\n--- Scenario 3: authenticated reads under high concurrency (GET /api/user/stats), with AI calls running concurrently ---',
    );
    const [statsResult, aiCheck] = await Promise.all([
      runAutocannon({
        url: `${BASE_URL}/api/user/stats`,
        connections: 1000,
        duration: 15,
        headers: { Authorization: `Bearer ${token}` },
      }),
      checkAiUnderLoad(token),
    ]);
    results.stats = summarize('stats-1000-concurrent', statsResult);
    results.aiUnderLoad = aiCheck;
    console.log(results.stats);
    console.log('AI-under-load check:', aiCheck);

    console.log('\n=== Full results (JSON) ===');
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await cleanupTestUsers(pool, userIds);
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
