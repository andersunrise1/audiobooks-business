import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTicket,
  listTickets,
  updateTicket,
} from '../../src/services/supportTicketService.js';
import { pool } from '../../src/config/database.js';

const SAMPLE_ROW = {
  id: 't-1',
  user_id: 'u-1',
  email: 'a@b.com',
  subject: 'Dúvida',
  message: 'Como funciona o modo offline?',
  status: 'open',
  admin_response: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('supportTicketService.createTicket', () => {
  test('inserts a ticket and maps the row to camelCase', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({ rows: [SAMPLE_ROW] }));

    try {
      const result = await createTicket({
        userId: 'u-1',
        email: 'a@b.com',
        subject: 'Dúvida',
        message: 'Como funciona o modo offline?',
      });
      assert.deepEqual(result, {
        id: 't-1',
        userId: 'u-1',
        email: 'a@b.com',
        subject: 'Dúvida',
        message: 'Como funciona o modo offline?',
        status: 'open',
        adminResponse: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
    } finally {
      queryMock.mock.restore();
    }
  });

  test('defaults userId to null for anonymous submissions', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({ rows: [SAMPLE_ROW] }));

    try {
      await createTicket({ email: 'a@b.com', subject: 'Dúvida', message: 'Oi' });
      const [, params] = queryMock.mock.calls[0].arguments;
      assert.equal(params[0], null);
    } finally {
      queryMock.mock.restore();
    }
  });
});

describe('supportTicketService.listTickets', () => {
  test('maps every row to camelCase, newest first', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({ rows: [SAMPLE_ROW] }));

    try {
      const result = await listTickets();
      assert.equal(result.length, 1);
      assert.equal(result[0].id, 't-1');
      assert.match(queryMock.mock.calls[0].arguments[0], /ORDER BY created_at DESC/);
    } finally {
      queryMock.mock.restore();
    }
  });
});

describe('supportTicketService.updateTicket', () => {
  test('updates status and admin_response', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({
      rows: [{ ...SAMPLE_ROW, status: 'resolved', admin_response: 'Feito.' }],
    }));

    try {
      const result = await updateTicket('t-1', { status: 'resolved', adminResponse: 'Feito.' });
      assert.equal(result.status, 'resolved');
      assert.equal(result.adminResponse, 'Feito.');
    } finally {
      queryMock.mock.restore();
    }
  });

  test('returns null when the ticket does not exist', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({ rows: [] }));

    try {
      const result = await updateTicket('missing', { status: 'resolved' });
      assert.equal(result, null);
    } finally {
      queryMock.mock.restore();
    }
  });
});
