import TechSpeakWordmark from '../features/TechSpeakWordmark.jsx';

function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center">
      <h1>
        <TechSpeakWordmark className="text-3xl" iconClassName="w-10 h-10" />
      </h1>
      <p className="text-slate-500">
        Aprenda o inglês que engenheiros de software realmente usam no trabalho.
      </p>
    </div>
  );
}

export default HomePage;
