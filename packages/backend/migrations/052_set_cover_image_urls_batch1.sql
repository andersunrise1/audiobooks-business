-- 10 of 25 audiobook cover illustrations generated so far (Canva quota hit
-- mid-batch); the remaining 15 will be set by a follow-up migration once
-- generation resumes. Path mirrors scripts/generateNarration.js's
-- audio_url pattern (BACKEND_PUBLIC_URL + static route path) - rewritten
-- to the request's actual host at read time by
-- audiobookController.js's resolveLocalMediaUrl, same as audio_url.
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/11111111-1111-1111-1111-111111111111.png'
  WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/336bfb9e-ef29-446a-bf0c-342626ae0220.png'
  WHERE id = '336bfb9e-ef29-446a-bf0c-342626ae0220';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/6415de58-4637-4c14-800a-cd7a0fda9260.png'
  WHERE id = '6415de58-4637-4c14-800a-cd7a0fda9260';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/dfa6a212-b7ff-49a2-a187-2ec3c2b52e9c.png'
  WHERE id = 'dfa6a212-b7ff-49a2-a187-2ec3c2b52e9c';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/7e3130a8-f77e-46b4-b9c7-8e1a26e21523.png'
  WHERE id = '7e3130a8-f77e-46b4-b9c7-8e1a26e21523';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/d56f625e-dd12-4185-afd9-32f2e532d6dd.png'
  WHERE id = 'd56f625e-dd12-4185-afd9-32f2e532d6dd';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/1c826c69-1e4e-40d7-ad67-42c0d22755d8.png'
  WHERE id = '1c826c69-1e4e-40d7-ad67-42c0d22755d8';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/4926bc21-6aab-447d-b05e-0ce9f04744b1.png'
  WHERE id = '4926bc21-6aab-447d-b05e-0ce9f04744b1';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/6ce550a8-a8d0-436e-87f9-9d0d07e36706.png'
  WHERE id = '6ce550a8-a8d0-436e-87f9-9d0d07e36706';
UPDATE audiobooks SET cover_image_url = 'http://localhost:3000/covers/91859a2f-bb6b-43f1-ba65-f2b4ac1ce8f5.png'
  WHERE id = '91859a2f-bb6b-43f1-ba65-f2b4ac1ce8f5';
