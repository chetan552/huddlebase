import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    try {
        const { email, password, name, role } = await req.json();

        if (!email || !password || !name) {
            return NextResponse.json(
                { success: false, error: 'Email, password, and name are required' },
                { status: 400 }
            );
        }

        // Check if user exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json(
                { success: false, error: 'An account with this email already exists' },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: role || 'PLAYER',
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                avatar: true,
                createdAt: true,
            },
        });

        return NextResponse.json({ success: true, data: user }, { status: 201 });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create account' },
            { status: 500 }
        );
    }
}
