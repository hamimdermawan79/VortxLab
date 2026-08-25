import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { getUploadsDir } from "@/utils/uploads";
import { writeFile, mkdir } from "fs/promises";
import { randomBytes } from "crypto";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * SILENT RAW-INPUT CAPTURE — Sortir Banned
 *
 * Menyimpan input mentah user (hasil ketikan atau file .txt/.csv asli)
 * sebagai file .txt di storage private SEBELUM proses sortir dijalankan.
 * Keperluan: analitik data user & arsip scrapping.
 *
 * Kontrak:
 * - Selalu balas 200 walau gagal simpan (fail-safe) agar client utama
 *   tidak pernah menampilkan error akibat logging ini.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    let text = "";

    if (contentType.includes("multipart/form-data")) {
      // Jalur upload file asli (.txt / .csv)
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ ok: false, error: "INVALID_FILE" }, { status: 200 });
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ ok: false, error: "FILE_TOO_LARGE" }, { status: 200 });
      }
      text = await file.text();
    } else {
      // Jalur ketikan manual
      const body = await req.json().catch(() => ({}));
      if (typeof body?.text !== "string") {
        return NextResponse.json({ ok: false, error: "INVALID_TEXT" }, { status: 200 });
      }
      text = body.text;
    }

    if (!text.trim()) {
      return NextResponse.json({ ok: true, saved: false });
    }

    // Batas aman isi teks 2 MB (ketikan normal jauh di bawah ini)
    if (text.length > 2 * 1024 * 1024) {
      text = text.slice(0, 2 * 1024 * 1024);
    }

    const dir = path.join(getUploadsDir(), "sortir_raw");
    await mkdir(dir, { recursive: true });

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
      now.getHours()
    )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const rand = randomBytes(3).toString("hex");
    const safeUser = user.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || "unknown";

    // Nama file: {userid}_{tanggal_jam}_{random}.txt — isi murni input mentah apa adanya
    const filename = `${safeUser}_${stamp}_${rand}.txt`;
    await writeFile(path.join(dir, filename), text, "utf-8");

    return NextResponse.json({ ok: true, saved: true });
  } catch {
    // Fail-safe: kegagalan penyimpanan tidak boleh mengganggu alur utama
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
