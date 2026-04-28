import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getSessionUser } from '@/lib/session';

const genai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

export async function POST(req: NextRequest) {
    const user = getSessionUser(req);
    if (!user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!genai) {
        return NextResponse.json({ success: false, error: 'AI features not configured (GEMINI_API_KEY missing)' }, { status: 503 });
    }

    const { sport, duration, skillFocus, ageGroup, playerCount } = await req.json();

    if (!sport || !duration || !skillFocus || !ageGroup) {
        return NextResponse.json({ success: false, error: 'sport, duration, skillFocus, and ageGroup are required' }, { status: 400 });
    }

    const prompt = `You are an expert sports coach with decades of experience. Create a detailed, ready-to-run practice plan with the following parameters:

- Sport: ${sport}
- Session Duration: ${duration} minutes
- Primary Skill Focus: ${skillFocus}
- Age Group: ${ageGroup}${playerCount ? `\n- Number of Players: ${playerCount}` : ''}

Structure the plan exactly as follows:

## Overview
A 2-3 sentence summary of today's session goals and theme.

## Equipment Needed
A brief bulleted list of what coaches should prepare.

## Warm-Up (${Math.round(Number(duration) * 0.15)} min)
2-3 warm-up activities that prepare players physically and mentally. For each:
- **[Activity Name]** (X min): Description, setup, and coaching cues.

## Skill Development (${Math.round(Number(duration) * 0.45)} min)
3-4 drills that directly develop ${skillFocus}. For each drill:
- **[Drill Name]** (X min)
  - *Objective:* What players will improve
  - *Setup:* Field/court layout and groupings
  - *Instructions:* Step-by-step execution
  - *Coaching Points:* 2-3 key things to watch for
  - *Progression:* How to make it harder if players master it

## Scrimmage / Game Application (${Math.round(Number(duration) * 0.30)} min)
A game-like activity or small-sided game that lets players apply ${skillFocus} in context. Include any rule modifications that emphasize the skill focus.

## Cool-Down & Review (${Math.round(Number(duration) * 0.10)} min)
Light stretching routine and 2-3 reflection questions to ask the group about today's focus.

## Coach's Notes
2-3 quick tips for running this session smoothly, common mistakes to watch for, and any safety reminders.

Write the plan in a practical, energetic coaching voice. Be specific with time allocations, player groupings, and distances where relevant.`;

    const stream = await genai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { maxOutputTokens: 4096, temperature: 0.7 },
    });

    const readable = new ReadableStream({
        async start(controller) {
            try {
                for await (const chunk of stream) {
                    const text = chunk.text;
                    if (text) {
                        controller.enqueue(new TextEncoder().encode(text));
                    }
                }
            } catch (err) {
                controller.error(err);
            } finally {
                controller.close();
            }
        },
    });

    return new Response(readable, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
        },
    });
}
