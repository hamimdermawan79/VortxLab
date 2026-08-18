import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { safeErrorResponse } from "@/utils/security";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function scanFilesRecursively(dir: string, baseDir: string): any[] {
  let results: any[] = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      results = results.concat(scanFilesRecursively(filePath, baseDir));
    } else {
      const relPath = path.relative(baseDir, filePath).replace(/\\/g, "/");
      results.push({
        id: relPath,
        name: file,
        relPath: relPath,
        url: `/api/admin/files/download?file=${encodeURIComponent(relPath)}`,
        sizeBytes: stat.size,
        sizeFormatted: formatBytes(stat.size),
        createdAt: stat.birthtime.toISOString(),
        modifiedAt: stat.mtime.toISOString(),
        subfolder: path.dirname(relPath) === "." ? "root" : path.dirname(relPath),
      });
    }
  }
  return results;
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const uploadsDir = path.join(process.cwd(), "private", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const allFiles = scanFilesRecursively(uploadsDir, uploadsDir);
    allFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalSizeBytes = allFiles.reduce((sum, f) => sum + f.sizeBytes, 0);

    return NextResponse.json({
      totalFiles: allFiles.length,
      totalSizeBytes,
      totalSizeFormatted: formatBytes(totalSizeBytes),
      files: allFiles,
    });
  } catch (err: any) {
    return safeErrorResponse(err, "Gagal memuat daftar file admin.");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { relPath, deleteAll } = body;

    const uploadsDir = path.join(process.cwd(), "private", "uploads");

    if (deleteAll) {
      const dataDir = path.join(uploadsDir, "data");
      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true, force: true });
        fs.mkdirSync(dataDir, { recursive: true });
      }
      return NextResponse.json({ success: true, message: "Semua file data extractor berhasil dibersihkan." });
    }

    if (!relPath) {
      return NextResponse.json({ error: "MISSING_PATH", message: "Parameter relPath diperlukan." }, { status: 400 });
    }

    const safePath = path.normalize(path.join(uploadsDir, relPath));
    if (!safePath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: "FORBIDDEN", message: "Path traversal tidak diizinkan." }, { status: 403 });
    }

    if (fs.existsSync(safePath)) {
      fs.unlinkSync(safePath);
      // Clean empty parent folder if it was in a timestamp subfolder
      const parentDir = path.dirname(safePath);
      if (parentDir !== uploadsDir && fs.existsSync(parentDir) && fs.readdirSync(parentDir).length === 0) {
        fs.rmdirSync(parentDir);
      }
      return NextResponse.json({ success: true, message: "File berhasil dihapus dari storage VPS." });
    }

    return NextResponse.json({ error: "NOT_FOUND", message: "File tidak ditemukan." }, { status: 404 });
  } catch (err: any) {
    return safeErrorResponse(err, "Gagal menghapus file storage.");
  }
}
