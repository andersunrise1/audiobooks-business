-- Pilot rewrite of "Building a Promotion Case" from Dia 41's one-sentence-
-- per-chapter template into a multi-paragraph narrative story, per the
-- user's request to move toward a "book with a real narrative" reading
-- model (matching a reference reading-app screenshot) rather than short
-- practice lines. Existing tagged words (impact/ownership/promotion/
-- feedback) are left in place (unaffected by the transcript UPDATEs below,
-- since chapter_id doesn't change) and confirmed to still appear verbatim
-- in the new text; new words are added to give the much longer chapters
-- more vocabulary to click, reusing existing technical_dictionary entries
-- wherever one already existed (Dia 41's "check before inventing" rule).

UPDATE chapters SET transcript = $$Jordan had always assumed good work spoke for itself. That assumption fell apart during performance review season, when their manager asked a simple question: "What's the impact of the work you did this year?" Jordan opened their mouth to answer and realized they had nothing specific to say, just a vague sense of having been busy.

That night, Jordan started a private document. Every Friday, they wrote down one sentence: what they had shipped, and why it mattered. Not tasks completed, but impact created - the outage they had prevented, the onboarding time they had cut in half for every new hire, the migration that had quietly kept the whole platform running.

It felt strange at first, almost like bragging to no one. But after a few months, the document stopped looking like a list of tasks. It started looking like a case.$$
WHERE title = 'Tracking Your Impact'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Building a Promotion Case');

UPDATE chapters SET transcript = $$By the time promotion season arrived, Jordan's document had become something more useful: evidence. Not opinions about being a good engineer, but specific examples of ownership, the times Jordan had taken a project further than anyone had asked, without being told to.

There was the incident where a service kept crashing under load, and Jordan had stayed late to trace the root cause instead of just restarting it. There was the migration nobody wanted to own, which Jordan had planned, staged, and shipped without a single rollback. There was the RFC Jordan had written for a new authentication flow, which the whole team ended up adopting.

Jordan organized everything by theme: reliability, scope, and mentorship. Each example had a before and after, the state of things before Jordan stepped in, and the measurable difference after. It wasn't enough to say "I worked hard." The evidence had to speak for itself.$$
WHERE title = 'Gathering Evidence'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Building a Promotion Case');

UPDATE chapters SET transcript = $$Jordan scheduled time on the calendar labeled simply "career chat" and spent the whole morning rehearsing. When the call started, they went straight to the point: "I'd like to be considered for promotion this cycle. I've put together some evidence, and I'd like your feedback before I take it further."

Their manager didn't look surprised. "I was hoping you'd bring this up," they said. "Walk me through it."

Jordan shared the document, chapter by chapter: the outage prevented, the migration owned end to end, the RFC adopted by the whole team. Their manager asked pointed questions, not to poke holes, but to understand the scope of each contribution. Had Jordan done this alone, or with support? Was the impact visible to other teams, or only within their own?

By the end of the conversation, the manager leaned back. "This is stronger than I expected. Let's build the actual case together before the calibration meeting."$$
WHERE title = 'Talking to Your Manager'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Building a Promotion Case');

UPDATE chapters SET transcript = $$The calibration meeting was the part Jordan had been dreading. A room full of managers, deciding who moved up and who didn't, based on a single document and a five minute pitch.

Jordan's manager presented first, laying out the case with the same structure Jordan had built: reliability, ownership, and technical leadership. One of the stakeholders in the room, a director from another team, asked whether the authentication RFC had actually shipped or was still theoretical.

"It shipped three months ago," Jordan's manager answered. "Every team on the platform uses it now."

Someone else raised a concern about scope, was this really senior level work, or a strong mid-level engineer doing more than expected? Jordan's manager didn't get defensive. Instead, they walked through the trade-off Jordan had navigated alone, the kind that usually needed a more senior engineer in the room.

The meeting ended without a decision. That part, Jordan couldn't control.$$
WHERE title = 'Making the Case'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Building a Promotion Case');

UPDATE chapters SET transcript = $$The message came on a Tuesday afternoon: the promotion was approved. Jordan read it twice before it felt real.

But the moment that mattered more, in the end, wasn't the approval message, it was the conversation afterward. Jordan's manager offered specific, constructive feedback: "Your technical work was never the question. Next time, speak up earlier when you're setting priorities for the team, not just executing them."

Jordan thought about that for a long time. The promotion was proof that tracking impact worked. But the feedback was proof that the next case would need a different kind of evidence, not just what Jordan had shipped, but what Jordan had chosen not to do, and why.

That night, Jordan opened the same private document and started a new section.$$
WHERE title = 'Handling the Outcome'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Building a Promotion Case');

-- New vocabulary tags for the now much-longer chapters. All reuse existing
-- technical_dictionary entries (checked against the full word list before
-- writing this) except none needed new dictionary rows this time.
INSERT INTO words (word, chapter_id)
SELECT v.word, c.id
FROM chapters c
JOIN (VALUES
  ('Tracking Your Impact', 'new hire'),
  ('Tracking Your Impact', 'migration'),
  ('Gathering Evidence', 'rollback'),
  ('Gathering Evidence', 'RFC'),
  ('Talking to Your Manager', 'scope'),
  ('Talking to Your Manager', 'visible'),
  ('Making the Case', 'stakeholders'),
  ('Making the Case', 'authentication'),
  ('Making the Case', 'trade-off'),
  ('Handling the Outcome', 'priorities')
) AS v(chapter_title, word) ON v.chapter_title = c.title
WHERE c.audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Building a Promotion Case');
