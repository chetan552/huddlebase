/**
 * Expo push delivery.
 *
 * Talks to Expo's push service directly over HTTP — no SDK dependency. Expo
 * accepts up to 100 messages per request and answers with a per-message ticket;
 * a `DeviceNotRegistered` ticket means the app was uninstalled and the token row
 * should go.
 *
 * Requires no server credential for standard Expo projects. If you have enabled
 * enhanced push security in your Expo account, set EXPO_ACCESS_TOKEN.
 */

import prisma from './db';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;
const MAX_FAILURES_BEFORE_PRUNE = 5;

export interface PushMessage {
    title: string;
    body: string;
    /** Deep-link path plus any routing metadata the app needs. */
    data?: Record<string, unknown>;
    badge?: number;
}

interface ExpoTicket {
    status: 'ok' | 'error';
    id?: string;
    message?: string;
    details?: { error?: string };
}

/** Expo tokens look like ExponentPushToken[xxx] or ExpoPushToken[xxx]. */
export function isExpoPushToken(token: string): boolean {
    return /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token.trim());
}

function chunk<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
}

/**
 * Push to every device registered to these users.
 *
 * Never throws: notification delivery is best-effort and must not fail the request
 * that triggered it. Returns counts for logging.
 */
export async function sendPushToUsers(
    userIds: string[],
    message: PushMessage,
): Promise<{ sent: number; failed: number; pruned: number }> {
    const result = { sent: 0, failed: 0, pruned: 0 };
    if (userIds.length === 0) return result;

    let tokens: { id: string; token: string }[];
    try {
        tokens = await prisma.pushToken.findMany({
            where: { userId: { in: userIds } },
            select: { id: true, token: true },
        });
    } catch (error) {
        console.error('[Push] Failed to load tokens:', error);
        return result;
    }

    if (tokens.length === 0) return result;

    const valid = tokens.filter((t) => isExpoPushToken(t.token));
    const staleIds: string[] = [];
    const failedIds: string[] = [];

    for (const batch of chunk(valid, BATCH_SIZE)) {
        const payload = batch.map((t) => ({
            to: t.token,
            title: message.title,
            body: message.body,
            data: message.data ?? {},
            sound: 'default' as const,
            ...(message.badge !== undefined && { badge: message.badge }),
            channelId: 'default',
        }));

        try {
            const response = await fetch(EXPO_PUSH_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                    ...(process.env.EXPO_ACCESS_TOKEN && {
                        Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}`,
                    }),
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                console.error(`[Push] Expo returned ${response.status}`);
                result.failed += batch.length;
                continue;
            }

            const body = (await response.json()) as { data?: ExpoTicket[] };
            const tickets = body.data ?? [];

            tickets.forEach((ticket, index) => {
                const tokenRow = batch[index];
                if (!tokenRow) return;

                if (ticket.status === 'ok') {
                    result.sent += 1;
                    return;
                }

                result.failed += 1;
                if (ticket.details?.error === 'DeviceNotRegistered') {
                    staleIds.push(tokenRow.id);
                } else {
                    failedIds.push(tokenRow.id);
                    console.error(`[Push] Ticket error: ${ticket.details?.error ?? ticket.message}`);
                }
            });
        } catch (error) {
            console.error('[Push] Send failed:', error);
            result.failed += batch.length;
        }
    }

    // Uninstalled apps: drop immediately. Other errors may be transient, so count
    // them and only prune once a device has failed repeatedly.
    try {
        if (staleIds.length > 0) {
            const deleted = await prisma.pushToken.deleteMany({ where: { id: { in: staleIds } } });
            result.pruned += deleted.count;
        }
        if (failedIds.length > 0) {
            await prisma.pushToken.updateMany({
                where: { id: { in: failedIds } },
                data: { failureCount: { increment: 1 } },
            });
            const burned = await prisma.pushToken.deleteMany({
                where: { id: { in: failedIds }, failureCount: { gte: MAX_FAILURES_BEFORE_PRUNE } },
            });
            result.pruned += burned.count;
        }
        if (result.sent > 0) {
            await prisma.pushToken.updateMany({
                where: { id: { in: valid.map((t) => t.id) } },
                data: { lastUsedAt: new Date(), failureCount: 0 },
            });
        }
    } catch (error) {
        console.error('[Push] Token cleanup failed:', error);
    }

    return result;
}
