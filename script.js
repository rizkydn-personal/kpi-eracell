/* =====================================================
   KPI Dashboard — Era Cellular
   script.js
   ===================================================== */

let DATA = [];
let WEIGHTS = {};
let TOKO_COLORS = {};
let KPI_DISPLAY = [];

let currentFilter = 'all';
let searchTerm = '';
let expandedCards = new Set();
let sortedData = [];
let ranked = [];

// ── INIT: Load data.json then bootstrap ──────────────
/*fetch('data.json')
  .then(r => r.json())
  .then(json => {
    const meta   = json.meta   || {};
    const config = json.config || {};

    DATA        = json.karyawan  || [];
    WEIGHTS     = config.weights || {};
    TOKO_COLORS = config.toko_colors || {};
    KPI_DISPLAY = config.kpi_display || [];

    // Populate header meta
    document.getElementById('updateTag').textContent  = 'Update: ' + (meta.update || '');
    document.getElementById('badgeMonth').textContent = meta.bulan || '';

    // Sort data
    ranked     = [...DATA].filter(d => d.rank_akhir > 0).sort((a, b) => a.rank_akhir - b.rank_akhir);
    const unranked = DATA.filter(d => d.rank_akhir === 0);
    sortedData = [...ranked, ...unranked];

    // Bootstrap UI
    buildStats();
    buildPodium();
    renderRankList();
    buildEraGroups();
    buildIndividualSelect();
  })
  .catch(err => {
    console.error('Gagal memuat data.json:', err);
    document.body.innerHTML = '<div style="color:#f87171;padding:2rem;font-family:monospace;">Error: Gagal memuat data.json. Pastikan file tersedia di direktori yang sama.</div>';
  });*/

import {
  db,
  ref,
  onValue
} from './firebase.js';

onValue(ref(db), (snapshot) => {
  const json = snapshot.val();

  if (!json) return;

  const meta   = json.meta || {};
  const config = json.config || {};

  DATA        = json.karyawan || [];
  WEIGHTS     = config.weights || {};
  TOKO_COLORS = config.toko_colors || {};
  KPI_DISPLAY = config.kpi_display || [];

  // Populate header meta
  document.getElementById('updateTag').textContent =
    'Update: ' + (meta.update || '');

  document.getElementById('badgeMonth').textContent =
    meta.bulan || '';

  // Sort data
  ranked = [...DATA]
    .filter(d => d.rank_akhir > 0)
    .sort((a, b) => a.rank_akhir - b.rank_akhir);

  const unranked =
    DATA.filter(d => d.rank_akhir === 0);

  sortedData = [...ranked, ...unranked];

  // Bootstrap UI
  buildStats();
  buildPodium();
  renderRankList();
  buildEraGroups();
  buildIndividualSelect();
});

// ── FORMAT HELPERS ────────────────────────────────────
function fmt(n, dec = 2)  { return parseFloat(n).toFixed(dec); }
function fmtPct(n)        { return (n * 100).toFixed(1) + '%'; }
function fmtScore(n)      { return parseFloat(n).toFixed(4); }
function fmtRp(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}

function kebBadge(k) {
  if (!k) return '';
  return `<span class="kebersihan-badge keb-${k}">${k}</span>`;
}

function buildKpiBar(pct, color = '#6ee7b7') {
  const w = Math.max(0, Math.min(100, pct * 100));
  return `<div class="kd-progress-track"><div class="kd-progress-fill" style="width:${w}%;background:${color}"></div></div>`;
}

function getRankBadgeClass(rank) {
  if (rank === 0) return 'rz';
  if (rank === 1) return 'r1';
  if (rank === 2) return 'r2';
  if (rank === 3) return 'r3';
  return 'rn';
}

function getScoreColor(score) {
  if (score > 0)     return 'green';
  if (score < -0.05) return 'red';
  return 'neutral';
}

// ── BUILD STATS ───────────────────────────────────────
function buildStats() {
  const activeData     = DATA.filter(d => d.rank_akhir > 0);
  const totalEmp       = DATA.length;
  const punished       = DATA.filter(d => d.keterangan === 'punishment').length;
  const avgPengurang   = activeData.length
    ? activeData.reduce((s, d) => s + d.pengurang, 0) / activeData.length
    : 0;
  const kebA = DATA.filter(d => d.kebersihan === 'A').length;
  const kebB = DATA.filter(d => d.kebersihan === 'B').length;
  const kebC = DATA.filter(d => d.kebersihan === 'C').length;

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card green">
      <div class="stat-label">Total Shift</div>
      <div class="stat-value">${totalEmp}</div>
      <div class="stat-sub">Shift 1–4 semua toko</div>
    </div>
    <div class="stat-card red">
      <div class="stat-label">Punishment</div>
      <div class="stat-value">${punished}</div>
      <div class="stat-sub">${(punished / totalEmp * 100).toFixed(0)}% dari total</div>
    </div>
    <div class="stat-card gold">
      <div class="stat-label">Rata-rata Pengurang</div>
      <div class="stat-value">${fmtPct(avgPengurang)}</div>
      <div class="stat-sub">Komitmen &amp; kebersihan</div>
    </div>
    <div class="stat-card blue">
      <div class="stat-label">Kebersihan A</div>
      <div class="stat-value">${kebA}</div>
      <div class="stat-sub">B:${kebB} | C:${kebC}</div>
    </div>
    <div class="stat-card purple">
      <div class="stat-label">Total Insentif</div>
      <div class="stat-value">Rp 0</div>
      <div class="stat-sub">Data bulan berjalan</div>
    </div>
  `;
}

// ── BUILD PODIUM ──────────────────────────────────────
function buildPodium() {
  const top3 = ranked.slice(0, 3);
  if (top3.length < 3) {
    document.getElementById('podiumGrid').innerHTML =
      '<div style="color:var(--text3);font-size:13px;padding:1rem;">Data ranking belum lengkap.</div>';
    return;
  }
  const order    = [top3[1], top3[0], top3[2]];
  const labels   = ['🥈', '👑', '🥉'];
  const cls      = ['silver', 'gold', 'bronze'];
  const rankNums = ['2', '1', '3'];

  document.getElementById('podiumGrid').innerHTML = order.map((emp, i) => `
    <div class="podium-card ${i === 1 ? 'p1' : ''}" onclick="openModal(${DATA.indexOf(emp)})">
      <div class="podium-crown">${labels[i]}</div>
      <div class="podium-rank ${cls[i]}">#${rankNums[i]}</div>
      <div class="podium-name">${emp.nama}</div>
      <div class="podium-toko">
        <span class="toko-pill" style="background:${TOKO_COLORS[emp.toko]}22;border-color:${TOKO_COLORS[emp.toko]}44;color:${TOKO_COLORS[emp.toko]}">${emp.toko}</span>
        Shift ${emp.shift}
      </div>
      <div class="podium-score">${fmtPct(emp.score_akhir)}</div>
      <div class="podium-score-label">Score Akhir</div>
    </div>
  `).join('');
}

// ── BUILD RANK CARD ───────────────────────────────────
function buildRankCard(emp, idx, globalIdx) {
  const rank       = emp.rank_akhir;
  const badgeClass = getRankBadgeClass(rank);
  const isExpanded = expandedCards.has(globalIdx);
  const tokoColor  = TOKO_COLORS[emp.toko] || '#888';
  const barW       = Math.max(0, Math.min(100, (emp.score_akhir + 0.5) / 1.0 * 100));

  const kpis = KPI_DISPLAY.length ? KPI_DISPLAY : [
    { key: 'digital',        name: 'Digital',          weight_label: '23%', color: '#6ee7b7' },
    { key: 'qr_tarik_tunai', name: 'QR/Tarik Tunai',   weight_label: '23%', color: '#60a5fa' },
    { key: 'perdana',        name: 'Perdana',           weight_label: '15%', color: '#a78bfa' },
    { key: 'voucher',        name: 'Voucher',           weight_label: '15%', color: '#f472b6' },
    { key: 'aksesoris',      name: 'Aksesoris',         weight_label: '14%', color: '#fb923c' },
  ];

  const detailCards = kpis.map(k => {
    const d      = emp[k.key];
    const pctVal = d.pct_acv ? (d.pct_acv * 100).toFixed(1) + '%' : '0%';
    const barFill = Math.max(0, Math.min(100, (d.pct_acv || 0) * 100));
    const momPct  = d.mom != null ? (d.mom * 100).toFixed(1) + '%' : '—';
    const momPos  = d.mom > 0;
    const momNeg  = d.mom < 0;
    return `
      <div class="kpi-detail-card">
        <div class="kd-header">
          <span class="kd-name">${k.name}</span>
          <span class="kd-weight">Bobot ${k.weight_label || k.w}</span>
        </div>
        <div class="kd-row"><span class="kd-row-label">M-1</span><span class="kd-row-val">${d.m1 != null ? d.m1.toLocaleString('id-ID', { maximumFractionDigits: 1 }) : '—'}</span></div>
        <div class="kd-row"><span class="kd-row-label">M (Acv)</span><span class="kd-row-val ${d.acv > 0 ? 'pos' : ''}">${d.acv.toLocaleString('id-ID', { maximumFractionDigits: 1 })}</span></div>
        <div class="kd-row"><span class="kd-row-label">MoM</span><span class="kd-row-val ${momPos ? 'pos' : momNeg ? 'neg' : ''}">${momPos ? '+' : ''}${momPct}</span></div>
        <div class="kd-row"><span class="kd-row-label">Gap MoM</span><span class="kd-row-val ${d.gap_mom < 0 ? 'neg' : d.gap_mom > 0 ? 'pos' : ''}">${d.gap_mom != null ? (d.gap_mom > 0 ? '+' : '') + d.gap_mom.toLocaleString('id-ID', { maximumFractionDigits: 1 }) : '—'}</span></div>
        <div class="kd-divider"></div>
        <div class="kd-row"><span class="kd-row-label">Target</span><span class="kd-row-val">${d.target.toLocaleString('id-ID', { maximumFractionDigits: 1 })}</span></div>
        <div class="kd-row"><span class="kd-row-label">% Acv</span><span class="kd-row-val ${d.pct_acv > 0 ? 'pos' : 'neg'}">${pctVal}</span></div>
        <div class="kd-row"><span class="kd-row-label">GAP Target</span><span class="kd-row-val ${d.gap < 0 ? 'neg' : 'pos'}">${d.gap.toLocaleString('id-ID', { maximumFractionDigits: 1 })}</span></div>
        <div class="kd-row"><span class="kd-row-label">Nilai</span><span class="kd-row-val">${fmtPct(d.nilai, 4)}</span></div>
        ${buildKpiBar(barFill / 100, k.color)}
      </div>
    `;
  }).join('');

  return `
    <div class="rank-card ${isExpanded ? 'expanded' : ''}" id="card-${globalIdx}">
      <div class="rank-card-top" onclick="toggleExpand(${globalIdx})">
        <div class="rank-badge ${badgeClass}">${rank > 0 ? '#' + rank : '—'}</div>
        <div class="emp-info">
          <div class="emp-name">${emp.nama}</div>
          <div class="emp-meta">
            <span class="toko-pill" style="background:${tokoColor}22;border-color:${tokoColor}44;color:${tokoColor}">${emp.toko}</span>
            Shift ${emp.shift} ${emp.kebersihan ? '&nbsp;' + kebBadge(emp.kebersihan) : ''}
          </div>
        </div>
        <div class="score-bar-wrap">
          <div class="score-bar-label">
            <span>Score</span>
            <span>${fmtPct(emp.score_akhir)}</span>
          </div>
          <div class="score-bar-track">
            <div class="score-bar-fill" style="width:${Math.max(2, barW)}%;background:${emp.score_akhir >= 0 ? '#6ee7b7' : '#f87171'}"></div>
          </div>
        </div>
        <div class="kpi-mini">
          <div class="kpi-mini-label">Pengurang</div>
          <div class="kpi-mini-val ${emp.pengurang > 0 ? 'red' : 'neutral'}">${fmtPct(emp.pengurang)}</div>
        </div>
        <div class="kpi-mini">
          <div class="kpi-mini-label">Keterangan</div>
          <div style="margin-top:2px">
            <span class="status-pill ${emp.keterangan === 'punishment' ? 'punishment' : emp.keterangan ? 'ok' : 'new'}">${emp.keterangan || 'N/A'}</span>
          </div>
        </div>
        <div class="expand-icon">▾</div>
      </div>

      <div class="detail-panel">
        <div class="detail-summary">
          <div class="ds-item">
            <div class="ds-label">Score KPI</div>
            <div class="ds-val ${emp.score >= 0 ? 'green' : 'red'}">${fmtPct(emp.score)}</div>
          </div>
          <div class="ds-item">
            <div class="ds-label">Pengurang</div>
            <div class="ds-val red">${fmtPct(emp.pengurang)}</div>
          </div>
          <div class="ds-item">
            <div class="ds-label">Score Akhir</div>
            <div class="ds-val ${emp.score_akhir >= 0 ? 'green' : 'red'}">${fmtPct(emp.score_akhir)}</div>
          </div>
          <div class="ds-item">
            <div class="ds-label">Rank Akhir</div>
            <div class="ds-val gold">${emp.rank_akhir > 0 ? '#' + emp.rank_akhir : '—'}</div>
          </div>
          <div class="ds-item">
            <div class="ds-label">Total Insentif</div>
            <div class="ds-val blue">${fmtRp(emp.total_insentif)}</div>
          </div>
          <div class="ds-item">
            <div class="ds-label">Absensi Hadir</div>
            <div class="ds-val neutral">${emp.absensi.acv_jumlah}/${emp.absensi.target_jumlah}</div>
          </div>
          <div class="ds-item">
            <div class="ds-label">Absensi Tepat</div>
            <div class="ds-val neutral">${emp.absensi.acv_tepat}/${emp.absensi.target_tepat}</div>
          </div>
          <div class="ds-item">
            <div class="ds-label">Kebersihan</div>
            <div class="ds-val ${emp.kebersihan === 'A' ? 'green' : emp.kebersihan === 'B' ? 'gold' : 'red'}">${emp.kebersihan || '—'}</div>
          </div>
        </div>
        <div class="detail-grid">${detailCards}</div>
        <button style="background:rgba(110,231,183,0.1);border:0.5px solid rgba(110,231,183,0.3);color:var(--accent);padding:8px 16px;border-radius:var(--r2);font-family:inherit;font-size:12px;cursor:pointer;"
          onclick="openModal(${globalIdx})">
          Lihat Detail Lengkap ↗
        </button>
      </div>
    </div>
  `;
}

// ── TOGGLE EXPAND ─────────────────────────────────────
function toggleExpand(idx) {
  if (expandedCards.has(idx)) {
    expandedCards.delete(idx);
  } else {
    expandedCards.add(idx);
  }
  renderRankList();
}

// ── RENDER RANK LIST ──────────────────────────────────
function renderRankList() {
  const list = document.getElementById('rankList');
  const filtered = sortedData.filter(emp => {
    const matchToko   = currentFilter === 'all' || emp.toko === currentFilter;
    const matchSearch = !searchTerm || emp.nama.toLowerCase().includes(searchTerm.toLowerCase());
    return matchToko && matchSearch;
  });

  document.getElementById('rankCount').textContent = filtered.length + ' karyawan';

  if (filtered.length === 0) {
    list.innerHTML = '<div class="no-data">Tidak ada data yang cocok.</div>';
    return;
  }
  list.innerHTML = filtered.map((emp, i) => buildRankCard(emp, i, sortedData.indexOf(emp))).join('');
}

// ── FILTER BY TOKO ────────────────────────────────────
function filterByToko(toko, e) {
  currentFilter = toko;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (e && e.target) e.target.classList.add('active');
  document.getElementById('rankSubtitle').textContent = toko === 'all'
    ? 'Semua karyawan diurutkan berdasarkan score akhir'
    : `Karyawan ${toko} diurutkan berdasarkan score akhir`;
  renderRankList();
}

// ── FILTER BY SEARCH ──────────────────────────────────
function filterBySearch() {
  searchTerm = document.getElementById('searchInput').value;
  renderRankList();
}

// ── BUILD ERA GROUPS ──────────────────────────────────
function buildEraGroups() {

  const tokos = [...new Set(DATA.map(d => d.toko))].sort();
  const container = document.getElementById('eraGroups');

  const kpis = KPI_DISPLAY.length ? KPI_DISPLAY : [
    { key: 'digital',        name: 'Digital',         color: '#6ee7b7' },
    { key: 'qr_tarik_tunai', name: 'QR/Tarik Tunai',  color: '#60a5fa' },
    { key: 'perdana',        name: 'Perdana',          color: '#a78bfa' },
    { key: 'voucher',        name: 'Voucher',          color: '#f472b6' },
    { key: 'aksesoris',      name: 'Aksesoris',        color: '#fb923c' },
  ];

  container.innerHTML = tokos.map(toko => {

    const emps  = DATA.filter(d => d.toko === toko);
    const color = TOKO_COLORS[toko] || '#888';

    // ── SORTING ──
    const ranked_emps   = emps.filter(e => e.rank_akhir > 0).sort((a,b) => a.rank_akhir - b.rank_akhir);
    const unranked_emps = emps.filter(e => e.rank_akhir === 0);
    const sortedEmps    = [...ranked_emps, ...unranked_emps];

    // ── STORE STATS ──
    const activeEmps  = emps.filter(e => e.rank_akhir > 0);
    const avgScore    = activeEmps.length ? activeEmps.reduce((s,e) => s + e.score_akhir, 0) / activeEmps.length : 0;
    const bestRank    = ranked_emps.length ? ranked_emps[0].rank_akhir : null;
    const punishCount = emps.filter(e => e.keterangan === 'punishment').length;
    const kebA        = emps.filter(e => e.kebersihan === 'A').length;
    const kebB        = emps.filter(e => e.kebersihan === 'B').length;
    const kebC        = emps.filter(e => e.kebersihan === 'C').length;

    // ── OVERALL ACHIEVEMENT (all KPI combined) ──
    let totalAcvAll = 0, totalTargetAll = 0;
    kpis.forEach(k => {
      totalAcvAll    += emps.reduce((s,e) => s + (e[k.key]?.acv    || 0), 0);
      totalTargetAll += emps.reduce((s,e) => s + (e[k.key]?.target || 0), 0);
    });
    const overallPct  = totalTargetAll > 0 ? totalAcvAll / totalTargetAll : 0;
    const overallBarW = Math.max(0, Math.min(100, overallPct * 100));
    const overallColor = overallPct >= 1 ? '#6ee7b7' : overallPct >= 0.6 ? '#fbbf24' : '#f87171';

    // ── KPI AGGREGATE ROWS ──
    const kpiRows = kpis.map(k => {
      const totalM1     = emps.reduce((s,e) => s + (e[k.key]?.m1     || 0), 0);
      const totalAcv    = emps.reduce((s,e) => s + (e[k.key]?.acv    || 0), 0);
      const totalTarget = emps.reduce((s,e) => s + (e[k.key]?.target || 0), 0);
      const totalGap    = emps.reduce((s,e) => s + (e[k.key]?.gap    || 0), 0);
      const totalGapMom = emps.reduce((s,e) => s + (e[k.key]?.gap_mom || 0), 0);
      const mom  = totalM1 > 0 ? (totalAcv - totalM1) / totalM1 : 0;
      const pct  = totalTarget > 0 ? totalAcv / totalTarget : 0;
      const barW = Math.max(0, Math.min(100, pct * 100));
      const barColor = pct >= 1 ? '#6ee7b7' : pct >= 0.5 ? '#fbbf24' : '#f87171';

      return `
        <div class="eg-kpi-row">
          <div class="eg-kpi-name">
            <span class="eg-kpi-dot" style="background:${k.color}"></span>
            ${k.name}
          </div>
          <div class="eg-kpi-vals">
            <div class="eg-kpi-val-group">
              <span class="eg-kv-label">M-1</span>
              <span class="eg-kv-num">${totalM1.toLocaleString('id-ID')}</span>
            </div>
            <div class="eg-kpi-val-group">
              <span class="eg-kv-label">ACV</span>
              <span class="eg-kv-num">${totalAcv.toLocaleString('id-ID')}</span>
            </div>
            <div class="eg-kpi-val-group">
              <span class="eg-kv-label">Target</span>
              <span class="eg-kv-num">${totalTarget.toLocaleString('id-ID')}</span>
            </div>
            <div class="eg-kpi-val-group">
              <span class="eg-kv-label">MoM</span>
              <span class="eg-kv-num ${mom >= 0 ? 'pos' : 'neg'}">${mom >= 0 ? '+' : ''}${(mom * 100).toFixed(1)}%</span>
            </div>
            <div class="eg-kpi-val-group">
              <span class="eg-kv-label">Gap MoM</span>
              <span class="eg-kv-num ${totalGapMom >= 0 ? 'pos' : 'neg'}">${totalGapMom >= 0 ? '+' : ''}${totalGapMom.toLocaleString('id-ID')}</span>
            </div>
            <div class="eg-kpi-val-group">
              <span class="eg-kv-label">Gap Target</span>
              <span class="eg-kv-num ${totalGap >= 0 ? 'pos' : 'neg'}">${totalGap >= 0 ? '+' : ''}${totalGap.toLocaleString('id-ID')}</span>
            </div>
            <div class="eg-kpi-val-group">
              <span class="eg-kv-label">ACV%</span>
              <span class="eg-kv-num" style="color:${barColor}">${(pct * 100).toFixed(1)}%</span>
            </div>
          </div>
          <div class="eg-kpi-bar-wrap">
            <div class="eg-kpi-bar">
              <div class="eg-kpi-bar-fill" style="width:${barW}%;background:${barColor}"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // ── EMPLOYEE CARDS ──
    const empCards = sortedEmps.map(emp => {
      const tc       = TOKO_COLORS[emp.toko] || '#888';
      const scoreClr = emp.score_akhir >= 0 ? 'var(--accent)' : 'var(--red)';
      const barW2    = Math.max(2, Math.min(100, (emp.score_akhir + 0.5) / 1.0 * 100));
      const barClr2  = emp.score_akhir >= 0 ? '#6ee7b7' : '#f87171';
      const isPunish = emp.keterangan === 'punishment';
      const idx      = DATA.indexOf(emp);

      return `
        <div class="eg-emp-card ${isPunish ? 'punished' : ''}" onclick="openModal(${idx})">
          <div class="eg-emp-top">
            <div class="eg-emp-avatar" style="background:${tc}22;border-color:${tc}44;color:${tc}">
              ${emp.nama.charAt(0)}
            </div>
            <div class="eg-emp-info">
              <div class="eg-emp-name">${emp.nama}</div>
            </div>
            <div class="eg-emp-rank">
              ${emp.rank_akhir > 0
                ? `<div class="eg-rank-badge ${getRankBadgeClass(emp.rank_akhir)}">#${emp.rank_akhir}</div>`
                : `<div class="eg-rank-badge rz">—</div>`
              }
            </div>
          </div>
          ${isPunish ? `<div class="eg-emp-punishment-tag">⚠ Punishment</div>` : ''}
        </div>
      `;
    }).join('');

    // ── FINAL RENDER ──
    return `
      <div class="eg-card" style="--toko-color:${color}">

        <!-- STORE HEADER -->
        <div class="eg-header">
          <div class="eg-header-left">
            <div class="eg-toko-badge" style="background:${color}22;border-color:${color}55;color:${color}">
              ${toko.replace('ERA ','')}
            </div>
            <div>
              <div class="eg-toko-name">${toko}</div>
              <div class="eg-toko-sub">${emps.length} shift aktif</div>
            </div>
          </div>

          <!-- OVERALL PROGRESS BAR -->
          <div class="eg-overall-wrap">
            <div class="eg-overall-label">
              <span>Overall ACV</span>
              <span style="color:${overallColor};font-weight:700">${(overallPct * 100).toFixed(1)}%</span>
            </div>
            <div class="eg-overall-bar">
              <div class="eg-overall-fill" style="width:${overallBarW}%;background:${overallColor}"></div>
            </div>
          </div>
        </div>

        <!-- SUMMARY CHIPS -->
        <div class="eg-chips">
          <div class="eg-chip">
            <div class="eg-chip-label">Avg Score</div>
            <div class="eg-chip-val" style="color:${avgScore >= 0 ? 'var(--accent)' : 'var(--red)'}">
              ${fmtPct(avgScore)}
            </div>
          </div>
          <div class="eg-chip">
            <div class="eg-chip-label">Best Rank</div>
            <div class="eg-chip-val" style="color:var(--gold)">
              ${bestRank ? '#' + bestRank : '—'}
            </div>
          </div>
          <div class="eg-chip">
            <div class="eg-chip-label">Punishment</div>
            <div class="eg-chip-val" style="color:${punishCount > 0 ? 'var(--red)' : 'var(--text3)'}">
              ${punishCount}
            </div>
          </div>
          <div class="eg-chip">
            <div class="eg-chip-label">Kebersihan</div>
            <div class="eg-chip-val eg-chip-keb">
              <span style="color:#6ee7b7">A:${kebA}</span>
              <span class="eg-keb-dot">·</span>
              <span style="color:#fbbf24">B:${kebB}</span>
              <span class="eg-keb-dot">·</span>
              <span style="color:#f87171">C:${kebC}</span>
            </div>
          </div>
        </div>

        <!-- KPI TABLE -->
        <div class="eg-section-label">Rekapitulasi KPI</div>
        <div class="eg-kpi-table">
          <div class="eg-kpi-table-head">
            <div class="eg-kth eg-kth-name">Kategori</div>
            <div class="eg-kth">M-1</div>
            <div class="eg-kth">ACV</div>
            <div class="eg-kth">Target</div>
            <div class="eg-kth">MoM</div>
            <div class="eg-kth">Gap MoM</div>
            <div class="eg-kth">Gap Target</div>
            <div class="eg-kth">ACV%</div>
          </div>
          <div class="eg-kpi-rows">
            ${kpiRows}
          </div>
        </div>

        <!-- KPI CARDS (Mobile only) -->
        <div class="eg-kpi-cards-mobile">
          ${kpis.map(k => {
            const totalM1     = emps.reduce((s,e) => s + (e[k.key]?.m1     || 0), 0);
            const totalAcv    = emps.reduce((s,e) => s + (e[k.key]?.acv    || 0), 0);
            const totalTarget = emps.reduce((s,e) => s + (e[k.key]?.target || 0), 0);
            const totalGap    = emps.reduce((s,e) => s + (e[k.key]?.gap    || 0), 0);
            const totalGapMom = emps.reduce((s,e) => s + (e[k.key]?.gap_mom || 0), 0);
            const mom = totalM1 > 0 ? (totalAcv - totalM1) / totalM1 : 0;
            const pct = totalTarget > 0 ? totalAcv / totalTarget : 0;
            const barW = Math.max(0, Math.min(100, pct * 100));
            const barColor = pct >= 1 ? '#6ee7b7' : pct >= 0.5 ? '#fbbf24' : '#f87171';
            return `
              <div class="eg-kpi-mcard">
                <div class="eg-kpi-mcard-head">
                  <span class="eg-kpi-dot" style="background:${k.color}"></span>
                  <span class="eg-kpi-mcard-name">${k.name}</span>
                </div>
                <div class="eg-kpi-mcard-grid">
                  <div class="eg-kpi-mcard-item"><span>M-1</span><strong>${totalM1.toLocaleString('id-ID')}</strong></div>
                  <div class="eg-kpi-mcard-item"><span>Target</span><strong>${totalTarget.toLocaleString('id-ID')}</strong></div>
                  <div class="eg-kpi-mcard-item"><span>Acv</span><strong>${totalAcv.toLocaleString('id-ID')}</strong></div>
                  <div class="eg-kpi-mcard-item"><span>Gap MoM</span><strong class="${totalGapMom >= 0 ? 'pos' : 'neg'}">${totalGapMom >= 0 ? '+' : ''}${totalGapMom.toLocaleString('id-ID')}</strong></div>
                  <div class="eg-kpi-mcard-item last"><span>Gap Target</span><strong class="${totalGap >= 0 ? 'pos' : 'neg'}">${totalGap >= 0 ? '+' : ''}${totalGap.toLocaleString('id-ID')}</strong></div>
                  <div class="eg-kpi-mcard-item last"><span>Acv%</span><strong class="${totalGap >= 0 ? 'pos' : 'neg'}">${(pct * 100).toFixed(1)}%</strong></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- EMPLOYEES -->
        <div class="eg-section-label">Karyawan</div>
        <div class="eg-emp-grid">
          ${empCards}
        </div>

      </div>
    `;

  }).join('');

}

// ── INDIVIDUAL SELECT ─────────────────────────────────
function buildIndividualSelect() {
  const sel = document.getElementById('empSelect');
  DATA.forEach((emp, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${emp.nama} — ${emp.toko} Shift ${emp.shift}`;
    sel.appendChild(opt);
  });
}

function showIndividual() {
  const idx = document.getElementById('empSelect').value;
  if (idx === '') {
    document.getElementById('individualPanel').innerHTML = '';
    return;
  }
  buildIndividualView(DATA[parseInt(idx)], 'individualPanel');
}

// ── INDIVIDUAL VIEW ───────────────────────────────────
function buildIndividualView(emp, containerId) {
  const container  = document.getElementById(containerId);
  const tokoColor  = TOKO_COLORS[emp.toko] || '#888';

  const kpis = KPI_DISPLAY.length ? KPI_DISPLAY : [
    { key: 'digital',        name: 'Digital',          weight_label: '23%', color: '#6ee7b7' },
    { key: 'qr_tarik_tunai', name: 'QR / Tarik Tunai', weight_label: '23%', color: '#60a5fa' },
    { key: 'perdana',        name: 'Penjualan Perdana', weight_label: '15%', color: '#a78bfa' },
    { key: 'voucher',        name: 'Voucher',           weight_label: '15%', color: '#f472b6' },
    { key: 'aksesoris',      name: 'Aksesoris',         weight_label: '14%', color: '#fb923c' },
  ];

  const kpiCards = kpis.map(k => {
    const d      = emp[k.key];
    const pctNum = (d.pct_acv || 0) * 100;
    const barW   = Math.max(0, Math.min(100, pctNum));
    const barColor = pctNum >= 100 ? '#6ee7b7' : pctNum >= 50 ? '#fbbf24' : '#f87171';
    const momPct   = d.mom != null ? (d.mom * 100).toFixed(1) + '%' : '—';
    const momColor = d.mom > 0 ? 'var(--accent)' : d.mom < 0 ? 'var(--red)' : 'var(--text3)';
    const gapMomColor = d.gap_mom > 0 ? 'var(--accent)' : d.gap_mom < 0 ? 'var(--red)' : 'var(--text3)';
    return `
      <div class="modal-kpi-item">
        <div class="mki-header">
          <span class="mki-name">${k.name}</span>
          <span class="mki-weight">${k.weight_label || k.w}</span>
        </div>
        <div class="mki-big ${d.acv > 0 ? 'pos' : d.acv < 0 ? 'neg' : 'zero'}">${d.acv.toLocaleString('id-ID', { maximumFractionDigits: 1 })}</div>
        <div class="mki-mom-row">
          <div class="mki-mom-item">
            <span class="mki-mom-label">M-1</span>
            <span class="mki-mom-val">${d.m1 != null ? d.m1.toLocaleString('id-ID', { maximumFractionDigits: 0 }) : '—'}</span>
          </div>
          <div class="mki-mom-item">
            <span class="mki-mom-label">MoM</span>
            <span class="mki-mom-val" style="color:${momColor}">${d.mom > 0 ? '+' : ''}${momPct}</span>
          </div>
          <div class="mki-mom-item">
            <span class="mki-mom-label">Gap MoM</span>
            <span class="mki-mom-val" style="color:${gapMomColor}">${d.gap_mom != null ? (d.gap_mom > 0 ? '+' : '') + d.gap_mom.toLocaleString('id-ID', { maximumFractionDigits: 0 }) : '—'}</span>
          </div>
        </div>
        <div class="mki-detail">
          <div class="mki-detail-item">
            <span class="mki-dl">Target</span>
            <span class="mki-dv">${d.target.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
          </div>
          <div class="mki-detail-item">
            <span class="mki-dl">% Acv</span>
            <span class="mki-dv">${pctNum.toFixed(1)}%</span>
          </div>
          <div class="mki-detail-item">
            <span class="mki-dl">GAP Target</span>
            <span class="mki-dv" style="color:${d.gap < 0 ? 'var(--red)' : 'var(--accent)'}">${d.gap.toLocaleString('id-ID', { maximumFractionDigits: 1 })}</span>
          </div>
          <div class="mki-detail-item">
            <span class="mki-dl">Insentif</span>
            <span class="mki-dv">${fmtRp(d.insentif)}</span>
          </div>
        </div>
        <div class="target-bar">
          <div class="target-bar-header">
            <span>0%</span>
            <span>${barW.toFixed(1)}%</span>
            <span>100%</span>
          </div>
          <div class="target-bar-track">
            <div class="target-bar-fill" style="width:${barW}%;background:${barColor}"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div style="background:var(--bg3);border:0.5px solid var(--border);border-radius:var(--r);padding:1.25rem;margin-bottom:1rem;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:1rem;flex-wrap:wrap;">
        <div style="width:48px;height:48px;border-radius:var(--r2);background:${tokoColor}22;border:0.5px solid ${tokoColor}44;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:${tokoColor}">
          ${emp.nama.charAt(0)}
        </div>
        <div>
          <div style="font-size:18px;font-weight:700;letter-spacing:-0.5px;">${emp.nama}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:2px;">
            <span class="toko-pill" style="background:${tokoColor}22;border-color:${tokoColor}44;color:${tokoColor}">${emp.toko}</span>
            Shift ${emp.shift} &nbsp;|&nbsp; Kebersihan: ${emp.kebersihan ? kebBadge(emp.kebersihan) : '—'}
          </div>
        </div>
        <div style="margin-left:auto;">
          <div style="font-size:11px;color:var(--text3);text-align:right;">Rank Akhir</div>
          <div style="font-size:28px;font-weight:700;color:var(--gold);text-align:right;">${emp.rank_akhir > 0 ? '#' + emp.rank_akhir : '—'}</div>
        </div>
      </div>
      <div class="modal-summary-row">
        <div class="msr-item">
          <div class="msr-label">Score KPI</div>
          <div class="msr-val" style="color:${emp.score >= 0 ? 'var(--accent)' : 'var(--red)'}">${fmtPct(emp.score)}</div>
        </div>
        <div class="msr-item">
          <div class="msr-label">Pengurang</div>
          <div class="msr-val" style="color:var(--red)">${fmtPct(emp.pengurang)}</div>
        </div>
        <div class="msr-item">
          <div class="msr-label">Score Akhir</div>
          <div class="msr-val" style="color:${emp.score_akhir >= 0 ? 'var(--accent)' : 'var(--red)'}">${fmtPct(emp.score_akhir)}</div>
        </div>
        <div class="msr-item">
          <div class="msr-label">Insentif Total</div>
          <div class="msr-val" style="color:var(--blue)">${fmtRp(emp.total_insentif)}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:1rem;">
        <div class="ds-item" style="background:var(--bg4);border:0.5px solid var(--border);border-radius:var(--r2);padding:10px 12px;">
          <div class="ds-label" style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">Status</div>
          <span class="status-pill ${emp.keterangan === 'punishment' ? 'punishment' : emp.keterangan ? 'ok' : 'new'}">${emp.keterangan || 'N/A'}</span>
        </div>
        <div class="ds-item" style="background:var(--bg4);border:0.5px solid var(--border);border-radius:var(--r2);padding:10px 12px;">
          <div class="ds-label" style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">Hadir / Target</div>
          <div style="font-size:16px;font-weight:600;font-family:'JetBrains Mono',monospace;">${emp.absensi.acv_jumlah} / ${emp.absensi.target_jumlah}</div>
        </div>
        <div class="ds-item" style="background:var(--bg4);border:0.5px solid var(--border);border-radius:var(--r2);padding:10px 12px;">
          <div class="ds-label" style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">Tepat Waktu</div>
          <div style="font-size:16px;font-weight:600;font-family:'JetBrains Mono',monospace;">${emp.absensi.acv_tepat} / ${emp.absensi.target_tepat}</div>
        </div>
        <div class="ds-item" style="background:var(--bg4);border:0.5px solid var(--border);border-radius:var(--r2);padding:10px 12px;">
          <div class="ds-label" style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">Kebersihan</div>
          <div style="font-size:16px;font-weight:600;">${emp.kebersihan ? kebBadge(emp.kebersihan) + ' ' + emp.kebersihan : '—'}</div>
        </div>
      </div>
    </div>
    <div class="modal-kpi-grid">${kpiCards}</div>
    <div style="background:var(--bg3);border:0.5px solid var(--border);border-radius:var(--r);padding:1rem;font-size:12px;color:var(--text3);">
      ℹ️ GAP = Acv − Target/Mom.
    </div>
  `;
}

// ── MODAL ─────────────────────────────────────────────
function openModal(idx) {
  const emp       = DATA[idx];
  const tokoColor = TOKO_COLORS[emp.toko] || '#888';

  document.getElementById('modalTitle').textContent = emp.nama;
  document.getElementById('modalMeta').innerHTML =
    `<span class="toko-pill" style="background:${tokoColor}22;border-color:${tokoColor}44;color:${tokoColor}">${emp.toko}</span>
     Shift ${emp.shift} &nbsp;|&nbsp; Rank Akhir: ${emp.rank_akhir > 0 ? '#' + emp.rank_akhir : 'Belum dinilai'}`;

  const tempDiv  = document.createElement('div');
  tempDiv.id     = '__tempIndividual';
  document.getElementById('modalBody').innerHTML = '';
  document.getElementById('modalBody').appendChild(tempDiv);

  buildIndividualView(emp, '__tempIndividual');

  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function closeModalIfBg(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

// ── TABS ──────────────────────────────────────────────
function switchTab(name, e) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (e && e.target) e.target.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
}

window.switchTab = switchTab;
window.filterByToko = filterByToko;
window.filterBySearch = filterBySearch;
window.toggleExpand = toggleExpand;
window.openModal = openModal;
window.closeModal = closeModal;
window.closeModalIfBg = closeModalIfBg;
window.showIndividual = showIndividual;