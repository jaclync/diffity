import { getDb } from './db.js';

export interface ReviewedFile {
  filePath: string;
  fingerprint: string;
}

export function getReviewedFiles(sessionId: string): ReviewedFile[] {
  const rows = getDb().prepare(
    'SELECT file_path, fingerprint FROM reviewed_files WHERE session_id = ?'
  ).all(sessionId) as { file_path: string; fingerprint: string }[];
  return rows.map(r => ({ filePath: r.file_path, fingerprint: r.fingerprint }));
}

export function setReviewedFile(sessionId: string, filePath: string, fingerprint: string): void {
  getDb().prepare(`
    INSERT INTO reviewed_files (session_id, file_path, fingerprint)
    VALUES (?, ?, ?)
    ON CONFLICT(session_id, file_path) DO UPDATE SET fingerprint = excluded.fingerprint
  `).run(sessionId, filePath, fingerprint);
}

export function removeReviewedFile(sessionId: string, filePath: string): void {
  getDb().prepare(
    'DELETE FROM reviewed_files WHERE session_id = ? AND file_path = ?'
  ).run(sessionId, filePath);
}
