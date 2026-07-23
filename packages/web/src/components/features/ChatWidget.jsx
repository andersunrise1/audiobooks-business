import { useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

function ChatWidget() {
  const { accessToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const userMessage = { role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    setError('');

    try {
      const { reply } = await apiRequest('/api/ai/chat', {
        method: 'POST',
        token: accessToken,
        body: { messages: nextMessages },
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border border-slate-200 rounded-lg p-4 flex flex-col gap-3">
      <h2 className="font-semibold">Chat com o tutor</h2>

      <div className="flex flex-col gap-2">
        {messages.map((message, i) => (
          <p key={i}>
            <strong>{message.role === 'user' ? 'Você' : 'Tutor'}:</strong> {message.content}
          </p>
        ))}
        {sending && <p className="text-slate-500">Tutor está digitando...</p>}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte algo sobre este capítulo..."
          className="flex-1 border border-slate-300 rounded px-3 py-2"
        />
        <button
          type="submit"
          disabled={sending}
          className="bg-slate-900 text-white rounded px-4 py-2 disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

export default ChatWidget;
