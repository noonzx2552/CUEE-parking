'use client'
import { useState, useEffect, useCallback } from 'react'

interface Slot { slot_name: string; status: string }
interface Session {
  _id: string; slot_name: string; line_user_id?: string
  start_time: string; ended: boolean; ended_at?: string; source?: string
}
interface User {
  id: string; name: string; type: string; joined: string; parked_at: string | null
}

type Tab = 'status' | 'history' | 'users'

function formatDuration(start: string, end?: string) {
  const ms = new Date(end || new Date()).getTime() - new Date(start).getTime()
  if (ms < 0) return '-'
  const m = Math.floor(ms / 60000)
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}ชม. ${m % 60}น.` : `${m}น.`
}
function formatTime(iso: string) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginErr, setLoginErr] = useState('')
  const [tab, setTab] = useState<Tab>('status')
  const [slots, setSlots] = useState<Slot[]>([])
  const [history, setHistory] = useState<Session[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const loadSlots = useCallback(async () => {
    const r = await fetch('/api/admin/status')
    if (r.status === 401) { setAuthed(false); return }
    const d = await r.json(); setSlots(d.slots || [])
  }, [])

  const loadHistory = useCallback(async () => {
    const r = await fetch('/api/admin/history?limit=100')
    if (r.ok) { const d = await r.json(); setHistory(d.sessions || []) }
  }, [])

  const loadUsers = useCallback(async () => {
    const r = await fetch('/api/admin/users')
    if (r.ok) { const d = await r.json(); setUsers(d.users || []) }
  }, [])

  useEffect(() => {
    fetch('/api/admin/status').then(r => {
      if (r.status === 401) setAuthed(false)
      else { setAuthed(true); r.json().then(d => setSlots(d.slots || [])) }
    }).catch(() => setAuthed(false))
  }, [])

  useEffect(() => {
    if (!authed) return
    const id = setInterval(loadSlots, 5000)
    return () => clearInterval(id)
  }, [authed, loadSlots])

  useEffect(() => {
    if (!authed) return
    if (tab === 'history') loadHistory()
    if (tab === 'users') loadUsers()
  }, [tab, authed, loadHistory, loadUsers])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoginErr('')
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
    if (r.ok) { setAuthed(true); loadSlots() }
    else { const d = await r.json(); setLoginErr(d.error || 'เกิดข้อผิดพลาด') }
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    setAuthed(false); setSlots([]); setHistory([]); setUsers([])
  }

  async function setSlotStatus(slot: string, status: 'occupied' | 'vacant') {
    setLoading(`${slot}-${status}`)
    const r = await fetch('/api/admin/set-slot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slot, status }) })
    setLoading(null)
    if (r.ok) { showToast(`${slot} → ${status === 'occupied' ? '🔴 มีรถ' : '🟢 ว่าง'}`); loadSlots() }
    else showToast('เกิดข้อผิดพลาด')
  }

  // ── LOGIN ─────────────────────────────────────────────────────────
  if (authed === null) return (
    <div style={{ background: '#050816', minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#fff', fontFamily: 'Prompt,sans-serif', fontSize: 14 }}>
      กำลังตรวจสอบ...
    </div>
  )

  if (!authed) return (
    <>
      <style>{loginStyle}</style>
      <div className="login-bg">
        <div className="login-bg1" /><div className="login-bg2" />
        <form className="login-card" onSubmit={handleLogin}>
          <div className="login-logo">SP</div>
          <div className="login-title">ADMIN LOGIN</div>
          <div className="login-sub">SmartPark Dashboard</div>
          {loginErr && <div className="login-err">{loginErr}</div>}
          <div className="login-field">
            <label>USERNAME</label>
            <input value={username} onChange={e => setUsername(e.target.value)} type="text" required autoComplete="username" />
          </div>
          <div className="login-field">
            <label>PASSWORD</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" required autoComplete="current-password" />
          </div>
          <button type="submit" className="login-btn">เข้าสู่ระบบ</button>
        </form>
      </div>
    </>
  )

  // ── DASHBOARD ─────────────────────────────────────────────────────
  const vacant = slots.filter(s => s.status === 'vacant').length
  const occupied = slots.filter(s => s.status === 'occupied').length

  return (
    <>
      <style>{dashStyle}</style>

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      {/* Top bar */}
      <div className="topbar">
        <div className="topbar-left">
          <div className="topbar-logo">SP</div>
          <div>
            <div className="topbar-title">SmartPark Admin</div>
            <div className="topbar-live"><span className="live-dot" />LIVE</div>
          </div>
        </div>
        <button className="btn-logout" onClick={handleLogout}>ออกจากระบบ</button>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card"><div className="stat-num blue">{slots.length}</div><div className="stat-lbl">ช่องทั้งหมด</div></div>
        <div className="stat-card"><div className="stat-num green">{vacant}</div><div className="stat-lbl">ว่าง</div></div>
        <div className="stat-card"><div className="stat-num red">{occupied}</div><div className="stat-lbl">ไม่ว่าง</div></div>
        <div className="stat-card"><div className="stat-num purple">{users.length || '-'}</div><div className="stat-lbl">ผู้ใช้</div></div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {(['status', 'history', 'users'] as Tab[]).map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'status' ? '🅿️ สถานะ' : t === 'history' ? '📋 ประวัติ' : '👥 ผู้ใช้'}
          </button>
        ))}
      </div>

      <div className="content">

        {/* ── TAB: STATUS ──────────────────────────────────────── */}
        {tab === 'status' && (
          <div className="slots-grid">
            {slots.map(s => {
              const isOcc = s.status === 'occupied'
              const busyEnter = loading === `${s.slot_name}-occupied`
              const busyExit = loading === `${s.slot_name}-vacant`
              return (
                <div key={s.slot_name} className={`slot-card ${isOcc ? 'occ' : 'vac'}`}>
                  <div className="slot-header">
                    <div className="slot-name">{s.slot_name}</div>
                    <div className={`slot-badge ${isOcc ? 'badge-occ' : 'badge-vac'}`}>
                      {isOcc ? '🔴 มีรถ' : '🟢 ว่าง'}
                    </div>
                  </div>
                  <div className="slot-actions">
                    <button
                      className="btn-enter"
                      disabled={isOcc || !!loading}
                      onClick={() => setSlotStatus(s.slot_name, 'occupied')}
                    >
                      {busyEnter ? '⏳' : '🚗 รถเข้า'}
                    </button>
                    <button
                      className="btn-exit"
                      disabled={!isOcc || !!loading}
                      onClick={() => setSlotStatus(s.slot_name, 'vacant')}
                    >
                      {busyExit ? '⏳' : '↩️ รถออก'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── TAB: HISTORY ─────────────────────────────────────── */}
        {tab === 'history' && (
          <div>
            <div className="section-header">
              <span>ประวัติการจอดรถ ({history.length} รายการ)</span>
              <button className="btn-refresh" onClick={loadHistory}>↻ รีเฟรช</button>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>ช่อง</th><th>เวลาเข้า</th><th>เวลาออก</th><th>ระยะเวลา</th><th>ผู้ใช้</th><th>แหล่งที่มา</th><th>สถานะ</th></tr>
                </thead>
                <tbody>
                  {history.length === 0 && (
                    <tr><td colSpan={7} className="empty">ไม่มีข้อมูล</td></tr>
                  )}
                  {history.map((s, i) => (
                    <tr key={i} className={s.ended ? '' : 'row-active'}>
                      <td><span className="slot-pill">{s.slot_name}</span></td>
                      <td>{formatTime(s.start_time)}</td>
                      <td>{s.ended_at ? formatTime(s.ended_at) : <span className="badge-now">กำลังจอด</span>}</td>
                      <td>{formatDuration(s.start_time, s.ended_at)}</td>
                      <td className="user-cell">{s.line_user_id ? <span className="line-tag">LINE</span> : <span className="sys-tag">-</span>}</td>
                      <td><span className="src-tag">{s.source || 'system'}</span></td>
                      <td>{s.ended ? <span className="badge-end">จบแล้ว</span> : <span className="badge-now">ใช้งาน</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB: USERS ───────────────────────────────────────── */}
        {tab === 'users' && (
          <div>
            <div className="section-header">
              <span>ผู้ใช้ทั้งหมด ({users.length} คน)</span>
              <button className="btn-refresh" onClick={loadUsers}>↻ รีเฟรช</button>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>ชื่อ</th><th>ประเภท</th><th>จอดอยู่ที่</th><th>วันที่สมัคร</th></tr>
                </thead>
                <tbody>
                  {users.length === 0 && (
                    <tr><td colSpan={4} className="empty">ไม่มีผู้ใช้</td></tr>
                  )}
                  {users.map((u, i) => (
                    <tr key={i} className={u.parked_at ? 'row-active' : ''}>
                      <td className="user-name">{u.name}</td>
                      <td>
                        {u.type === 'LINE'
                          ? <span className="line-tag">LINE</span>
                          : <span className="pw-tag">Password</span>}
                      </td>
                      <td>
                        {u.parked_at
                          ? <span className="slot-pill">{u.parked_at}</span>
                          : <span className="none-tag">-</span>}
                      </td>
                      <td className="date-cell">{formatTime(u.joined)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const loginStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Prompt',sans-serif;background:#050816;min-height:100vh}
  .login-bg{min-height:100vh;display:grid;place-items:center;padding:24px;position:relative;overflow:hidden}
  .login-bg1{position:fixed;top:-80px;left:-80px;width:360px;height:360px;background:radial-gradient(circle,rgba(88,166,255,.18),transparent 70%);pointer-events:none}
  .login-bg2{position:fixed;bottom:-60px;right:-60px;width:300px;height:300px;background:radial-gradient(circle,rgba(188,140,255,.14),transparent 70%);pointer-events:none}
  .login-card{position:relative;z-index:1;width:100%;max-width:400px;background:rgba(12,18,32,.95);border:1px solid rgba(255,255,255,.09);border-radius:24px;padding:36px 28px;color:#e6edf3}
  .login-logo{width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,#58a6ff,#bc8cff);display:grid;place-items:center;font-weight:900;font-size:18px;margin-bottom:18px;font-family:monospace}
  .login-title{font-size:24px;font-weight:700;font-family:monospace;margin-bottom:4px}
  .login-sub{color:#555577;font-size:13px;margin-bottom:22px}
  .login-err{background:rgba(248,81,73,.12);border:1px solid rgba(248,81,73,.3);color:#fca5a5;border-radius:12px;padding:10px 14px;font-size:13px;margin-bottom:16px}
  .login-field{margin-bottom:16px}
  .login-field label{display:block;font-size:11px;color:#555577;letter-spacing:.05em;margin-bottom:7px;font-weight:600}
  .login-field input{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:13px 16px;color:#e6edf3;font-family:'Prompt',sans-serif;font-size:14px;outline:none}
  .login-field input:focus{border-color:#58a6ff;box-shadow:0 0 0 3px rgba(88,166,255,.15)}
  .login-btn{width:100%;background:linear-gradient(135deg,#1f6feb,#58a6ff);border:none;border-radius:13px;padding:14px;color:#fff;font-family:'Prompt',sans-serif;font-size:15px;font-weight:700;cursor:pointer;margin-top:4px}
  .login-btn:hover{filter:brightness(1.08)}
`

const dashStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#050816;color:#e6edf3;font-family:'Prompt',sans-serif;min-height:100vh}

  .toast{position:fixed;top:18px;left:50%;transform:translateX(-50%);background:#1e293b;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px 22px;font-size:13px;font-weight:600;z-index:999;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.4)}

  .topbar{background:rgba(8,12,24,.96);border-bottom:1px solid rgba(255,255,255,.07);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}
  .topbar-left{display:flex;align-items:center;gap:12px}
  .topbar-logo{width:38px;height:38px;background:linear-gradient(135deg,#58a6ff,#bc8cff);border-radius:10px;display:grid;place-items:center;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:14px}
  .topbar-title{font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;color:#58a6ff}
  .topbar-live{display:inline-flex;align-items:center;gap:5px;font-size:10px;color:#10b981;margin-top:2px}
  .live-dot{width:6px;height:6px;border-radius:50%;background:#10b981;animation:pulse 1.4s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  .btn-logout{background:rgba(248,81,73,.12);color:#f85149;border:1px solid rgba(248,81,73,.2);border-radius:10px;padding:8px 16px;cursor:pointer;font-size:13px;font-family:'Prompt',sans-serif}

  .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:20px 24px 0}
  .stat-card{background:rgba(12,18,32,.7);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:18px;text-align:center}
  .stat-num{font-family:'JetBrains Mono',monospace;font-size:30px;font-weight:700;margin-bottom:4px}
  .stat-lbl{font-size:11px;color:#555577}
  .blue{color:#58a6ff} .green{color:#10b981} .red{color:#f85149} .purple{color:#bc8cff}

  .tabs{display:flex;gap:8px;padding:16px 24px 0}
  .tab-btn{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:9px 18px;color:#8b949e;font-family:'Prompt',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}
  .tab-btn.active{background:rgba(88,166,255,.1);border-color:rgba(88,166,255,.3);color:#58a6ff}

  .content{padding:20px 24px}

  /* Slot cards */
  .slots-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
  .slot-card{background:rgba(12,18,32,.7);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:18px}
  .slot-card.occ{border-color:rgba(248,81,73,.25);background:rgba(248,81,73,.04)}
  .slot-card.vac{border-color:rgba(16,185,129,.25);background:rgba(16,185,129,.04)}
  .slot-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
  .slot-name{font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700}
  .slot-badge{font-size:12px;font-weight:600;padding:4px 10px;border-radius:8px}
  .badge-occ{background:rgba(248,81,73,.15);color:#f85149}
  .badge-vac{background:rgba(16,185,129,.15);color:#10b981}
  .slot-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .btn-enter,.btn-exit{border:none;border-radius:10px;padding:10px 6px;font-family:'Prompt',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}
  .btn-enter{background:rgba(88,166,255,.15);color:#58a6ff;border:1px solid rgba(88,166,255,.2)}
  .btn-enter:not(:disabled):hover{background:rgba(88,166,255,.25)}
  .btn-exit{background:rgba(248,81,73,.15);color:#f85149;border:1px solid rgba(248,81,73,.2)}
  .btn-exit:not(:disabled):hover{background:rgba(248,81,73,.25)}
  .btn-enter:disabled,.btn-exit:disabled{opacity:.3;cursor:not-allowed}

  /* Table */
  .section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;font-size:14px;color:#8b949e;font-weight:600}
  .btn-refresh{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:8px;padding:5px 12px;color:#8b949e;font-family:'Prompt',sans-serif;font-size:12px;cursor:pointer}
  .btn-refresh:hover{background:rgba(255,255,255,.09)}
  .table-wrap{overflow-x:auto;border-radius:16px;border:1px solid rgba(255,255,255,.07)}
  .table{width:100%;border-collapse:collapse;background:rgba(12,18,32,.6)}
  .table th{padding:12px 14px;text-align:left;font-size:11px;font-weight:600;color:#555577;letter-spacing:.05em;border-bottom:1px solid rgba(255,255,255,.07)}
  .table td{padding:11px 14px;font-size:13px;border-bottom:1px solid rgba(255,255,255,.04)}
  .table tr:last-child td{border-bottom:none}
  .row-active td{background:rgba(88,166,255,.04)}
  .empty{text-align:center;color:#333355;padding:32px!important}
  .slot-pill{background:rgba(88,166,255,.15);color:#58a6ff;border-radius:6px;padding:2px 8px;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700}
  .badge-now{background:rgba(16,185,129,.15);color:#10b981;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600}
  .badge-end{background:rgba(255,255,255,.06);color:#555577;border-radius:6px;padding:2px 8px;font-size:11px}
  .line-tag{background:rgba(0,185,0,.15);color:#4ade80;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600}
  .pw-tag{background:rgba(188,140,255,.15);color:#bc8cff;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600}
  .src-tag{background:rgba(255,255,255,.05);color:#8b949e;border-radius:6px;padding:2px 7px;font-size:11px}
  .sys-tag{color:#333355}
  .none-tag{color:#333355}
  .user-name{font-weight:600}
  .date-cell{color:#555577;font-size:12px}

  @media(max-width:600px){
    .stats-row{grid-template-columns:repeat(2,1fr)}
    .slots-grid{grid-template-columns:1fr 1fr}
  }
`
