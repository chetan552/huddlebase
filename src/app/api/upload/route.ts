import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuid } from 'uuid';
import { getSessionUser } from '@/lib/session';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = (formData as any).get('file') as File | null;

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ success: false, error: 'Invalid file type. Use JPG, PNG, WebP, or GIF.' }, { status: 400 });
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json({ success: false, error: 'File too large. Max 2MB.' }, { status: 400 });
        }

        // Ensure upload directory exists
        await mkdir(UPLOAD_DIR, { recursive: true });

        // Generate unique filename
        const ext = file.name.split('.').pop() || 'jpg';
        const filename = `${uuid()}.${ext}`;
        const filepath = join(UPLOAD_DIR, filename);

        // Write file
        const bytes = await file.arrayBuffer();
        await writeFile(filepath, Buffer.from(bytes));

        const url = `/uploads/${filename}`;

        return NextResponse.json({ success: true, data: { url, filename } }, { status: 201 });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ success: false, error: 'Failed to upload file' }, { status: 500 });
    }
}
