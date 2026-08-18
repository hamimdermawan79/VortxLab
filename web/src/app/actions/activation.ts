'use server'

import { revalidatePath } from 'next/cache'
import { getUser } from '@/utils/auth'
import { prisma } from '@/utils/prisma'
import crypto from 'crypto'

// SECRET_SALT dipindah ke env. Nilai lama (hardcode di repo) SUDAH BOCOR — wajib rotasi.
const rawSecret = process.env.LICENSE_SIGNING_SECRET;
if (!rawSecret) throw new Error('LICENSE_SIGNING_SECRET is not set in environment variables');
const SECRET_SALT: string = rawSecret;
const NEW_ADMIN_TOOLS = ['mac-extractor', 'mac-splitter', 'nomac-extractor', 'xml-conf', 'result-proc'] as const;
const LEGACY_TOOL = 'data-checker' as const;
const VALID_GENERATOR_PRODUCTS: readonly string[] = [...NEW_ADMIN_TOOLS, LEGACY_TOOL];

export async function activateProduct(productId: string, hwid: string, days: number) {
  const user = await getUser()
  if (!user) return { error: 'UNAUTHORIZED' }
  if (!VALID_GENERATOR_PRODUCTS.includes(productId)) return { error: 'INVALID_PRODUCT', details: `Product '${productId}' is not authorized for license generation.` }
  const product = await prisma.products.findUnique({ where: { sku: productId }, select: { sku: true } })
  if (!product) return { error: 'PRODUCT_NOT_FOUND' }
  const expiryTs = Math.floor(Date.now() / 1000) + (Math.max(days, 1) * 86400);
  const payload = { h: hwid, p: product.sku, exp: expiryTs };
  let finalSignedToken: string;
  if (productId === LEGACY_TOOL) {
    const rawStr = `${hwid.toUpperCase()}-New Checker-${SECRET_SALT}`;
    finalSignedToken = crypto.createHash('sha256').update(rawStr).digest('hex').toUpperCase();
  } else if ((NEW_ADMIN_TOOLS as readonly string[]).includes(productId)) {
    const sortedPayload = Object.keys(payload).sort().reduce((acc: any, key) => { acc[key] = (payload as any)[key]; return acc; }, {});
    const jsonStr = JSON.stringify(sortedPayload);
    const b64Payload = Buffer.from(jsonStr).toString('base64');
    const signature = crypto.createHmac('sha256', SECRET_SALT).update(b64Payload).digest('hex').toUpperCase();
    finalSignedToken = `${b64Payload}.${signature}`;
  } else {
    return { error: 'ROUTING_ERROR' }
  }
  const costPerDay = productId === 'data-checker' ? 150 : 100;
  const totalCost = Math.max(days, 1) * costPerDay;
  const expiresAt = new Date(expiryTs * 1000);
  try {
    const profile = await prisma.profiles.findUnique({ where: { id: user.id } })
    if (!profile || profile.vcoin_balance < totalCost) return { error: 'INSUFFICIENT_BALANCE' }
    await prisma.$transaction([
      prisma.profiles.update({ where: { id: user.id }, data: { vcoin_balance: { decrement: totalCost } } }),
      prisma.transactions.create({ data: { user_id: user.id, type: 'activation', amount: -totalCost, status: 'completed', meta_data: { product_sku: productId, days, hwid, license_key: finalSignedToken } } }),
      prisma.licenses.create({ data: { user_id: user.id, product_sku: productId, product_name: product.sku, expires_at: expiresAt } })
    ]);
    revalidatePath('/dashboard')
    return { success: true, licenseKey: finalSignedToken, expiryDate: expiresAt.toISOString(), cost: totalCost }
  } catch (err: any) {
    console.error('Activation Error:', err)
    return { error: 'DATABASE_ERROR', details: err.message }
  }
}
