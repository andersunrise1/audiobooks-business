-- Batch narrative rewrite (auto-generated from a verified data file -
-- every word below was confirmed to appear in its chapter's new text
-- before this file was written, using the same normalize/match logic
-- TranscriptDisplay.jsx uses, per the Dia 42 word-form-mismatch lesson).
-- Part of the broader "book with audio, narrative chapters" rewrite the
-- user requested, following the Building a Promotion Case pilot.

UPDATE chapters SET transcript = $$Priya used to walk into her 1:1s with nothing prepared, hoping something useful would come up. It rarely did. The conversations drifted into small talk, and she'd leave without saying the things she actually needed to say.

This time was different. The night before, she wrote down three topics: the unclear priorities on her team, a project she wanted more ownership of, and a question about her growth path. She kept the list short on purpose, three topics was enough for thirty minutes.

When she sat down with her manager, Tom, she opened with the list itself. "I want to make sure we get through these today," she said, sliding her notes across the table. Tom smiled. "This is exactly what I wish more people did."$$
WHERE title = 'Preparing for the 1:1'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = '1:1s & Performance Reviews');

UPDATE chapters SET transcript = $$The second item on Priya's list was harder to say out loud. She took a breath. "I think clearer priorities from the team would help me plan my week better. Right now, everything feels equally urgent, and I end up guessing."

Tom didn't get defensive, which surprised her. "That's fair feedback," he said. "I've been assuming the priorities were obvious to everyone, but they're only obvious to me."

He asked her to describe a specific week where this had been a problem, and she did, project X had come in without warning and pushed everything else aside with no explanation of why. By the end of the conversation, Tom had agreed to send a short priorities update every Monday.$$
WHERE title = 'Giving Feedback Upward'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = '1:1s & Performance Reviews');

UPDATE chapters SET transcript = $$"Where do you want to be in a year?" Tom asked. Priya had rehearsed this answer in her head a dozen times, but saying it out loud still felt exposed.

"I want to grow into a senior role," she said. "Right now I feel solid on execution, but I don't always know what skills separate a mid-level engineer from a senior one."

Tom listed a few: owning ambiguous problems without being told exactly what to build, mentoring newer engineers, and being able to explain a trade-off to people outside the team. Priya wrote all three down. None of them were about writing more code, and that surprised her most.$$
WHERE title = 'Discussing Growth'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = '1:1s & Performance Reviews');

UPDATE chapters SET transcript = $$By the end of the 1:1, Priya and Tom had turned the conversation into something concrete. "Let's not leave this as a nice chat," Tom said. "What are two goals we can check on next quarter?"

They agreed on two: Priya would take full ownership of the reporting dashboard project, from design to launch, and she would review at least one pull request from a newer teammate every week.

Writing the goals down made them feel real in a way the conversation alone hadn't. Priya left with a plan instead of just a good feeling, which was new for her.$$
WHERE title = 'Setting Goals'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = '1:1s & Performance Reviews');

UPDATE chapters SET transcript = $$Three months later, Priya's performance review referenced the exact goals from that 1:1. Tom had written that she'd taken real ownership of the dashboard project and shipped it two weeks ahead of schedule.

The one area to improve was specific too: she still hesitated to speak up in larger meetings, even when she clearly understood the problem better than most people in the room. It stung a little to read, but it also felt fair, and actionable in a way vague feedback never had been.

Priya thought back to her first, unprepared 1:1s. The difference wasn't that she'd become a different engineer. It was that she'd started asking for the conversation she actually needed.$$
WHERE title = 'Performance Review'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = '1:1s & Performance Reviews');

UPDATE chapters SET transcript = $$Sam stared at the whiteboard, marker in hand. "We need a way for users to update their profile," he said. "The question is how many fields we let them change in one request."

His teammate Lee shook her head. "Don't make them send the whole profile every time. Just accept the fields that changed." They sketched out a new endpoint: a PATCH request that would only touch what was included in the body, leaving everything else untouched.

It sounded simple on the whiteboard. Sam knew from experience that the simple-looking endpoints were often the ones that caused the most trouble in production, so he made a note to think carefully about the request shape before writing a single line of code.$$
WHERE title = 'Defining Endpoints'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'API Design');

UPDATE chapters SET transcript = $$By the next morning, Sam had a first version working. The request payload included just the user's name and email, nothing else. The response returned the full, updated profile as JSON, so the frontend never had to guess what had actually changed.

Lee reviewed it and asked one question: "What happens if someone sends a field we don't recognize?" Sam hadn't thought about it. They agreed the API would silently ignore unknown fields rather than fail the whole request, a small decision that would save someone a confusing bug months later.

It was a reminder that the payload's shape mattered as much as the endpoint's behavior.$$
WHERE title = 'Request and Response'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'API Design');

UPDATE chapters SET transcript = $$The next design question was bigger: what should the underlying schema look like? Sam wanted to keep everything in one flat table. Lee disagreed.

"If we mix public fields with internal ones, we'll eventually leak something we shouldn't," she said. She proposed separating the schema into a public-facing shape and an internal one, with a clear mapping between them.

It meant more code upfront, but it also meant the API could evolve without exposing implementation details to every client that depended on it. They agreed on the split, and Sam quietly admitted Lee had saved him from a decision he would have regretted in six months.$$
WHERE title = 'Choosing a Schema'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'API Design');

UPDATE chapters SET transcript = $$Six months later, the team needed to change the schema in a way that would break existing clients. Instead of updating the endpoint in place, they released a new API version and let both versions run side by side.

The old endpoint wasn't deleted, it was deprecated, with a clear six-month timeline posted in the changelog and an email sent to every integration partner. Sam remembered how painful it had been at his last job when an API changed overnight with no warning.

This time, nothing broke. A few partners even thanked the team for the advance notice.$$
WHERE title = 'Versioning and Deprecation'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'API Design');

UPDATE chapters SET transcript = $$The last piece of the design was making the endpoint idempotent. If a client's request timed out and retried automatically, Sam didn't want a second, duplicate update to happen by accident.

He added a request ID that the server would remember for a short window, so retrying the exact same request would simply return the same result instead of applying the change twice. Once the update succeeded, a webhook notified the billing service, which depended on profile data being current.

Lee tested it by deliberately sending the same request five times in a row. Only one update went through. "Now I can sleep at night," Sam said, only half joking.$$
WHERE title = 'Reliability'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'API Design');

UPDATE chapters SET transcript = $$Chen had been staring at the sequence diagram for an hour. The obvious approach was to have the order service call the shipping service directly, but every time she traced through it, she saw the same problem: if shipping was slow, orders would be slow too.

She proposed something different in the team channel: put a queue between the two services. Orders would be published to the queue immediately, and shipping would process them whenever it was ready, at its own pace.

It felt like a bigger change than it needed to be, at least at first. But Chen had been burned before by a "simple" direct call that turned into a cascading outage, and she wasn't willing to repeat that mistake here.$$
WHERE title = 'Proposing an Approach'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Architecture Decisions');

UPDATE chapters SET transcript = $$Not everyone agreed immediately. "A queue adds complexity," said one of the backend engineers. "Now we need monitoring, retries, dead-letter handling, all of it."

Chen didn't disagree. "That's the trade-off," she said. "We're giving up simplicity to get scalability. If shipping goes down for ten minutes, direct calls mean orders go down too. With a queue, orders keep working and shipping catches up later."

The team spent an hour listing what could go wrong with each approach. In the end, the trade-off was clear enough to write down: short-term simplicity versus long-term resilience under load.$$
WHERE title = 'Weighing the Trade-off'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Architecture Decisions');

UPDATE chapters SET transcript = $$Chen scheduled a thirty-minute meeting instead of trying to settle it over chat. Decisions this size, she'd learned, needed a real conversation, not a thread that dragged on for two days.

They went around the room. The frontend lead didn't have a strong opinion either way. The on-call engineer cared most about what would page him at 3 AM, and the queue clearly won there. By the end of the meeting, they had reached consensus, not because everyone loved the idea equally, but because everyone understood why it mattered.

Chen left the meeting relieved. A decision made with consensus was much easier to defend later than one made alone.$$
WHERE title = 'Getting Consensus'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Architecture Decisions');

UPDATE chapters SET transcript = $$Before writing a single line of code, Chen wrote the decision down: what problem they were solving, the two options considered, and why the queue had won. She included the trade-off explicitly, so nobody reading it in a year would assume the team simply loved complexity for its own sake.

She'd learned this habit the hard way. A previous team's architecture had baffled every new engineer who joined, because nobody remembered why anything worked the way it did. This time, the reasoning would still exist even after everyone in the room had moved to different teams.

The document took twenty minutes to write. Chen suspected it would save far more than twenty minutes, many times over.$$
WHERE title = 'Documenting the Decision'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Architecture Decisions');

UPDATE chapters SET transcript = $$Six months later, order volume had tripled. Chen pulled up the old decision document during a planning meeting, partly out of curiosity.

The reasoning still held up. The queue had absorbed two real shipping outages without orders ever going down, exactly as predicted. The only surprise was how little the team had needed to touch the queue itself since launch, it had simply worked.

"Good thing we didn't take the simple path," someone said. Chen smiled, remembering how close the original conversation had come to going the other way. Revisiting old decisions, she thought, was almost as valuable as making them carefully in the first place.$$
WHERE title = 'Revisiting Later'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Architecture Decisions');

UPDATE chapters SET transcript = $$Ana pushed her changes right before lunch and expected to come back to a green checkmark. Instead, she found a red X waiting for her, and a Slack notification nobody wanted to see: "build failed."

Her first instinct was mild panic, had she broken something for the whole team? She took a breath and reminded herself of the process: don't guess, go read what actually failed.

She opened the CI dashboard. The build had failed immediately after her push, which at least meant the problem was almost certainly in her own change, not some flaky infrastructure issue unrelated to her.$$
WHERE title = 'A Broken Build'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'CI/CD Troubleshooting');

UPDATE chapters SET transcript = $$Ana opened the full build log instead of just the summary. Scrolling past the setup steps, she found the exact line where things went wrong: a dependency install step had failed because of a version mismatch in a package she'd added that morning.

It would have been easy to miss if she'd only glanced at the red X and assumed it was her test code. The actual failure was two steps earlier, in a part of the pipeline she hadn't even thought about.

Reading the log carefully, instead of guessing, took less than two minutes and pointed her directly at the real problem.$$
WHERE title = 'Reading the Build Log'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'CI/CD Troubleshooting');

UPDATE chapters SET transcript = $$Before pushing any fix, Ana ran the exact same install command locally, in a clean environment, to reproduce the failure herself. Sure enough, the same version mismatch appeared on her machine too.

She was glad she'd checked first. Her initial guess, that it was some CI-specific caching issue, would have sent her down the wrong path entirely. Reproducing the failure locally turned a vague, scary "the build is broken" into a specific, boring dependency conflict she already knew how to fix.

It took ten minutes to confirm what the log had already told her, but those ten minutes gave her real confidence in the fix she was about to make.$$
WHERE title = 'Reproducing Locally'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'CI/CD Troubleshooting');

UPDATE chapters SET transcript = $$Ana's manager asked if she wanted to revert her change and try again later. She thought about it for a second, then said no.

The fix itself was small: pin the dependency to a compatible version. Reverting would mean redoing the same work tomorrow, plus explaining to two teammates why their branches, built on top of hers, had also broken in the meantime.

Fixing forward felt slightly riskier in the moment, but it was also faster and clearer. She pushed the one-line fix, watched the pipeline restart, and went back to her lunch, which by now was thoroughly cold.$$
WHERE title = 'Fixing Forward'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'CI/CD Troubleshooting');

UPDATE chapters SET transcript = $$Twenty minutes later, the pipeline turned green again. Ana felt the small, specific relief that only came from watching a red build become a passing one.

She added one more thing before closing the ticket: a comment in the dependency file explaining why that exact version was pinned, so the next person wouldn't casually "upgrade" it and reintroduce the same failure. It was a small note, but she'd learned that broken builds usually had a story behind them, and that story was worth writing down.

The pipeline stayed stable for the rest of the week, which was exactly the kind of boring outcome Ana was hoping for.$$
WHERE title = 'A Stable Pipeline'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'CI/CD Troubleshooting');

UPDATE chapters SET transcript = $$Marcus had lost count of how many times a teammate said "it works on my machine" right before something broke in production. The team's fix was to package the application into a container, a single image that ran exactly the same way everywhere.

The container image included every dependency the application needed: the right language runtime, the right libraries, even the right configuration files. Nothing was left to chance on whatever machine happened to run it.

The first time Marcus deployed the container to a brand new server and it just worked, no missing dependency, no version mismatch, he almost didn't believe it. It felt like cheating after years of manual setup scripts.$$
WHERE title = 'Containers'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Cloud & DevOps');

UPDATE chapters SET transcript = $$One container running on one server was easy. Managing hundreds of containers across dozens of servers was a different problem entirely, which is why the team ran everything on a cluster managed by Kubernetes.

Each service ran as its own instance, sometimes several instances of the same service at once, spread across the cluster for redundancy. If one instance crashed, Kubernetes noticed within seconds and started a replacement automatically, often before anyone on the team even saw an alert.

Marcus remembered the old way: a 3 AM page, a manual SSH into a server, and a tired engineer restarting a process by hand. Watching Kubernetes do that same job silently, every day, felt like a small miracle.$$
WHERE title = 'Orchestration'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Cloud & DevOps');

UPDATE chapters SET transcript = $$Getting code from a laptop into production used to take a full afternoon of manual steps. Now, every push to main triggered the deployment pipeline automatically.

The pipeline built a fresh container image, ran the full test suite against it, and, if everything passed, deployed it to staging without anyone touching a keyboard. Only after a final manual approval did the same image roll out to production, using the exact image that had already been tested, not a new build that might behave differently.

Marcus trusted the pipeline more than he trusted a rushed manual deploy at the end of a long day, and for good reason: the pipeline never skipped a step because it was tired.$$
WHERE title = 'Deployment Pipeline'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Cloud & DevOps');

UPDATE chapters SET transcript = $$Every year, the company's busiest shopping day brought ten times the normal traffic. In the past, this meant a stressful week of manually provisioning extra servers in advance and hoping the estimate was right.

Now, the cluster scaled itself. When traffic increased, Kubernetes automatically added more instances of the services under load, and removed them again once traffic dropped back to normal. Latency stayed low even during the peak hour, when order volume was highest.

Marcus watched the dashboard that day, instance count climbing steadily with traffic, and felt something close to boredom. For infrastructure, boring was exactly the goal.$$
WHERE title = 'Scaling'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Cloud & DevOps');

UPDATE chapters SET transcript = $$None of this mattered if nobody noticed when something went wrong, so the team monitored throughput and latency for every service, all the time, not just during incidents.

When a number drifted outside its normal range, an alert fired automatically and notified whoever was on call, often minutes before a customer would have noticed anything at all. Marcus had come to think of these dashboards as the team's early warning system, quiet most of the time, but essential the moment something started to drift.

The goal was never to watch the dashboards constantly. It was to trust that the dashboards were watching, so the team didn't have to.$$
WHERE title = 'Monitoring'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Cloud & DevOps');

UPDATE chapters SET transcript = $$Fatima opened a pull request for the feature she'd been working on all week and immediately felt the familiar nerves. Asking for feedback always meant handing someone else a reason to find something wrong.

She wrote a short description at the top: what the change did, why she'd made a few unusual decisions, and one specific question she wasn't sure about. Then she tagged a teammate and asked directly for feedback, rather than just silently waiting for someone to notice the request.

It was a small habit, but it made reviews faster. Reviewers didn't have to guess what she wanted checked, she'd already told them.$$
WHERE title = 'Requesting a Review'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Code Review Etiquette');

UPDATE chapters SET transcript = $$When Fatima reviewed other people's code, she tried to avoid the laziest kind of comment: "this is wrong." It was true, sometimes, but it never explained anything.

Instead, she explained exactly why a change could cause a bug. "This function doesn't handle an empty list, if the array here is empty on line 42, we'll throw an error instead of returning zero," she wrote, pointing at the specific case that worried her.

It took longer to write than "this is wrong," but the author usually understood immediately and fixed it in one try, instead of guessing what she meant and getting it wrong twice.$$
WHERE title = 'Being Specific'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Code Review Etiquette');

UPDATE chapters SET transcript = $$Early in her career, Fatima had taken review comments personally, every "this could be cleaner" felt like a judgment on her as an engineer, not just on the code in front of her.

Over time, she learned to separate the two. When she reviewed now, she reminded herself: I'm reviewing the code, not the person. She tried to stay constructive even when pointing out a real problem, phrasing things as questions when she wasn't sure, and as clear suggestions when she was.

It didn't make every review comfortable. But it made the team's reviews something people actually trusted, instead of something they dreaded opening.$$
WHERE title = 'Staying Objective'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Code Review Etiquette');

UPDATE chapters SET transcript = $$A junior engineer once left three comments on Fatima's own pull request, one of them fairly blunt. Her first reaction was defensive, a familiar tightness in her chest.

She paused before responding, and reminded herself of her own rule: it's about the code, not me. Reading the comment again, she realized it was actually correct, she had missed an edge case.

She thanked the engineer, fixed the issue, and moved on. It cost her nothing except a small moment of discomfort, and the code was better for it. She thought that was probably a fair trade, most days.$$
WHERE title = 'Receiving Feedback'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Code Review Etiquette');

UPDATE chapters SET transcript = $$After two rounds of comments, the pull request in front of Fatima finally looked right. The edge cases were handled, the naming was clear, and the tests covered the tricky parts.

She didn't approve just to be polite, and she didn't withhold approval over small style preferences that didn't really matter. Once everything looked genuinely good, she approved the pull request and said so clearly, so the author knew it was safe to merge.

A good review, she'd come to believe, wasn't about finding every possible flaw. It was about making sure the code was solid, and then getting out of the way.$$
WHERE title = 'Approving Changes'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Code Review Etiquette');

UPDATE chapters SET transcript = $$The message came in flagged as urgent: "the customer said the app was crashing every time they logged in." Diego read it twice before responding, resisting the urge to jump straight to a fix.

He replied with a few clarifying questions instead: which device, which app version, and whether it happened every single time or only sometimes. The customer's first message hadn't mentioned any of that, and guessing wrong would waste both their time.

Diego had learned that most support escalations went wrong at this exact step, someone assumed they understood the complaint before they actually did.$$
WHERE title = 'Understanding the Complaint'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Customer Support Escalation');

UPDATE chapters SET transcript = $$Once Diego had the details, he asked for a bit more before promising anything: the exact error message, a screenshot, and the approximate time it happened, so he could check the logs.

He wanted to investigate the issue properly instead of guessing at a cause and hoping it stuck. The extra questions felt slow in the moment, but they usually saved an entire back-and-forth cycle later, when a wrong guess would have sent the customer down the wrong path entirely.

Within ten minutes, the logs confirmed it: a specific account setting was triggering a crash on login for a small number of users.$$
WHERE title = 'Investigating the Issue'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Customer Support Escalation');

UPDATE chapters SET transcript = $$The real fix would need a code change, a review, and a deploy, realistically, at least a day away. Diego didn't want the customer stuck for that long.

He offered a temporary workaround instead: disabling the specific setting that was triggering the crash, which let the customer log in again immediately, even though it wasn't the permanent solution.

"This isn't the final fix," he told them clearly, "but it should get you back into your account today while we finish the real one." The customer replied within minutes, relieved just to be able to use the app again.$$
WHERE title = 'Offering a Workaround'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Customer Support Escalation');

UPDATE chapters SET transcript = $$The customer asked, reasonably, when the real fix would ship. Diego resisted the temptation to say "soon" just to sound reassuring.

Instead, he gave a realistic ETA: two business days, based on what the engineering team had actually told him, not what he hoped might happen. It felt less impressive than promising something immediate, but it was honest, and honesty tended to age much better than optimism did.

Two days later, the fix shipped exactly on schedule. The customer's reply was simple: "Thanks for being straight with me about the timeline."$$
WHERE title = 'Setting Expectations'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Customer Support Escalation');

UPDATE chapters SET transcript = $$After the fix shipped, Diego didn't close the ticket and move on immediately. He did a quick follow up first, checking in directly with the customer to confirm everything was actually working now.

It only took a minute, but it caught something a silent ticket closure never would have: the customer mentioned one small remaining glitch on an older device, something the team could now investigate before it became a bigger complaint.

Diego had learned that the last step of any escalation mattered as much as the first. Following up turned a fixed bug into a customer who trusted the team a little more than before.$$
WHERE title = 'Following Up'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Customer Support Escalation');

UPDATE chapters SET transcript = $$Maria unmuted her microphone right on time. Nine sharp, the same as every morning, five minutes, no exceptions, that was the rule the team had agreed on months ago and mostly kept.

"Yesterday I deployed a new version," she said, keeping it brief. No lengthy explanation, just the fact, in case anyone needed to know before their own update. The rest of the team was still joining the call, a few cameras still dark, coffee cups still in hand.

Standups worked best, she'd found, when everyone respected the same unwritten rule: say what matters, skip what doesn't, and save the real conversation for after the call ended.$$
WHERE title = 'Opening'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Daily Standup');

UPDATE chapters SET transcript = $$When it was his turn, Jamal kept his update just as short. "Today I'm working on the payment integration," he said. "I'm adding tests for the new endpoint before I open a pull request."

Nobody asked follow-up questions, not because they didn't care, but because none were needed yet. If something came up during the day, that conversation could happen afterward, in a smaller thread, with only the people who actually needed to be involved.

The standup wasn't the place to solve problems. It was the place to make sure everyone knew what everyone else was doing, so problems could be solved quickly later, by the right people.$$
WHERE title = 'Updates'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Daily Standup');

UPDATE chapters SET transcript = $$"My only blocker is waiting for the API keys from the client," Priya said. "I can't test the webhook without them." She'd been waiting two days already, and it was starting to slow down the whole integration.

Maria made a note to follow up with the client directly after the call, since Priya had already asked twice with no response. That was exactly what blockers were for, saying them out loud, in front of the team, so someone with more leverage could help unstick them.

A blocker mentioned in silence helped nobody. A blocker mentioned in standup, even briefly, had a real chance of getting solved that same day.$$
WHERE title = 'Blockers'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Daily Standup');

UPDATE chapters SET transcript = $$Before wrapping up, Maria gave a quick look ahead. "For this sprint, our priorities are finishing the checkout flow and fixing the reported bugs," she said. "Let's also refactor the old authentication module if we have time."

She said "if we have time" deliberately. The team had learned, painfully, that packing a sprint too tightly meant something always slipped, and it was better to be honest about the stretch goal than to pretend certainty they didn't have.

Everyone nodded, or in a few cases, gave a quiet thumbs up on camera. The plan for the day, and the week, was clear enough to start working.$$
WHERE title = 'Planning'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Daily Standup');

UPDATE chapters SET transcript = $$"That's all from me," Maria said, glancing at the clock. Four minutes and thirty seconds, still under the five-minute limit they aimed for. "Does anyone have questions, or need help with their blockers?"

A short silence followed, the good kind, not an awkward one. Priya's blocker was already being handled outside the call. Everything else could wait for the smaller conversations that would happen naturally throughout the day.

Maria ended the call and opened her task list for the morning. The standup had done exactly what it was supposed to do: nothing dramatic, just five minutes that kept six people quietly in sync.$$
WHERE title = 'Closing'
  AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Daily Standup');

-- New vocabulary tags, reusing existing technical_dictionary entries.
INSERT INTO words (word, chapter_id)
SELECT v.word, c.id
FROM chapters c
JOIN (VALUES
  ('Preparing for the 1:1', 'priorities'),
  ('Preparing for the 1:1', 'ownership'),
  ('Giving Feedback Upward', 'feedback'),
  ('Giving Feedback Upward', 'priorities'),
  ('Discussing Growth', 'trade-off'),
  ('Setting Goals', 'goals'),
  ('Setting Goals', 'ownership'),
  ('Setting Goals', 'pull request'),
  ('Performance Review', 'performance review'),
  ('Performance Review', 'ownership'),
  ('Defining Endpoints', 'endpoint'),
  ('Request and Response', 'payload'),
  ('Choosing a Schema', 'schema'),
  ('Versioning and Deprecation', 'schema'),
  ('Versioning and Deprecation', 'deprecated'),
  ('Reliability', 'idempotent'),
  ('Reliability', 'webhook'),
  ('Proposing an Approach', 'queue'),
  ('Weighing the Trade-off', 'trade-off'),
  ('Weighing the Trade-off', 'scalability'),
  ('Getting Consensus', 'consensus'),
  ('A Broken Build', 'build'),
  ('Reading the Build Log', 'build'),
  ('A Stable Pipeline', 'pipeline'),
  ('Containers', 'container'),
  ('Orchestration', 'cluster'),
  ('Orchestration', 'instance'),
  ('Deployment Pipeline', 'pipeline'),
  ('Deployment Pipeline', 'staging'),
  ('Scaling', 'latency'),
  ('Monitoring', 'throughput'),
  ('Monitoring', 'latency'),
  ('Requesting a Review', 'pull request'),
  ('Requesting a Review', 'feedback'),
  ('Being Specific', 'bug'),
  ('Staying Objective', 'constructive'),
  ('Approving Changes', 'pull request'),
  ('Investigating the Issue', 'issue'),
  ('Offering a Workaround', 'workaround'),
  ('Setting Expectations', 'ETA'),
  ('Following Up', 'follow up'),
  ('Opening', 'deployed'),
  ('Updates', 'endpoint'),
  ('Blockers', 'blocker'),
  ('Blockers', 'webhook'),
  ('Planning', 'sprint'),
  ('Planning', 'priorities'),
  ('Planning', 'refactor'),
  ('Closing', 'blocker')
) AS v(chapter_title, word) ON v.chapter_title = c.title
WHERE c.audiobook_id IN (SELECT id FROM audiobooks WHERE title IN ('1:1s & Performance Reviews', 'API Design', 'Architecture Decisions', 'CI/CD Troubleshooting', 'Cloud & DevOps', 'Code Review Etiquette', 'Customer Support Escalation', 'Daily Standup'));
