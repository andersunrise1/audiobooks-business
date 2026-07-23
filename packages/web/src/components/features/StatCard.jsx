function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 flex flex-col gap-1">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </div>
  );
}

export default StatCard;
