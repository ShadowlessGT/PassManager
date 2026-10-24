export const MIN_MASTER_LENGTH = 6;
export const RECOMMENDED_MASTER_LENGTH = 12;

export function validateNewMasterPassword(password: string, confirmation: string): string | null {
  if (password.length < MIN_MASTER_LENGTH) return 'Bitte mindestens 6 Zeichen eingeben.';
  if (password !== confirmation) return 'Die beiden Passwörter stimmen nicht überein.';
  return null;
}

export type MasterStrength = 'too-short' | 'below-recommendation' | 'recommended';
export function masterPasswordStrength(password: string): MasterStrength {
  if (password.length < MIN_MASTER_LENGTH) return 'too-short';
  return password.length < RECOMMENDED_MASTER_LENGTH ? 'below-recommendation' : 'recommended';
}
