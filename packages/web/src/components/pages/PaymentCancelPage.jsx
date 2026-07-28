import { Link } from 'react-router-dom';

function PaymentCancelPage() {
  return (
    <div className="flex flex-col gap-4 max-w-md">
      <h1 className="text-2xl font-bold">Pagamento cancelado</h1>
      <p className="text-slate-600 dark:text-stone-300">
        Nenhuma cobrança foi feita. Você pode tentar novamente quando quiser.
      </p>
      <Link to="/pricing" className="text-slate-900 dark:text-stone-100 underline">
        Voltar para os planos
      </Link>
    </div>
  );
}

export default PaymentCancelPage;
