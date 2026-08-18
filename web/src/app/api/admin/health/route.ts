import { NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { prisma } from "@/utils/prisma";
import os from "os";

export const dynamic = "force-dynamic";

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}h ${h}j ${m}m`;
  if (h > 0) return `${h} jam ${m} mnt`;
  return `${m} menit`;
}

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // 1. Database Latency & Health Check
    const dbStart = Date.now();
    let dbStatus = "HEALTHY";
    let dbLatencyMs = 0;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStart;
    } catch (e) {
      dbStatus = "ERROR";
      dbLatencyMs = Date.now() - dbStart;
    }

    // 2. Sortir Banned Queue Telemetry
    const [sortirProcessing, sortirPending, sortirCompletedToday] = await Promise.all([
      prisma.sortir_banned_jobs.count({ where: { status: "processing" } }),
      prisma.sortir_banned_jobs.count({ where: { status: "pending" } }),
      prisma.sortir_banned_jobs.count({
        where: {
          status: "completed",
          created_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    // 3. Extractor Queue Telemetry
    const [extractorProcessing, extractorTotalToday] = await Promise.all([
      prisma.extractor_jobs.count({ where: { status: { in: ["processing_analysis", "uploaded"] } } }),
      prisma.extractor_jobs.count({
        where: {
          created_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    // 4. Memory & VPS Telemetry
    const memUsage = process.memoryUsage();
    const serverUptimeSec = process.uptime();
    const osUptimeSec = os.uptime();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        provider: "PostgreSQL",
      },
      engines: {
        sortirBanned: {
          status: sortirProcessing > 0 ? "PROCESSING" : "READY",
          processing: sortirProcessing,
          pending: sortirPending,
          completedToday: sortirCompletedToday,
        },
        dataExtractor: {
          status: extractorProcessing > 0 ? "PROCESSING" : "READY",
          activeJobs: extractorProcessing,
          totalToday: extractorTotalToday,
        },
        upstreamBotKita: {
          status: "ONLINE",
          endpoint: "https://botkita.online",
        },
      },
      system: {
        platform: os.platform() === "linux" ? "Ubuntu Linux VPS" : `${os.platform()} (${os.arch()})`,
        nodeUptime: formatUptime(serverUptimeSec),
        osUptime: formatUptime(osUptimeSec),
        heapUsed: formatBytes(memUsage.heapUsed),
        heapTotal: formatBytes(memUsage.heapTotal),
        rss: formatBytes(memUsage.rss),
        cpuCount: os.cpus().length,
        freeMem: formatBytes(os.freemem()),
        totalMem: formatBytes(os.totalmem()),
      },
    });
  } catch (err: any) {
    console.error("Admin Health API Error:", err);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: err.message }, { status: 500 });
  }
}
