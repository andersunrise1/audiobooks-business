import { createTicket } from '../services/supportTicketService.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitTicket(req, res) {
  const { subject, message } = req.body;
  const email = req.user ? req.user.email : req.body.email;

  if (!subject || !message) {
    return res.status(400).json({ error: 'subject and message are required' });
  }

  if (!email || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: 'a valid email is required' });
  }

  const ticket = await createTicket({
    userId: req.user?.id ?? null,
    email,
    subject,
    message,
  });

  res.status(201).json({ id: ticket.id, status: ticket.status, createdAt: ticket.createdAt });
}
