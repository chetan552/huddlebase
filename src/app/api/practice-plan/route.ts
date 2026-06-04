import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';

const DEFAULT_MODEL = process.env.AI_PRACTICE_PLAN_MODEL || 'gpt-5-mini';
const PREMIUM_MODEL = process.env.AI_PRACTICE_PLAN_PREMIUM_MODEL || 'gpt-5.2';
const MONTHLY_LIMIT = Number(process.env.AI_PRACTICE_PLAN_MONTHLY_LIMIT || 30);
const MAX_OUTPUT_TOKENS = Number(process.env.AI_PRACTICE_PLAN_MAX_OUTPUT_TOKENS || 3000);

const PRACTICE_PLAN_SCHEMA = {
    name: 'practice_plan',
    schema: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'overview', 'durationMinutes', 'equipment', 'sections', 'coachNotes', 'safetyNotes'],
        properties: {
            title: { type: 'string' },
            overview: { type: 'string' },
            durationMinutes: { type: 'number' },
            equipment: { type: 'array', items: { type: 'string' } },
            sections: {
                type: 'array',
                minItems: 4,
                items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['name', 'durationMinutes', 'setup', 'instructions', 'coachingPoints', 'progression', 'regression'],
                    properties: {
                        name: { type: 'string' },
                        durationMinutes: { type: 'number' },
                        setup: { type: 'string' },
                        instructions: { type: 'string' },
                        coachingPoints: { type: 'array', items: { type: 'string' } },
                        progression: { type: 'string' },
                        regression: { type: 'string' },
                    },
                },
            },
            coachNotes: { type: 'array', items: { type: 'string' } },
            safetyNotes: { type: 'array', items: { type: 'string' } },
        },
    },
    strict: true,
};

function monthStart() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
}

function buildPrompt(input: {
    sport: string;
    duration: string;
    skillFocus: string;
    ageGroup: string;
    playerCount?: string;
    equipment?: string;
    advanced?: boolean;
}) {
    return `Create a ready-to-run youth sports practice plan.

Inputs:
- Sport: ${input.sport}
- Duration: ${input.duration} minutes
- Skill focus: ${input.skillFocus}
- Age group: ${input.ageGroup}
- Player count: ${input.playerCount || 'not specified'}
- Available equipment: ${input.equipment || 'standard team equipment'}
- Detail level: ${input.advanced ? 'advanced coach plan' : 'standard coach plan'}

Requirements:
- Return only JSON that matches the provided schema.
- Total section durations must add up to ${input.duration} minutes.
- Make drills age-appropriate and safe.
- Avoid medical advice.
- Include practical setup, instructions, progressions, regressions, coaching points, and safety notes.
- Do not include private player or family data.`;
}

function extractOutputText(data: { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }) {
    if (data.output_text) return data.output_text;
    return data.output
        ?.flatMap((item) => item.content || [])
        .filter((content) => content.type === 'output_text' && content.text)
        .map((content) => content.text)
        .join('') || '';
}

export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const currentUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
                role: true,
                coachApproved: true,
                aiPracticePlanEnabled: true,
                suspended: true,
            },
        });

        if (!currentUser || currentUser.suspended) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const canUsePracticePlan =
            currentUser.role === 'ADMIN' ||
            (currentUser.role === 'COACH' && currentUser.coachApproved && currentUser.aiPracticePlanEnabled);

        if (!canUsePracticePlan) {
            return NextResponse.json({
                success: false,
                error: 'AI practice plans are not enabled for your account. Ask an admin to unlock this feature.',
            }, { status: 403 });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'AI features not configured (OPENAI_API_KEY missing)' }, { status: 503 });
        }

        const body = await req.json();
        const { sport, duration, skillFocus, ageGroup, playerCount, equipment, advanced } = body;

        if (!sport || !duration || !skillFocus || !ageGroup) {
            return NextResponse.json({ success: false, error: 'sport, duration, skillFocus, and ageGroup are required' }, { status: 400 });
        }

        const usageThisMonth = await prisma.aiUsage.count({
            where: {
                userId: user.id,
                feature: 'practice-plan',
                createdAt: { gte: monthStart() },
            },
        });

        if (usageThisMonth >= MONTHLY_LIMIT) {
            return NextResponse.json({
                success: false,
                error: `Practice plan limit reached (${MONTHLY_LIMIT}/month).`,
            }, { status: 429 });
        }

        const model = advanced ? PREMIUM_MODEL : DEFAULT_MODEL;
        const prompt = buildPrompt({ sport, duration, skillFocus, ageGroup, playerCount, equipment, advanced });

        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                input: [
                    {
                        role: 'system',
                        content: 'You are a practical sports coaching assistant. Generate safe, realistic, editable practice plans for coaches.',
                    },
                    { role: 'user', content: prompt },
                ],
                text: {
                    format: {
                        type: 'json_schema',
                        ...PRACTICE_PLAN_SCHEMA,
                    },
                },
                max_output_tokens: MAX_OUTPUT_TOKENS,
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            return NextResponse.json({ success: false, error: data.error?.message || 'Failed to generate practice plan' }, { status: 502 });
        }

        const outputText = extractOutputText(data);
        if (!outputText) {
            return NextResponse.json({ success: false, error: 'AI returned an empty practice plan' }, { status: 502 });
        }

        const plan = JSON.parse(outputText);
        const inputTokens = data.usage?.input_tokens || 0;
        const outputTokens = data.usage?.output_tokens || 0;

        await prisma.aiUsage.create({
            data: {
                userId: user.id,
                feature: 'practice-plan',
                model,
                inputTokens,
                outputTokens,
            },
        });

        return NextResponse.json({
            success: true,
            data: plan,
            usage: {
                model,
                inputTokens,
                outputTokens,
                remainingThisMonth: Math.max(0, MONTHLY_LIMIT - usageThisMonth - 1),
            },
        });
    } catch (error) {
        console.error('Practice plan error:', error);
        return NextResponse.json({ success: false, error: 'Failed to generate practice plan' }, { status: 500 });
    }
}
