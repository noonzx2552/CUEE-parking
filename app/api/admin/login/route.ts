import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'
import { timingSafeEqual } from 'crypto'

const loginAttempts = new Map<string, number[]>()

function tooManyAttempts(ip: string): boolean {
  const now = Date.now()
  const window = 15 * 60 * 1000
  const attempts = (loginAttempts.get(ip) || []).filter(t => now - t < window)
  loginAttempts.set(ip, attempts)
  return attempts.length >= 5
}

function recordAttempt(ip: string) {
  const attempts = loginAttempts.get(ip) || []
  attempts.push(Date.now())
  loginAttempts.set(ip, attempts)
}

function clearAttempts(ip: string) {
  loginAttempts.delete(ip)
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const { username, password } = await req.json()

  if (tooManyAttempts(ip)) {
    return NextResponse.json({ error: 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาที' }, { status: 429 })
  }

  const expectedUser = process.env.ADMIN_USERNAME || 'admin'
  const expectedPass = process.env.ADMIN_PASSWORD || 'admin1234'

  let valid = false
  try {
    valid =
      timingSafeEqual(Buffer.from(expectedUser), Buffer.from(username || '')) &&
      timingSafeEqual(Buffer.from(expectedPass), Buffer.from(password || ''))
  } catch { valid = false }

  if (!valid) {
    recordAttempt(ip)
    return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 })
  }

  clearAttempts(ip)
  const res = NextResponse.json({ ok: true })
  const session = await getIronSession<SessionData>(req, res, sessionOptions)
  session.isAdmin = true
  session.adminUsername = username
  await session.save()
  return res
}
