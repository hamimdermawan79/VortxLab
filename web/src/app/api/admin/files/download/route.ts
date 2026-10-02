import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { safeErrorResponse } from "@/utils/security";
import { getUploadsDir } from "@/utils/uploads";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const relPath = searchParams.get("file");

    if (!relPath) {
      return NextResponse.json({ error: "MISSING_FILE", message: "Parameter file diperlukan." }, { status: 400 });
    }

    const uploadsDir = getUploadsDir();
    const safePath = path.normalize(path.join(uploadsDir, relPath));

    if (!safePath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: "FORBIDDEN", message: "Path traversal tidak diizinkan." }, { status: 403 });
    }

    if (!fs.existsSync(safePath) || fs.statSync(safePath).isDirectory()) {
      return NextResponse.json({ error: "NOT_FOUND", message: "File tidak ditemukan di server." }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(safePath);
    const fileName = path.basename(safePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (err: any) {
    return safeErrorResponse(err, "Gagal mengunduh file admin.");
  }
}
