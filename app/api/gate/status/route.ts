export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'

export async function GET(req: NextRequest) {
  // Auth: accept x-api-key header or ?api_key= query param for ESP32 GET requests
  const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('api_key') || ''
  const expectedKey = process.env.DEVICE_API_KEY || ''
  if (!expectedKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Support multiple slots: ?slot=A1&slot=A2  OR  ?slot=A1,A2
  const slotParams = req.nextUrl.searchParams.getAll('slot')
  const slots = slotParams.flatMap(s => s.split(',')).map(s => s.trim()).filter(Boolean)
  if (slots.length === 0) return NextResponse.json({ error: 'Missing slot param' }, { status: 422 })

  try {
    const db = await getDb()
    const now = Date.now()

    if (slots.length === 1) {
      // Single slot — return flat object (backward compatible)
      const doc = await db.collection('slots').findOne({ slot_name: slots[0] })
      if (!doc) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
      const open = now < (doc.gate_open_until ? new Date(doc.gate_open_until).getTime() : 0)
      return NextResponse.json({ slot: slots[0], open, until: doc.gate_open_until ?? null })
    }

    // Multiple slots — return array
    const docs = await db.collection('slots').find({ slot_name: { $in: slots } }).toArray()
    const result = slots.map(s => {
      const doc = docs.find(d => d.slot_name === s)
      if (!doc) return { slot: s, open: false, until: null, error: 'not found' }
      const open = now < (doc.gate_open_until ? new Date(doc.gate_open_until).getTime() : 0)
      return { slot: s, open, until: doc.gate_open_until ?? null }
    })
    return NextResponse.json({ gates: result })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
