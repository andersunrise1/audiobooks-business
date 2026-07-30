-- Batch narrative rewrite (auto-generated from a verified data file -
-- every word below was confirmed to appear in its chapter's new text
-- before this file was written, using the same normalize/match logic
-- TranscriptDisplay.jsx uses, per the Dia 42 word-form-mismatch lesson).
-- Part of the broader "book with audio, narrative chapters" rewrite the
-- user requested, following the Building a Promotion Case pilot.

UPDATE chapters SET transcript = $$On Grace's first day, Victor met her at the door before her badge even worked and gave her a tour of the codebase instead of just the office. He didn't dump the whole repository on her at once - he walked through the three services she'd actually touch in her first week, and left the rest for later. Being the new hire was less overwhelming when someone chose what mattered first.$$
WHERE title = 'Welcoming the New Hire'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Onboarding a New Developer');

UPDATE chapters SET transcript = $$Over coffee, Victor sketched the architecture on a whiteboard: the API talked to a queue, the queue fed a worker service, and the worker wrote back to a shared database. Grace asked why it wasn't just one simple application, and Victor's answer - so one slow part couldn't take down everything else - was the kind of context no README ever seemed to capture.$$
WHERE title = 'Explaining the Architecture'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Onboarding a New Developer');

UPDATE chapters SET transcript = $$The rest of the morning went to setting up her environment: cloning the repositories, installing the right versions of everything, and getting the local database seeded with realistic test data. It took longer than either of them expected, and Victor made a note to fix the setup script once Grace was done needing it explained out loud.$$
WHERE title = 'Setting Up the Environment'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Onboarding a New Developer');

UPDATE chapters SET transcript = $$In the afternoon, Victor picked a small, real bug and paired with Grace on fixing it instead of assigning it to her alone. Watching how he actually navigated the codebase - which files he opened first, what he searched for - taught her more in an hour than any onboarding document had.$$
WHERE title = 'Pairing on a Task'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Onboarding a New Developer');

UPDATE chapters SET transcript = $$At the end of her first week, Victor checked in properly instead of just asking "how's it going" in passing. Grace admitted the architecture still felt like a lot, and Victor told her that was normal - it had taken him months, not days, to feel like he really understood it too.$$
WHERE title = 'Checking In'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Onboarding a New Developer');

UPDATE chapters SET transcript = $$Amara wanted to contribute to a project she used every day but had never touched the code of. She looked through the open issues and found one labeled good first issue: a small formatting bug in the CLI's output. It felt manageable enough to actually start with.$$
WHERE title = 'Finding an Issue'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Open Source Contribution');

UPDATE chapters SET transcript = $$She forked the repository into her own account and cloned it to her machine, following the contributing guide step by step. It was strange seeing a project she'd only ever installed as a package suddenly sitting as real, readable code on her own laptop.$$
WHERE title = 'Forking the Repository'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Open Source Contribution');

UPDATE chapters SET transcript = $$The fix itself was small - a missing space in a formatted string - but Amara wrote a test to cover it anyway, so the same mistake couldn't quietly come back later. She ran the full test suite locally before touching anything else, just to be sure she hadn't broken something unrelated.$$
WHERE title = 'Making the Change'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Open Source Contribution');

UPDATE chapters SET transcript = $$She opened a pull request explaining exactly what she'd changed and why, linking back to the original issue so a reviewer wouldn't have to go looking for context. It was her first pull request to a project she didn't own, and she reread the description three times before submitting it.$$
WHERE title = 'Opening the Pull Request'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Open Source Contribution');

UPDATE chapters SET transcript = $$A maintainer replied within a day, asking for one small change: a slightly different variable name to match the rest of the file. Amara made the change immediately and thanked them for the quick review on the pull request - it was a small interaction, but it was the moment the project stopped feeling like someone else's and started feeling like something she was part of.$$
WHERE title = 'Responding to Maintainers'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Open Source Contribution');

UPDATE chapters SET transcript = $$Before the meeting, Derek thought carefully about how much technical detail these particular stakeholders actually needed. Some of them cared about architecture diagrams; this group cared about whether customers would notice a difference, and by when.$$
WHERE title = 'Knowing Your Audience'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Presenting to Stakeholders');

UPDATE chapters SET transcript = $$He rewrote his slides twice, replacing every piece of jargon with plain, everyday language. "We reduced p99 latency" became "the slowest requests are now three times faster" - the same fact, but one version required no follow-up question to understand.$$
WHERE title = 'Simplifying the Message'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Presenting to Stakeholders');

UPDATE chapters SET transcript = $$Instead of walking through more slides, Derek pulled up a live demo of the actual feature running in staging. Watching it work in real time landed more clearly than any bullet point could have, and it turned a one-way presentation into an actual conversation.$$
WHERE title = 'Using a Demo'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Presenting to Stakeholders');

UPDATE chapters SET transcript = $$When someone asked a question Derek genuinely didn't know the answer to, he said so plainly instead of guessing out loud in front of the room, and promised to follow up with a real answer by the next day. Nobody seemed to mind - the honesty read as more credible than a confident but wrong answer would have.$$
WHERE title = 'Handling Questions'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Presenting to Stakeholders');

UPDATE chapters SET transcript = $$Derek closed the presentation with three clear next steps: what would ship this week, what needed one more round of testing, and who owned each piece. The meeting ended with the room agreeing on exactly what happened next, instead of everyone leaving with a different impression of what was decided.$$
WHERE title = 'Summarizing Next Steps'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Presenting to Stakeholders');

UPDATE chapters SET transcript = $$Since Noah's team spanned three time zones, he posted an async update in Slack every morning instead of waiting for a live call that half the team would have to join at an inconvenient hour. It meant nobody was blocked waiting for him to wake up.$$
WHERE title = 'Async Updates'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Remote Work Communication');

UPDATE chapters SET transcript = $$He learned early on that clear, concise written communication saved everyone time - a message that answered the obvious follow-up question upfront meant nobody had to wait a full day, across time zones, just to ask it.$$
WHERE title = 'Written Communication'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Remote Work Communication');

UPDATE chapters SET transcript = $$For the one meeting that genuinely needed everyone live, the team rotated who had to join at an inconvenient time zone, rather than always asking the same person to take the early morning call.$$
WHERE title = 'Timezone Coordination'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Remote Work Communication');

UPDATE chapters SET transcript = $$Instead of saving comments for a call that might not happen for days, Noah left his feedback directly on the pull request as soon as he had it, so the author could act on it the moment they were online again.$$
WHERE title = 'Giving Feedback Remotely'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Remote Work Communication');

UPDATE chapters SET transcript = $$Working async made it easy to disappear without meaning to, so Noah made a habit of updating his ticket every day, even with a short note - not to prove he was working, but so his progress stayed visible to a team that couldn't just look over at his desk.$$
WHERE title = 'Staying Visible'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Remote Work Communication');

UPDATE chapters SET transcript = $$Elena was reviewing a bug report that confused two very different failures. Authentication checks who you are - did this password match this account. Authorization checks what you're allowed to do once you're in - just because you're logged in doesn't mean you're allowed to see everyone else's data.$$
WHERE title = 'Authentication vs Authorization'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Security Basics');

UPDATE chapters SET transcript = $$A security researcher emailed in a vulnerability report describing exactly how the login form leaked whether an email address existed in the system, just from how quickly it responded. It was a small detail, but a real one, and Elena treated the report seriously instead of dismissing it as minor.$$
WHERE title = 'A Vulnerability Report'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Security Basics');

UPDATE chapters SET transcript = $$While looking into it, she noticed something worse buried nearby: passwords were being stored in a way that wasn't properly hashed. She fixed it so the system would encrypt every password before it ever touched the database, the way it always should have been.$$
WHERE title = 'Encrypting Data'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Security Basics');

UPDATE chapters SET transcript = $$The original vulnerability itself came down to one missing habit: never trust input from a user, always validate it on the server, no matter how harmless the form looks on the frontend.$$
WHERE title = 'Validating Input'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Security Basics');

UPDATE chapters SET transcript = $$Elena patched the vulnerability the same day it was reported and deployed the fix immediately, then wrote back to the researcher thanking them by name. Being fast and honest about a real problem built more trust with that researcher than pretending it never happened ever could have.$$
WHERE title = 'Patching the Issue'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Security Basics');

UPDATE chapters SET transcript = $$Before planning anything, Mateo's team reviewed the backlog together and argued, briefly and productively, about which items actually mattered most this quarter. Not every item on the backlog could make it into this quarter's priorities, and saying that out loud mattered more than the list itself.$$
WHERE title = 'Reviewing the Backlog'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Sprint Planning & Retrospectives');

UPDATE chapters SET transcript = $$Instead of guessing hours, the team estimated each ticket using story points, comparing new work against something they'd already built before. It wasn't perfect, but it was consistent, and consistency was what actually made the next step - fitting work into a sprint - possible at all.$$
WHERE title = 'Estimating Effort'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Sprint Planning & Retrospectives');

UPDATE chapters SET transcript = $$After some back and forth, the team committed to ten tickets for the sprint, deliberately leaving a little slack instead of packing the schedule completely full. Mateo had learned that an optimistic sprint always felt worse at the end than a realistic one.$$
WHERE title = 'Committing to the Sprint'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Sprint Planning & Retrospectives');

UPDATE chapters SET transcript = $$At the end of the sprint, the team demoed what they'd actually finished to the stakeholders, showing working software instead of a slide describing what was planned. A few features from the original ten hadn't made it, and saying so plainly, rather than hiding it, was part of the review too.$$
WHERE title = 'Sprint Review'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Sprint Planning & Retrospectives');

UPDATE chapters SET transcript = $$In the retro that followed, nobody pointed fingers - the conversation stayed on what had gone well, what had slowed the team down, and one specific change to try next sprint. Mateo wrote that one change down before anyone left the room, so it wouldn't just get talked about and forgotten.$$
WHERE title = 'Retrospective'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Sprint Planning & Retrospectives');

UPDATE chapters SET transcript = $$Ravi opened a new repository and, before writing any real code, wrote the README first: what the project did, and exactly how to run it locally in under five minutes. He'd joined enough projects with no README at all to know how much time a good one actually saved everyone else.$$
WHERE title = 'Writing a README'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Technical Writing');

UPDATE chapters SET transcript = $$Before writing a single line of the new caching layer, Ravi wrote an RFC proposing the architecture and circulated it to the whole team for comments. Getting disagreement on a document was far cheaper than getting it after the code was already built.$$
WHERE title = 'Proposing an RFC'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Technical Writing');

UPDATE chapters SET transcript = $$Once the caching layer shipped, Ravi documented every endpoint it exposed - not just what each one returned, but what happened when something went wrong, so another team could integrate against it without ever needing to ask him directly.$$
WHERE title = 'Documenting an API'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Technical Writing');

UPDATE chapters SET transcript = $$In the same document, he explained the trade-off plainly: the cache made reads dramatically faster, but it meant a change could take a few seconds to become visible everywhere. Writing that down explicitly meant nobody discovered it by surprise in production later.$$
WHERE title = 'Explaining Trade-offs'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Technical Writing');

UPDATE chapters SET transcript = $$Six months later, when the caching approach changed, Ravi updated the same document instead of letting it quietly go stale. He'd seen what happened when outdated documentation misled someone confidently in the wrong direction - it was worse than having no documentation at all.$$
WHERE title = 'Keeping Docs Updated'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Technical Writing');

UPDATE chapters SET transcript = $$Isabel wrote a unit test for the new discount function before merging it, checking that a ten percent discount produced exactly the value she expected on a handful of realistic inputs. It was a small test, but it meant nobody could quietly break that function without something failing loudly first.$$
WHERE title = 'Writing a Unit Test'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Testing & QA');

UPDATE chapters SET transcript = $$Looking at the report, Isabel noticed test coverage on the billing module was far lower than the rest of the codebase - most of the edge cases around refunds and partial payments had no tests at all. She spent the afternoon closing exactly those gaps.$$
WHERE title = 'Increasing Coverage'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Testing & QA');

UPDATE chapters SET transcript = $$One test kept failing without anyone changing the related code, passing most of the time but failing randomly in ways nobody could reliably reproduce. Isabel called it what it was - a flaky test - and refused to just re-run it until it passed, since that would only hide the real timing bug underneath.$$
WHERE title = 'A Flaky Test'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Testing & QA');

UPDATE chapters SET transcript = $$The real cause turned out to be a genuine network call the test made to a third-party service. Isabel mocked that dependency instead, so the test's result depended only on her own code, not on whether some external API happened to respond in time.$$
WHERE title = 'Mocking a Dependency'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Testing & QA');

UPDATE chapters SET transcript = $$After fixing the flaky test and closing the coverage gaps, the pipeline ran green for the first time in weeks. Isabel didn't just feel relief - she felt like the codebase itself was finally telling the truth about its own health again.$$
WHERE title = 'A Green Pipeline'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Testing & QA');

-- New vocabulary tags, reusing existing technical_dictionary entries.
-- NOT EXISTS guard: batch 1 (migration 042) blindly inserted every word
-- listed here even when that (word, chapter_id) pair already existed from
-- the original seed data, creating duplicate rows cleaned up in 043 -
-- this guard prevents repeating that mistake in this batch.
INSERT INTO words (word, chapter_id)
SELECT v.word, c.id
FROM chapters c
JOIN (VALUES
  ('Welcoming the New Hire', 'new hire'),
  ('Explaining the Architecture', 'architecture'),
  ('Setting Up the Environment', 'environment'),
  ('Pairing on a Task', 'bug'),
  ('Pairing on a Task', 'paired'),
  ('Finding an Issue', 'issue'),
  ('Forking the Repository', 'forked'),
  ('Opening the Pull Request', 'pull request'),
  ('Responding to Maintainers', 'maintainer'),
  ('Responding to Maintainers', 'pull request'),
  ('Knowing Your Audience', 'stakeholders'),
  ('Simplifying the Message', 'jargon'),
  ('Using a Demo', 'demo'),
  ('Handling Questions', 'follow up'),
  ('Async Updates', 'async'),
  ('Written Communication', 'concise'),
  ('Timezone Coordination', 'time zone'),
  ('Giving Feedback Remotely', 'pull request'),
  ('Staying Visible', 'visible'),
  ('Authentication vs Authorization', 'authentication'),
  ('Authentication vs Authorization', 'authorization'),
  ('A Vulnerability Report', 'vulnerability'),
  ('Encrypting Data', 'encrypt'),
  ('Patching the Issue', 'vulnerability'),
  ('Patching the Issue', 'deployed'),
  ('Reviewing the Backlog', 'backlog'),
  ('Reviewing the Backlog', 'priorities'),
  ('Committing to the Sprint', 'sprint'),
  ('Sprint Review', 'sprint'),
  ('Sprint Review', 'stakeholders'),
  ('Retrospective', 'retro'),
  ('Proposing an RFC', 'architecture'),
  ('Proposing an RFC', 'RFC'),
  ('Documenting an API', 'endpoint'),
  ('Explaining Trade-offs', 'trade-off'),
  ('Increasing Coverage', 'coverage'),
  ('A Flaky Test', 'flaky'),
  ('Mocking a Dependency', 'mocked'),
  ('A Green Pipeline', 'pipeline')
) AS v(chapter_title, word) ON v.chapter_title = c.title
WHERE c.audiobook_id IN (SELECT id FROM audiobooks WHERE title IN ('Onboarding a New Developer', 'Open Source Contribution', 'Presenting to Stakeholders', 'Remote Work Communication', 'Security Basics', 'Sprint Planning & Retrospectives', 'Technical Writing', 'Testing & QA'))
  AND NOT EXISTS (
    SELECT 1 FROM words existing WHERE existing.word = v.word AND existing.chapter_id = c.id
  );
