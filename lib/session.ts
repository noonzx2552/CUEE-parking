import { SessionOptions } from 'iron-session'

export interface SessionData {
  isAdmin?: boolean
  adminUsername?: string
  lineUserId?: string
  lineName?: string
  userId?: string
  userName?: string
  loginType?: 'line' | 'password'
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'fallback-secret-change-in-production-32',
  cookieName: 'smartpark_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
}
