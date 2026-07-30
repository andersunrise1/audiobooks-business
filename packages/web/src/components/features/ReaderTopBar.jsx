import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const FONT_SIZES = ['text-base', 'text-lg', 'text-xl'];

// Dia [current]: top bar for the "book with audio" reading model - close,
// jump to any chapter directly (not just prev/next), cycle reading font
// size, and a settings popover holding the volume control (the "abaixar o
// volume e só ler" requirement) - kept out of the main playback bar to
// match the reference's minimal bottom controls.
function ReaderTopBar({
  chapters,
  chapterIndex,
  onSelectChapter,
  fontSize,
  onFontSizeChange,
  progressFraction,
  volume,
  onVolumeChange,
  voicePref,
  onVoicePrefChange,
}) {
  const navigate = useNavigate();
  const [showChapterMenu, setShowChapterMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  function cycleFontSize() {
    const index = FONT_SIZES.indexOf(fontSize);
    onFontSizeChange(FONT_SIZES[(index + 1) % FONT_SIZES.length]);
  }

  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-stone-900 -mx-4 px-4 pt-1">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate('/audiobooks')}
          aria-label="Fechar leitura"
          className="w-9 h-9 flex items-center justify-center rounded-full text-slate-600 dark:text-stone-300 touch-manipulation"
        >
          ✕
        </button>

        <div className="relative flex-1 text-center">
          <button
            type="button"
            onClick={() => setShowChapterMenu((v) => !v)}
            aria-expanded={showChapterMenu}
            className="text-sm text-primary font-medium touch-manipulation"
          >
            Capítulo {chapterIndex + 1} de {chapters.length} ▾
          </button>

          {showChapterMenu && (
            <ul
              role="menu"
              className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-64 max-h-72 overflow-y-auto bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-lg shadow-lg z-20 text-left"
            >
              {chapters.map((c, index) => (
                <li key={c.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onSelectChapter(index);
                      setShowChapterMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm touch-manipulation hover:bg-slate-100 dark:hover:bg-stone-700 ${
                      index === chapterIndex ? 'font-semibold text-primary' : ''
                    }`}
                  >
                    {index + 1}. {c.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={cycleFontSize}
            aria-label="Alterar tamanho do texto"
            className="w-9 h-9 flex items-center justify-center rounded-full text-slate-600 dark:text-stone-300 text-sm font-semibold touch-manipulation"
          >
            Aa
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              aria-expanded={showSettings}
              aria-label="Configurações de leitura"
              className="w-9 h-9 flex items-center justify-center rounded-full text-slate-600 dark:text-stone-300 touch-manipulation"
            >
              ⚙
            </button>

            {showSettings && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-lg shadow-lg z-20 p-3">
                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-stone-300">
                  Volume da narração
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(e) => onVolumeChange(Number(e.target.value))}
                    className="w-full h-6 touch-manipulation accent-primary"
                    aria-label="Volume da narração"
                  />
                </label>
                <p className="text-xs text-slate-400 dark:text-stone-500 mt-1">
                  Abaixe pra 0 e apenas leia o texto.
                </p>

                {onVoicePrefChange && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-stone-700">
                    <p className="text-sm text-slate-600 dark:text-stone-300 mb-1.5">
                      Voz da narração
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => onVoicePrefChange('female')}
                        aria-pressed={voicePref === 'female'}
                        className={`flex-1 h-9 rounded-full text-sm font-medium touch-manipulation ${
                          voicePref === 'female'
                            ? 'bg-primary/20 text-primary'
                            : 'bg-slate-100 dark:bg-stone-700 text-slate-700 dark:text-stone-200'
                        }`}
                      >
                        Mulher
                      </button>
                      <button
                        type="button"
                        onClick={() => onVoicePrefChange('male')}
                        aria-pressed={voicePref === 'male'}
                        className={`flex-1 h-9 rounded-full text-sm font-medium touch-manipulation ${
                          voicePref === 'male'
                            ? 'bg-primary/20 text-primary'
                            : 'bg-slate-100 dark:bg-stone-700 text-slate-700 dark:text-stone-200'
                        }`}
                      >
                        Homem
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-1 bg-slate-100 dark:bg-stone-700 rounded-full mt-2 mb-1 overflow-hidden">
        <div
          className="h-full bg-primary transition-[width]"
          style={{ width: `${Math.round((progressFraction || 0) * 100)}%` }}
        />
      </div>
    </div>
  );
}

export default ReaderTopBar;
