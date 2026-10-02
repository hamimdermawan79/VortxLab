import path from "path";

/**
 * Resolve lokasi folder uploads secara KONSISTEN untuk semua komponen.
 *
 * Prioritas:
 * 1. Env var UPLOADS_DIR (paling eksplisit — di-set di ecosystem.config.js)
 * 2. Fallback: {cwd}/private/uploads — aman, tidak pernah public
 */
export function getUploadsDir(): string {
  if (process.env.UPLOADS_DIR && process.env.UPLOADS_DIR.trim()) {
    return path.resolve(process.env.UPLOADS_DIR);
  }
  return path.join(process.cwd(), "private", "uploads");
}

/** Folder data di dalam uploads (tempat file extractor disimpan). */
export function getUploadsDataDir(): string {
  return path.join(getUploadsDir(), "data");
}
