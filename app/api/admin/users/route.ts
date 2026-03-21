export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'
import { getDb } from '@/lib/mongodb'

export async function GET(req: NextRequest) {
  const res = NextResponse.next()
  const session = await getIronSession<SessionData>(req, res, sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const db = await getDb()

    // LINE users
    const lineUsers = await db.collection('line_users').find({}).sort({ linked_at: -1 }).limit(200).toArray()
    // Password users
    const pwUsers = await db.collection('users').find({}, { projection: { password_hash: 0 } }).sort({ created_at: -1 }).limit(200).toArray()
    // Active sessions to find who is parked where
    const activeSessions = await db.collection('parking_sessions').find({ ended: false }).toArray()

    const activeByUser: Record<string, string> = {}
    for (const s of activeSessions) {
      if (s.line_user_id) activeByUser[s.line_user_id] = s.slot_name
    }

    const combined = [
      ...lineUsers.map(u => ({
        id: u.line_user_id,
        name: u.display_name || u.line_user_id,
        type: 'LINE',
        joined: u.linked_at || u.updated_at,
        parked_at: activeByUser[u.line_user_id] || null,
      })),
      ...pwUsers.map(u => ({
        id: String(u._id),
        name: u.display_name || u.username,
        type: 'Password',
        joined: u.created_at,
        parked_at: activeByUser[String(u._id)] || null,
      })),
    ].sort((a, b) => (b.joined || '').localeCompare(a.joined || ''))

    return NextResponse.json({ users: combined })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
