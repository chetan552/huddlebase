import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuid } from 'uuid';
import { getSessionUser } from '@/lib/session';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const MIME_TO_EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
};

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

        const ext = MIME_TO_EXT[file.type];
        if (!ext) {
            return NextResponse.json({ success: false, error: 'Invalid file type. Use JPG, PNG, WebP, or GIF.' }, { status: 400 });
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json({ success: false, error: 'File too large. Max 2MB.' }, { status: 400 });
        }

        // Ensure upload directory exists
        await mkdir(UPLOAD_DIR, { recursive: true });

        // Extension is derived from the validated MIME type — never trust the client filename,
        // since a file uploaded as image/png with name "evil.html" would otherwise be stored as
        // .html and served as HTML from /public/uploads (stored XSS).
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
