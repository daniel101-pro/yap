import bcrypt from 'bcryptjs';

const MIN_LENGTH = 8;

export function isValidPassword(password: string): boolean {
  return typeof password === 'string' && password.length >= MIN_LENGTH && password.length <= 200;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
