import { pool } from '../config/database.js';

function toTicket(row) {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    subject: row.subject,
    message: row.message,
    status: row.status,
    adminResponse: row.admin_response,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createTicket({ userId, email, subject, message }) {
  const { rows } = await pool.query(
    `INSERT INTO support_tickets (user_id, email, subject, message)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId ?? null, email, subject, message],
  );
  return toTicket(rows[0]);
}

export async function listTickets() {
  const { rows } = await pool.query(`SELECT * FROM support_tickets ORDER BY created_at DESC`);
  return rows.map(toTicket);
}

export async function updateTicket(id, { status, adminResponse }) {
  const { rows } = await pool.query(
    `UPDATE support_tickets
     SET status = COALESCE($1, status),
         admin_response = COALESCE($2, admin_response),
         updated_at = now()
     WHERE id = $3
     RETURNING *`,
    [status ?? null, adminResponse ?? null, id],
  );
  return rows[0] ? toTicket(rows[0]) : null;
}
