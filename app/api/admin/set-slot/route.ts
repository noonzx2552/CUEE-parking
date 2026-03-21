import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'
import { setSlotStatus, endActiveSessions, createSession } from '@/lib/parking-repository'

export async function POST(req: NextRequest) {
  const res = NextResponse.next()
  const session = await getIronSession<SessionData>(req, res, sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { slot, status } = await req.json()
    if (!slot || !['vacant', 'occupied'].includes(status)) {
      return NextResponse.json({ error: 'Invalid slot or status' }, { status: 422 })
    }

    await setSlotStatus(slot, status, 'admin')
    await endActiveSessions(slot)
    if (status === 'occupied') {
      await createSession(slot, '', undefined, undefined, 'admin')
    }

    return NextResponse.json({ success: true, slot, status })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
