import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

function createMessage(role, content, messageId = null, fallback = null) {
  return { id: crypto.randomUUID(), role, content, feedback: null, messageId, fallback };
}

function ChatWidget({ chapterId }) {
  const { accessToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
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
      const data = await apiRequest('/api/ai/chat', {
        method: 'POST',
        token: accessToken,
        body: {
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          chapterId,
        },
      });
      setMessages((prev) => [
        ...prev,
        createMessage('assistant', data.reply, data.messageId, data.fallback ? data : null),
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleCopy(message) {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
    } catch {
      setCopiedId(`error:${message.id}`);
    }
    setTimeout(() => setCopiedId((id) => (String(id).includes(message.id) ? null : id)), 2000);
  }

  async function handleFeedback(message, value) {
    const nextValue = message.feedback === value ? null : value;
    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? { ...m, feedback: nextValue } : m)),
    );

    if (!message.messageId) return;

    try {
      await apiRequest(`/api/ai/chat/${message.messageId}/feedback`, {
        method: 'PATCH',
        token: accessToken,
        body: { feedback: nextValue },
      });
    } catch {
      // Feedback is a non-critical signal - a failed PATCH just means it
      // wasn't persisted for analytics; the local UI state already reflects
      // the user's click, so we don't surface an error for this.
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
            className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                message.role === 'user'
                  ? 'bg-slate-900 text-white'
                  : message.fallback
                    ? 'bg-amber-50 text-slate-900 border border-amber-200'
                    : 'bg-slate-100 text-slate-900 border border-slate-200'
              }`}
            >
              {message.content}
            </div>

            {message.fallback && (
              <div className="max-w-[80%] mt-1 text-xs text-slate-500 flex flex-col gap-1 border border-amber-100 bg-amber-50 rounded-lg p-2">
                <p className="font-semibold">Perguntas frequentes</p>
                {message.fallback.faq.map((item) => (
                  <p key={item.question}>
                    <strong>{item.question}</strong> {item.answer}
                  </p>
                ))}
                <p>
                  Documentação:{' '}
                  <a
                    href={message.fallback.externalDocsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {message.fallback.externalDocsUrl}
                  </a>
                </p>
                <p>Suporte: {message.fallback.supportContact}</p>
              </div>
            )}

            {message.role === 'assistant' && !message.fallback && (
              <div className="flex gap-2 mt-1 text-xs text-slate-400">
                <button
                  type="button"
                  onClick={() => handleCopy(message)}
                  className="hover:text-slate-600"
                >
                  {copiedId === message.id
                    ? 'Copiado!'
                    : copiedId === `error:${message.id}`
                      ? 'Erro ao copiar'
                      : 'Copiar'}
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedback(message, 'helpful')}
                  aria-label="Marcar como útil"
                  aria-pressed={message.feedback === 'helpful'}
                  className={`rounded px-1 ${
                    message.feedback === 'helpful' ? 'bg-green-100' : 'hover:bg-slate-100'
                  }`}
                >
                  👍
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedback(message, 'not_helpful')}
                  aria-label="Marcar como não útil"
                  aria-pressed={message.feedback === 'not_helpful'}
                  className={`rounded px-1 ${
                    message.feedback === 'not_helpful' ? 'bg-red-100' : 'hover:bg-slate-100'
                  }`}
                >
                  👎
                </button>
              </div>
            )}
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
