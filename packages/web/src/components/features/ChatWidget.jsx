import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

function createMessage(role, content) {
  return { id: crypto.randomUUID(), role, content };
}

function ChatWidget() {
  const { accessToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function handleSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const userMessage = createMessage('user', text);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    setError('');

    try {
      const { reply } = await apiRequest('/api/ai/chat', {
        method: 'POST',
        token: accessToken,
        body: { messages: nextMessages.map(({ role, content }) => ({ role, content })) },
      });
      setMessages((prev) => [...prev, createMessage('assistant', reply)]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border border-slate-200 rounded-lg p-4 flex flex-col gap-3">
      <h2 className="font-semibold">Chat com o tutor</h2>

      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
        {messages.length === 0 && !sending && (
          <p className="text-slate-400 text-sm">
            Pergunte algo sobre este capítulo, uma palavra ou gramática.
          </p>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                message.role === 'user'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-900 border border-slate-200'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="rounded-lg px-3 py-2 text-sm bg-slate-100 text-slate-500 border border-slate-200">
              Tutor está digitando...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
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
