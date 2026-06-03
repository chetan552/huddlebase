import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;

function securityKey() {
    const secret = process.env.TWO_FACTOR_ENCRYPTION_KEY || process.env.SESSION_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('TWO_FACTOR_ENCRYPTION_KEY or SESSION_SECRET is required in production');
    }
    return createHash('sha256').update(secret || 'huddlebase-dev-2fa-secret').digest();
}

export function base32Encode(buffer: Buffer) {
    let bits = '';
    let output = '';
    for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');
    for (let i = 0; i < bits.length; i += 5) {
        const chunk = bits.slice(i, i + 5).padEnd(5, '0');
        output += BASE32_ALPHABET[parseInt(chunk, 2)];
    }
    return output;
}

function base32Decode(value: string) {
    const clean = value.toUpperCase().replace(/[^A-Z2-7]/g, '');
    let bits = '';
    for (const char of clean) {
        const index = BASE32_ALPHABET.indexOf(char);
        if (index === -1) throw new Error('Invalid base32 character');
        bits += index.toString(2).padStart(5, '0');
    }

    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }
    return Buffer.from(bytes);
}

export function createTwoFactorSecret() {
    return base32Encode(randomBytes(20));
}

export function encryptTwoFactorSecret(secret: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', securityKey(), iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptTwoFactorSecret(value: string) {
    const [iv, tag, encrypted] = value.split('.');
    if (!iv || !tag || !encrypted) throw new Error('Invalid encrypted secret');
    const decipher = createDecipheriv('aes-256-gcm', securityKey(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'base64url')),
        decipher.final(),
    ]).toString('utf8');
}

function hotp(secret: string, counter: number) {
    const key = base32Decode(secret);
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(counter));
    const digest = createHmac('sha1', key).update(buffer).digest();
    const offset = digest[digest.length - 1] & 0xf;
    const binary = ((digest[offset] & 0x7f) << 24)
        | ((digest[offset + 1] & 0xff) << 16)
        | ((digest[offset + 2] & 0xff) << 8)
        | (digest[offset + 3] & 0xff);
    return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

export function verifyTotpCode(secret: string, code: string) {
    const cleanCode = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(cleanCode)) return false;

    const now = Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS);
    for (const offset of [-1, 0, 1]) {
        const expected = hotp(secret, now + offset);
        if (timingSafeEqual(Buffer.from(expected), Buffer.from(cleanCode))) return true;
    }
    return false;
}

export function createOtpAuthUrl({ issuer, account, secret }: { issuer: string; account: string; secret: string }) {
    const label = `${issuer}:${account}`;
    const params = new URLSearchParams({
        secret,
        issuer,
        algorithm: 'SHA1',
        digits: String(TOTP_DIGITS),
        period: String(TOTP_STEP_SECONDS),
    });
    return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

export function createRecoveryCodes() {
    return Array.from({ length: 10 }, () => randomBytes(5).toString('hex').match(/.{1,5}/g)!.join('-'));
}

export function hashRecoveryCode(code: string) {
    return createHash('sha256').update(code.trim().toLowerCase()).digest('hex');
}

export function verifyAndConsumeRecoveryCode(storedCodes: string | null, code: string) {
    const hashes = storedCodes ? JSON.parse(storedCodes) as string[] : [];
    const codeHash = hashRecoveryCode(code);
    const index = hashes.findIndex((hash) => hash === codeHash);
    if (index === -1) return null;
    return JSON.stringify(hashes.filter((_, i) => i !== index));
}
