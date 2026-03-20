<?php if (!defined('SMARTPARK_ADMIN_VIEW')) { http_response_code(403); exit; } ?>
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartPark — Admin Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Prompt:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #060910;
      --bg2: #0d1117;
      --bg3: #161b22;
      --border: rgba(255,255,255,0.06);
      --border2: rgba(255,255,255,0.12);
      --primary: #58a6ff;
      --success: #3fb950;
      --danger: #f85149;
      --warning: #d29922;
      --purple: #bc8cff;
      --text: #e6edf3;
      --muted: #7d8590;
      --mono: 'JetBrains Mono', monospace;
      --sans: 'Prompt', sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      font-family: var(--sans);
      color: var(--text);
      min-height: 100vh;
    }

    /* ── TOP BAR ── */
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 24px;
      background: var(--bg2);
      border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 100;
    }
    .topbar-left { display: flex; align-items: center; gap: 12px; }
    .topbar-logo {
      width: 32px; height: 32px;
      background: linear-gradient(135deg, #388bfd, #bc8cff);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-family: var(--mono); font-weight: 700; font-size: 14px;
    }
    .topbar-title { font-family: var(--mono); font-size: 14px; font-weight: 700; letter-spacing: 1px; color: var(--text); }
    .topbar-badge {
      background: rgba(63,185,80,0.15); border: 1px solid rgba(63,185,80,0.3);
      border-radius: 20px; padding: 3px 10px;
      font-size: 10px; font-weight: 600; color: var(--success);
      display: flex; align-items: center; gap: 5px;
      font-family: var(--mono);
    }
    .topbar-badge::before {
      content: ''; width: 6px; height: 6px; border-radius: 50%;
      background: var(--success);
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
    .topbar-right { display: flex; align-items: center; gap: 12px; }
    .topbar-time { font-family: var(--mono); font-size: 13px; color: var(--muted); }
    .topbar-logout {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 8px 14px; border-radius: 10px;
      border: 1px solid var(--border2); color: var(--text);
      text-decoration: none; font-size: 12px; font-family: var(--mono);
      background: rgba(255,255,255,0.04);
    }
    .topbar-logout:hover { border-color: var(--primary); color: var(--primary); }

    /* ── MAIN ── */
    .main { padding: 24px; display: flex; flex-direction: column; gap: 20px; max-width: 1200px; margin: 0 auto; }

    /* ── STAT CARDS ── */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
    .stat-card {
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: 12px; padding: 18px 20px;
      position: relative; overflow: hidden;
    }
    .stat-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    }
    .stat-card.blue::before { background: var(--primary); }
    .stat-card.green::before { background: var(--success); }
    .stat-card.red::before { background: var(--danger); }
    .stat-card.purple::before { background: var(--purple); }
    .stat-label { font-size: 11px; color: var(--muted); font-weight: 600; letter-spacing: .5px; margin-bottom: 8px; text-transform: uppercase; }
    .stat-val { font-family: var(--mono); font-size: 32px; font-weight: 700; line-height: 1; margin-bottom: 4px; }
    .stat-card.blue .stat-val { color: var(--primary); }
    .stat-card.green .stat-val { color: var(--success); }
    .stat-card.red .stat-val { color: var(--danger); }
    .stat-card.purple .stat-val { color: var(--purple); }
    .stat-sub { font-size: 11px; color: var(--muted); }

    /* ── SECTION TITLE ── */
    .section-title {
      font-family: var(--mono); font-size: 12px; font-weight: 700;
      color: var(--muted); letter-spacing: 1.5px; text-transform: uppercase;
      display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
    }
    .section-title::after { content: ''; flex: 1; height: 1px; background: var(--border); }

    /* ── PARKING MAP TOP VIEW ── */
    .map-card {
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: 12px; padding: 20px; overflow-x: auto;
    }
    .road-bar {
      display: flex; align-items: center; justify-content: space-between;
      background: #1c2128; border-radius: 8px;
      padding: 10px 16px; margin-bottom: 16px;
      border: 1px solid var(--border);
    }
    .road-label { font-family: var(--mono); font-size: 11px; color: var(--warning); font-weight: 700; }
    .road-dashes {
      flex: 1; margin: 0 16px; height: 4px; border-radius: 2px;
      background: repeating-linear-gradient(90deg, var(--warning) 0, var(--warning) 16px, transparent 16px, transparent 28px);
      opacity: .5;
    }
    .parking-map {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      min-width: 360px;
    }
    .pslot-map {
      border-radius: 10px; padding: 14px 10px;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      cursor: pointer; transition: all .2s; position: relative;
      border: 2px solid transparent;
      min-height: 110px; justify-content: center;
    }
    .pslot-map.vacant {
      background: rgba(63,185,80,0.08);
      border-color: rgba(63,185,80,0.3);
    }
    .pslot-map.occupied {
      background: rgba(248,81,73,0.1);
      border-color: rgba(248,81,73,0.4);
    }
    .pslot-map.long-park {
      background: rgba(248,81,73,0.18);
      border-color: var(--danger);
      animation: border-blink 1s infinite;
    }
    @keyframes border-blink { 0%,100%{border-color:var(--danger)} 50%{border-color:transparent} }
    .pslot-map-name {
      font-family: var(--mono); font-size: 16px; font-weight: 700;
      color: var(--text);
    }
    .car-icon { font-size: 28px; line-height: 1; }
    .pslot-map-timer {
      font-family: var(--mono); font-size: 11px; font-weight: 600;
      color: var(--warning); background: rgba(210,153,34,0.12);
      border-radius: 6px; padding: 2px 8px;
    }
    .pslot-map-timer.long { color: var(--danger); background: rgba(248,81,73,0.12); }
    .pslot-map-empty { font-size: 11px; color: var(--muted); letter-spacing: 1px; }
    .pslot-map-badge {
      font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 20px;
      font-family: var(--mono);
    }
    .pslot-map-badge.v { background: rgba(63,185,80,0.15); color: var(--success); }
    .pslot-map-badge.o { background: rgba(248,81,73,0.15); color: var(--danger); }

    .map-legend {
      display: flex; gap: 20px; margin-top: 14px;
      padding-top: 14px; border-top: 1px solid var(--border);
      flex-wrap: wrap;
    }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }
    .legend-dot { width: 12px; height: 12px; border-radius: 3px; }
    .vacant-dot { background: rgba(63,185,80,0.5); border: 1px solid rgba(63,185,80,0.5); }
    .occupied-dot { background: rgba(248,81,73,0.5); border: 1px solid rgba(248,81,73,0.5); }
    .long-dot { background: var(--danger); }

    /* ── SLOT LIST ── */
    .slots-list { display: flex; flex-direction: column; gap: 8px; }
    .slot-row {
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: 10px; padding: 14px 18px;
      display: flex; align-items: center; gap: 14px;
      transition: border-color .2s;
    }
    .slot-row.occupied { border-color: rgba(248,81,73,0.3); }
    .slot-row-name { font-family: var(--mono); font-size: 16px; font-weight: 700; min-width: 36px; }
    .slot-row-status { flex: 1; }
    .slot-row-timer { font-family: var(--mono); font-size: 13px; color: var(--warning); min-width: 80px; text-align: right; }
    .slot-row-timer.long { color: var(--danger); }
    .slot-row-actions { display: flex; gap: 6px; }

    @media (max-width: 600px) {
      .main { padding: 16px; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }

    /* ── EMERGENCY BARRIER ── */
    .barrier-card {
      background: var(--bg2); border: 1px solid rgba(248,81,73,0.2);
      border-radius: 12px; padding: 20px;
    }
    .barrier-inner { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .barrier-icon { font-size: 28px; }
    .barrier-body { flex: 1; }
    .barrier-title { font-size: 14px; font-weight: 700; color: var(--danger); margin-bottom: 2px; }
    .barrier-sub { font-size: 12px; color: var(--muted); }
    .btn-barrier {
      padding: 12px 24px; border-radius: 10px; border: none;
      background: linear-gradient(135deg, #f85149, #da3633);
      color: #fff; font-size: 13px; font-weight: 700; cursor: pointer;
      font-family: var(--sans);
      box-shadow: 0 4px 14px rgba(248,81,73,0.35);
      transition: all .15s; white-space: nowrap;
    }
    .btn-barrier:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(248,81,73,0.45); }
    .btn-barrier:active { transform: scale(.97); }
    .btn-barrier.open {
      background: linear-gradient(135deg, #3fb950, #2ea043);
      box-shadow: 0 4px 14px rgba(63,185,80,0.35);
    }

    /* ── LOG TABLE ── */
    .log-card {
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: 12px; overflow: hidden;
    }
    .log-header {
      padding: 14px 18px; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
    }
    .log-title { font-family: var(--mono); font-size: 13px; font-weight: 700; }
    .log-count { font-family: var(--mono); font-size: 11px; color: var(--muted); }
    table { width: 100%; border-collapse: collapse; }
    th {
      text-align: left; padding: 10px 18px;
      font-size: 10px; font-weight: 700; color: var(--muted);
      letter-spacing: .8px; text-transform: uppercase;
      border-bottom: 1px solid var(--border);
      font-family: var(--mono);
      background: rgba(255,255,255,0.02);
    }
    td { padding: 12px 18px; font-size: 13px; border-bottom: 1px solid var(--border); }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255,255,255,0.02); }
    .td-slot { font-family: var(--mono); font-weight: 700; color: var(--primary); }
    .td-time { font-family: var(--mono); font-size: 12px; color: var(--muted); }
    .td-duration { font-family: var(--mono); font-size: 12px; }
    .badge-in { background: rgba(63,185,80,0.12); color: var(--success); border: 1px solid rgba(63,185,80,0.25); border-radius: 6px; padding: 2px 8px; font-size: 10px; font-weight: 700; font-family: var(--mono); }
    .badge-out { background: rgba(125,133,144,0.12); color: var(--muted); border: 1px solid var(--border); border-radius: 6px; padding: 2px 8px; font-size: 10px; font-weight: 700; font-family: var(--mono); }
    .empty-log { padding: 32px; text-align: center; color: var(--muted); font-size: 13px; }

    /* toast */
    .toast {
      position: fixed; top: 20px; left: 50%; transform: translate(-50%,-80px);
      z-index: 9999; padding: 10px 22px; border-radius: 100px;
      font-size: 13px; font-weight: 700; color: #fff;
      transition: transform .3s cubic-bezier(.175,.885,.32,1.275);
      font-family: var(--sans);
    }
    .toast.show { transform: translate(-50%, 0); }
    .toast.success { background: #2ea043; box-shadow: 0 4px 20px rgba(63,185,80,.4); }
    .toast.error { background: #da3633; box-shadow: 0 4px 20px rgba(248,81,73,.4); }

    @media (max-width: 600px) {
      .main { padding: 16px; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
  <script src="app-config.js.php"></script>
</head>
<body>

<div class="toast" id="toast"></div>

<!-- TOP BAR -->
<div class="topbar">
  <div class="topbar-left">
    <div class="topbar-logo">SP</div>
    <div class="topbar-title">SMARTPARK / ADMIN</div>
    <div class="topbar-badge">LIVE</div>
  </div>
  <div class="topbar-right">
    <div class="topbar-time" id="topbar-time">--:--:--</div>
    <a class="topbar-logout" href="admin.php?logout=1">LOGOUT</a>
  </div>
</div>

<div class="main">

  <!-- STAT CARDS -->
  <div class="stats-grid">
    <div class="stat-card blue">
      <div class="stat-label">รถเข้าวันนี้</div>
      <div class="stat-val" id="stat-today">0</div>
      <div class="stat-sub">คัน</div>
    </div>
    <div class="stat-card red">
      <div class="stat-label">ไม่ว่างตอนนี้</div>
      <div class="stat-val" id="stat-occupied">0</div>
      <div class="stat-sub">ช่อง</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">ว่างตอนนี้</div>
      <div class="stat-val" id="stat-vacant">0</div>
      <div class="stat-sub">ช่อง</div>
    </div>
    <div class="stat-card purple">
      <div class="stat-label">ทั้งหมด</div>
      <div class="stat-val">4</div>
      <div class="stat-sub">ช่อง</div>
    </div>
  </div>

  <!-- SLOT MAP TOP VIEW -->
  <div>
    <div class="section-title">แผนผังที่จอด — Top View</div>
    <div class="map-card">
      <!-- ถนนทางเข้า -->
      <div class="road-bar">
        <span class="road-label">◀ ทางเข้า</span>
        <div class="road-dashes"></div>
        <span class="road-label">ทางออก ▶</span>
      </div>
      <!-- ช่องจอด -->
      <div class="parking-map" id="parking-map"></div>
      <!-- legend -->
      <div class="map-legend">
        <div class="legend-item"><div class="legend-dot vacant-dot"></div>ว่าง</div>
        <div class="legend-item"><div class="legend-dot occupied-dot"></div>มีรถ</div>
        <div class="legend-item"><div class="legend-dot long-dot"></div>จอดนานเกิน 1 ชม.</div>
      </div>
    </div>
  </div>

  <!-- SLOT DETAIL LIST -->
  <div>
    <div class="section-title">รายละเอียดช่องจอด</div>
    <div class="slots-list" id="slots-list"></div>
  </div>

  <!-- EMERGENCY BARRIER -->
  <div>
    <div class="section-title">ควบคุมไม้กั้นฉุกเฉิน</div>
    <div class="barrier-card">
      <div class="barrier-inner">
        <div class="barrier-icon">🚧</div>
        <div class="barrier-body">
          <div class="barrier-title">ระบบฉุกเฉิน — เปิด/ปิดไม้กั้น</div>
          <div class="barrier-sub">ใช้เมื่อเซนเซอร์พัง หรือต้องการควบคุมด้วยมือ</div>
        </div>
        <button class="btn-barrier" id="barrier-btn" onclick="toggleBarrier()">
          🔓 เปิดไม้กั้นฉุกเฉิน
        </button>
      </div>
    </div>
  </div>

  <!-- LOG TABLE -->
  <div>
    <div class="section-title">ประวัติการจอดวันนี้</div>
    <div class="log-card">
      <div class="log-header">
        <div class="log-title">Parking Log</div>
        <div class="log-count" id="log-count">0 รายการ</div>
      </div>
      <div id="log-table-wrap">
        <div class="empty-log">กำลังโหลดข้อมูล...</div>
      </div>
    </div>
  </div>

</div>

<script>
  const APP_CONFIG = window.APP_CONFIG || {};
  const API_BASE = APP_CONFIG.API_BASE || 'api';
  const apiUrl = (path) => `${API_BASE}/${path}`;
  const SLOTS = ['A1','A2','A3','A4'];
  const slotData = {};
  let barrierOpen = false;
  let todayCount = 0;

  // init slot data
  SLOTS.forEach(s => { slotData[s] = { status: 'vacant', since: null }; });

  // ── Clock ──────────────────────────────────────────────────────
  function updateClock() {
    document.getElementById('topbar-time').textContent = new Date().toLocaleTimeString('th-TH');
  }
  setInterval(updateClock, 1000);
  updateClock();

  // ── Format duration ────────────────────────────────────────────
  function formatDuration(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}ชม. ${m}น.`;
    if (m > 0) return `${m}น. ${sec}ว.`;
    return `${sec}ว.`;
  }

  // ── Render parking map (top view) ─────────────────────────────
  function renderSlots() {
    const map = document.getElementById('parking-map');
    const list = document.getElementById('slots-list');
    if (!map || !list) return;
    map.innerHTML = '';
    list.innerHTML = '';
    let occ = 0, vac = 0;

    SLOTS.forEach(name => {
      const d = slotData[name];
      const isOcc = d.status === 'occupied';
      if (isOcc) occ++; else vac++;
      const dur = isOcc && d.since ? Date.now() - d.since : 0;
      const durStr = isOcc ? formatDuration(dur) : '';
      const isLong = dur > 3600000;

      // ── MAP CELL ──
      const cell = document.createElement('div');
      cell.className = `pslot-map ${isOcc ? (isLong ? 'long-park' : 'occupied') : 'vacant'}`;
      cell.id = 'map-' + name;
      cell.innerHTML = isOcc
        ? `<div class="pslot-map-name">${name}</div>
           <div class="car-icon">🚗</div>
           <div class="pslot-map-timer ${isLong ? 'long' : ''}" id="map-timer-${name}">${durStr}</div>
           <div class="pslot-map-badge o">ไม่ว่าง</div>`
        : `<div class="pslot-map-name">${name}</div>
           <div class="pslot-map-empty">— ว่าง —</div>
           <div class="pslot-map-badge v">ว่าง</div>`;
      map.appendChild(cell);

      // ── LIST ROW ──
      const row = document.createElement('div');
      row.className = `slot-row ${isOcc ? 'occupied' : ''}`;
      row.innerHTML = `
        <div class="slot-row-name">${name}</div>
        <div class="slot-row-status">
          <span class="slot-status ${isOcc ? 'occupied' : 'vacant'}">${isOcc ? '🚗 มีรถ' : '✅ ว่าง'}</span>
          ${isLong ? '<span style="margin-left:8px;font-size:11px;color:var(--danger);">⚠️ นานเกินกำหนด</span>' : ''}
        </div>
        <div class="slot-row-timer ${isLong ? 'long' : ''}" id="list-timer-${name}">${durStr || '—'}</div>
        <div class="slot-row-actions">
          <button class="btn-sm btn-occupied" onclick="forceStatus('${name}','occupied')">🔴 ไม่ว่าง</button>
          <button class="btn-sm btn-vacant" onclick="forceStatus('${name}','vacant')">🟢 ว่าง</button>
        </div>
      `;
      list.appendChild(row);
    });

    document.getElementById('stat-occupied').textContent = occ;
    document.getElementById('stat-vacant').textContent = vac;
  }

  // ── Live timer update ──────────────────────────────────────────
  function updateTimers() {
    SLOTS.forEach(name => {
      const d = slotData[name];
      if (d.status !== 'occupied' || !d.since) return;
      const dur = Date.now() - d.since;
      const durStr = formatDuration(dur);
      const isLong = dur > 3600000;
      const mt = document.getElementById('map-timer-' + name);
      const lt = document.getElementById('list-timer-' + name);
      if (mt) { mt.textContent = durStr; mt.className = `pslot-map-timer ${isLong ? 'long' : ''}`; }
      if (lt) { lt.textContent = durStr; lt.className = `slot-row-timer ${isLong ? 'long' : ''}`; }
    });
  }
  setInterval(updateTimers, 1000);

  // ── Load status from server ────────────────────────────────────
  function loadStatus() {
    fetch(apiUrl('get_status.php'))
      .then(r => r.json())
      .then(data => {
        data.forEach(row => {
          const prev = slotData[row.slot_name]?.status;
          if (prev !== row.status) {
            if (row.status === 'occupied' && prev === 'vacant') {
              slotData[row.slot_name].since = Date.now();
              todayCount++;
              document.getElementById('stat-today').textContent = todayCount;
              addLog(row.slot_name, 'in');
            }
            if (row.status === 'vacant' && prev === 'occupied') {
              slotData[row.slot_name].since = null;
              addLog(row.slot_name, 'out');
            }
            slotData[row.slot_name].status = row.status;
          }
        });
        renderSlots();
      })
      .catch(() => {});
  }

  // ── Force status (ปุ่มฉุกเฉินต่อช่อง) ─────────────────────────
  function forceStatus(slot, status) {
    fetch(apiUrl('update.php'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot, status, source: 'admin' })
    })
    .then(() => {
      const prev = slotData[slot].status;
      slotData[slot].status = status;
      if (status === 'occupied') {
        slotData[slot].since = Date.now();
        if (prev !== 'occupied') { todayCount++; document.getElementById('stat-today').textContent = todayCount; addLog(slot, 'in'); }
      } else {
        slotData[slot].since = null;
        if (prev === 'occupied') addLog(slot, 'out');
      }
      renderSlots();
      showToast(`✅ ช่อง ${slot} → ${status === 'occupied' ? 'ไม่ว่าง' : 'ว่าง'}`, 'success');
    })
    .catch(() => showToast('❌ เชื่อมต่อ server ไม่ได้', 'error'));
  }

  // ── Emergency barrier ──────────────────────────────────────────
  function toggleBarrier() {
    barrierOpen = !barrierOpen;
    const btn = document.getElementById('barrier-btn');
    if (barrierOpen) {
      btn.textContent = '🔒 ปิดไม้กั้น';
      btn.classList.add('open');
      showToast('🔓 เปิดไม้กั้นฉุกเฉินแล้ว', 'success');
    } else {
      btn.textContent = '🔓 เปิดไม้กั้นฉุกเฉิน';
      btn.classList.remove('open');
      showToast('🔒 ปิดไม้กั้นแล้ว', 'success');
    }
  }

  // ── Log ────────────────────────────────────────────────────────
  const logs = [];
  function addLog(slot, type) {
    logs.unshift({
      slot, type,
      time: new Date().toLocaleTimeString('th-TH'),
      date: new Date().toLocaleDateString('th-TH')
    });
    if (logs.length > 50) logs.pop();
    renderLog();
  }

  function renderLog() {
    document.getElementById('log-count').textContent = logs.length + ' รายการ';
    if (logs.length === 0) {
      document.getElementById('log-table-wrap').innerHTML = '<div class="empty-log">ยังไม่มีรายการวันนี้</div>';
      return;
    }
    let rows = logs.map(l => `
      <tr>
        <td class="td-slot">${l.slot}</td>
        <td><span class="${l.type === 'in' ? 'badge-in' : 'badge-out'}">${l.type === 'in' ? 'เข้า' : 'ออก'}</span></td>
        <td class="td-time">${l.time}</td>
        <td class="td-duration" style="color:var(--muted)">${l.date}</td>
      </tr>
    `).join('');
    document.getElementById('log-table-wrap').innerHTML = `
      <table>
        <thead><tr><th>ช่อง</th><th>สถานะ</th><th>เวลา</th><th>วันที่</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  // ── Toast ──────────────────────────────────────────────────────
  function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast ${type} show`;
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  // ── Init ───────────────────────────────────────────────────────
  renderSlots();
  renderLog();
  loadStatus();
  setInterval(loadStatus, 500);
</script>
</body>
</html>
