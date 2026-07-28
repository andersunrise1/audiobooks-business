import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

const INITIAL_FORM = {
  title: '',
  description: '',
  category: '',
  level: 'beginner',
  chapterTitle: 'Chapter 1',
  transcript: '',
  wordsMetadata: '[]',
  publishedAt: '',
};

function AdminUploadPage() {
  const { accessToken } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!file) {
      setError('Selecione um arquivo de áudio.');
      return;
    }

    setSubmitting(true);
    setError('');
    setResult(null);

    const body = new FormData();
    body.set('title', form.title);
    body.set('description', form.description);
    body.set('category', form.category);
    body.set('level', form.level);
    body.set('chapterTitle', form.chapterTitle);
    body.set('transcript', form.transcript);
    body.set('words_metadata', form.wordsMetadata);
    if (form.publishedAt) {
      body.set('publishedAt', new Date(form.publishedAt).toISOString());
    }
    body.set('audio_file', file);

    try {
      const data = await apiRequest('/api/admin/audiobooks', {
        method: 'POST',
        token: accessToken,
        body,
      });
      setResult(data);
      setForm(INITIAL_FORM);
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <h1 className="text-2xl font-bold">Upload de Audiobook</h1>
      <p className="text-sm text-slate-500">
        Cria um novo audiobook com seu primeiro capítulo. Os timestamps de{' '}
        <code>words_metadata</code> devem ser informados manualmente (não há geração automática via
        Deepgram nesta versão).
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          required
          placeholder="Título do audiobook"
          value={form.title}
          onChange={(e) => updateField('title', e.target.value)}
          className="border border-slate-300 rounded px-3 py-2"
        />
        <input
          placeholder="Descrição"
          value={form.description}
          onChange={(e) => updateField('description', e.target.value)}
          className="border border-slate-300 rounded px-3 py-2"
        />
        <input
          placeholder="Categoria (ex: Software Engineering)"
          value={form.category}
          onChange={(e) => updateField('category', e.target.value)}
          className="border border-slate-300 rounded px-3 py-2"
        />
        <select
          value={form.level}
          onChange={(e) => updateField('level', e.target.value)}
          className="border border-slate-300 rounded px-3 py-2"
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <input
          placeholder="Título do capítulo"
          value={form.chapterTitle}
          onChange={(e) => updateField('chapterTitle', e.target.value)}
          className="border border-slate-300 rounded px-3 py-2"
        />
        <textarea
          required
          placeholder="Transcript do capítulo"
          value={form.transcript}
          onChange={(e) => updateField('transcript', e.target.value)}
          className="border border-slate-300 rounded px-3 py-2"
          rows={3}
        />
        <textarea
          placeholder='words_metadata (JSON, ex: [{"word":"deployed","start_seconds":0.5,"end_seconds":1}])'
          value={form.wordsMetadata}
          onChange={(e) => updateField('wordsMetadata', e.target.value)}
          className="border border-slate-300 rounded px-3 py-2 font-mono text-xs"
          rows={3}
        />
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Data de lançamento (opcional — em branco cria como rascunho)
          <input
            type="datetime-local"
            value={form.publishedAt}
            onChange={(e) => updateField('publishedAt', e.target.value)}
            className="border border-slate-300 rounded px-3 py-2"
          />
        </label>
        <input
          required
          type="file"
          accept="audio/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary neon-glow text-white rounded px-4 py-2 disabled:opacity-50 touch-manipulation"
        >
          {submitting ? 'Enviando...' : 'Enviar'}
        </button>
      </form>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {result && (
        <p className="text-green-600 text-sm">
          Audiobook criado! ID: {result.audiobookId} · capítulo: {result.chapterId} ·{' '}
          {result.publishedAt
            ? `agendado/publicado para ${new Date(result.publishedAt).toLocaleString('pt-BR')}`
            : 'salvo como rascunho'}
          . Use a aba{' '}
          <Link to="/admin/content" className="underline">
            Conteúdo
          </Link>{' '}
          para pré-visualizar ou publicar.
        </p>
      )}
    </div>
  );
}

export default AdminUploadPage;
