import { NextRequest, NextResponse } from 'next/server'
import { attachLineUserToActiveSession } from '@/lib/parking-repository'
import { isLineConfigured, pushParkingTicket } from '@/lib/line-client'

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const slot = (data.slot || '').trim()
    const lineUserId = (data.user_id || '').trim()
    const entranceTime = (data.entrance_time || new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })).trim()

    if (!slot) return NextResponse.json({ status: 'error', message: 'Slot is required.' }, { status: 422 })

    let linked = false
    if (lineUserId) {
      linked = await attachLineUserToActiveSession(slot, lineUserId)
      if (isLineConfigured()) {
        await pushParkingTicket(lineUserId, slot, entranceTime)
      }
    }

    return NextResponse.json({ status: 'success', slot, line_linked: linked })
  } catch (e) {
    return NextResponse.json({ status: 'error', message: (e as Error).message }, { status: 500 })
  }
}
