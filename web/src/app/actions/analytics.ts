'use server'

import { prisma } from '@/utils/prisma'
import { getUser } from '@/utils/auth'

export async function getPendingTopups() {
  const user = await getUser()
  if (!user || user.role !== 'admin') return { error: 'UNAUTHORIZED' }
  try {
    const data = await prisma.transactions.findMany({
      where: { type: 'topup', status: 'pending' },
      orderBy: { created_at: 'desc' },
      include: { profile: { select: { username: true } } }
    })
    const mappedData = data.map((tx: any) => ({ ...tx, profiles: tx.profile }))
    return { data: mappedData }
  } catch (error) {
    console.error('Pending Data Access Failure:', error)
    return { error: 'DATABASE_ERROR' }
  }
}

export async function getFeatureUsage() {
  const user = await getUser()
  if (!user || user.role !== 'admin') return { error: 'UNAUTHORIZED' }
  try {
    const data = await prisma.transactions.groupBy({
      by: ['type'],
      _count: { id: true },
      where: { status: 'completed', amount: { lt: 0 } }
    })
    return { data: data.map((d: any) => ({ service: d.type, count: d._count.id })) }
  } catch (error) {
    console.error('Feature Usage Error:', error)
    return { error: 'DATABASE_ERROR' }
  }
}
