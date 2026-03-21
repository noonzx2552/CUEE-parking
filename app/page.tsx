'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

interface Slot { slot_name: string; status: string }
interface Session { startTime: number; warned: boolean; lastBilledPeriod: number; intervalId: ReturnType<typeof setInterval> | null }

const LIFF_ID = process.env.NEXT_PUBLIC_LINE_LIFF_ID || ''


const modernCar = `<svg viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg" style="width:38px;height:80px;filter:drop-shadow(0 5px 8px rgba(0,0,0,.4))"><rect x="15" y="10" width="70" height="180" rx="20" fill="#e2e8f0"/><rect x="25" y="40" width="50" height="35" rx="8" fill="#1e293b"/><rect x="25" y="120" width="50" height="45" rx="8" fill="#1e293b"/><rect x="20" y="20" width="15" height="5" rx="2" fill="#ef4444"/><rect x="65" y="20" width="15" height="5" rx="2" fill="#ef4444"/><rect x="20" y="175" width="15" height="5" rx="2" fill="#f59e0b"/><rect x="65" y="175" width="15" height="5" rx="2" fill="#f59e0b"/></svg>`
const modernCarDark = `<svg viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg" style="width:38px;height:80px;filter:drop-shadow(0 5px 8px rgba(0,0,0,.4))"><rect x="15" y="10" width="70" height="180" rx="20" fill="#334155"/><rect x="25" y="40" width="50" height="35" rx="8" fill="#0f172a"/><rect x="25" y="120" width="50" height="45" rx="8" fill="#0f172a"/><rect x="20" y="20" width="15" height="5" rx="2" fill="#ef4444"/><rect x="65" y="20" width="15" height="5" rx="2" fill="#ef4444"/><rect x="20" y="175" width="15" height="5" rx="2" fill="#f59e0b"/><rect x="65" y="175" width="15" height="5" rx="2" fill="#f59e0b"/></svg>`
const trucks: Record<string, string> = { A1: modernCar, A2: modernCarDark, A3: modernCar, A4: modernCarDark }

export default function Home() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [filter, setFilter] = useState<'all' | 'vac' | 'occ'>('all')
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [lineConnected, setLineConnected] = useState(false)
  const [lineUserId, setLineUserId] = useState('')
  const [lineName, setLineName] = useState('')
  const [toast, setToast] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [lastUpdate, setLastUpdate] = useState('')
  const [ticketSlot, setTicketSlot] = useState('')
  const [ticketTime, setTicketTime] = useState('')
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutData, setCheckoutData] = useState({ slot: '', timeIn: '', timeNow: '', duration: '', fee: 0 })
  const [exitDone, setExitDone] = useState(false)
  const timerMap = useRef<Record<string, Session>>({})
  const [timerDisplay, setTimerDisplay] = useState<Record<string, { val: string; cls: string; lbl: string }>>({})
  const qrRef = useRef<HTMLDivElement>(null)
  const liffId = useRef(LIFF_ID)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }, [])

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/get-status')
      const data = await res.json()
      if (Array.isArray(data)) {
        setSlots(data)
        setLastUpdate(new Date().toLocaleTimeString('th-TH'))
      }
    } catch { /* ignore */ }
  }, [])

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('th-TH')), 1000)
    return () => clearInterval(id)
  }, [])

  // Fetch app config + LIFF id
  useEffect(() => {
    fetch('/api/app-config').then(r => r.json()).then(cfg => {
      if (cfg.LINE_LIFF_ID) liffId.current = cfg.LINE_LIFF_ID
    }).catch(() => {})
  }, [])

  // LIFF init
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const lineParam = params.get('line')
    const nameParam = params.get('name')
    if (lineParam === 'ok' && nameParam) {
      const uidParam = params.get('uid') || ''
      if (uidParam) {
        localStorage.setItem('sp_user_id', uidParam)
        localStorage.setItem('sp_user_name', nameParam)
      }
      const storedId = uidParam || localStorage.getItem('sp_user_id') || ''
      setLineConnected(true)
      setLineName(nameParam)
      if (storedId) {
        setLineUserId(storedId)
        restoreSessionFromDb(storedId)
      }
    }

    const script = document.createElement('script')
    script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
    script.onload = () => {
      const id = liffId.current
      if (!id) { initFromStorage(); return }
      window.liff.init({ liffId: id }).then(() => {
        if (window.liff.isLoggedIn()) {
          window.liff.getProfile().then(profile => {
            localStorage.setItem('sp_user_id', profile.userId)
            localStorage.setItem('sp_line_added', '1')
            setLineConnected(true)
            setLineUserId(profile.userId)
            setLineName(profile.displayName)
          }).catch(() => { window.liff.logout(); localStorage.removeItem('sp_user_id'); localStorage.removeItem('sp_line_added') })
        } else {
          initFromStorage()
        }
      }).catch(initFromStorage).finally(() => {
        loadStatus()
      })
    }
    script.onerror = initFromStorage
    document.head.appendChild(script)

    function initFromStorage() {
      const uid = localStorage.getItem('sp_user_id') || ''
      if (localStorage.getItem('sp_line_added') === '1' && uid) {
        setLineConnected(true)
        setLineUserId(uid)
        restoreSessionFromDb(uid)
      }
      loadStatus()
    }
  }, [loadStatus])

  // Poll status
  useEffect(() => {
    const id = setInterval(loadStatus, 8000)
    return () => clearInterval(id)
  }, [loadStatus])

  function handleLineAdd() {
    if (lineConnected || !window.liff) return
    const redirectUri = window.location.href.split('?')[0]
    window.liff.login({ redirectUri })
  }

  function restoreSessionFromDb(uid: string) {
    if (!uid) return
    fetch(`/api/my-session?user_id=${encodeURIComponent(uid)}`)
      .then(r => r.json())
      .then(data => {
        if (!data.session) return
        const { slot, startTime } = data.session
        localStorage.setItem('sp_slot', slot)
        localStorage.setItem('sp_entrance_time', String(new Date(startTime).getTime()))
        const disp = new Date(startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        localStorage.setItem('sp_entrance_time_display', disp)
        setSelectedSlot(slot)
        setTicketSlot(slot)
        setTicketTime(disp)
        setConfirmed(true)
        startTimer(slot, new Date(startTime).getTime())
      })
      .catch(() => {})
  }

  function selectSlot(name: string) {
    if (confirmed) return
    const slot = slots.find(s => s.slot_name === name)
    if (slot?.status === 'occupied') return
    if (!lineConnected) { showToast('⚠️ กรุณาแอด LINE ก่อนเลือกที่จอดครับ'); return }
    setSelectedSlot(name)
  }

  async function confirmSlot() {
    if (!selectedSlot) return
    const uid = localStorage.getItem('sp_user_id') || lineUserId
    if (uid) {
      const res = await fetch(`/api/my-session?user_id=${encodeURIComponent(uid)}`).then(r => r.json()).catch(() => ({ session: null }))
      if (res.session) {
        showToast(`⚠️ คุณมีการจอดที่ช่อง ${res.session.slot} อยู่แล้ว`)
        return
      }
    }
    setConfirmed(true)
    localStorage.setItem('sp_slot', selectedSlot)
    const display = localStorage.getItem('sp_entrance_time_display') || new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    if (!localStorage.getItem('sp_entrance_time')) {
      localStorage.setItem('sp_entrance_time', String(Date.now()))
      localStorage.setItem('sp_entrance_time_display', display)
    }
    setTicketSlot(selectedSlot)
    setTicketTime(display)
    fetch('/api/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slot: selectedSlot, status: 'occupied', source: 'web', line_user_id: uid }) })
      .then(() => loadStatus())
      .catch(() => {})
    fetch('/api/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slot: selectedSlot, user_id: uid, entrance_time: display }) }).catch(() => {})
    startTimer(selectedSlot)
    showToast('✅ ยืนยันช่องจอดแล้ว! ระบบส่งแจ้งเตือนเข้า LINE แล้ว')
  }

  function simSensor(slot: string, status: string) {
    fetch('/api/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slot, status, source: 'sensor' }) }).catch(() => {})
    if (status === 'occupied') startTimer(slot)
    else stopTimer(slot)
    loadStatus()
  }

  function startTimer(slot: string, fromTime?: number) {
    stopTimer(slot)
    const uid = localStorage.getItem('sp_user_id') || lineUserId
    const startTime = fromTime || Date.now()
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    const initPeriod = elapsed > 15 ? Math.floor((elapsed - 15) / 20) : 0
    const session: Session = { startTime, warned: elapsed >= 10, lastBilledPeriod: initPeriod, intervalId: null }
    timerMap.current[slot] = session
    session.intervalId = setInterval(() => tickTimer(slot, uid), 1000)
    tickTimer(slot, uid)
  }

  function stopTimer(slot: string) {
    const s = timerMap.current[slot]
    if (!s) return
    if (s.intervalId) clearInterval(s.intervalId)
    delete timerMap.current[slot]
    setTimerDisplay(prev => { const n = { ...prev }; delete n[slot]; return n })
  }

  function tickTimer(slot: string, uid: string) {
    const FREE_SECONDS = 15
    const BILLING_INTERVAL = 20
    const BILLING_RATE = 20

    const s = timerMap.current[slot]
    if (!s) return
    const elapsed = Math.floor((Date.now() - s.startTime) / 1000)
    let val: string, cls: string, lbl: string

    if (elapsed < FREE_SECONDS) {
      const remaining = FREE_SECONDS - elapsed
      val = remaining + 's'
      cls = elapsed >= 10 ? 'timer-val warn' : 'timer-val'
      lbl = 'จอดฟรีเหลือ'
      if (elapsed >= 10 && !s.warned) {
        s.warned = true
        if (uid) fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slot, user_id: uid, type: 'warn', remaining }) }).catch(() => {})
      }
    } else {
      const overTime = elapsed - FREE_SECONDS
      const currentPeriod = 1 + Math.floor(overTime / BILLING_INTERVAL)
      const fee = currentPeriod * BILLING_RATE
      const remaining = BILLING_INTERVAL - (overTime % BILLING_INTERVAL)
      val = remaining + 's'
      cls = remaining <= 5 ? 'timer-val over' : 'timer-val warn'
      lbl = `💰 ${fee}฿ · คิดเพิ่มใน`
      if (currentPeriod > s.lastBilledPeriod) {
        s.lastBilledPeriod = currentPeriod
        if (uid) fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slot, user_id: uid, type: 'billing', fee, period: currentPeriod, elapsed }) }).catch(() => {})
      }
    }
    setTimerDisplay(prev => ({ ...prev, [slot]: { val, cls, lbl } }))
  }

  function showCheckoutPage() {
    const s = localStorage.getItem('sp_slot')
    const ts = localStorage.getItem('sp_entrance_time')
    const disp = localStorage.getItem('sp_entrance_time_display') || ''
    if (!s || !ts) { alert('❌ ไม่พบข้อมูลการจอดรถ'); return }
    const elapsed = Math.floor((Date.now() - parseInt(ts)) / 1000)
    const totalFee = elapsed <= 15 ? 0 : Math.ceil((elapsed - 15) / 20) * 20
    const h = Math.floor(elapsed / 3600), m = Math.floor((elapsed % 3600) / 60), sec = elapsed % 60
    const pad = (n: number) => String(n).padStart(2, '0')
    setCheckoutData({ slot: s, timeIn: disp, timeNow: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }), duration: `${pad(h)}:${pad(m)}:${pad(sec)}`, fee: totalFee })
    setShowCheckout(true)
    setExitDone(false)
    setTimeout(() => {
      if (qrRef.current) {
        qrRef.current.innerHTML = ''
        const qrData = `SMARTPARK-OUT:${s}:${ts}:${totalFee}`
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
        script.onload = () => {
          if (qrRef.current) {
            new window.QRCode(qrRef.current, { text: qrData, width: 200, height: 200, colorDark: '#000000', colorLight: '#ffffff', correctLevel: 1 })
          }
        }
        if (!window.QRCode) document.head.appendChild(script)
        else if (qrRef.current) new window.QRCode(qrRef.current, { text: qrData, width: 200, height: 200, colorDark: '#000000', colorLight: '#ffffff', correctLevel: 1 })
      }
    }, 100)
  }

  function startExitAnimation() {
    const exitBtn = document.getElementById('exit-btn')
    const exitScene = document.getElementById('exit-scene')
    const exitCar = document.getElementById('exit-car')
    const exitArm = document.getElementById('exit-arm')
    const exitLight = document.getElementById('exit-light')
    const exitTxt = document.getElementById('exit-status-txt')
    if (exitBtn) exitBtn.style.display = 'none'
    if (exitScene) exitScene.style.display = 'block'
    setTimeout(() => { if (exitCar) exitCar.style.transform = 'translateX(50px)' }, 300)
    setTimeout(() => {
      if (exitArm) exitArm.style.transform = 'rotate(-88deg)'
      if (exitLight) exitLight.setAttribute('fill', '#10b981')
      if (exitTxt) { exitTxt.textContent = '🟢 ไม้กั้น : เปิด'; exitTxt.setAttribute('fill', '#10b981') }
    }, 1500)
    setTimeout(() => { if (exitCar) exitCar.style.transform = 'translateX(320px)' }, 2500)
    setTimeout(() => {
      const slot = checkoutData.slot || localStorage.getItem('sp_slot') || ''
      if (slot) {
        fetch('/api/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slot, status: 'vacant', source: 'checkout' }) })
          .then(() => loadStatus())
          .catch(() => {})
      }
      setExitDone(true)
      localStorage.removeItem('sp_slot')
      localStorage.removeItem('sp_entrance_time')
      localStorage.removeItem('sp_entrance_time_display')
    }, 4000)
  }

  const vacant = slots.filter(s => s.status === 'vacant').length
  const occupied = slots.filter(s => s.status === 'occupied').length

  return (
    <>
      <style>{`
        :root{--bg-color:#0f172a;--card-bg:rgba(30,41,59,.7);--glass-border:rgba(255,255,255,.08);--primary:#6366f1;--success:#10b981;--danger:#f43f5e;--warning:#f59e0b;--text-main:#f8fafc;--text-muted:#94a3b8}
        body{background:var(--bg-color);font-family:'Prompt',sans-serif;color:var(--text-main);min-height:100vh;position:relative;overflow-x:hidden;background-image:radial-gradient(circle at 15% 50%,rgba(99,102,241,.15),transparent 25%),radial-gradient(circle at 85% 30%,rgba(16,185,129,.1),transparent 25%)}
        .hdr{padding:30px 20px 20px;text-align:center}
        .hdr-row{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:8px}
        .hdr-icon{width:40px;height:40px;background:linear-gradient(135deg,var(--primary),#8b5cf6);border-radius:12px;display:flex;align-items:center;justify-content:center;font-family:'Orbitron',sans-serif;font-size:18px;font-weight:900}
        .hdr-title{font-family:'Orbitron',sans-serif;font-size:22px;font-weight:900;letter-spacing:1px}
        .hdr-sub{font-size:13px;color:var(--text-muted)}
        .live-pill{display:inline-flex;align-items:center;gap:6px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);border-radius:20px;padding:4px 12px;font-size:10px;color:var(--success);font-weight:600;letter-spacing:.5px;margin-top:10px}
        .lpulse{width:6px;height:6px;border-radius:50%;background:var(--success);position:relative}
        .lpulse::after{content:'';position:absolute;inset:-3px;border-radius:50%;background:var(--success);animation:ring 1.5s infinite;opacity:.4}
        @keyframes ring{0%{transform:scale(1);opacity:.4}100%{transform:scale(2.5);opacity:0}}
        .line-banner{margin:0 20px 20px;padding:16px;background:rgba(0,195,0,.08);border:1px solid rgba(0,195,0,.3);border-radius:16px;display:flex;align-items:center;gap:15px;cursor:pointer;transition:all .3s}
        .line-banner:active{transform:scale(.98)}
        .line-banner-icon{width:40px;height:40px;background:#00c300;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
        .line-banner-body{flex:1;text-align:left}
        .line-banner-title{font-size:14px;font-weight:600;color:#00e600;margin-bottom:2px}
        .line-banner-sub{font-size:11px;color:#84cc84}
        .line-banner.connected{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.3);cursor:default}
        .line-banner.connected .line-banner-icon{background:#10b981}
        .line-banner.connected .line-banner-title{color:#10b981}
        .line-banner.connected .line-banner-sub{color:#a7f3d0}
        .stats{display:flex;gap:12px;padding:0 20px 20px}
        .sc{flex:1;background:var(--card-bg);border:1px solid var(--glass-border);border-radius:16px;padding:16px 10px;text-align:center;backdrop-filter:blur(10px);position:relative;overflow:hidden}
        .sc::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}
        .sc.g::before{background:var(--success)}.sc.r::before{background:var(--danger)}.sc.p::before{background:var(--primary)}
        .sc-n{font-family:'Orbitron',sans-serif;font-size:28px;font-weight:700;line-height:1;margin-bottom:4px}
        .sc.g .sc-n{color:var(--success)}.sc.r .sc-n{color:var(--danger)}.sc.p .sc-n{color:var(--primary)}
        .sc-l{font-size:11px;color:var(--text-muted);font-weight:500}
        .ftabs{display:flex;gap:8px;padding:0 20px 20px}
        .ft{flex:1;font-size:12px;padding:10px;border-radius:12px;border:1px solid var(--glass-border);background:var(--card-bg);color:var(--text-muted);cursor:pointer;font-family:'Prompt',sans-serif;transition:all .2s}
        .ft.on{background:var(--primary);border-color:var(--primary);color:#fff}
        .lot-wrap{padding:0 16px;position:relative;z-index:2;margin-bottom:20px}
        .entrance-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding:0 2px}
        .ent-pill{display:inline-flex;align-items:center;gap:6px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:20px;padding:5px 14px;font-size:10px;font-weight:700;color:var(--warning)}
        .exit-pill{display:inline-flex;align-items:center;gap:6px;background:rgba(244,63,94,.1);border:1px solid rgba(244,63,94,.3);border-radius:20px;padding:5px 14px;font-size:10px;font-weight:700;color:var(--danger)}
        .road{height:20px;background:rgba(15,23,42,.6);border-radius:12px 12px 0 0;display:flex;align-items:center;padding:0 12px;border:1px solid var(--glass-border);border-bottom:none}
        .rd{flex:1;display:flex;gap:4px;align-items:center;margin:0 8px;justify-content:space-around}
        .rdash{width:16px;height:2px;background:rgba(245,158,11,.4);border-radius:1px}
        .lot{display:flex;background:var(--card-bg);border:1px solid var(--glass-border);border-top:none;border-radius:0 0 16px 16px;overflow:hidden;backdrop-filter:blur(10px)}
        .pslot{flex:1;display:flex;flex-direction:column;align-items:center;padding:12px 4px 10px;border-right:1px solid var(--glass-border);cursor:pointer;transition:all .2s;position:relative;overflow:hidden}
        .pslot:last-child{border-right:none}
        .pslot.occ{background:linear-gradient(180deg,rgba(244,63,94,.1),transparent)}
        .pslot.vac{background:linear-gradient(180deg,rgba(16,185,129,.05),transparent)}
        .pslot.selected{background:linear-gradient(180deg,rgba(99,102,241,.2),transparent);outline:2px solid var(--primary);outline-offset:-2px}
        .pslot-line{position:absolute;top:0;left:15%;right:15%;height:3px;border-radius:0 0 4px 4px}
        .pslot.occ .pslot-line{background:var(--danger);box-shadow:0 0 10px var(--danger)}
        .pslot.vac .pslot-line{background:var(--success);box-shadow:0 0 10px var(--success)}
        .pslot.selected .pslot-line{background:var(--primary);box-shadow:0 0 10px var(--primary)}
        .pid{font-family:'Orbitron',sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;margin-bottom:7px;color:var(--text-main)}
        .czone{width:100%;height:120px;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:8px}
        .pslot.occ .czone{background:radial-gradient(ellipse at 50% 85%,rgba(244,63,94,.15),transparent 70%)}
        .pslot.vac .czone{border:1px dashed rgba(16,185,129,.3)}
        .pslot.selected .czone{border:1px dashed var(--primary)}
        .etxt{font-size:9px;color:rgba(255,255,255,.3);font-weight:600;letter-spacing:2px}
        .sbadge{font-size:9px;font-weight:600;padding:4px 8px;border-radius:8px;margin-bottom:4px;display:inline-flex;align-items:center;gap:4px}
        .pslot.occ .sbadge{background:rgba(244,63,94,.15);color:var(--danger)}
        .pslot.vac .sbadge{background:rgba(16,185,129,.15);color:var(--success)}
        .pslot.selected .sbadge{background:rgba(99,102,241,.2);color:#a5b4fc}
        .timer-box{width:90%;padding:4px;background:rgba(0,0,0,.4);border-radius:6px;text-align:center}
        .timer-val{font-family:'Orbitron',sans-serif;font-size:11px;font-weight:700;color:#a5b4fc}
        .timer-val.warn{color:var(--warning);animation:blink .8s infinite}
        .timer-val.over{color:var(--danger);animation:blink .5s infinite}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
        .timer-lbl{font-size:7px;color:var(--text-muted);margin-top:2px}
        .action-wrap{padding:0 16px 20px;position:relative;z-index:2}
        .instruction-banner{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);padding:16px;border-radius:16px;display:flex;align-items:center;gap:12px;margin-bottom:16px}
        .instruction-title{font-size:14px;font-weight:600;color:var(--warning);margin-bottom:2px}
        .instruction-sub{font-size:12px;color:rgba(255,255,255,.7)}
        .confirm-btn{width:100%;padding:16px;border-radius:16px;border:none;background:linear-gradient(135deg,var(--primary),#8b5cf6);color:#fff;font-size:16px;font-weight:600;font-family:'Prompt',sans-serif;cursor:pointer;display:none;box-shadow:0 8px 20px rgba(99,102,241,.4);transition:transform .2s;margin-bottom:10px}
        .confirm-btn.show{display:block}
        .confirm-btn:active{transform:scale(.98)}
        .ticket-card{background:rgba(30,41,59,.85);border:1px solid rgba(99,102,241,.4);border-radius:12px;width:100%;max-width:400px;margin:10px auto 0;overflow:hidden;backdrop-filter:blur(10px)}
        .ticket-header{background:linear-gradient(135deg,var(--primary),#8b5cf6);padding:8px 16px;color:#fff;display:flex;justify-content:space-between;align-items:center}
        .ticket-header h2{font-family:'Orbitron',sans-serif;font-size:14px;margin:0;letter-spacing:1px}
        .ticket-header p{font-size:10px;margin:0;background:rgba(0,0,0,.2);padding:3px 8px;border-radius:10px}
        .ticket-body{padding:10px 16px}
        .tk-row{display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px;border-bottom:1px dashed rgba(255,255,255,.1);padding-bottom:6px}
        .tk-row:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}
        .tk-label{color:var(--text-muted)}
        .tk-val{font-weight:600;color:#a5b4fc}
        .topbar{position:sticky;top:0;z-index:50;background:rgba(15,23,42,.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--glass-border);display:flex;align-items:center;justify-content:space-between;padding:12px 16px}
        .topbar-clock{font-family:'Orbitron',sans-serif;font-size:13px;color:var(--text-main);font-weight:700;line-height:1.3}
        .topbar-upd{font-size:9px;color:var(--text-muted)}
        .topbar-btns{display:flex;gap:8px}
        .tbtn{padding:8px 14px;border-radius:10px;border:none;font-size:12px;font-weight:600;font-family:'Prompt',sans-serif;cursor:pointer;color:#fff;display:flex;align-items:center;gap:4px}
        .tbtn-ref{background:rgba(255,255,255,.1)}
        .tbtn-ref:hover{background:rgba(255,255,255,.16)}
        .tbtn-out{background:rgba(244,63,94,.18);color:var(--danger);border:1px solid rgba(244,63,94,.2)}
        .tbtn-out:hover{background:rgba(244,63,94,.28)}
        .page-wrap{max-width:520px;margin:0 auto;padding-bottom:32px}
        .overlay-dark{position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:1000;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(8px);padding:20px;overflow-y:auto}
        .checkout-card{background:rgba(30,41,59,.95);border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:30px 25px;text-align:center;width:100%;max-width:360px;position:relative}
        .close-btn{position:absolute;top:15px;right:20px;background:none;border:none;color:#94a3b8;font-size:24px;cursor:pointer}
        .checkout-title{font-size:18px;color:#f8fafc;font-weight:700;margin-bottom:8px;font-family:'Orbitron',sans-serif}
        .checkout-sub{font-size:13px;color:#94a3b8;margin-bottom:20px}
        .fee-card{background:linear-gradient(135deg,rgba(244,63,94,.1),rgba(99,102,241,.1));border:1px solid rgba(244,63,94,.3);border-radius:16px;padding:20px;margin-bottom:20px}
        .fee-row{display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px}
        .fee-label{color:var(--text-muted)}
        .fee-value{color:#fff;font-weight:600}
        .fee-total{border-top:2px dashed rgba(255,255,255,.2);padding-top:12px;margin-top:8px}
        .fee-total .fee-label{font-size:14px;color:#a5b4fc}
        .fee-total .fee-value{font-size:24px;color:#10b981;font-family:'Orbitron',sans-serif;font-weight:900}
        .qr-wrap{background:#fff;border-radius:16px;padding:15px;display:inline-block;margin-bottom:15px}
        .qr-hint{font-size:12px;color:#cbd5e1;font-weight:500}
        .toast{position:fixed;top:20px;left:50%;transform:translate(-50%,-100px);z-index:2000;background:var(--success);color:#fff;padding:12px 24px;border-radius:100px;font-size:14px;font-weight:600;transition:transform .4s cubic-bezier(.175,.885,.32,1.275)}
        .toast.show{transform:translate(-50%,0)}
      `}</style>

      {toast && <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>}

      {/* Topbar — time + action buttons */}
      <div className="topbar">
        <div>
          <div className="topbar-clock">{currentTime || '--:--:--'}</div>
          {lastUpdate && <div className="topbar-upd">อัปเดต: {lastUpdate}</div>}
        </div>
        <div className="topbar-btns">
          <button className="tbtn tbtn-ref" onClick={loadStatus}>↻ รีเฟรช</button>
          <button className="tbtn tbtn-out" onClick={showCheckoutPage}>🚪 ออกรถ</button>
        </div>
      </div>

      <div className="page-wrap">
      <div className="hdr">
        <div className="hdr-row">
          <div className="hdr-icon">P</div>
          <div className="hdr-title">Spotsync</div>
        </div>
        <div className="hdr-sub">ระบบที่จอดรถอัจฉริยะ ชั้น B1</div>
        <div className="live-pill"><div className="lpulse" />LIVE MONITORING</div>
      </div>

      <div className={`line-banner${lineConnected ? ' connected' : ''}`} onClick={handleLineAdd}>
        <div className="line-banner-icon">{lineConnected ? '✅' : '💬'}</div>
        <div className="line-banner-body">
          <div className="line-banner-title">{lineConnected ? `เชื่อมต่อ LINE แล้ว!${lineName ? ' — ' + lineName : ''}` : 'เชื่อมต่อแจ้งเตือน LINE Bot'}</div>
          <div className="line-banner-sub">{lineConnected ? 'รับแจ้งเตือนเวลาจอดผ่าน LINE' : 'กดที่นี่เพื่อล็อกอิน LINE และรับแจ้งเตือน'}</div>
        </div>
        {!lineConnected && <div style={{ color: 'rgba(0,230,0,.5)', fontSize: 22 }}>›</div>}
      </div>

      <div className="stats">
        <div className="sc g"><div className="sc-n">{vacant}</div><div className="sc-l">ช่องว่าง</div></div>
        <div className="sc r"><div className="sc-n">{occupied}</div><div className="sc-l">ไม่ว่าง</div></div>
        <div className="sc p"><div className="sc-n">{slots.length || 4}</div><div className="sc-l">ทั้งหมด</div></div>
      </div>

      <div className="ftabs">
        {(['all', 'vac', 'occ'] as const).map(f => (
          <button key={f} className={`ft${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'ทั้งหมด' : f === 'vac' ? 'ว่าง' : 'ไม่ว่าง'}
          </button>
        ))}
      </div>

      <div className="lot-wrap">
        <div className="entrance-row">
          <div className="ent-pill">
            <svg width="14" height="10" viewBox="0 0 14 10"><polygon points="0,5 6,0 6,3 14,3 14,7 6,7 6,10" fill="#f59e0b"/></svg>
            <span>ทางเข้า</span>
          </div>
          <div className="exit-pill">
            <span>ทางออก</span>
            <svg width="14" height="10" viewBox="0 0 14 10"><polygon points="14,5 8,0 8,3 0,3 0,7 8,7 8,10" fill="#f43f5e"/></svg>
          </div>
        </div>
        <div className="road"><div className="rd">{Array(6).fill(0).map((_, i) => <div key={i} className="rdash" />)}</div></div>
        <div className="lot" style={{ opacity: confirmed ? 0.7 : 1, pointerEvents: confirmed ? 'none' : 'auto' }}>
          {slots.filter(s => filter === 'all' || (filter === 'vac' && s.status === 'vacant') || (filter === 'occ' && s.status === 'occupied')).map(s => {
            const isOcc = s.status === 'occupied'
            const isSel = selectedSlot === s.slot_name && !confirmed
            const cls = `pslot ${isOcc ? 'occ' : 'vac'}${isSel ? ' selected' : ''}`
            const td = timerDisplay[s.slot_name]
            return (
              <div key={s.slot_name} className={cls} onClick={() => selectSlot(s.slot_name)}>
                <div className="pslot-line" />
                <div className="pid">{s.slot_name}</div>
                <div className="czone">
                  {isOcc ? <span dangerouslySetInnerHTML={{ __html: trucks[s.slot_name] || modernCar }} /> : <span className="etxt">{isSel ? 'SELECTED' : 'EMPTY'}</span>}
                </div>
                <div className="sbadge">{isSel ? '✓ เลือกแล้ว' : isOcc ? 'ไม่ว่าง' : 'ว่าง'}</div>
                {td && <div className="timer-box"><div className={td.cls}>{td.val}</div><div className="timer-lbl">{td.lbl}</div></div>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="action-wrap">
        {!confirmed && (
          <div className="instruction-banner">
            <div style={{ fontSize: 24 }}>📍</div>
            <div>
              <div className="instruction-title">กรุณาเลือกช่องที่คุณจอดรถ</div>
              <div className="instruction-sub">{selectedSlot ? `เลือกช่อง ${selectedSlot} แล้ว กดปุ่มยืนยันด้านล่าง` : 'แตะที่ช่องจอดว่าง แล้วกดยืนยัน'}</div>
            </div>
          </div>
        )}
        {selectedSlot && !confirmed && (
          <button className="confirm-btn show" onClick={confirmSlot}>ยืนยันเข้าจอดช่อง {selectedSlot}</button>
        )}
        {confirmed && ticketSlot && (
          <div className="ticket-card">
            <div className="ticket-header"><h2>SPOTSYNC</h2><p>E-Ticket</p></div>
            <div className="ticket-body">
              <div className="tk-row"><span className="tk-label">สถานะ LINE</span><span className="tk-val" style={{ color: lineConnected ? '#10b981' : '#f59e0b' }}>{lineConnected ? '✅ เชื่อมต่อแล้ว' : '⚠️ ยังไม่ได้แอด LINE'}</span></div>
              <div className="tk-row"><span className="tk-label">ช่องจอด</span><span className="tk-val">{ticketSlot}</span></div>
              <div className="tk-row"><span className="tk-label">เวลาเข้า</span><span className="tk-val">{ticketTime} น.</span></div>
            </div>
          </div>
        )}
      </div>

      </div>{/* end page-wrap */}

      {showCheckout && (
        <div className="overlay-dark">
          <div className="checkout-card">
            <button className="close-btn" onClick={() => setShowCheckout(false)}>✕</button>
            <div className="checkout-title">🚗 ออกจากที่จอด</div>
            <div className="checkout-sub">สรุปค่าใช้จ่ายการจอดรถ</div>
            <div className="fee-card">
              <div className="fee-row"><span className="fee-label">ช่องจอด</span><span className="fee-value">{checkoutData.slot}</span></div>
              <div className="fee-row"><span className="fee-label">เวลาเข้า</span><span className="fee-value">{checkoutData.timeIn}</span></div>
              <div className="fee-row"><span className="fee-label">เวลาปัจจุบัน</span><span className="fee-value">{checkoutData.timeNow}</span></div>
              <div className="fee-row"><span className="fee-label">ระยะเวลา</span><span className="fee-value">{checkoutData.duration}</span></div>
              <div className="fee-row fee-total"><span className="fee-label">💰 ค่าจอดรวม</span><span className="fee-value">{checkoutData.fee.toLocaleString()} ฿</span></div>
            </div>
            <div className="qr-wrap"><div ref={qrRef} /></div>
            <div className="qr-hint" style={{ marginBottom: 16 }}>สแกน QR Code นี้ที่ทางออก</div>
            {!exitDone && (
              <button id="exit-btn" onClick={startExitAnimation} style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14, background: 'linear-gradient(135deg,#f43f5e,#e11d48)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Prompt,sans-serif' }}>
                🚗 ยืนยันออกรถ
              </button>
            )}
            <div id="exit-scene" style={{ display: 'none', marginTop: 16, borderRadius: 16, overflow: 'hidden', background: '#0a0a1a' }}>
              <svg id="exit-svg" width="100%" viewBox="0 0 320 130" xmlns="http://www.w3.org/2000/svg">
                <rect width="320" height="130" fill="#0a0a1a"/>
                <rect x="0" y="90" width="320" height="40" fill="#1e293b"/>
                <rect x="0" y="90" width="320" height="3" fill="#334155"/>
                {[0,60,120,180,240,300].map(x => <rect key={x} x={x} y="108" width="40" height="4" rx="2" fill="#f59e0b" opacity="0.5"/>)}
                <rect x="119" y="40" width="10" height="50" rx="3" fill="#94a3b8"/>
                <circle id="exit-light" cx="124" cy="36" r="7" fill="#f43f5e"/>
                <g id="exit-arm" style={{ transformOrigin: '129px 58px', transform: 'rotate(0deg)', transition: 'transform 1s cubic-bezier(.34,1.4,.64,1)' }}>
                  <rect x="129" y="55" width="20" height="7" rx="2" fill="#f43f5e"/>
                  <rect x="149" y="55" width="16" height="7" rx="2" fill="#fff"/>
                  <rect x="165" y="55" width="16" height="7" rx="2" fill="#f43f5e"/>
                  <rect x="181" y="55" width="16" height="7" rx="2" fill="#fff"/>
                  <rect x="197" y="55" width="16" height="7" rx="2" fill="#f43f5e"/>
                  <circle cx="215" cy="58" r="5" fill="#fbbf24"/>
                </g>
                <g id="exit-car" style={{ transform: 'translateX(0px)', transition: 'transform 1.6s cubic-bezier(.4,0,.2,1)' }}>
                  <rect x="20" y="68" width="56" height="24" rx="8" fill="#6366f1"/>
                  <rect x="27" y="58" width="38" height="16" rx="5" fill="#818cf8"/>
                  <rect x="29" y="60" width="15" height="11" rx="2" fill="#bfdbfe" opacity="0.9"/>
                  <rect x="47" y="60" width="15" height="11" rx="2" fill="#bfdbfe" opacity="0.9"/>
                  <circle cx="32" cy="93" r="6" fill="#1e293b"/><circle cx="32" cy="93" r="3" fill="#475569"/>
                  <circle cx="64" cy="93" r="6" fill="#1e293b"/><circle cx="64" cy="93" r="3" fill="#475569"/>
                  <rect x="74" y="76" width="4" height="6" rx="2" fill="#fef08a" opacity="0.9"/>
                </g>
                <text id="exit-status-txt" x="160" y="25" textAnchor="middle" fill="#f43f5e" fontSize="11" fontWeight="700" fontFamily="Arial,sans-serif">🔴 ไม้กั้น : ปิด</text>
              </svg>
              {exitDone && (
                <div style={{ padding: 16, textAlign: 'center', background: 'rgba(16,185,129,.1)', borderTop: '1px solid rgba(16,185,129,.2)' }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>✅</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>ออกรถเรียบร้อยแล้ว!</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>ขอบคุณที่ใช้บริการ Spotsync</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
