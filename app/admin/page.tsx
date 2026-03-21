'use client'
import { useState, useEffect, useCallback } from 'react'

interface Slot { slot_name: string; status: string }

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [lastUpdate, setLastUpdate] = useState('')

  const loadSlots = useCallback(async () => {
    const res = await fetch('/api/admin/status')
    if (res.status === 401) { setAuthed(false); return }
    const data = await res.json()
    setSlots(data.slots || [])
    setLastUpdate(new Date().toLocaleTimeString('th-TH'))
  }, [])

  useEffect(() => {
    fetch('/api/admin/status').then(r => {
      if (r.status === 401) setAuthed(false)
      else { setAuthed(true); r.json().then(d => { setSlots(d.slots || []); setLastUpdate(new Date().toLocaleTimeString('th-TH')) }) }
    }).catch(() => setAuthed(false))
  }, [])

  useEffect(() => {
    if (!authed) return
    const id = setInterval(loadSlots, 5000)
    return () => clearInterval(id)
  }, [authed, loadSlots])

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
    if (res.ok) { setAuthed(true); loadSlots() }
    else { const d = await res.json(); setError(d.error || 'เกิดข้อผิดพลาด') }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    setAuthed(false)
    setSlots([])
  }

  if (authed === null) return <div style={{ background: '#050816', minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#fff', fontFamily: 'Prompt,sans-serif' }}>กำลังโหลด...</div>

  if (!authed) return (
    <>
      <style>{`
        body{min-height:100vh;display:grid;place-items:center;padding:24px;color:#e6edf3;font-family:'Prompt',sans-serif;background:radial-gradient(circle at top left,rgba(88,166,255,.2),transparent 30%),radial-gradient(circle at bottom right,rgba(188,140,255,.15),transparent 28%),linear-gradient(180deg,#050816 0%,#0b1020 100%)}
        .card{width:100%;max-width:420px;padding:32px 28px;border-radius:24px;background:rgba(12,18,32,.9);border:1px solid rgba(255,255,255,.08);box-shadow:0 20px 60px rgba(0,0,0,.35)}
        .logo{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;margin-bottom:18px;background:linear-gradient(135deg,#58a6ff,#bc8cff);font-family:'JetBrains Mono',monospace;font-weight:700;font-size:16px}
        h1{font-family:monospace;font-size:24px;margin-bottom:8px}
        .sub{color:#8b949e;font-size:14px;margin-bottom:24px}
        .err{margin-bottom:16px;padding:12px 14px;border-radius:12px;background:rgba(248,81,73,.12);border:1px solid rgba(248,81,73,.28);color:#ffb3ad;font-size:14px}
        label{display:block;font-size:12px;color:#8b949e;margin-bottom:8px;letter-spacing:.04em}
        .field{margin-bottom:18px}
        input{width:100%;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#e6edf3;border-radius:14px;padding:14px 16px;font-size:15px;outline:none;font-family:inherit}
        input:focus{border-color:#58a6ff;box-shadow:0 0 0 3px rgba(88,166,255,.18)}
        button{width:100%;border:none;border-radius:14px;padding:14px 16px;cursor:pointer;color:#fff;font-size:14px;font-weight:600;font-family:monospace;background:linear-gradient(135deg,#1f6feb,#58a6ff)}
        .hint{margin-top:14px;font-size:12px;color:#8b949e;text-align:center}
      `}</style>
      <form className="card" onSubmit={login}>
        <div className="logo">SP</div>
        <h1>ADMIN LOGIN</h1>
        <p className="sub">กรอกบัญชีแอดมินก่อนเข้าหน้า dashboard</p>
        {error && <div className="err">{error}</div>}
        <div className="field"><label>USERNAME</label><input value={username} onChange={e => setUsername(e.target.value)} type="text" required autoComplete="username" /></div>
        <div className="field"><label>PASSWORD</label><input value={password} onChange={e => setPassword(e.target.value)} type="password" required autoComplete="current-password" /></div>
        <button type="submit">LOGIN</button>
        <p className="hint">ตั้งค่าได้ที่ .env.local ด้วย ADMIN_USERNAME และ ADMIN_PASSWORD</p>
      </form>
    </>
  )

  const vacant = slots.filter(s => s.status === 'vacant').length
  const occupied = slots.filter(s => s.status === 'occupied').length

  return (
    <>
      <style>{`
        body{background:#050816;min-height:100vh;font-family:'Prompt',sans-serif;color:#e6edf3}
        .topbar{background:rgba(12,18,32,.95);border-bottom:1px solid rgba(255,255,255,.08);padding:16px 24px;display:flex;align-items:center;justify-content:space-between}
        .topbar-title{font-family:monospace;font-weight:700;font-size:18px;color:#58a6ff}
        .live{display:inline-flex;align-items:center;gap:6px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);border-radius:20px;padding:4px 12px;font-size:11px;color:#10b981}
        .dot{width:6px;height:6px;border-radius:50%;background:#10b981;animation:pulse 1.5s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        .logout{background:rgba(248,81,73,.15);color:#f85149;border:none;border-radius:10px;padding:8px 16px;cursor:pointer;font-size:13px;font-family:inherit}
        .content{padding:24px}
        .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px}
        .stat{background:rgba(12,18,32,.7);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px;text-align:center}
        .stat-n{font-family:monospace;font-size:32px;font-weight:700;margin-bottom:4px}
        .stat-l{font-size:12px;color:#8b949e}
        .g{color:#10b981} .r{color:#f85149} .b{color:#58a6ff}
        .slots-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
        .slot{background:rgba(12,18,32,.7);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px}
        .slot.occ{border-color:rgba(248,81,73,.3)}
        .slot.vac{border-color:rgba(16,185,129,.3)}
        .slot-name{font-family:monospace;font-size:18px;font-weight:700;margin-bottom:8px}
        .slot-badge{display:inline-block;padding:4px 12px;border-radius:8px;font-size:12px;font-weight:600}
        .slot.occ .slot-badge{background:rgba(248,81,73,.15);color:#f85149}
        .slot.vac .slot-badge{background:rgba(16,185,129,.15);color:#10b981}
        .upd{font-size:11px;color:#8b949e;margin-top:4px}
        .section-title{font-size:14px;font-weight:600;color:#8b949e;margin-bottom:12px;text-transform:uppercase;letter-spacing:.05em}
      `}</style>
      <div className="topbar">
        <div>
          <div className="topbar-title">SmartPark Admin</div>
          <div className="live"><span className="dot" />LIVE</div>
        </div>
        <button className="logout" onClick={logout}>ออกจากระบบ</button>
      </div>
      <div className="content">
        <div className="stats">
          <div className="stat"><div className="stat-n b">{slots.length}</div><div className="stat-l">ทั้งหมด</div></div>
          <div className="stat"><div className="stat-n g">{vacant}</div><div className="stat-l">ว่าง</div></div>
          <div className="stat"><div className="stat-n r">{occupied}</div><div className="stat-l">ไม่ว่าง</div></div>
        </div>
        <div className="section-title">สถานะช่องจอด</div>
        <div className="slots-grid">
          {slots.map(s => (
            <div key={s.slot_name} className={`slot ${s.status === 'occupied' ? 'occ' : 'vac'}`}>
              <div className="slot-name">{s.slot_name}</div>
              <div className="slot-badge">{s.status === 'occupied' ? '🔴 ไม่ว่าง' : '🟢 ว่าง'}</div>
            </div>
          ))}
        </div>
        {lastUpdate && <div className="upd" style={{ marginTop: 16 }}>อัปเดตล่าสุด: {lastUpdate}</div>}
      </div>
    </>
  )
}
