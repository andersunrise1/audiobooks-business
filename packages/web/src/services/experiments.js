import { apiRequest } from './api.js';

const VISITOR_ID_KEY = 'techspeak_visitor_id';

// Persisted in localStorage (not tied to login) so an anonymous pricing-page
// visitor and the same person after logging in see the same experiment
// variant - the price shown pre-login must match what's actually charged.
export function getVisitorId() {
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

export function getExperimentAssignment(name) {
  const subjectId = getVisitorId();
  return apiRequest(
    `/api/experiments/${name}/assignment?subjectId=${encodeURIComponent(subjectId)}`,
  );
}

export function recordExperimentConversion(name, variant, metadata) {
  return apiRequest(`/api/experiments/${name}/conversion`, {
    method: 'POST',
    body: { subjectId: getVisitorId(), variant, metadata },
  }).catch((err) => {
    // Best-effort: a failed conversion log shouldn't block the user's action.
    console.error(`failed to record conversion for experiment "${name}"`, err);
  });
}
