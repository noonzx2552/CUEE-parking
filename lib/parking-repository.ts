import { getDb } from './mongodb'

const SLOTS = (process.env.PARKING_SLOTS || 'A1,A2,A3,A4').split(',').map(s => s.trim())
const SLOT_COL = 'slots'
const SESSION_COL = 'parking_sessions'
const LINE_USERS_COL = 'line_users'

function nowIso() { return new Date().toISOString() }
function randomId(prefix: string) { return prefix + '_' + Buffer.from(crypto.getRandomValues(new Uint8Array(10))).toString('hex') }

export async function ensureDefaultSlots() {
  const db = await getDb()
  const existing = await db.collection(SLOT_COL).find({}, { projection: { slot_name: 1 } }).toArray()
  const names = existing.map(s => s.slot_name as string)
  for (const name of SLOTS) {
    if (!names.includes(name)) {
      const now = nowIso()
      await db.collection(SLOT_COL).insertOne({ _id: `slot_${name}` as any, slot_name: name, status: 'vacant', created_at: now, updated_at: now, updated_by: 'system' })
    }
  }
}

export async function getSlots() {
  await ensureDefaultSlots()
  const db = await getDb()
  const slots = await db.collection(SLOT_COL).find({}).sort({ slot_name: 1 }).toArray()
  return slots.map(s => ({ slot_name: s.slot_name as string, status: s.status as string }))
}

export async function getSlot(slotName: string) {
  await ensureDefaultSlots()
  const db = await getDb()
  return db.collection(SLOT_COL).findOne({ slot_name: slotName })
}

export async function setSlotStatus(slotName: string, status: string, source = 'system') {
  await ensureDefaultSlots()
  const db = await getDb()
  await db.collection(SLOT_COL).updateOne(
    { slot_name: slotName },
    { $set: { slot_name: slotName, status, updated_at: nowIso(), updated_by: source } },
    { upsert: true }
  )
}

export async function endActiveSessions(slotName: string) {
  const db = await getDb()
  const now = nowIso()
  await db.collection(SESSION_COL).updateMany(
    { slot_name: slotName, ended: false },
    { $set: { ended: true, ended_at: now, updated_at: now } }
  )
}

export async function createSession(slotName: string, lineUserId = '', duration?: number, warn?: number, source = 'system') {
  const db = await getDb()
  const now = nowIso()
  const doc = {
    _id: randomId('session') as any,
    slot_name: slotName,
    line_user_id: lineUserId,
    start_time: now,
    duration_minutes: duration ?? parseInt(process.env.DEFAULT_PARKING_DURATION_MINUTES || '35'),
    warn_minutes: warn ?? parseInt(process.env.DEFAULT_WARNING_MINUTES || '20'),
    ended: false,
    source,
    created_at: now,
    updated_at: now,
  }
  await db.collection(SESSION_COL).insertOne(doc)
  return doc
}

export async function getLatestActiveSession(slotName: string) {
  const db = await getDb()
  return db.collection(SESSION_COL).findOne({ slot_name: slotName, ended: false }, { sort: { created_at: -1 } })
}

export async function attachLineUserToActiveSession(slotName: string, lineUserId: string) {
  const session = await getLatestActiveSession(slotName)
  if (!session) return false
  const db = await getDb()
  await db.collection(SESSION_COL).updateOne(
    { _id: session._id },
    { $set: { line_user_id: lineUserId, updated_at: nowIso() } }
  )
  return true
}

export async function upsertLineUser(lineUserId: string, displayName: string) {
  const db = await getDb()
  const now = nowIso()
  await db.collection(LINE_USERS_COL).updateOne(
    { line_user_id: lineUserId },
    { $set: { line_user_id: lineUserId, display_name: displayName, linked_at: now, updated_at: now } },
    { upsert: true }
  )
}

export async function getParkingLog(limit = 50) {
  const db = await getDb()
  return db.collection(SESSION_COL).find({}).sort({ created_at: -1 }).limit(limit).toArray()
}
