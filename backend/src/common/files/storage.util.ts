import { basename, extname, isAbsolute, join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';

export const UPLOADS_ROOT = join(process.cwd(), 'uploads');
export const MESSAGES_UPLOAD_DIR = join(UPLOADS_ROOT, 'messages');
export const PUBLICATIONS_UPLOAD_DIR = join(UPLOADS_ROOT, 'publications');

export const ALLOWED_UPLOAD_EXTENSIONS = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.txt',
  '.csv',
  '.rtf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.odt',
  '.ods',
  '.odp',
] as const;

export const ALLOWED_UPLOAD_MIMES = [
  'application/pdf',
  'image/png',
  'image/jpg',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/rtf',
  'text/rtf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
  'application/octet-stream',
] as const;

export const COURRIER_MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MESSAGE_MAX_FILE_BYTES = 20 * 1024 * 1024;

export function ensureUploadDirs() {
  if (!existsSync(UPLOADS_ROOT)) mkdirSync(UPLOADS_ROOT, { recursive: true });
  if (!existsSync(MESSAGES_UPLOAD_DIR)) mkdirSync(MESSAGES_UPLOAD_DIR, { recursive: true });
  if (!existsSync(PUBLICATIONS_UPLOAD_DIR)) mkdirSync(PUBLICATIONS_UPLOAD_DIR, { recursive: true });
}

/** Relative path stored in DB (never store Multer absolute paths on Windows). */
export function relativeUploadPath(
  filename: string,
  folder: 'root' | 'messages' | 'publications' = 'root',
) {
  if (folder === 'messages') return `uploads/messages/${filename}`;
  if (folder === 'publications') return `uploads/publications/${filename}`;
  return `uploads/${filename}`;
}

/**
 * Resolve a stored path whether absolute (legacy) or relative to cwd.
 * Falls back to basename under the expected upload directory.
 */
export function resolveStoredFilePath(
  stored: string | null | undefined,
  fallbackDir: string = UPLOADS_ROOT,
): string {
  if (!stored) return '';
  if (isAbsolute(stored)) {
    if (existsSync(stored)) return stored;
    const byName = join(fallbackDir, basename(stored));
    return existsSync(byName) ? byName : stored;
  }

  const relative = stored.replace(/^[/\\]+/, '');
  const candidate = join(process.cwd(), relative);
  if (existsSync(candidate)) return candidate;

  const byName = join(fallbackDir, basename(stored));
  if (existsSync(byName)) return byName;

  return candidate;
}

export function isAllowedUpload(originalname: string, mimetype: string): boolean {
  const ext = extname(originalname || '').toLowerCase();
  const extOk = (ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(ext);
  const mimeOk = (ALLOWED_UPLOAD_MIMES as readonly string[]).includes(mimetype);
  if (!mimeOk && !extOk) return false;
  if (mimetype === 'application/octet-stream' && !extOk) return false;
  return true;
}

export function safeUnlink(filePath: string) {
  try {
    if (filePath && existsSync(filePath)) unlinkSync(filePath);
  } catch {
    // ignore FS errors on cleanup
  }
}
