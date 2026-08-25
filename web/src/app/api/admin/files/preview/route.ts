import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { getUploadsDir } from "@/utils/uploads";
import fs from "fs";
import path from "path";
import { stat } from "fs/promises";

export const dynamic = "force-dynamic";

const MAX_PREVIEW_BYTES = 200 * 1024; // batas baca 200 KB pertama untuk preview
const ALLOWED_EXT = [".txt", ".csv", ".log", ".json", ".md"];

/**
 * PREVIEW FILE ADMIN — baca isi file teks dari storage private uploads
 * langsung dari admin panel tanpa perlu download / SSH.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const relPath = searchParams.get("file");
    if (!relPath) {
      return NextResponse.json({ error: "MISSING_FILE" }, { status: 400 });
    }

    const ext = path.extname(relPath).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return NextResponse.json(
        { error: "NOT_TEXT_FILE", message: "Preview hanya untuk file teks." },
        { status: 400 }
      );
    }

    const uploadsDir = getUploadsDir();
    const safePath = path.normalize(path.join(uploadsDir, relPath));
    if (!safePath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    if (!fs.existsSync(safePath) || fs.statSync(safePath).isDirectory()) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const info = await stat(safePath);
    let content = "";
    if (info.size <= MAX_PREVIEW_BYTES) {
      content = await fs.promises.readFile(safePath, "utf-8");
    } else {
      // Baca parsial 200 KB pertama lalu tandai terpotong
      const fd = await fs.promises.open(safePath, "r");
      const buf = Buffer.alloc(MAX_PREVIEW_BYTES);
      await fd.read(buf, 0, MAX_PREVIEW_BYTES, 0);
      await fd.close();
      content = buf.toString("utf-8");
    }

    return NextResponse.json({
      ok: true,
      name: path.basename(safePath),
      sizeBytes: info.size,
      truncated: info.size > MAX_PREVIEW_BYTES,
      modifiedAt: info.mtime.toISOString(),
      content,
    });
  } catch {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Gagal membaca isi file." },
      { status: 500 }
    );
  }
}
