import { NextResponse } from 'next/server'
import { getParkingLog } from '@/lib/parking-repository'

export async function GET() {
  try {
    const logs = await getParkingLog(50)
    return NextResponse.json(logs)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
