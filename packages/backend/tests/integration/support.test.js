import { after, before, describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/config/database.js';
import { resendClient } from '../../src/config/resend.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

describe('POST /api/support/tickets', () => {
  let server;
  let baseUrl;
  const createdTicketIds = [];

  before(async () => {
    ({ server, baseUrl } = await startTestServer());
  });

  after(async () => {
    if (createdTicketIds.length > 0) {
      await pool.query('DELETE FROM support_tickets WHERE id = ANY($1)', [createdTicketIds]);
    }
    await stopTestServer(server);
  });

  test('rejects a request missing subject or message', async () => {
    const res = await fetch(`${baseUrl}/api/support/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com' }),
    });
    assert.equal(res.status, 400);
  });

  test('rejects an anonymous request with no email or an invalid one', async () => {
    const res = await fetch(`${baseUrl}/api/support/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: 'Dúvida', message: 'Oi', email: 'not-an-email' }),
    });
    assert.equal(res.status, 400);
  });

  test('creates a ticket for an anonymous visitor with a valid email', async () => {
    const res = await fetch(`${baseUrl}/api/support/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'Dúvida sobre preço',
        message: 'O Vitalício cobre livros futuros?',
        email: 'visitante@example.com',
      }),
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.id);
    assert.equal(data.status, 'open');
    createdTicketIds.push(data.id);

    const { rows } = await pool.query('SELECT user_id, email FROM support_tickets WHERE id = $1', [
      data.id,
    ]);
    assert.equal(rows[0].user_id, null);
    assert.equal(rows[0].email, 'visitante@example.com');
  });

  test('creates a ticket for an authenticated user using their account email', async () => {
    const registered = await registerTestUser(baseUrl);

    try {
      const res = await fetch(`${baseUrl}/api/support/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${registered.accessToken}`,
        },
        body: JSON.stringify({ subject: 'Bug no player', message: 'O áudio não carrega.' }),
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      createdTicketIds.push(data.id);

      const { rows } = await pool.query(
        'SELECT user_id, email FROM support_tickets WHERE id = $1',
        [data.id],
      );
      assert.equal(rows[0].user_id, registered.user.id);
      assert.equal(rows[0].email, registered.email);
    } finally {
      await pool.query('DELETE FROM users WHERE id = $1', [registered.user.id]);
    }
  });
});

describe('Admin support ticket endpoints', () => {
  let server;
  let baseUrl;
  let adminAccessToken;
  let adminUserId;
  let plainAccessToken;
  let plainUserId;
  let ticketId;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());

    const admin = await registerTestUser(baseUrl);
    adminAccessToken = admin.accessToken;
    adminUserId = admin.user.id;
    await pool.query('UPDATE users SET is_admin = true WHERE id = $1', [adminUserId]);

    const plain = await registerTestUser(baseUrl);
    plainAccessToken = plain.accessToken;
    plainUserId = plain.user.id;

    const { rows } = await pool.query(
      `INSERT INTO support_tickets (email, subject, message) VALUES ($1, $2, $3) RETURNING id`,
      ['ticket-test@example.com', 'Assunto de teste', 'Mensagem de teste'],
    );
    ticketId = rows[0].id;
  });

  after(async () => {
    await pool.query('DELETE FROM support_tickets WHERE id = $1', [ticketId]);
    await pool.query('DELETE FROM users WHERE id = $1', [adminUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [plainUserId]);
    await stopTestServer(server);
  });

  test('GET /api/admin/support/tickets rejects a non-admin user', async () => {
    const res = await fetch(`${baseUrl}/api/admin/support/tickets`, {
      headers: { Authorization: `Bearer ${plainAccessToken}` },
    });
    assert.equal(res.status, 403);
  });

  test('GET /api/admin/support/tickets lists tickets for an admin', async () => {
    const res = await fetch(`${baseUrl}/api/admin/support/tickets`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    assert.equal(res.status, 200);
    const tickets = await res.json();
    assert.ok(tickets.some((t) => t.id === ticketId));
  });

  test('PATCH /api/admin/support/tickets/:id rejects an invalid status', async () => {
    const res = await fetch(`${baseUrl}/api/admin/support/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'not-a-status' }),
    });
    assert.equal(res.status, 400);
  });

  test('PATCH /api/admin/support/tickets/:id resolves a ticket with an admin response', async () => {
    const res = await fetch(`${baseUrl}/api/admin/support/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'resolved', adminResponse: 'Resolvido, obrigado!' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'resolved');
    assert.equal(data.adminResponse, 'Resolvido, obrigado!');
  });

  test('PATCH /api/admin/support/tickets/:id emails the requester when Resend is configured', async () => {
    const originalKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = 're_test_123';
    const sendMock = mock.method(resendClient.emails, 'send', async () => ({ data: { id: 'x' } }));

    try {
      const res = await fetch(`${baseUrl}/api/admin/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminResponse: 'Aqui está a resposta!' }),
      });
      assert.equal(res.status, 200);

      // The controller fires the email best-effort, without awaiting it -
      // give its microtask a tick to run before asserting on the mock.
      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.equal(sendMock.mock.calls.length, 1);
      const [args] = sendMock.mock.calls[0].arguments;
      assert.equal(args.to, 'ticket-test@example.com');
      assert.match(args.text, /Aqui está a resposta!/);
    } finally {
      sendMock.mock.restore();
      if (originalKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = originalKey;
    }
  });

  test('PATCH /api/admin/support/tickets/:id returns 404 for a nonexistent ticket', async () => {
    const res = await fetch(
      `${baseUrl}/api/admin/support/tickets/00000000-0000-0000-0000-000000000000`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'resolved' }),
      },
    );
    assert.equal(res.status, 404);
  });
});
