import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext.jsx';

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(email, password, name);
      navigate(location.state?.from ?? '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-sm">
      <h1 className="text-2xl font-bold mb-4">Criar conta</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          aria-label="Nome"
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-slate-300 rounded px-3 py-2"
        />
        <input
          type="email"
          aria-label="Email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border border-slate-300 rounded px-3 py-2"
        />
        <input
          type="password"
          aria-label="Senha"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="border border-slate-300 rounded px-3 py-2"
        />

        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-primary neon-glow text-white rounded px-3 py-2 disabled:opacity-50"
        >
          {submitting ? 'Criando...' : 'Criar conta'}
        </button>
      </form>

      <p className="text-sm text-slate-500 dark:text-stone-400 mt-3">
        Já tem conta?{' '}
        <Link to="/login" className="underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}

export default RegisterPage;
