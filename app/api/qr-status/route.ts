export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'

async function getGen() {
  const db = await getDb()
  const doc = await db.collection('config').findOne({ _id: 'qr_gen' as any })
  return (doc?.count as number) || 0
}

// GET: return current generation
export async function GET() {
  try {
    const gen = await getGen()
    return NextResponse.json({ gen })
  } catch {
    return NextResponse.json({ gen: 0 })
  }
}

// POST: increment generation (called when QR is scanned)
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json().catch(() => ({}))
    const db = await getDb()
    const result = await db.collection('config').findOneAndUpdate(
      { _id: 'qr_gen' as any },
      { $inc: { count: 1 }, $set: { last_token: token, updated_at: new Date().toISOString() } },
      { upsert: true, returnDocument: 'after' }
    )
    return NextResponse.json({ gen: result?.count || 1 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
