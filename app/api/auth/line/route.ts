import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'
import { upsertLineUser } from '@/lib/parking-repository'
import { pushMessage, isLineConfigured } from '@/lib/line-client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code') || ''
  const error = searchParams.get('error') || ''
  const stateParam = searchParams.get('state') || ''

  const base = process.env.NEXTAUTH_URL || new URL(req.url).origin

  // ถ้า state เป็น URL ของ login page ให้ redirect กลับไปที่ home แทน
  let afterLoginUrl = `${base}/`
  try {
    const stateUrl = new URL(decodeURIComponent(stateParam))
    if (stateUrl.origin === base) {
      afterLoginUrl = `${base}/`
    }
  } catch { /* ignore */ }

  if (error || !code) return NextResponse.redirect(`${afterLoginUrl}?line=cancel`)

  const clientId = process.env.LINE_LOGIN_CLIENT_ID || ''
  const clientSecret = process.env.LINE_LOGIN_CLIENT_SECRET || ''
  const redirectUri = `${base}/api/auth/line`

  if (!clientId || !clientSecret) return NextResponse.redirect(`${afterLoginUrl}?line=error`)

  const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret }),
  })
  const tokenData = await tokenRes.json()
  const accessToken = tokenData.access_token || ''
  if (!accessToken) return NextResponse.redirect(`${afterLoginUrl}?line=error`)

  const profileRes = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const profile = await profileRes.json()
  const userId = profile.userId || ''
  const displayName = profile.displayName || ''
  if (!userId) return NextResponse.redirect(`${afterLoginUrl}?line=error`)

  const res = NextResponse.redirect(`${afterLoginUrl}?line=ok&name=${encodeURIComponent(displayName)}&uid=${encodeURIComponent(userId)}`)
  const session = await getIronSession<SessionData>(req, res, sessionOptions)
  session.lineUserId = userId
  session.lineName = displayName
  await session.save()

  try { await upsertLineUser(userId, displayName) } catch { /* ignore */ }

  if (isLineConfigured()) {
    pushMessage(userId, [{
      type: 'text',
      text: `ยินดีต้อนรับสู่ SmartPark! 🎉\nสวัสดีคุณ ${displayName}\n\nคุณเชื่อมต่อ LINE กับระบบเรียบร้อยแล้ว\nระบบจะแจ้งเตือนค่าจอดรถผ่าน LINE นี้\n\nพิมพ์ "สถานะ" เพื่อดูช่องจอดว่าง`,
    }]).catch(() => {})
  }

  return res
}
