-- Migrations 052/053 matched audiobooks by id, but audiobooks.id defaults to
-- gen_random_uuid() and none of the seed migrations (009-033) pin an explicit
-- id except Daily Standup's fixed 11111111-... row. So every environment that
-- re-runs those seed migrations (like the production database) generates its
-- own random ids, different from the ones baked into 052/053 - only Daily
-- Standup's cover ever actually applied outside this dev machine.
-- Match by title instead, which is stable across environments; the filenames
-- themselves stay tied to this dev machine's original (local) ids, since
-- that's what the actual image files on disk are named after.
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/af1e627b-afbc-420f-8cb8-81bdcdd0374d.png'
  WHERE title = '1:1s & Performance Reviews';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/6415de58-4637-4c14-800a-cd7a0fda9260.png'
  WHERE title = 'API Design';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/665bbc1d-76db-4696-8867-359ca572abb0.png'
  WHERE title = 'Architecture Decisions';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/92c38386-0d86-4cab-ba4c-faae48fb0283.png'
  WHERE title = 'Building a Promotion Case';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/ca9ffdf2-17b6-476e-874d-e14f82568d67.png'
  WHERE title = 'CI/CD Troubleshooting';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/dfa6a212-b7ff-49a2-a187-2ec3c2b52e9c.png'
  WHERE title = 'Cloud & DevOps';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/6ce550a8-a8d0-436e-87f9-9d0d07e36706.png'
  WHERE title = 'Code Review Etiquette';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/c3461858-9a90-419d-9862-6a845c59975c.png'
  WHERE title = 'Customer Support Escalation';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/11111111-1111-1111-1111-111111111111.png'
  WHERE title = 'Daily Standup';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/91859a2f-bb6b-43f1-ba65-f2b4ac1ce8f5.png'
  WHERE title = 'Database & Performance';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/049ea238-b97a-44a1-b27e-28be65db2daa.png'
  WHERE title = 'Debugging in Production';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/16c94867-af2e-4b8c-8c2d-20449c05b82a.png'
  WHERE title = 'Freelancing & Contracts';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/336bfb9e-ef29-446a-bf0c-342626ae0220.png'
  WHERE title = 'Git & Code Review';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/d56f625e-dd12-4185-afd9-32f2e532d6dd.png'
  WHERE title = 'Incident Response';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/7e3130a8-f77e-46b4-b9c7-8e1a26e21523.png'
  WHERE title = 'Interview Preparation';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/a562bac8-f5f3-460f-a32f-9b2ef6479d0c.png'
  WHERE title = 'Negotiating a Job Offer';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/95ac3561-2081-4da2-9707-53d63fa09ca6.png'
  WHERE title = 'Networking at Tech Events';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/9214ca6a-9039-4cee-95ab-f525815321da.png'
  WHERE title = 'Onboarding a New Developer';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/d0e696d2-ad9e-4d0b-b377-c99f67c78ecf.png'
  WHERE title = 'Open Source Contribution';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/18e93216-607e-41b6-8162-96917dd76c37.png'
  WHERE title = 'Presenting to Stakeholders';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/1c826c69-1e4e-40d7-ad67-42c0d22755d8.png'
  WHERE title = 'Remote Work Communication';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/96703f1d-187e-4510-ae00-188163efd0ea.png'
  WHERE title = 'Security Basics';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/4926bc21-6aab-447d-b05e-0ce9f04744b1.png'
  WHERE title = 'Sprint Planning & Retrospectives';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/4c551ff7-67a1-45a5-bbae-f8234b4764ac.png'
  WHERE title = 'Technical Writing';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/99afd95a-3060-4d33-8b92-51b7b87294ad.png'
  WHERE title = 'Testing & QA';
