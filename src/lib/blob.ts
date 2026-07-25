/**
 * Blob storage.
 *
 * Photos and videos go to Vercel Blob. The previous local-disk upload path
 * (`public/uploads`) only works in development — Vercel's filesystem is read-only
 * and per-invocation, so anything written there vanishes. This module keeps that
 * fallback for local dev but treats Blob as the real backend.
 *
 * Set BLOB_READ_WRITE_TOKEN to enable it. Vercel injects it automatically once a
 * Blob store is attached to the project; locally, `vercel env pull` fetches it.
 */

export const IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
] as const;

export const VIDEO_MIME_TYPES = [
    'video/mp4',
    'video/quicktime',
    'video/webm',
] as const;

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15MB
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200MB

export function isBlobConfigured(): boolean {
    return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function mediaTypeFor(contentType: string): 'IMAGE' | 'VIDEO' | null {
    if ((IMAGE_MIME_TYPES as readonly string[]).includes(contentType)) return 'IMAGE';
    if ((VIDEO_MIME_TYPES as readonly string[]).includes(contentType)) return 'VIDEO';
    return null;
}

export function maxBytesFor(contentType: string): number {
    return mediaTypeFor(contentType) === 'VIDEO' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
}

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.m4v'];

/**
 * Size ceiling inferred from a filename, for the upload-token stage where only the
 * pathname is known. Errs toward the video limit so a legitimate clip isn't rejected;
 * the allowed-content-type list is what actually constrains what can be stored.
 */
export function maxBytesForPathname(pathname: string): number {
    const lower = pathname.toLowerCase();
    return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext)) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
}

/**
 * Storage path for an upload. Namespacing by team keeps a team's media together and
 * makes bulk cleanup on team deletion straightforward.
 *
 * The extension is derived from the validated MIME type, never the client-supplied
 * filename — a file uploaded as image/png but named "evil.html" would otherwise be
 * stored and served as HTML.
 */
export function mediaPathname(teamId: string, contentType: string): string {
    const extensions: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
        'image/heic': 'heic',
        'image/heif': 'heif',
        'video/mp4': 'mp4',
        'video/quicktime': 'mov',
        'video/webm': 'webm',
    };
    const ext = extensions[contentType] ?? 'bin';
    return `teams/${teamId}/media/${crypto.randomUUID()}.${ext}`;
}

export const DOCUMENT_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
] as const;

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024; // 25MB

/** Content types accepted for the team file repository: documents plus images. */
export const TEAM_FILE_MIME_TYPES = [
    ...DOCUMENT_MIME_TYPES,
    ...IMAGE_MIME_TYPES,
] as const;

export function isTeamFileType(contentType: string): boolean {
    return (TEAM_FILE_MIME_TYPES as readonly string[]).includes(contentType);
}

/**
 * Storage path for a team document. As with media, the extension comes from the
 * validated MIME type rather than the client filename, so an upload can't be made
 * to serve as HTML.
 */
export function teamFilePathname(teamId: string, contentType: string): string {
    const extensions: Record<string, string> = {
        'application/pdf': 'pdf',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'application/vnd.ms-powerpoint': 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
        'text/plain': 'txt',
        'text/csv': 'csv',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
        'image/heic': 'heic',
        'image/heif': 'heif',
    };
    const ext = extensions[contentType] ?? 'bin';
    return `teams/${teamId}/files/${crypto.randomUUID()}.${ext}`;
}
