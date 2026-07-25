# Audiobook Structure Template

The standard shape every TechSpeak audiobook follows (Dia 41, Etapa 4). Fill in
the blanks below to plan a new audiobook before writing it into the database —
see `CONTENT_GUIDELINES.md` for the authoring rules this template exists to
enforce, and `migrations/001_create_schema.sql` for the exact columns each
field maps to.

## Metadata (`audiobooks` row)

| Field                | Target                                                       | Column                         |
| -------------------- | ------------------------------------------------------------ | ------------------------------ |
| Title                | Short, real workplace scenario (e.g. "Daily Standup")        | `title`                        |
| Description          | One sentence, in Portuguese (matches the existing seed data) | `description`                  |
| Category             | `Software Engineering`, `Data Science`, `DevOps`, etc.       | `category`                     |
| Level                | `beginner`, `intermediate`, or `advanced`                    | `level`                        |
| Total duration       | **12-15 minutes**                                            | `duration_minutes`             |
| Technical vocabulary | **80-100 distinct words** across all chapters                | (via `words` rows per chapter) |

## Chapter structure (5 chapters, ~2.5-3 min each)

Every audiobook follows the same 5-chapter arc — a real daily standup
meeting, which doubles as both a language lesson and a lesson in how
standups actually work:

| #   | Chapter title | Purpose                                       | Opens with...             |
| --- | ------------- | --------------------------------------------- | ------------------------- |
| 1   | Opening       | Recap what was done since the last standup    | "Yesterday I..."          |
| 2   | Updates       | Describe current work in progress             | "Today I'm working on..." |
| 3   | Blockers      | Name a problem or dependency slowing progress | "We're facing..."         |
| 4   | Planning      | State near-term priorities                    | "Sprint priorities..."    |
| 5   | Closing       | Wrap up, invite questions                     | "Any questions?"          |

Each `chapters` row needs: `title`, `order_index` (1-5), `transcript` (full
plain-text sentence(s) for that chapter — not markdown, not multiple
paragraphs; this is what `chat`'s `buildChatContext` and `remedial`'s
summary both read directly), and `duration_seconds` (real audio length once
recorded — used for progress tracking and the Dashboard's `totalStudyMinutes`
stat).

## Worked example (Dia 42's "Daily Standup" audiobook)

`11111111-1111-1111-1111-111111111111` (used throughout the manual
verification steps in `CLAUDE.md`) is the reference implementation of this
template, migrations `009`-`013`:

```
Audiobook: Daily Standup
  category: Software Engineering
  level: beginner

Chapter 1: Opening
  transcript: "Yesterday I deployed a new version."
  words: deployed (clickable, timestamped, in technical_dictionary)

Chapter 2: Updates
  transcript: "Today I'm working on the payment integration. I'm adding tests for the new endpoint."
  words: endpoint

Chapter 3: Blockers
  transcript: "My only blocker is waiting for the API keys from the client. I can't test the webhook without them."
  words: blocker, webhook

Chapter 4: Planning
  transcript: "For this sprint, our priorities are finishing the checkout flow and fixing the reported bugs. Let's also refactor the old authentication module."
  words: sprint, priorities, refactor

Chapter 5: Closing
  transcript: "That's all from me. Does anyone have questions, or need help with their blockers?"
```

Chapters 2-5 don't carry real audio timestamps (`audio_url`/`start_seconds`/
`end_seconds` are `NULL`) — no TTS/audio production pipeline exists yet
(tracked gap, see `CLAUDE.md`'s architecture section). Click-to-translate,
`chat`, `remedial`, and `PronunciationRecorder` all work regardless, since
none of them depend on `audio_url`; only real audio playback and the
playback-time highlight effect are affected. See `migrations/010`-`013` for
four more full audiobooks built on this same pattern.

## Per-word checklist (`words` rows per chapter)

For every technical term in a chapter's transcript that should be clickable:

1. Check `technical_dictionary` first (`GET /api/dictionary/:word` or query
   the table directly) — if the word is already seeded there (24 terms as of
   Dia 16, e.g. `deployed`, `rollback`, `pipeline`, `merge`), you only need a
   `words` row with `word` + `start_seconds`/`end_seconds` (timestamps come
   from the recorded audio); `portuguese_translation`/`technical_explanation`/
   `example_sentence` fall back to the dictionary automatically.
2. If it's a genuinely new term, add it to `technical_dictionary` first
   (`part_of_speech`, `portuguese_translation`, `technical_explanation`,
   `example_sentence`, `contexts`) so every future audiobook can reuse it —
   this is what keeps the 80-100-word vocabulary target meaningfully
   cumulative across a series instead of each audiobook inventing its own
   glossary.
3. `start_seconds`/`end_seconds` require the audio to already be recorded and
   timed — sequence content writing before timestamping, not the reverse.
