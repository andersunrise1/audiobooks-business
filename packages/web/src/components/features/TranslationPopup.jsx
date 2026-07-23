function TranslationPopup({ word, onClose }) {
  if (!word) return null;

  return (
    <div className="fixed inset-x-0 bottom-6 flex justify-center px-4 pointer-events-none">
      <div className="animate-popup-in pointer-events-auto max-w-sm w-full rounded-lg bg-slate-900 text-white shadow-lg p-4 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">{word.word}</span>
            {word.part_of_speech && (
              <span className="text-xs uppercase tracking-wide text-slate-400">
                {word.part_of_speech}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white leading-none"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {word.pronunciation && <p className="text-sm text-slate-300">{word.pronunciation}</p>}
        {word.portuguese_translation && <p className="text-base">{word.portuguese_translation}</p>}
        {word.technical_explanation && (
          <p className="text-sm text-slate-300">{word.technical_explanation}</p>
        )}
        {word.example_sentence && (
          <p className="text-sm italic text-slate-400">“{word.example_sentence}”</p>
        )}
        {word.contexts?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {word.contexts.map((context) => (
              <span
                key={context}
                className="text-xs rounded-full bg-slate-700 text-slate-200 px-2 py-0.5"
              >
                {context}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TranslationPopup;
