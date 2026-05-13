import bcrypt from 'bcrypt';
import crypto from 'crypto';

const ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateTemporaryPassword(length = 12): string {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
}
