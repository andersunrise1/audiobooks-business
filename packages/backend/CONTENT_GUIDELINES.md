# Content Guidelines

Rules for writing TechSpeak audiobook content (Dia 41, starting Etapa 4).
See `content/AUDIOBOOK_TEMPLATE.md` for the fill-in-the-blanks structure
these guidelines exist to justify.

## Why "daily standup" as the format

Every audiobook is a real workplace scenario, not an abstract vocabulary
list. The 5-chapter standup arc (Opening → Updates → Blockers → Planning →
Closing) was chosen because it teaches two things at once: the English
vocabulary itself, and the professional communication pattern a developer
needs it for. A learner who finishes an audiobook should be able to
recognize and use that pattern in a real meeting, not just define the words
on a quiz.

Future series (code review, incident response, sprint planning, 1:1s, etc.)
should follow the same principle: pick a real recurring workplace scenario
with a natural beginning/middle/end, not a themed word list.

## Vocabulary strategy

- **Reuse before inventing.** Check `technical_dictionary` (24 seeded terms
  as of Dia 16) before adding a new word to a chapter. A term explained once
  and reused across many audiobooks reinforces itself through spaced
  repetition (`flashcards`, Dia 17); a one-off term used in a single chapter
  doesn't.
- **80-100 words per audiobook is a target, not a hard cap** — it's sized so
  a learner meets roughly 15-20 new/reinforced terms per chapter, dense
  enough to be worth their time without overwhelming a single 12-15 minute
  session.
- **Prefer words a working developer actually says out loud** in a standup,
  PR review, or incident channel (`deployed`, `rollback`, `blocker`,
  `merge`) over textbook computer-science vocabulary. The existing
  dictionary's seed set is the calibration reference.

## Writing transcripts that work with the app's existing features

A chapter's `transcript` isn't just narration text — it's read directly by
several already-built features, so it has real constraints:

- **Plain text only.** `chat`'s `buildChatContext` and `remedial`'s summary
  generation both inject the raw transcript into an AI prompt — markdown,
  special formatting, or multi-paragraph structure adds noise the model has
  to work around instead of context that helps it.
- **One coherent scene per chapter**, not a list of disconnected example
  sentences — `ChapterFeedback`'s "Não entendi" flow asks the AI to
  summarize _this chapter_, which only makes sense if the chapter is
  actually about one thing.
- **Sentences short enough to record and time cleanly.** Every clickable
  word needs a real `start_seconds`/`end_seconds` pair from the actual
  audio (Dia 11-12's word-sync); long, clause-heavy sentences make accurate
  per-word timestamping slower and more error-prone.
- **Natural spoken English**, not written-English grammar — this is
  training material for verbal communication (standups, calls), and the
  `PronunciationRecorder` (Dia 18) scores the learner against the exact
  transcript text, so it needs to be something a person would actually say
  out loud.

## Category and level

- `category` should match (or extend) the existing set surfaced by
  `GET /api/user/recommendations` (Dia 34) — a new category with no other
  audiobooks in it can never be "recommended based on what you already
  engage with."
- `level` (`beginner`/`intermediate`/`advanced`) should track _vocabulary
  density and grammatical complexity_, not topic difficulty — a beginner
  audiobook can cover an advanced topic (e.g. "Blockers") using simple
  sentence structure and already-seeded vocabulary.

## Before publishing a new audiobook

1. Every chapter has a `transcript` and, once recorded, a real
   `duration_seconds` — `remedial` 422s on a missing transcript, and
   `totalStudyMinutes`/recommendations quietly undercount a chapter with no
   duration.
2. Every clickable term is a real `words` row — `start_seconds`/
   `end_seconds` are only needed once real audio exists (they drive
   Dia 12's playback-highlight effect); without them, click-to-translate,
   `chat`, `remedial`, and `PronunciationRecorder` still work fine (Dia 42).
   Tagging is intentionally partial — only the technical terms, not every
   word (Dia 42 fixed `TranscriptDisplay` to keep the full sentence visible
   regardless of how many words are tagged).
3. New vocabulary not already in `technical_dictionary` has been added
   there first, not just inlined into one chapter's `words` row.
4. The audiobook's total runtime and vocabulary count are checked against
   the 12-15 minute / 80-100 word targets in `content/AUDIOBOOK_TEMPLATE.md`.
