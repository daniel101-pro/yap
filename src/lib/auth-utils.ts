const EXETER_EMAIL_SUFFIX = '@exeter.ac.uk';

export function isExeterEmail(email: string) {
  return email.trim().toLowerCase().endsWith(EXETER_EMAIL_SUFFIX);
}
