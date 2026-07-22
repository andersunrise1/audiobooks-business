import { useParams } from 'react-router-dom';

function PlayerPage() {
  const { id } = useParams();

  return (
    <div>
      <h1 className="text-2xl font-bold">Player</h1>
      <p className="text-slate-500 mt-2">
        O player do audiobook {id} será implementado na Etapa 2 do plano.
      </p>
    </div>
  );
}

export default PlayerPage;
