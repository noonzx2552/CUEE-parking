export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'
import { getDb } from '@/lib/mongodb'
import { ensureDefaultSlots } from '@/lib/parking-repository'

export async function GET(req: NextRequest) {
  const res = NextResponse.next()
  const session = await getIronSession<SessionData>(req, res, sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await ensureDefaultSlots()
    const db = await getDb()

    const slots = await db.collection('slots').find({}).sort({ slot_name: 1 }).toArray()
    const activeSessions = await db.collection('parking_sessions').find({ ended: false }).toArray()
    const lineUsers = await db.collection('line_users').find({}).toArray()
    const pwUsers = await db.collection('users').find({}, { projection: { password_hash: 0 } }).toArray()

    // Build user lookup
    const userMap: Record<string, string> = {}
    for (const u of lineUsers) userMap[u.line_user_id] = u.display_name || u.line_user_id
    for (const u of pwUsers) userMap[String(u._id)] = u.display_name || u.username

    // Map active session to each slot
    const sessionBySlot: Record<string, { start_time: string; user_name: string; source: string }> = {}
    for (const s of activeSessions) {
      const userName = s.line_user_id ? (userMap[s.line_user_id] || s.line_user_id) : (s.user_id ? (userMap[s.user_id] || '-') : '-')
      sessionBySlot[s.slot_name] = {
        start_time: s.start_time,
        user_name: userName,
        source: s.source || 'system',
      }
    }

    const result = slots.map(s => ({
      slot_name: s.slot_name as string,
      status: s.status as string,
      updated_at: s.updated_at as string,
      updated_by: s.updated_by as string,
      session: sessionBySlot[s.slot_name] || null,
    }))

    return NextResponse.json({ slots: result })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
