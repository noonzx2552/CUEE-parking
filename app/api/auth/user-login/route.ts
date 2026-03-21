import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'
import { getDb } from '@/lib/mongodb'

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) {
      return NextResponse.json({ status: 'error', message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' }, { status: 422 })
    }

    const clean = username.trim().toLowerCase()
    if (clean.length < 2) {
      return NextResponse.json({ status: 'error', message: 'ชื่อผู้ใช้ต้องมีอย่างน้อย 2 ตัวอักษร' }, { status: 422 })
    }
    if (password.length < 4) {
      return NextResponse.json({ status: 'error', message: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' }, { status: 422 })
    }

    const db = await getDb()
    const col = db.collection('users')
    const hashed = await hashPassword(password)

    const existing = await col.findOne({ username: clean })

    if (existing) {
      if (existing.password_hash !== hashed) {
        return NextResponse.json({ status: 'error', message: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 })
      }
      // Login success
      const res = NextResponse.json({ status: 'success', userId: existing._id, userName: existing.display_name || clean })
      const session = await getIronSession<SessionData>(req, res, sessionOptions)
      session.userId = String(existing._id)
      session.userName = existing.display_name || clean
      session.loginType = 'password'
      await session.save()
      return res
    } else {
      // Auto-register
      const now = new Date().toISOString()
      const doc = {
        username: clean,
        display_name: username.trim(),
        password_hash: hashed,
        created_at: now,
        updated_at: now,
      }
      const result = await col.insertOne(doc)
      const res = NextResponse.json({ status: 'success', userId: String(result.insertedId), userName: username.trim(), isNew: true })
      const session = await getIronSession<SessionData>(req, res, sessionOptions)
      session.userId = String(result.insertedId)
      session.userName = username.trim()
      session.loginType = 'password'
      await session.save()
      return res
    }
  } catch (e) {
    return NextResponse.json({ status: 'error', message: (e as Error).message }, { status: 500 })
  }
}
