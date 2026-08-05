import { listTickets, updateTicket } from '../services/supportTicketService.js';
import { isEmailConfigured, sendSupportReply } from '../services/emailService.js';

const VALID_STATUSES = ['open', 'resolved'];

export async function getTickets(req, res) {
  const tickets = await listTickets();
  res.json(tickets);
}

export async function patchTicket(req, res) {
  const { status, adminResponse } = req.body;

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const ticket = await updateTicket(req.params.id, { status, adminResponse });

  if (!ticket) {
    return res.status(404).json({ error: 'ticket not found' });
  }

  // Best-effort: a failed/unconfigured email service must not undo the
  // admin's response (already saved above) or fail this request - same
  // resilience pattern as costTrackingService's best-effort logging.
  if (adminResponse && isEmailConfigured()) {
    sendSupportReply({
      to: ticket.email,
      subject: ticket.subject,
      message: ticket.message,
      adminResponse,
    }).catch((err) => console.error('Failed to send support reply email', err));
  }

  res.json(ticket);
}
