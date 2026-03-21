'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function CheckinPage() {
  const router = useRouter()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const entranceTime = Date.now()
    localStorage.setItem('sp_entrance_time', String(entranceTime))
    const now = new Date()
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    localStorage.setItem('sp_entrance_time_display', timeStr)

    const btn = document.getElementById('btn') as HTMLButtonElement
    const arm = document.getElementById('arm')
    const car = document.getElementById('car')
    const statusTxt = document.getElementById('status-txt')
    const postLight = document.getElementById('post-light')
    const overlay = document.getElementById('overlay')

    if (btn) { btn.disabled = true; btn.textContent = '⏳ กำลังเปิดไม้กั้น...' }

    setTimeout(() => { if (car) car.className = 'car at-gate' }, 200)
    setTimeout(() => {
      if (arm) arm.classList.add('open')
      if (postLight) postLight.classList.add('green')
      if (statusTxt) { statusTxt.style.color = '#34d399'; statusTxt.textContent = '🟢 ไม้กั้น : เปิดแล้ว!' }
      if (btn) btn.textContent = '🚗 กำลังเข้า...'
    }, 1200)
    setTimeout(() => {
      if (car) car.className = 'car entering'
      if (statusTxt) { statusTxt.style.color = '#a78bfa'; statusTxt.textContent = '✅ กำลังเข้าที่จอดรถ' }
    }, 2400)
    setTimeout(() => { if (car) car.className = 'car passed' }, 3600)
    setTimeout(() => { if (overlay) overlay.classList.add('show') }, 4500)
    setTimeout(() => { router.push('/') }, 6000)
  }, [router])

  return (
    <>
      <style>{`
        body{background:#06060e;font-family:'Prompt',sans-serif;color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden}
        .bg1{position:fixed;top:-80px;left:-80px;width:320px;height:320px;background:radial-gradient(circle,rgba(124,77,255,.15),transparent 70%);pointer-events:none}
        .bg2{position:fixed;bottom:0;right:-60px;width:260px;height:260px;background:radial-gradient(circle,rgba(52,211,153,.08),transparent 70%);pointer-events:none}
        .card{width:100%;max-width:340px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:28px 24px;position:relative;z-index:2;text-align:center}
        .logo-row{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:6px}
        .logo-icon{width:44px;height:44px;background:linear-gradient(135deg,#7c4dff,#e040fb);border-radius:14px;display:flex;align-items:center;justify-content:center;font-family:'Orbitron',sans-serif;font-size:18px;font-weight:900;box-shadow:0 0 20px rgba(124,77,255,.5)}
        .logo-title{font-family:'Orbitron',sans-serif;font-size:22px;font-weight:900;background:linear-gradient(90deg,#a78bfa,#fff,#34d399);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .sub{font-size:12px;color:#444466;margin-bottom:20px}
        .scene{width:100%;height:175px;position:relative;margin-bottom:18px;background:rgba(0,0,0,.3);border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.06)}
        .scene-bg{position:absolute;inset:0;background:linear-gradient(180deg,#0a0a1a 0%,#0d1a2e 60%,#1a1a2e 100%)}
        .road{position:absolute;bottom:0;left:0;right:0;height:55px;background:linear-gradient(180deg,#1e293b,#0f172a)}
        .road-line{position:absolute;bottom:22px;left:0;right:0;height:4px;background:repeating-linear-gradient(90deg,rgba(255,204,0,.5) 0,rgba(255,204,0,.5) 30px,transparent 30px,transparent 55px)}
        .road-edge{position:absolute;top:0;left:0;right:0;height:3px;background:rgba(255,255,255,.08)}
        .post{position:absolute;bottom:55px;left:50%;transform:translateX(-50%);width:14px;height:50px;background:linear-gradient(180deg,#cbd5e1,#64748b);border-radius:3px;z-index:5}
        .post-light{position:absolute;top:-10px;left:50%;transform:translateX(-50%);width:20px;height:14px;border-radius:4px;background:#ff4c6a;box-shadow:0 0 16px rgba(255,76,106,.8);transition:background .3s,box-shadow .3s}
        .post-light.green{background:#34d399;box-shadow:0 0 16px rgba(52,211,153,.8)}
        .arm-wrap{position:absolute;bottom:104px;left:calc(50% + 7px);transform-origin:0% 50%;width:135px;height:14px;z-index:4;transition:transform 1s cubic-bezier(.68,-0.3,.27,1.4)}
        .arm-wrap.open{transform:rotate(-88deg)}
        .arm{width:100%;height:100%;border-radius:7px;background:repeating-linear-gradient(90deg,#ef4444 0,#ef4444 18px,#fff 18px,#fff 26px);box-shadow:0 0 10px rgba(239,68,68,.4)}
        .arm-tip{position:absolute;right:-5px;top:50%;transform:translateY(-50%);width:10px;height:10px;background:#fbbf24;border-radius:50%;box-shadow:0 0 8px rgba(251,191,36,.9)}
        .car{position:absolute;bottom:57px;left:-100px;z-index:6;transition:left 1.4s cubic-bezier(.4,0,.2,1)}
        .car.at-gate{left:calc(50% - 130px)}
        .car.entering{left:calc(50% - 30px)}
        .car.passed{left:110%}
        .status{position:absolute;top:10px;left:50%;transform:translateX(-50%);font-size:11px;font-weight:700;letter-spacing:.5px;color:#ff4c6a;background:rgba(0,0,0,.6);padding:4px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.1);transition:color .3s;white-space:nowrap}
        .btn{width:100%;background:linear-gradient(135deg,#7c4dff,#e040fb);color:#fff;border:none;border-radius:16px;padding:16px;font-family:'Prompt',sans-serif;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 8px 20px rgba(124,77,255,.3)}
        .btn:disabled{opacity:0.7;cursor:not-allowed}
        .overlay{position:fixed;inset:0;background:#06060e;z-index:999;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .6s}
        .overlay.show{opacity:1;pointer-events:auto}
        .spinner{width:40px;height:40px;border:4px solid rgba(255,255,255,.1);border-top-color:#7c4dff;border-radius:50%;animation:spin 1s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
      <div className="bg1" /><div className="bg2" />
      <div className="card">
        <div className="logo-row">
          <div className="logo-icon">P</div>
          <div className="logo-title">SMART PARK</div>
        </div>
        <div className="sub">ระบบควบคุมทางเข้าอัจฉริยะ (Entrance)</div>
        <div className="scene">
          <div className="scene-bg" />
          <div className="road"><div className="road-line" /><div className="road-edge" /></div>
          <div className="status" id="status-txt">🔴 ไม้กั้น : ปิด</div>
          <div className="post"><div className="post-light" id="post-light" /></div>
          <div className="arm-wrap" id="arm"><div className="arm" /><div className="arm-tip" /></div>
          <svg className="car" id="car" width="60" height="30" viewBox="0 0 100 50">
            <path d="M10,50 L90,50 C95,50 100,45 100,40 L100,25 C100,20 95,15 85,15 L70,5 C65,0 60,0 55,0 L30,0 C20,0 15,5 10,15 L5,15 C2,15 0,18 0,22 L0,40 C0,45 5,50 10,50 Z" fill="#ffffff"/>
            <path d="M15,15 L30,2 C35,2 40,2 45,2 L65,2 C70,2 75,5 80,15 L15,15 Z" fill="#0f172a"/>
            <circle cx="25" cy="50" r="12" fill="#334155"/><circle cx="25" cy="50" r="6" fill="#cbd5e1"/>
            <circle cx="75" cy="50" r="12" fill="#334155"/><circle cx="75" cy="50" r="6" fill="#cbd5e1"/>
            <rect x="95" y="25" width="5" height="8" fill="#fca5a5" rx="2"/>
            <rect x="0" y="25" width="5" height="8" fill="#ef4444" rx="2"/>
          </svg>
        </div>
        <button className="btn" id="btn">🅿️ เริ่มเข้าจอดรถ</button>
      </div>
      <div className="overlay" id="overlay">
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 20px' }} />
          <div style={{ fontWeight: 600, color: '#a78bfa', letterSpacing: 1 }}>กำลังเข้าสู่ระบบ...</div>
        </div>
      </div>
    </>
  )
}
