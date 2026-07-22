import { useAuth } from '../../store/AuthContext.jsx';

function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold">Olá, {user?.name || user?.email}</h1>
      <p className="text-slate-500 mt-2">Seu progresso e flashcards vão aparecer aqui em breve.</p>
    </div>
  );
}

export default DashboardPage;
