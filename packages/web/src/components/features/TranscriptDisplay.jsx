function TranscriptDisplay({ words, activeWordId, transcript }) {
  if (words.length === 0) {
    if (!transcript) return null;
    return <p className="leading-relaxed text-slate-700">{transcript}</p>;
  }

  return (
    <p className="leading-relaxed text-slate-700">
      {words.map((word) => (
        <span
          key={word.id}
          className={`inline-block mr-1 rounded px-0.5 transition-colors ${
            word.id === activeWordId ? 'bg-yellow-200 font-semibold' : ''
          }`}
        >
          {word.word}
        </span>
      ))}
    </p>
  );
}

export default TranscriptDisplay;
