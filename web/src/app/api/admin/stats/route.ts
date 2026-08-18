import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { getUser } from '@/utils/auth';
import { safeErrorResponse } from '@/utils/security';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date) {
  const d = new Date(date);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function getDirStats(dir: string): { count: number; sizeBytes: number } {
  let count = 0;
  let sizeBytes = 0;
  if (!fs.existsSync(dir)) return { count, sizeBytes };

  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const sub = getDirStats(filePath);
      count += sub.count;
      sizeBytes += sub.sizeBytes;
    } else {
      count++;
      sizeBytes += stat.size;
    }
  }
  return { count, sizeBytes };
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const storageStats = getDirStats(uploadsDir);

    const now = new Date();
    const startOfToday = startOfDay(now);
    const startOfYesterday = startOfDay(new Date(now.getTime() - 24 * 60 * 60 * 1000));
    const startOfThisMonth = startOfMonth(now);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Visitor Analytics
    const [visitorViewsToday, uniqueVisitorsTodayRaw] = await Promise.all([
      prisma.visitor_logs.count({ where: { created_at: { gte: startOfToday } } }),
      prisma.visitor_logs.findMany({
        where: { created_at: { gte: startOfToday } },
        select: { ip_hash: true },
        distinct: ['ip_hash'],
      }),
    ]);
    const uniqueVisitorsToday = uniqueVisitorsTodayRaw.length;

    // 30 Days Visitor Trend
    const visitorLogs30d = await prisma.visitor_logs.findMany({
      where: { created_at: { gte: thirtyDaysAgo } },
      select: { created_at: true, ip_hash: true, path: true },
    });

    const visitorTrendMap: Record<string, { views: number; uniqueIps: Set<string> }> = {};
    visitorLogs30d.forEach((log) => {
      const dateStr = log.created_at.toISOString().split('T')[0];
      if (!visitorTrendMap[dateStr]) {
        visitorTrendMap[dateStr] = { views: 0, uniqueIps: new Set() };
      }
      visitorTrendMap[dateStr].views += 1;
      visitorTrendMap[dateStr].uniqueIps.add(log.ip_hash);
    });

    const visitorTrend30d = Object.entries(visitorTrendMap)
      .map(([date, data]) => ({
        date,
        views: data.views,
        unique: data.uniqueIps.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 2. Revenue Calculations
    const [revenueToday, revenueYesterday, topupThisMonth, pendingApprovals, totalCirculation] = await Promise.all([
      prisma.transactions.aggregate({
        _sum: { amount: true },
        where: { type: 'topup', status: 'completed', created_at: { gte: startOfToday } }
      }),
      prisma.transactions.aggregate({
        _sum: { amount: true },
        where: { type: 'topup', status: 'completed', created_at: { gte: startOfYesterday, lt: startOfToday } }
      }),
      prisma.transactions.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { type: 'topup', status: 'completed', created_at: { gte: startOfThisMonth } }
      }),
      prisma.transactions.count({ where: { type: 'topup', status: 'pending' } }),
      prisma.profiles.aggregate({ _sum: { vcoin_balance: true } })
    ]);

    // Active users in 7 days
    const activeUserTransactions = await prisma.transactions.findMany({
      select: { user_id: true },
      where: { created_at: { gte: sevenDaysAgo } },
      distinct: ['user_id']
    });
    const activeUsers7d = activeUserTransactions.length;

    // Topup 30d Trend
    const topUpTrend30dRaw = await prisma.transactions.groupBy({
      by: ['created_at'],
      where: { type: 'topup', status: 'completed', created_at: { gte: thirtyDaysAgo } },
      _sum: { amount: true }
    });

    const dailyTrendMap: Record<string, number> = {};
    topUpTrend30dRaw.forEach(item => {
      const dateStr = item.created_at.toISOString().split('T')[0];
      dailyTrendMap[dateStr] = (dailyTrendMap[dateStr] || 0) + (item._sum.amount || 0);
    });

    const topUpTrend30dFormatted = Object.entries(dailyTrendMap)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Service revenue
    const activeServicesList = ['sortir-banned', 'data-extractor', 'intip-nomor', 'cek-info-akun'];
    const serviceConfigs = await prisma.service_configs.findMany({
      select: { service_type: true, cost_per_id: true }
    });
    const serviceConfigMap = serviceConfigs.reduce((acc, config) => {
      acc[config.service_type] = config.cost_per_id;
      return acc;
    }, {} as Record<string, number>);

    const serviceTransactions = await prisma.transactions.groupBy({
      by: ['type'],
      where: { type: { in: activeServicesList }, status: 'completed' },
      _sum: { amount: true }
    });

    const revenueByService = serviceTransactions.map(item => {
      const costPerId = serviceConfigMap[item.type] || 20;
      const idsProcessed = Math.abs(item._sum.amount || 0) / costPerId;
      const revenue = idsProcessed * costPerId;
      return { service: item.type, revenue };
    });

    // Top spenders in 7 days
    const topSpenders7d = await prisma.transactions.groupBy({
      by: ['user_id'],
      where: { type: { in: activeServicesList }, status: 'completed', created_at: { gte: sevenDaysAgo } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5
    });

    const topSpendersWithNames: any[] = [];
    for (const spender of topSpenders7d) {
      const profile = await prisma.profiles.findUnique({
        where: { id: spender.user_id },
        select: { username: true }
      });
      if (profile) {
        topSpendersWithNames.push({
          username: profile.username,
          total_spent: Math.abs(spender._sum.amount || 0)
        });
      }
    }

    // Recent transactions
    const recentActivity = await prisma.transactions.findMany({
      take: 10,
      orderBy: { created_at: 'desc' },
      include: { profile: { select: { username: true } } }
    });

    // Multi-series feature trend 30d
    const FEATURE_COLORS: Record<string, string> = {
      'sortir-banned': '#dc2626',
      'data-extractor': '#0891b2',
      'intip-nomor': '#f59e0b',
      'cek-info-akun': '#8b5cf6',
    };
    const FEATURE_LABELS: Record<string, string> = {
      'sortir-banned': 'Sortir Banned',
      'data-extractor': 'Data Extractor',
      'intip-nomor': 'Intip Nomor',
      'cek-info-akun': 'Cek Info Akun',
    };

    const featureTx30d = await prisma.transactions.findMany({
      where: { type: { in: activeServicesList }, status: 'completed', created_at: { gte: thirtyDaysAgo } },
      select: { type: true, amount: true, created_at: true }
    });

    const trendMap: Record<string, Record<string, number>> = {};
    const trendDates = new Set<string>();
    featureTx30d.forEach((t: any) => {
      const dateStr = t.created_at.toISOString().split('T')[0];
      trendDates.add(dateStr);
      if (!trendMap[dateStr]) trendMap[dateStr] = {};
      const cost = serviceConfigMap[t.type] || 20;
      const idsProcessed = Math.abs(t.amount) / cost;
      trendMap[dateStr][t.type] = (trendMap[dateStr][t.type] || 0) + idsProcessed;
    });

    const sortedDates = Array.from(trendDates).sort();
    const activeTypes = new Set(featureTx30d.map((t: any) => t.type));
    const featureTrend30d = {
      labels: sortedDates,
      series: activeServicesList
        .filter(type => activeTypes.has(type))
        .map(type => ({
          key: type,
          label: FEATURE_LABELS[type] || type,
          color: FEATURE_COLORS[type] || '#94a3b8',
          data: sortedDates.map(date => Math.round((trendMap[date]?.[type] || 0) * 100) / 100),
        })),
    };

    const totalUsers = await prisma.profiles.count();
    const totalVolume = await prisma.transactions.aggregate({ _sum: { amount: true }, where: { type: 'topup', status: 'completed' } });

    return NextResponse.json({
      totalUsers,
      totalVolume: totalVolume._sum.amount || 0,
      visitors: {
        viewsToday: visitorViewsToday,
        uniqueToday: uniqueVisitorsToday,
        trend30d: visitorTrend30d,
      },
      storage: {
        totalFiles: storageStats.count,
        totalSizeBytes: storageStats.sizeBytes,
        totalSizeFormatted: formatBytes(storageStats.sizeBytes),
      },
      revenueToday: revenueToday._sum.amount || 0,
      revenueYesterday: revenueYesterday._sum.amount || 0,
      topupThisMonth: {
        sum: topupThisMonth._sum.amount || 0,
        count: topupThisMonth._count
      },
      pendingApprovals,
      totalCirculation: totalCirculation._sum.vcoin_balance || 0,
      activeUsers7d,
      topUpTrend30d: topUpTrend30dFormatted,
      revenueByService,
      topSpenders7d: topSpendersWithNames,
      recentActivity,
      featureTrend30d
    });
  } catch (error: any) {
    return safeErrorResponse(error, 'Gagal memuat statistik sistem.');
  }
}
