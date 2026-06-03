import { createHash, randomBytes } from 'crypto';

export function createSecureToken(): string {
    return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

export function appUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${base.replace(/\/$/, '')}${path}`;
}
