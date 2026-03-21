export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSlot, setSlotStatus, endActiveSessions, createSession } from '@/lib/parking-repository'
import { validateSignedDeviceRequest } from '@/lib/device-auth'
import { getDb } from '@/lib/mongodb'

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const data = JSON.parse(rawBody || '{}')
    const slot = (data.slot || '').trim()
    const status = (data.status || '').trim()
    const source = (data.source || 'auto').trim()
    const lineUserId = (data.line_user_id || '').trim()

    if (source === 'sensor' && !validateSignedDeviceRequest(rawBody, req.headers)) {
      return NextResponse.json({ error: 'Unauthorized device request.' }, { status: 401 })
    }

    if (!slot || !['vacant', 'occupied'].includes(status)) {
      return NextResponse.json({ error: 'Invalid slot or status.' }, { status: 422 })
    }

    const current = await getSlot(slot)
    const currentStatus = current?.status || ''
    await setSlotStatus(slot, status, source)

    const changed = status !== currentStatus
    if (changed) {
      if (status === 'occupied') {
        await endActiveSessions(slot)
        await createSession(slot, lineUserId, undefined, undefined, source)
      } else {
        await endActiveSessions(slot)
      }
    }

    // Open gate for 8 seconds on entry OR exit
    const shouldOpenGate = changed || source === 'checkout'
    if (shouldOpenGate) {
      const db = await getDb()
      await db.collection('slots').updateOne(
        { slot_name: slot },
        { $set: { gate_open_until: new Date(Date.now() + 8000).toISOString() } }
      )
    }

    return NextResponse.json({ success: true, slot, status, changed })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
