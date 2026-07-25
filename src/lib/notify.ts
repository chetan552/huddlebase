/**
 * Single fan-out point for notifications.
 *
 * Every alert should go through here so in-app rows, email and mobile push stay in
 * step — previously each route hand-rolled its own notification + email pair and
 * push had nowhere to hook in.
 *
 * Delivery is best-effort by design: a failed email or push must never fail the
 * request that triggered it. Errors are logged, not thrown.
 */

import prisma from './db';
import { sendEmail } from './email';
import { sendPushToUsers } from './push';
import { appUrl } from './tokens';

export interface NotifyOptions {
    userIds: string[];
    type: string;
    title: string;
    body: string;
    /** In-app path, also used to deep-link the push notification. */
    link?: string;
    /** Omit to skip email for this notification. */
    emailSubject?: string;
    emailHtml?: string;
    /** Extra payload for the mobile app's notification handler. */
    data?: Record<string, unknown>;
    /** Set false for low-value alerts that shouldn't buzz a phone. */
    push?: boolean;
}

export async function notifyUsers({
    userIds,
    type,
    title,
    body,
    link,
    emailSubject,
    emailHtml,
    data,
    push = true,
}: NotifyOptions): Promise<void> {
    const recipients = Array.from(new Set(userIds)).filter(Boolean);
    if (recipients.length === 0) return;

    // In-app rows first: they're the durable record, so a push or email failure
    // still leaves the user something to find in the app.
    try {
        await prisma.notification.createMany({
            data: recipients.map((userId) => ({ userId, type, title, body, link: link ?? null })),
        });
    } catch (error) {
        console.error('[Notify] Failed to write notifications:', error);
    }

    const tasks: Promise<unknown>[] = [];

    if (push) {
        tasks.push(
            sendPushToUsers(recipients, {
                title,
                body,
                data: { type, link: link ?? null, ...data },
            }).catch((error) => console.error('[Notify] Push failed:', error)),
        );
    }

    if (emailSubject && emailHtml) {
        tasks.push(
            (async () => {
                try {
                    const users = await prisma.user.findMany({
                        where: { id: { in: recipients }, suspended: false },
                        select: { email: true },
                    });
                    const addresses = users.map((u) => u.email).filter(Boolean);
                    if (addresses.length > 0) {
                        await sendEmail({ to: addresses, subject: emailSubject, html: emailHtml });
                    }
                } catch (error) {
                    console.error('[Notify] Email failed:', error);
                }
            })(),
        );
    }

    await Promise.allSettled(tasks);
}

/** Convenience wrapper for notifying every member of a team except the actor. */
export async function notifyTeam(
    teamId: string,
    options: Omit<NotifyOptions, 'userIds'> & { exceptUserId?: string },
): Promise<void> {
    const { exceptUserId, ...rest } = options;
    try {
        const members = await prisma.teamMember.findMany({
            where: { teamId, ...(exceptUserId && { userId: { not: exceptUserId } }) },
            select: { userId: true },
        });
        await notifyUsers({ ...rest, userIds: members.map((m) => m.userId) });
    } catch (error) {
        console.error('[Notify] Team fan-out failed:', error);
    }
}

/** Absolute URL for a link, for use inside emails. */
export function notificationUrl(link: string): string {
    return appUrl(link);
}
