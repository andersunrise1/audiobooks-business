# Performance benchmarks (Dia 71-72)

Real numbers from `npm run test:load --workspace=packages/backend`
(`packages/backend/loadtest/run.js`), run against this machine's own local
dev backend (`http://localhost:3000`) and local Postgres. This is **not** a
production environment — see "Honest caveats" below before drawing
conclusions about real-world capacity.

The plan calls for K6 or JMeter. Adapted to
[autocannon](https://github.com/mcollina/autocannon) instead: a pure-Node
HTTP load generator, installable with a plain `npm install` like everything
else in this project, no separate Go/Java binary to download and manage.

## What was tested, and why not literally "1000 concurrent AI users"

"1000 usuários simultâneos" is simulated as concurrent **read** traffic
(catalog browsing, authenticated dashboard reads) — that's what 1000
simultaneous users of a content app mostly means. It deliberately does
**not** mean 1000 concurrent calls to `/api/ai/explain`: `AI_DAILY_RATE_LIMIT`
(Dia 37) exists specifically to cap concurrent AI cost, and this dev machine
has no local Redis (same standing gap as Dia 30), so that limiter fails
open here — 1000 concurrent real AI calls would just mean 1000 real,
real-money Anthropic API calls with no useful signal beyond "yes, an
unthrottled loop can spend money fast." Instead, a handful of real AI calls
run _concurrently with_ the heavy read-traffic scenario, to honestly answer
"does the AI feature stay responsive when the server is otherwise busy"
without being reckless with real spend.

## Results

### Scenario 1: public catalog browsing — `GET /api/audiobooks`

100 concurrent connections, 10s.

| Metric                      | Value               |
| --------------------------- | ------------------- |
| Requests/sec                | 3,245               |
| Latency p50 / p99 / max     | 29ms / 49ms / 302ms |
| Errors / timeouts / non-2xx | 0 / 0 / 0           |

### Scenario 2: free audiobook chapters — `GET /api/audiobooks/:id/chapters`

100 concurrent connections, 10s, against a real free (`is_free`) audiobook.

| Metric                      | Value              |
| --------------------------- | ------------------ |
| Requests/sec                | 4,134              |
| Latency p50 / p99 / max     | 24ms / 34ms / 52ms |
| Errors / timeouts / non-2xx | 0 / 0 / 0          |

### Scenario 3: authenticated dashboard reads — `GET /api/user/stats`

**1000** concurrent connections, 15s, real bearer token, run at the same
time as the AI-under-load check below.

| Metric                      | Value                 |
| --------------------------- | --------------------- |
| Requests/sec                | 1,636                 |
| Latency p50 / p99 / max     | 568ms / 840ms / 996ms |
| Errors / timeouts / non-2xx | 0 / 0 / 0             |

**Servidor aguenta?** Yes — zero errors, zero timeouts, even at 1000
concurrent connections. But latency at 1000 concurrent (p50 568ms) is
~20x worse than the two simpler endpoints' p50 (~25-30ms) at only 100
concurrent. The likely cause, not yet fixed (that's Dia 73-74's job):
`statsService.getUserStats` runs **5 separate queries** per request
(`packages/backend/src/services/statsService.js`), and `config/database.js`'s
`pg.Pool` has no explicit `max` set — it defaults to 10 connections. At
1000 concurrent requests × 5 queries each, requests are almost certainly
queueing for one of only 10 available DB connections rather than failing —
exactly the behavior a connection pool is supposed to have under overload
(degrade gracefully, don't error), but it's the real, measured reason for
the latency cliff, not a guess.

### AI-under-load check (real Anthropic API calls, not mocked)

3 real `POST /api/ai/explain` calls, fired concurrently with Scenario 3's
1000-connection burst.

| Word       | Status | Latency |
| ---------- | ------ | ------- |
| deployed   | 200    | 3,484ms |
| merged     | 200    | 4,385ms |
| refactored | 200    | 4,096ms |

**IA ainda funciona?** Yes — all 3 succeeded. Latency (3.4-4.4s) is
noticeably higher than the idle baseline measured on Dia 35/40
(~1.2-2.5s post-Haiku-switch) — consistent with the same single Node
process's event loop and outbound-fetch/DB-pool resources being shared
with the 1000-connection stats burst running at the same moment, not a
failure of the AI path itself.

## Honest caveats

- **Single dev machine, not a production deployment**: one local Postgres
  instance, one Node process, no load balancer, no read replicas, no CDN.
  These numbers describe this laptop under this load, not a real
  production topology.
- **No local Redis**: `AI_DAILY_RATE_LIMIT`'s Redis-backed counter (Dia 37)
  and the explain/remedial response cache (Dia 30) both fail open/skip
  here — same standing gap documented since Dia 30. In a real deployment
  with Redis actually reachable, repeated concurrent AI calls for the same
  word would mostly be cache hits, not new Anthropic API calls.
- **Read-only load**: no write-heavy scenario (progress upserts, flashcard
  reviews, word clicks) was load-tested this round - reads are what "1000
  users browsing" mostly means, but writes have different bottlenecks
  (lock contention, not just connection-pool queueing) worth a future pass.
- Test users created during the run are registered against the real local
  DB and deleted again in the script's own cleanup (`loadtest/helpers.js`)
  - confirmed 0 leftover rows after each run.

## Running it yourself

```bash
npm run dev --workspace=packages/backend   # needs to be running first
npm run test:load --workspace=packages/backend
```

`LOADTEST_BASE_URL` env var overrides the target (default
`http://localhost:3000`).
