'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'


type State = 'idle' | 'loading' | 'success' | 'error'

const QR_EXPIRE_MS = 5 * 60 * 1000 // 5 นาที
const ROTATE_SECONDS = 30

function isTokenExpired(token: string) {
  if (!token) return false
  const tokenTime = parseInt(token, 36) * ROTATE_SECONDS * 1000
  return Date.now() - tokenTime > QR_EXPIRE_MS
}

export default function CheckinPage() {
  const router = useRouter()
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [successName, setSuccessName] = useState('')
  const [lineOaId, setLineOaId] = useState('')
  const [qrExpired, setQrExpired] = useState(false)

  // Save entrance time + notify QR to rotate
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('t') || ''

    if (token && isTokenExpired(token)) {
      setQrExpired(true)
      return
    }

    localStorage.setItem('sp_entrance_time', String(Date.now()))
    localStorage.setItem('sp_entrance_time_display',
      new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }))
    // Consume current QR token → triggers rotation on /qrcode screen
    fetch('/api/qr-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }).catch(() => {})
  }, [])

  // Fetch app config
  useEffect(() => {
    fetch('/api/app-config').then(r => r.json()).then(cfg => {
      if (cfg.LINE_OA_ID) setLineOaId(cfg.LINE_OA_ID)
    }).catch(() => {})
  }, [])


  async function handleLineLogin() {
    if (state === 'loading') return
    setState('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/app-config')
      const cfg = await res.json()
      const clientId = cfg.LINE_CLIENT_ID
      if (!clientId) {
        setErrorMsg('ยังไม่ได้ตั้งค่า LINE Client ID กรุณาติดต่อผู้ดูแลระบบ')
        setState('error')
        return
      }
      const redirectUri = encodeURIComponent(window.location.origin + '/api/auth/line')
      const stateParam = encodeURIComponent(window.location.href)
      window.location.href = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${stateParam}&scope=profile%20openid`
    } catch {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อ LINE')
      setState('error')
    }
  }

  const isLoading = state === 'loading'

  if (qrExpired) {
    return (
      <>
        <style>{globalStyles}</style>
        <div className="bg1" /><div className="bg2" /><div className="bg3" />
        <div className="success-wrap">
          <div className="success-circle" style={{ borderColor: 'rgba(239,68,68,.2)', boxShadow: '0 0 40px rgba(239,68,68,.15)' }}>
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <circle cx="26" cy="26" r="26" fill="rgba(239,68,68,0.15)" />
              <path d="M16 16l20 20M36 16L16 36" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="success-title" style={{ color: '#ef4444' }}>QR Code หมดอายุ</div>
          <div className="success-sub">QR Code นี้ใช้งานได้ไม่เกิน 5 นาที</div>
          <div className="success-sub" style={{ marginTop: 8 }}>กรุณาสแกน QR Code ใหม่ที่หน้าจอทางเข้า</div>
        </div>
      </>
    )
  }

  if (state === 'success') {
    return (
      <>
        <style>{globalStyles}</style>
        <div className="bg1" /><div className="bg2" /><div className="bg3" />
        <div className="success-wrap">
          <div className="success-circle">
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <circle cx="26" cy="26" r="26" fill="rgba(52,211,153,0.15)" />
              <path d="M14 27l9 9 16-16" stroke="#34d399" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="success-title">ยินดีต้อนรับ!</div>
          <div className="success-name">{successName}</div>
          <div className="success-sub">กำลังเข้าสู่ระบบ...</div>
          <div className="dots"><span /><span /><span /></div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{globalStyles}</style>
      <div className="bg1" /><div className="bg2" /><div className="bg3" />

      <div className="wrap">
        {/* Logo */}
        <div className="logo-row">
          <div className="logo-icon">P</div>
          <div className="logo-text">SMART PARK</div>
        </div>
        <div className="logo-sub">ระบบที่จอดรถอัจฉริยะ CUEE</div>

        {/* Card */}
        <div className="card">
          <div className="card-title">เข้าสู่ระบบ</div>
          <div className="card-desc">เพื่อรับการแจ้งเตือนและตั๋วจอดรถของคุณ</div>

          <div className="line-illus">
            <div className="line-bubble">สแกน QR แล้วเข้าสู่ระบบด้วย LINE</div>
            <div className="line-icon-wrap">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="#fff">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
              </svg>
            </div>
          </div>

          {lineOaId && (
            <a
              className="btn-add-friend"
              href={`https://line.me/R/ti/p/${lineOaId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 8, flexShrink: 0 }}>
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
              </svg>
              <span>
                <span style={{ fontWeight: 700 }}>Step 1</span> — Add เพื่อน LINE OA ก่อน
                <span style={{ display: 'block', fontSize: 11, opacity: 0.75, fontWeight: 400, marginTop: 2 }}>เพื่อรับการแจ้งเตือนค่าจอดรถ</span>
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
              </svg>
            </a>
          )}
          <div className="step-divider">แล้วจึง</div>
          {errorMsg && <div className="err-msg">{errorMsg}</div>}
          <button className="btn-line" onClick={handleLineLogin} disabled={isLoading}>
            {isLoading ? <span className="spinner-sm" /> : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" style={{ marginRight: 8 }}>
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                </svg>
                <span>Step 2 — เข้าสู่ระบบด้วย LINE</span>
              </>
            )}
          </button>

        </div>

        <div className="footer-text">SmartPark · CUEE · Powered by Next.js</div>
      </div>
    </>
  )
}

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;600;700&family=Orbitron:wght@700;900&display=swap');

  *{box-sizing:border-box;margin:0;padding:0}
  body{
    background:#06060e;
    font-family:'Prompt',sans-serif;
    color:#fff;
    min-height:100vh;
    display:flex;align-items:center;justify-content:center;
    padding:24px;
    position:relative;overflow-x:hidden;
  }

  .bg1{position:fixed;top:-120px;left:-100px;width:420px;height:420px;
    background:radial-gradient(circle,rgba(124,77,255,.18),transparent 70%);pointer-events:none;z-index:0}
  .bg2{position:fixed;bottom:-80px;right:-80px;width:340px;height:340px;
    background:radial-gradient(circle,rgba(52,211,153,.1),transparent 70%);pointer-events:none;z-index:0}
  .bg3{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:600px;
    background:radial-gradient(circle,rgba(56,40,120,.12),transparent 65%);pointer-events:none;z-index:0}

  .wrap{
    position:relative;z-index:1;
    width:100%;max-width:380px;
    display:flex;flex-direction:column;align-items:center;
  }

  /* Logo */
  .logo-row{display:flex;align-items:center;gap:12px;margin-bottom:6px}
  .logo-icon{
    width:48px;height:48px;
    background:linear-gradient(135deg,#7c4dff,#e040fb);
    border-radius:16px;
    display:flex;align-items:center;justify-content:center;
    font-family:'Orbitron',sans-serif;font-size:20px;font-weight:900;
    box-shadow:0 0 28px rgba(124,77,255,.5);
  }
  .logo-text{
    font-family:'Orbitron',sans-serif;font-size:24px;font-weight:900;
    background:linear-gradient(90deg,#a78bfa,#fff,#34d399);
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  }
  .logo-sub{font-size:12px;color:#4a4a6a;margin-bottom:28px;letter-spacing:.5px}

  /* Card */
  .card{
    width:100%;
    background:rgba(255,255,255,.04);
    border:1px solid rgba(255,255,255,.09);
    border-radius:28px;
    padding:28px 24px 22px;
    backdrop-filter:blur(12px);
    box-shadow:0 20px 60px rgba(0,0,0,.4);
  }
  .card-title{font-size:20px;font-weight:700;margin-bottom:4px}
  .card-desc{font-size:12px;color:#4a4a6a;margin-bottom:22px}

  @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

  /* LINE tab */
  .line-illus{
    background:linear-gradient(135deg,rgba(0,185,0,.12),rgba(0,150,0,.06));
    border:1px solid rgba(0,200,0,.15);
    border-radius:18px;padding:20px;
    display:flex;flex-direction:column;align-items:center;
    margin-bottom:14px;
  }
  .line-bubble{
    background:rgba(0,185,0,.15);border:1px solid rgba(0,200,0,.2);
    border-radius:12px;padding:8px 14px;
    font-size:12px;color:#4ade80;margin-bottom:12px;text-align:center;
  }
  .line-icon-wrap{
    width:72px;height:72px;
    background:linear-gradient(135deg,#00b900,#00d600);
    border-radius:20px;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 24px rgba(0,185,0,.4);
  }
  .line-desc{font-size:13px;color:#8888aa;text-align:center;line-height:1.7;margin-bottom:16px}
  .line-desc strong{color:#a78bfa}

  .btn-add-friend{
    width:100%;
    background:rgba(0,185,0,.08);
    border:1.5px dashed rgba(0,200,0,.35);
    border-radius:14px;
    padding:13px 14px;
    color:#4ade80;
    font-family:'Prompt',sans-serif;font-size:13px;font-weight:600;
    cursor:pointer;text-decoration:none;
    display:flex;align-items:center;
    margin-bottom:10px;
    transition:all .2s;
    line-height:1.3;
  }
  .btn-add-friend:hover{background:rgba(0,185,0,.15);border-color:rgba(0,200,0,.6)}

  .step-divider{
    text-align:center;font-size:11px;color:#333355;
    margin-bottom:10px;position:relative;
  }
  .step-divider::before,.step-divider::after{
    content:'';position:absolute;top:50%;width:38%;height:1px;
    background:rgba(255,255,255,.06);
  }
  .step-divider::before{left:0} .step-divider::after{right:0}

  .btn-line{
    width:100%;
    background:linear-gradient(135deg,#00b900,#00d600);
    color:#fff;border:none;border-radius:16px;
    padding:15px;
    font-family:'Prompt',sans-serif;font-size:15px;font-weight:700;
    cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 8px 24px rgba(0,185,0,.3);
    transition:all .2s;
  }
  .btn-line:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 12px 28px rgba(0,185,0,.4)}
  .btn-line:disabled{opacity:.6;cursor:not-allowed}

  .err-msg{
    background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);
    border-radius:10px;padding:10px 14px;
    font-size:12px;color:#fca5a5;margin-bottom:14px;
  }


  /* Spinner */
  .spinner-sm{
    width:20px;height:20px;
    border:2.5px solid rgba(255,255,255,.3);
    border-top-color:#fff;
    border-radius:50%;
    animation:spin .7s linear infinite;
  }
  @keyframes spin{to{transform:rotate(360deg)}}

  /* Success */
  .success-wrap{
    position:relative;z-index:1;
    display:flex;flex-direction:column;align-items:center;
    animation:fadeIn .4s ease;
  }
  .success-circle{
    width:100px;height:100px;
    background:rgba(52,211,153,.08);
    border:1px solid rgba(52,211,153,.2);
    border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    margin-bottom:20px;
    box-shadow:0 0 40px rgba(52,211,153,.15);
    animation:pulse 1.5s ease infinite;
  }
  @keyframes pulse{0%,100%{box-shadow:0 0 40px rgba(52,211,153,.15)}50%{box-shadow:0 0 60px rgba(52,211,153,.3)}}
  .success-title{font-size:26px;font-weight:700;margin-bottom:6px}
  .success-name{
    font-size:18px;font-weight:600;
    background:linear-gradient(90deg,#a78bfa,#34d399);
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
    margin-bottom:10px;
  }
  .success-sub{font-size:13px;color:#555577;margin-bottom:20px}
  .dots{display:flex;gap:8px}
  .dots span{
    width:8px;height:8px;border-radius:50%;
    background:rgba(167,139,250,.5);
    animation:bounce .8s ease infinite;
  }
  .dots span:nth-child(2){animation-delay:.15s}
  .dots span:nth-child(3){animation-delay:.3s}
  @keyframes bounce{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.4);opacity:1}}

  .footer-text{font-size:10px;color:#222244;margin-top:20px}
`
