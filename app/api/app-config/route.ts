import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    API_BASE: 'api',
    LINE_LIFF_ID: process.env.LINE_LIFF_ID || '',
    LINE_CLIENT_ID: process.env.LINE_LOGIN_CLIENT_ID || '',
    LINE_OA_ID: process.env.LINE_OA_ID || '',
  })
}
