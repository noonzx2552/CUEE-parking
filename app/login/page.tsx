'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'


type Tab = 'line' | 'password'
type State = 'idle' | 'loading' | 'success' | 'error'

export default function CheckinPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('line')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [successName, setSuccessName] = useState('')
  const [liffId, setLiffId] = useState('')
  const liffReady = useRef(false)

  // Save entrance time on mount
  useEffect(() => {
    localStorage.setItem('sp_entrance_time', String(Date.now()))
    localStorage.setItem('sp_entrance_time_display',
      new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }))
  }, [])

  // Fetch LIFF ID
  useEffect(() => {
    fetch('/api/app-config').then(r => r.json()).then(cfg => {
      if (cfg.LINE_LIFF_ID) setLiffId(cfg.LINE_LIFF_ID)
    }).catch(() => {})
  }, [])

  // Load LIFF SDK when tab switches to LINE
  useEffect(() => {
    if (tab !== 'line' || !liffId || liffReady.current) return
    const script = document.createElement('script')
    script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
    script.onload = async () => {
      try {
        await window.liff.init({ liffId })
        liffReady.current = true
        // If already logged in via LIFF, auto-capture
        if (window.liff.isLoggedIn()) {
          await handleLiffProfile()
        }
      } catch { /* ignore init error */ }
    }
    document.head.appendChild(script)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, liffId])

  async function handleLiffProfile() {
    const profile = await window.liff.getProfile()
    localStorage.setItem('sp_user_id', profile.userId)
    localStorage.setItem('sp_user_name', profile.displayName)
    setSuccessName(profile.displayName)
    setState('success')
    setTimeout(() => router.push('/'), 2200)
  }

  async function handleLineLogin() {
    if (state === 'loading') return
    setState('loading')
    setErrorMsg('')
    try {
      if (!liffId) {
        setErrorMsg('ยังไม่ได้ตั้งค่า LIFF ID กรุณาติดต่อผู้ดูแลระบบ')
        setState('error')
        return
      }
      if (!liffReady.current) {
        // LIFF not ready yet — init now
        await window.liff.init({ liffId })
        liffReady.current = true
      }
      if (!window.liff.isLoggedIn()) {
        window.liff.login()
        return
      }
      await handleLiffProfile()
    } catch {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อ LINE')
      setState('error')
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'loading') return
    setState('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/auth/user-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (data.status === 'success') {
        localStorage.setItem('sp_user_id', data.userId)
        localStorage.setItem('sp_user_name', data.userName)
        setSuccessName(data.userName)
        setState('success')
        setTimeout(() => router.push('/'), 2200)
      } else {
        setErrorMsg(data.message || 'เกิดข้อผิดพลาด')
        setState('error')
      }
    } catch {
      setErrorMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
      setState('error')
    }
  }

  function handleSkip() {
    localStorage.removeItem('sp_user_id')
    localStorage.removeItem('sp_user_name')
    router.push('/')
  }

  const isLoading = state === 'loading'

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

          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab-btn ${tab === 'line' ? 'active' : ''}`}
              onClick={() => { setTab('line'); setState('idle'); setErrorMsg('') }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 6 }}>
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
              </svg>
              LINE
            </button>
            <button
              className={`tab-btn ${tab === 'password' ? 'active' : ''}`}
              onClick={() => { setTab('password'); setState('idle'); setErrorMsg('') }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              ชื่อผู้ใช้
            </button>
          </div>

          {/* LINE Tab */}
          {tab === 'line' && (
            <div className="tab-content">
              <div className="line-illus">
                <div className="line-bubble">สแกน QR แล้วเข้าสู่ระบบด้วย LINE</div>
                <div className="line-icon-wrap">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="#fff">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                  </svg>
                </div>
              </div>
              <p className="line-desc">
                เชื่อมต่อ LINE เพื่อรับ<br />
                <strong>ตั๋วจอดรถ &amp; การแจ้งเตือน</strong> ผ่าน LINE
              </p>
              {errorMsg && <div className="err-msg">{errorMsg}</div>}
              <button className="btn-line" onClick={handleLineLogin} disabled={isLoading}>
                {isLoading ? <span className="spinner-sm" /> : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" style={{ marginRight: 8 }}>
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                    </svg>
                    เข้าสู่ระบบด้วย LINE
                  </>
                )}
              </button>
            </div>
          )}

          {/* Username/Password Tab */}
          {tab === 'password' && (
            <div className="tab-content">
              <form onSubmit={handlePasswordLogin} autoComplete="off">
                <div className="field">
                  <label className="field-label">ชื่อผู้ใช้</label>
                  <div className="field-wrap">
                    <svg className="field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                    </svg>
                    <input
                      className="field-input"
                      type="text"
                      placeholder="ชื่อหรือรหัสนักศึกษา"
                      value={username}
                      onChange={e => { setUsername(e.target.value); setState('idle'); setErrorMsg('') }}
                      disabled={isLoading}
                      autoComplete="username"
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">รหัสผ่าน</label>
                  <div className="field-wrap">
                    <svg className="field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <input
                      className="field-input"
                      type={showPass ? 'text' : 'password'}
                      placeholder="รหัสผ่าน (อย่างน้อย 4 ตัว)"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setState('idle'); setErrorMsg('') }}
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <button type="button" className="pass-toggle" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                      {showPass ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                {errorMsg && <div className="err-msg">{errorMsg}</div>}
                <button className="btn-submit" type="submit" disabled={isLoading || !username || !password}>
                  {isLoading ? <span className="spinner-sm" /> : 'เข้าสู่ระบบ / สมัครสมาชิก'}
                </button>
                <div className="form-hint">หากยังไม่มีบัญชี ระบบจะสร้างให้อัตโนมัติ</div>
              </form>
            </div>
          )}

          {/* Skip */}
          <button className="btn-skip" onClick={handleSkip}>
            ข้ามขั้นตอนนี้
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 4 }}>
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
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

  /* Tabs */
  .tabs{
    display:grid;grid-template-columns:1fr 1fr;
    background:rgba(255,255,255,.05);
    border-radius:14px;
    padding:4px;
    margin-bottom:22px;
    gap:4px;
  }
  .tab-btn{
    display:flex;align-items:center;justify-content:center;
    background:transparent;border:none;color:#555577;
    font-family:'Prompt',sans-serif;font-size:13px;font-weight:600;
    padding:9px 8px;border-radius:10px;cursor:pointer;
    transition:all .2s;
  }
  .tab-btn.active{
    background:linear-gradient(135deg,rgba(124,77,255,.25),rgba(224,64,251,.15));
    color:#fff;
    box-shadow:0 2px 12px rgba(124,77,255,.2);
    border:1px solid rgba(124,77,255,.3);
  }

  /* Tab content */
  .tab-content{animation:fadeIn .25s ease}
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

  /* Form fields */
  .field{margin-bottom:14px}
  .field-label{font-size:11px;font-weight:600;color:#555577;letter-spacing:.5px;margin-bottom:6px;display:block}
  .field-wrap{position:relative;display:flex;align-items:center}
  .field-icon{position:absolute;left:14px;color:#444466;pointer-events:none;flex-shrink:0}
  .field-input{
    width:100%;
    background:rgba(255,255,255,.06);
    border:1px solid rgba(255,255,255,.1);
    border-radius:13px;
    padding:13px 42px 13px 40px;
    color:#fff;font-family:'Prompt',sans-serif;font-size:14px;
    outline:none;transition:border .2s,box-shadow .2s;
  }
  .field-input::placeholder{color:#333355}
  .field-input:focus{border-color:rgba(124,77,255,.5);box-shadow:0 0 0 3px rgba(124,77,255,.1)}
  .field-input:disabled{opacity:.5}
  .pass-toggle{
    position:absolute;right:12px;
    background:none;border:none;color:#444466;cursor:pointer;
    padding:4px;display:flex;align-items:center;
    transition:color .2s;
  }
  .pass-toggle:hover{color:#a78bfa}

  .err-msg{
    background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);
    border-radius:10px;padding:10px 14px;
    font-size:12px;color:#fca5a5;margin-bottom:14px;
  }

  .btn-submit{
    width:100%;
    background:linear-gradient(135deg,#7c4dff,#e040fb);
    color:#fff;border:none;border-radius:16px;
    padding:15px;
    font-family:'Prompt',sans-serif;font-size:15px;font-weight:700;
    cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 8px 24px rgba(124,77,255,.3);
    transition:all .2s;margin-top:4px;
  }
  .btn-submit:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 12px 28px rgba(124,77,255,.4)}
  .btn-submit:disabled{opacity:.5;cursor:not-allowed}

  .form-hint{font-size:10px;color:#333355;text-align:center;margin-top:10px}

  /* Skip */
  .btn-skip{
    display:flex;align-items:center;
    background:none;border:none;
    color:#333355;font-family:'Prompt',sans-serif;font-size:12px;
    cursor:pointer;margin-top:16px;padding:6px;
    transition:color .2s;
  }
  .btn-skip:hover{color:#a78bfa}

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
