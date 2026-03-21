import { NextResponse } from 'next/server'
import { getSlots } from '@/lib/parking-repository'

export async function GET() {
  try {
    const slots = await getSlots()
    return NextResponse.json(slots, { headers: { 'Access-Control-Allow-Origin': '*' } })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
