import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'notifications@huddlebase.com';

export async function sendEmail({
    to,
    subject,
    html,
}: {
    to: string | string[];
    subject: string;
    html: string;
}) {
    if (!resend) {
        console.warn('[Email] RESEND_API_KEY not set; skipping email send');
        return { success: false, skipped: true };
    }

    try {
        const result = await resend.emails.send({
            from: FROM_EMAIL,
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('[Email] Send failed:', error);
        return { success: false, error };
    }
}

export function eventCreatedEmail({
    eventTitle,
    eventType,
    teamName,
    startTime,
    location,
}: {
    eventTitle: string;
    eventType: string;
    teamName: string;
    startTime: string;
    location: string | null;
}) {
    const date = new Date(startTime).toLocaleString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

    return `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1e293b;">
            <h2 style="margin: 0 0 8px; font-size: 20px;">New ${eventType.toLowerCase()}: ${eventTitle}</h2>
            <p style="margin: 0 0 16px; color: #64748b;">A new event has been added to <strong>${teamName}</strong>.</p>
            <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <div style="margin-bottom: 8px;"><strong>When:</strong> ${date}</div>
                ${location ? `<div><strong>Where:</strong> ${location}</div>` : ''}
            </div>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://huddlebase.com'}/schedule" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600;">View Schedule</a>
        </div>
    `;
}

export function eventCancelledEmail({
    eventTitle,
    eventType,
    teamName,
    startTime,
}: {
    eventTitle: string;
    eventType: string;
    teamName: string;
    startTime: string;
}) {
    const date = new Date(startTime).toLocaleString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

    return `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1e293b;">
            <h2 style="margin: 0 0 8px; font-size: 20px; color: #dc2626;">Cancelled: ${eventTitle}</h2>
            <p style="margin: 0 0 16px; color: #64748b;">The following ${eventType.toLowerCase()} on <strong>${teamName}</strong> has been cancelled.</p>
            <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin-bottom: 16px; color: #991b1b;">
                <div><strong>When:</strong> ${date}</div>
            </div>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://huddlebase.com'}/schedule" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600;">View Schedule</a>
        </div>
    `;
}
