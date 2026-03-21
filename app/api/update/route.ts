export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSlot, setSlotStatus, endActiveSessions, createSession } from '@/lib/parking-repository'
import { validateSignedDeviceRequest } from '@/lib/device-auth'

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const data = JSON.parse(rawBody || '{}')
    const slot = (data.slot || '').trim()
    const status = (data.status || '').trim()
    const source = (data.source || 'auto').trim()

    if (source === 'sensor' && !validateSignedDeviceRequest(rawBody, req.headers)) {
      return NextResponse.json({ error: 'Unauthorized device request.' }, { status: 401 })
    }

    if (!slot || !['vacant', 'occupied'].includes(status)) {
      return NextResponse.json({ error: 'Invalid slot or status.' }, { status: 422 })
    }

    const current = await getSlot(slot)
    const currentStatus = current?.status || ''
    await setSlotStatus(slot, status, source)

    if (status !== currentStatus) {
      if (status === 'occupied') {
        await endActiveSessions(slot)
        await createSession(slot, '', undefined, undefined, source)
      } else {
        await endActiveSessions(slot)
      }
    }

    return NextResponse.json({ success: true, slot, status, changed: status !== currentStatus })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
