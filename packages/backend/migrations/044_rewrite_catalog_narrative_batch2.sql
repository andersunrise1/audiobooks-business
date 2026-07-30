-- Batch narrative rewrite (auto-generated from a verified data file -
-- every word below was confirmed to appear in its chapter's new text
-- before this file was written, using the same normalize/match logic
-- TranscriptDisplay.jsx uses, per the Dia 42 word-form-mismatch lesson).
-- Part of the broader "book with audio, narrative chapters" rewrite the
-- user requested, following the Building a Promotion Case pilot.

UPDATE chapters SET transcript = $$Leila's team needed a report of every order placed in the last month, broken down by region. She opened the ORM and wrote a straightforward query, joining the orders table with customers and regions. It ran fine on her laptop, against a database with a few hundred rows. She pushed it to staging without thinking twice - the query was correct, and correct felt like enough. It would only take a few more days for that assumption to be tested against something much bigger than her laptop.$$
WHERE title = 'Writing the Query'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Database & Performance');

UPDATE chapters SET transcript = $$Two days after the report shipped, support tickets started arriving: the dashboard page was taking almost ten seconds to load, and some customers were giving up before it finished. Leila didn't guess. She opened the profiler and watched exactly where the time went, request by request. The bottleneck wasn't the network, and it wasn't the frontend - it was one single database call, called over and over, that alone accounted for nine of those ten seconds.$$
WHERE title = 'Finding the Bottleneck'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Database & Performance');

UPDATE chapters SET transcript = $$The slow call was a lookup by customer email, and the customers table had grown to millions of rows with nothing to speed that search up. Leila checked the query plan and confirmed it: every single lookup was scanning the whole table. She added an index on the email column, shipped the change during a quiet hour, and reran the same report. The nine seconds became under one.$$
WHERE title = 'Adding an Index'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Database & Performance');

UPDATE chapters SET transcript = $$Just as the dashboard felt fast again, a new complaint came in: the orders list page was slow too, and it only got worse as customers placed more orders. Leila added logging around each database call and counted them - one query to fetch the orders, then one more query per order to fetch its items. Fifty orders on a page meant fifty-one queries where one would do. This was the classic N+1 problem, and the fix was to fetch everything the page needed in a single, well-joined query instead of looping.$$
WHERE title = 'The N+1 Problem'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Database & Performance');

UPDATE chapters SET transcript = $$With the N+1 problem fixed, Leila's last task was to add a new column the product team needed: a customer's preferred currency. The table had ten million rows, and locking it for a schema change would mean real downtime during business hours. She wrote the migration to add the column with a safe default, applied it in the background without locking the table, and confirmed the app kept working the whole time. No one but her ever noticed it happened.$$
WHERE title = 'Running a Migration'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Database & Performance');

UPDATE chapters SET transcript = $$A customer reported that checkout sometimes failed with no clear reason. Omar tried the exact same steps on his own machine - same browser, same cart, same payment method - and everything worked perfectly. That was the frustrating part: a bug that only showed up in production, never locally, was nearly impossible to fix by guessing. He decided to stop trying to recreate it blind and go look at what production itself was telling him.$$
WHERE title = 'Reproducing the Bug'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Debugging in Production');

UPDATE chapters SET transcript = $$Omar opened the production logs and searched for the customer's session around the time of the failed checkout. Buried between hundreds of routine lines, he found something unusual: an error he had never seen before, thrown right as the payment step began. It didn't explain everything yet, but it was the first real clue, and it pointed him toward one specific function instead of the whole checkout flow.$$
WHERE title = 'Reading the Logs'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Debugging in Production');

UPDATE chapters SET transcript = $$He clicked into the full error and read the stack trace line by line, from the outermost request down to the exact function where it broke. It led straight to the payment function, where the code expected a discount value and instead received nothing at all. Somewhere upstream, for a small number of customers, that value was never being set - and the stack trace was the map that showed exactly where.$$
WHERE title = 'Finding the Stack Trace'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Debugging in Production');

UPDATE chapters SET transcript = $$Reading the code wasn't enough to see why the value went missing, so Omar added a breakpoint right before the payment function ran. He triggered the same checkout again, this time in a staging environment built to match production closely, and watched the real values as execution paused there. The discount was arriving as an empty string instead of null, and one line of code was checking only for null.$$
WHERE title = 'Adding a Breakpoint'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Debugging in Production');

UPDATE chapters SET transcript = $$Once Omar understood exactly what was happening and why, the fix itself was small: check for both an empty string and null before applying a discount. He wrote a test that reproduced the original failure, watched it pass, and shipped the change the same afternoon. The customer who first reported it never even knew how many production logs it took to find one missing check.$$
WHERE title = 'Shipping a Fix'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Debugging in Production');

UPDATE chapters SET transcript = $$Before Nora agreed to take on the project, she sat down with the client and wrote out exactly what was included: three dashboard pages, one export feature, and nothing else. Both sides signed off on that scope in writing. It felt like an unnecessary step to some of her past clients, but Nora had learned the hard way that a vague scope was where every difficult freelance project began.$$
WHERE title = 'Defining the Scope'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Freelancing & Contracts');

UPDATE chapters SET transcript = $$With the scope agreed, Nora proposed a deadline six weeks out, quietly building in extra time for the parts of the project she was least familiar with. The client wanted it sooner, but she held her ground, explaining that a realistic deadline protected the quality of the work more than an optimistic one ever could. They settled on five weeks, still comfortable enough to leave room for the unexpected.$$
WHERE title = 'Setting a Deadline'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Freelancing & Contracts');

UPDATE chapters SET transcript = $$At the end of the first month, Nora sent the client an invoice for the work completed so far, itemized by feature so there were no surprises. The client paid within a week, and Nora added a note to her own records: this was a client worth working with again.$$
WHERE title = 'Sending an Invoice'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Freelancing & Contracts');

UPDATE chapters SET transcript = $$Midway through the project, the client asked for a small addition: a fourth dashboard page that wasn't in the original agreement. Nora recognized it immediately as scope creep, but instead of simply refusing, she explained the situation clearly to the client and offered two paths - push the deadline back, or handle the new page as a separate, paid addition. The client chose the second option without any hard feelings.$$
WHERE title = 'Handling Scope Creep'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Freelancing & Contracts');

UPDATE chapters SET transcript = $$The project shipped on time, the client was happy, and three months later they reached out again. This time, renewing the contract took ten minutes instead of two weeks of back-and-forth, because both sides already knew exactly how the other worked.$$
WHERE title = 'Renewing the Contract'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Freelancing & Contracts');

UPDATE chapters SET transcript = $$Before writing a single line for the new login feature, Ben pulled the latest changes from main and created a new branch just for that work. It was a small habit, but it meant his changes would never be tangled up with anyone else's, and reviewing them later would be simple and self-contained.$$
WHERE title = 'Starting a New Branch'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Git & Code Review');

UPDATE chapters SET transcript = $$Ben worked in small steps, and after fixing the first bug in his login flow, he made a commit that described exactly what changed and why - not just "fix bug," but the actual reasoning behind the fix. Months later, when someone asked why that line existed, the commit message answered the question before anyone had to ask him directly.$$
WHERE title = 'Committing Changes'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Git & Code Review');

UPDATE chapters SET transcript = $$Once the login feature felt complete, Ben opened a pull request, describing the change in plain language and linking the ticket it closed. He didn't just drop the code and wait - he wrote enough context that a reviewer could understand the "why" in thirty seconds, before ever reading a single line of the diff.$$
WHERE title = 'Opening a Pull Request'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Git & Code Review');

UPDATE chapters SET transcript = $$A teammate reviewed the pull request that afternoon and left a few honest comments: one function did too many things at once, and one important case had no test at all. Ben didn't take it personally - he chose to refactor the function into two smaller ones and added the missing test, exactly as she'd suggested.$$
WHERE title = 'Review and Feedback'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Git & Code Review');

UPDATE chapters SET transcript = $$After Ben addressed every comment, his teammate reviewed it once more and approved it. He merged the branch into main and deleted it right away, satisfied that the whole history - branch, commits, review, and all - told a clear story of how the feature came to be.$$
WHERE title = 'Merging'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Git & Code Review');

UPDATE chapters SET transcript = $$Sara's phone buzzed at 3 AM with a page: the API was returning errors for a growing number of requests. She was on call that week, and the moment she saw the alert, she was awake and reaching for her laptop before she'd even fully processed what it said.$$
WHERE title = 'Detecting the Issue'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Incident Response');

UPDATE chapters SET transcript = $$The first step wasn't to fix anything - it was to understand what was actually happening. Sara pulled up the dashboards with two other engineers already online, and within minutes they traced the pattern back to a deployment that had gone out an hour earlier. It wasn't confirmed yet, but it was the most likely root cause, and that gave them somewhere real to start.$$
WHERE title = 'Triage'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Incident Response');

UPDATE chapters SET transcript = $$Rather than debug the deployment live while errors kept climbing, the team decided to mitigate the impact first and understand the deeper cause later. They rolled back the deployment, and within two minutes, the error rate dropped back to normal. The rollback wasn't a fix - it was a way to stop the bleeding while they figured out what had actually broken.$$
WHERE title = 'Mitigating'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Incident Response');

UPDATE chapters SET transcript = $$While the rollback was underway, Sara posted a short update in the incident channel every fifteen minutes, even when there was nothing new to say - silence during an incident makes people assume the worst. When it became clear the root cause touched the database layer, she escalated to the database team directly instead of waiting for them to notice on their own.$$
WHERE title = 'Communicating'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Incident Response');

UPDATE chapters SET transcript = $$Two days later, once everything had calmed down, the team wrote a postmortem: what happened, why it happened, and three concrete changes that would make it harder for the same failure to happen again. No one was blamed by name - the postmortem was about the system, not the person who happened to be on call that night.$$
WHERE title = 'Postmortem'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Incident Response');

UPDATE chapters SET transcript = $$"Tell me about yourself" was the very first question Dana asked, and Kevin had learned not to ramble through his entire resume in response. He kept it short: his current role, the two or three skills most relevant to this job, and what he was actually looking for next. Thirty seconds in, Dana was already nodding along instead of glancing at the clock.$$
WHERE title = 'Introducing Yourself'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Interview Preparation');

UPDATE chapters SET transcript = $$For the system design portion, Dana asked Kevin to design a URL shortener that could handle millions of requests a day. He resisted the urge to jump straight to a diagram. Instead, he asked clarifying questions first - how many reads versus writes, how important was it that a shortened link never break - before sketching even the first piece of the architecture.$$
WHERE title = 'System Design Basics'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Interview Preparation');

UPDATE chapters SET transcript = $$When Dana asked how he'd make the system faster, Kevin proposed adding a cache in front of the database. He was careful to name the real trade-off out loud instead of pretending the improvement was free: a cache would cut latency dramatically, but it added complexity, and it could serve a stale link for a few seconds after an update. Naming that trade-off, rather than hiding it, was exactly what Dana was listening for.$$
WHERE title = 'Discussing Trade-offs'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Interview Preparation');

UPDATE chapters SET transcript = $$The behavioral question came next: describe a time you disagreed with a technical decision. Kevin picked a real, specific situation - the context, the action he took, and the honest result, including the part where he was partly wrong. He didn't reach for a polished, made-up story; the real one, told briefly, was more convincing than anything invented.$$
WHERE title = 'Behavioral Questions'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Interview Preparation');

UPDATE chapters SET transcript = $$At the end, when Dana asked if he had any questions, Kevin didn't waste it on salary or vacation days - he asked about the team's current codebase and what the biggest technical challenge had been in the last six months. It was a small moment, but it was the clearest signal all interview that his interest was genuine.$$
WHERE title = 'Asking Questions'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Interview Preparation');

UPDATE chapters SET transcript = $$The recruiter called with good news: an offer, but the salary was a little lower than Yuki had expected going in. She thanked the recruiter, asked for a few days to review everything properly, and hung up before saying anything she might regret rushing into.$$
WHERE title = 'Receiving the Offer'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Negotiating a Job Offer');

UPDATE chapters SET transcript = $$Before responding, Yuki spent an evening researching what a fair salary actually looked like for similar roles at similar companies, using real data instead of guessing at what felt fair. The number she found gave her something solid to negotiate from - not a feeling, but evidence she could point to directly.$$
WHERE title = 'Doing Research'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Negotiating a Job Offer');

UPDATE chapters SET transcript = $$Armed with real numbers, Yuki sent a clear, polite counteroffer: a specific salary figure, backed by her research, along with a request for two extra vacation days. She framed it as a starting point for a conversation, not an ultimatum, and made it easy for the company to say yes.$$
WHERE title = 'Making a Counteroffer'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Negotiating a Job Offer');

UPDATE chapters SET transcript = $$Alongside the counteroffer, Yuki asked whether the role could be fully remote instead of hybrid. It mattered as much to her as the number on the offer letter, and she made sure to say so directly instead of treating it as a minor afterthought.$$
WHERE title = 'Discussing Remote Work'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Negotiating a Job Offer');

UPDATE chapters SET transcript = $$After one short round of negotiation, the company came back with the salary she'd asked for and confirmed the role would be remote. Yuki accepted, glad she'd taken the extra few days instead of saying yes to the first number she heard.$$
WHERE title = 'Accepting the Offer'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Negotiating a Job Offer');

UPDATE chapters SET transcript = $$Carlos walked into the conference knowing almost no one, and he introduced himself to the first small group he found near the coffee station, giving a short, natural summary of what he worked on instead of a rehearsed pitch.$$
WHERE title = 'Introducing Yourself'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Networking at Tech Events');

UPDATE chapters SET transcript = $$Before diving into anything technical, the group made small talk about the conference itself - which talks had been good so far, how bad the coffee line was - and only after a few minutes did the conversation naturally drift toward what everyone actually built for a living.$$
WHERE title = 'Making Small Talk'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Networking at Tech Events');

UPDATE chapters SET transcript = $$When someone finally asked what he was working on, Carlos gave the elevator pitch he'd practiced beforehand: one sentence on the problem, one on how his project solved it, short enough to finish before the escalator ride ended, literally or otherwise.$$
WHERE title = 'Giving Your Elevator Pitch'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Networking at Tech Events');

UPDATE chapters SET transcript = $$Before the group broke apart to catch the next talk, they exchanged contacts, trading a quick way to reach each other later instead of relying on a chance encounter at next year's conference to reconnect.$$
WHERE title = 'Exchanging Contacts'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Networking at Tech Events');

UPDATE chapters SET transcript = $$The next morning, while the conversation was still fresh, Carlos sent a short follow up message to each new contact, mentioning something specific they'd talked about so it didn't read like a copy-pasted template.$$
WHERE title = 'Following Up After'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Networking at Tech Events');

-- New vocabulary tags, reusing existing technical_dictionary entries.
-- NOT EXISTS guard: batch 1 (migration 042) blindly inserted every word
-- listed here even when that (word, chapter_id) pair already existed from
-- the original seed data, creating duplicate rows cleaned up in 043 -
-- this guard prevents repeating that mistake in this batch.
INSERT INTO words (word, chapter_id)
SELECT v.word, c.id
FROM chapters c
JOIN (VALUES
  ('Writing the Query', 'query'),
  ('Finding the Bottleneck', 'bottleneck'),
  ('Adding an Index', 'index'),
  ('The N+1 Problem', 'query'),
  ('Running a Migration', 'migration'),
  ('Reproducing the Bug', 'bug'),
  ('Reading the Logs', 'logs'),
  ('Finding the Stack Trace', 'stack trace'),
  ('Adding a Breakpoint', 'breakpoint'),
  ('Defining the Scope', 'scope'),
  ('Setting a Deadline', 'deadline'),
  ('Sending an Invoice', 'client'),
  ('Sending an Invoice', 'invoice'),
  ('Handling Scope Creep', 'scope'),
  ('Handling Scope Creep', 'client'),
  ('Starting a New Branch', 'branch'),
  ('Committing Changes', 'commit'),
  ('Opening a Pull Request', 'pull request'),
  ('Review and Feedback', 'refactor'),
  ('Review and Feedback', 'reviewed'),
  ('Merging', 'merged'),
  ('Triage', 'root cause'),
  ('Mitigating', 'mitigate'),
  ('Mitigating', 'rollback'),
  ('Communicating', 'escalated'),
  ('Postmortem', 'postmortem'),
  ('System Design Basics', 'architecture'),
  ('Discussing Trade-offs', 'trade-off'),
  ('Discussing Trade-offs', 'latency'),
  ('Discussing Trade-offs', 'complexity'),
  ('Receiving the Offer', 'salary'),
  ('Doing Research', 'salary'),
  ('Making a Counteroffer', 'counteroffer'),
  ('Discussing Remote Work', 'remote'),
  ('Accepting the Offer', 'negotiation'),
  ('Giving Your Elevator Pitch', 'elevator pitch'),
  ('Exchanging Contacts', 'contacts'),
  ('Following Up After', 'follow up')
) AS v(chapter_title, word) ON v.chapter_title = c.title
WHERE c.audiobook_id IN (SELECT id FROM audiobooks WHERE title IN ('Database & Performance', 'Debugging in Production', 'Freelancing & Contracts', 'Git & Code Review', 'Incident Response', 'Interview Preparation', 'Negotiating a Job Offer', 'Networking at Tech Events'))
  AND NOT EXISTS (
    SELECT 1 FROM words existing WHERE existing.word = v.word AND existing.chapter_id = c.id
  );
