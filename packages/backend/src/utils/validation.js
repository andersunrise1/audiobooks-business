// Dia 75: centralizes validation that was previously duplicated
// (supportController.js had its own EMAIL_PATTERN) or missing entirely
// (registration accepted any truthy string as an email/password, no format
// or length check).
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

export function isValidEmail(value) {
  return typeof value === 'string' && EMAIL_PATTERN.test(value);
}

export function isValidPassword(value) {
  return typeof value === 'string' && value.length >= MIN_PASSWORD_LENGTH;
}
