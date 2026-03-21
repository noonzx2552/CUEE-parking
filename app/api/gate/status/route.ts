export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { validateSignedDeviceRequest } from '@/lib/device-auth'
import { getDb } from '@/lib/mongodb'

export async function GET(req: NextRequest) {
  // Auth: accept x-api-key header or ?api_key= query param for ESP32 GET requests
  const apiKeyHeader = req.headers.get('x-api-key') || ''
  const apiKeyQuery = req.nextUrl.searchParams.get('api_key') || ''
  const apiKey = apiKeyHeader || apiKeyQuery
  const expectedKey = process.env.DEVICE_API_KEY || ''

  if (!expectedKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const slot = req.nextUrl.searchParams.get('slot') || ''
  if (!slot) return NextResponse.json({ error: 'Missing slot param' }, { status: 422 })

  try {
    const db = await getDb()
    const doc = await db.collection('slots').findOne({ slot_name: slot })
    if (!doc) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })

    const gateOpenUntil = doc.gate_open_until ? new Date(doc.gate_open_until).getTime() : 0
    const open = Date.now() < gateOpenUntil

    return NextResponse.json({ slot, open, until: doc.gate_open_until ?? null })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
