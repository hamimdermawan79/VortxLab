'use server'

import { revalidatePath } from 'next/cache'
import { getUser } from '@/utils/auth'
import { prisma } from '@/utils/prisma'

export async function getLinkMetadata() {
  try {
    const products = await prisma.products.findMany({ select: { sku: true, name: true, is_active: true }, orderBy: { sku: 'asc' } })
    const compatProducts = products.map((p: any) => ({ sku: p.sku, name: p.name, download_url: null as string | null, tutorial_url: null as string | null, is_download_enabled: false, is_tutorial_enabled: false }))
    return { products: compatProducts, settings: [] }
  } catch (err: any) {
    console.error('Settings Fetch Failure:', err)
    return { error: 'FETCH_FAILED' }
  }
}

export async function updateProduct(sku: string, updates: any) {
  const user = await getUser()
  if (!user || user.role !== 'admin') return { error: 'UNAUTHORIZED' }
  try {
    await prisma.products.update({ where: { sku }, data: updates })
    revalidatePath('/admin')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error('Product Update Failure:', err)
    return { error: 'DATABASE_ERROR' }
  }
}
