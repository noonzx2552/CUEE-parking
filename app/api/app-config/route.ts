import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    API_BASE: 'api',
    LINE_LIFF_ID: process.env.LINE_LIFF_ID || '',
  })
}
