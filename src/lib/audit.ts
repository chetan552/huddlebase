import prisma from '@/lib/db';
import type { SessionUser } from '@/lib/session';

export async function writeAuditLog({
    actor,
    action,
    targetType,
    targetId,
    targetLabel,
    metadata,
}: {
    actor: SessionUser;
    action: string;
    targetType: string;
    targetId: string;
    targetLabel?: string | null;
    metadata?: Record<string, unknown>;
}) {
    await prisma.auditLog.create({
        data: {
            actorId: actor.id,
            actorEmail: actor.email,
            action,
            targetType,
            targetId,
            targetLabel: targetLabel || null,
            metadata: metadata ? JSON.stringify(metadata) : null,
        },
    });
}
