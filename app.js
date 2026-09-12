(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const WEEKDAY_JP = ['日', '月', '火', '水', '木', '金', '土'];

  /* =====================================================================
     日付・保存キー
     ===================================================================== */

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.getDate();
  const daysInMonth = new Date(year, month, 0).getDate();
  const STORAGE_KEY = 'habitTrackerFull:' + year + '-' + String(month).padStart(2, '0');

  function isFriday(y, m, d) {
    return new Date(y, m - 1, d).getDay() === 5;
  }

  const DEFAULT_GOALS = [
    '疲れにくい体にしたい（体力をつけたい）',
    '身体を引き締めたい',
    'ストレス解消・将来の健康維持'
  ];

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      /* 保存できなくてもアプリ自体は動作を続ける */
    }
  }

  const loaded = loadData();
  const data = loaded || {
    goals: DEFAULT_GOALS.slice(),
    checks: {},
    reflectGood: '',
    reflectEffort: '',
    reflectNext: '',
    selfNote: ''
  };
  if (!data.goals || data.goals.length !== 3) data.goals = DEFAULT_GOALS.slice();

  /* =====================================================================
     SVGパーツ（手描き風フレーム・星・チェックマーク）
     ===================================================================== */

  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }

  function wobbleFrame(color, filterId, viewW, viewH, strokeW) {
    const svg = svgEl('svg', {
      class: 'frame-svg',
      viewBox: '0 0 ' + viewW + ' ' + viewH,
      preserveAspectRatio: 'none'
    });
    const pad = strokeW * 1.4;
    svg.appendChild(svgEl('rect', {
      x: pad, y: pad,
      width: viewW - pad * 2,
      height: viewH - pad * 2,
      rx: Math.min(viewW, viewH) * 0.08,
      fill: 'none',
      stroke: color,
      'stroke-width': strokeW,
      'vector-effect': 'non-scaling-stroke',
      filter: 'url(#' + filterId + ')'
    }));
    return svg;
  }

  function starIcon() {
    const svg = svgEl('svg', { class: 'star', viewBox: '0 0 40 40' });
    svg.appendChild(svgEl('path', {
      d: 'M20 2 L24.6 14.8 L38 15.3 L27.2 23.4 L31.2 36.2 L20 28.4 L8.8 36.2 L12.8 23.4 L2 15.3 L15.4 14.8 Z',
      fill: 'var(--yellow)',
      stroke: 'var(--blue)',
      'stroke-width': 1.6,
      'stroke-linejoin': 'round',
      filter: 'url(#wobble3)'
    }));
    return svg;
  }

  function checkMark() {
    const svg = svgEl('svg', { class: 'mark', viewBox: '0 0 24 24' });
    svg.appendChild(svgEl('path', {
      d: 'M4 12.5 L9.5 18 L20 6',
      fill: 'none', stroke: 'currentColor',
      'stroke-width': 3.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    }));
    return svg;
  }

  // すべての .card / .date-badge に手描き風フレームを重ねる
  function applyFrames() {
    document.querySelectorAll('.card').forEach(function (card, i) {
      const color = card.classList.contains('theme-pink') ? 'var(--pink)' : 'var(--blue)';
      card.prepend(wobbleFrame(color, 'wobble' + ((i % 3) + 1), 500, 300, 6));
    });
    document.querySelectorAll('.date-badge').forEach(function (badge, i) {
      badge.prepend(wobbleFrame('var(--blue)', 'wobble' + ((i % 3) + 1), 300, 100, 4));
    });
  }

  /* =====================================================================
     ヘッダー：星＋ピル／月・年バッジ
     ===================================================================== */

  const badgeRow = document.getElementById('badgeRow');
  badgeRow.appendChild(starIcon());
  const pill = document.createElement('div');
  pill.className = 'pill';
  pill.textContent = 'なりたい自分になるために';
  badgeRow.appendChild(pill);
  badgeRow.appendChild(starIcon());

  const dateRow = document.getElementById('dateRow');
  [['月', month + '月'], ['年', year + '年']].forEach(function (pair) {
    const badge = document.createElement('div');
    badge.className = 'date-badge';
    const span = document.createElement('span');
    span.textContent = pair[0] + '：' + pair[1];
    badge.appendChild(span);
    dateRow.appendChild(badge);
  });

  /* =====================================================================
     今月の目標
     ===================================================================== */

  const goalsList = document.getElementById('goalsList');
  data.goals.forEach(function (val, i) {
    const row = document.createElement('div');
    row.className = 'goal-row';
    const num = document.createElement('span');
    num.className = 'goal-num';
    num.textContent = (i + 1) + '.';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'goal-input';
    input.maxLength = 60;
    input.value = val;
    input.addEventListener('input', function () {
      data.goals[i] = input.value;
      saveData();
    });
    row.appendChild(num);
    row.appendChild(input);
    goalsList.appendChild(row);
  });

  /* =====================================================================
     習慣トラッカー：テーブル生成
     ===================================================================== */

  const GROUPS = [
    {
      cls: 'group-ex', title: '運動', type: 'check',
      rows: [
        { id: 'pilates', label: 'ピラティス' },
        { id: 'cardio', label: '有酸素運動' },
        { id: 'strength', label: '筋トレ' },
        { id: 'stretch', label: 'ストレッチ・ほぐし' }
      ]
    },
    {
      cls: 'group-life', title: '生活習慣', type: 'check',
      rows: [
        { id: 'sleep', label: '7時間以上の睡眠' },
        { id: 'meal', label: 'バランスのよい食事' },
        { id: 'water', label: '水を1.5L以上飲む' },
        { id: 'bath', label: '湯船・リラックス' }
      ]
    },
    {
      cls: 'group-cond', title: '体調・メンタル', type: 'number',
      rows: [
        { id: 'fatigue', label: '疲労度' },
        { id: 'mood', label: '気分' },
        { id: 'soreness', label: '首・肩・腰のこり' },
        { id: 'friFatigue', label: '金曜日の疲労度', fridayOnly: true }
      ]
    }
  ];

  const tableWrap = document.getElementById('tableWrap');
  const table = document.createElement('table');
  table.className = 'tracker-table';

  const thead = document.createElement('thead');
  const rowNum = document.createElement('tr');
  const rowWd = document.createElement('tr');
  const cornerNum = document.createElement('th');
  const cornerWd = document.createElement('th');
  cornerNum.className = 'row-label';
  cornerWd.className = 'row-label';
  rowNum.appendChild(cornerNum);
  rowWd.appendChild(cornerWd);

  for (let day = 1; day <= daysInMonth; day++) {
    const wd = new Date(year, month - 1, day).getDay();
    const isToday = day === today;

    const thN = document.createElement('th');
    thN.textContent = day;
    if (isToday) thN.classList.add('today-col');

    const thW = document.createElement('th');
    thW.textContent = WEEKDAY_JP[wd];
    thW.classList.add('wd');
    if (isToday) thW.classList.add('today-col');

    rowNum.appendChild(thN);
    rowWd.appendChild(thW);
  }
  thead.appendChild(rowNum);
  thead.appendChild(rowWd);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  let numberModalOpener = null; // 後で定義する openNumberModal をここにセットする

  GROUPS.forEach(function (group) {
    const headTr = document.createElement('tr');
    headTr.className = 'group-head ' + group.cls;
    const headTd = document.createElement('td');
    headTd.textContent = group.title;
    headTd.colSpan = 1;
    headTr.appendChild(headTd);
    for (let day = 1; day <= daysInMonth; day++) {
      const filler = document.createElement('td');
      headTr.appendChild(filler);
    }
    tbody.appendChild(headTr);

    group.rows.forEach(function (row) {
      const tr = document.createElement('tr');
      tr.className = group.cls;

      const th = document.createElement('th');
      th.className = 'row-label';
      th.textContent = row.label;
      tr.appendChild(th);

      for (let day = 1; day <= daysInMonth; day++) {
        const td = document.createElement('td');
        td.className = 'day-cell';
        if (day === today) td.classList.add('today-col');

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cell-btn' + (group.type === 'number' ? ' num' : '');
        const key = row.id + '_' + day;
        btn.dataset.key = key;
        btn.dataset.label = row.label;
        btn.dataset.day = day;

        if (group.type === 'check') {
          btn.setAttribute('aria-label', month + '月' + day + '日 ' + row.label);
          const mark = checkMark();
          btn.appendChild(mark);
          if (data.checks[key]) btn.classList.add('checked');
          btn.addEventListener('click', function () {
            const checked = btn.classList.toggle('checked');
            if (checked) data.checks[key] = true; else delete data.checks[key];
            saveData();
            recalcSummary();
          });
        } else {
          const fridayOnly = !!row.fridayOnly;
          const allowed = !fridayOnly || isFriday(year, month, day);
          if (!allowed) {
            btn.disabled = true;
            btn.classList.add('non-friday');
          } else {
            if (data.checks[key]) {
              btn.classList.add('checked');
              btn.textContent = data.checks[key];
            }
            btn.addEventListener('click', function () {
              if (numberModalOpener) numberModalOpener(btn);
            });
          }
        }

        td.appendChild(btn);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
  });

  table.appendChild(tbody);
  tableWrap.appendChild(table);

  /* =====================================================================
     1〜10 数値選択モーダル
     ===================================================================== */

  const numberModalBackdrop = document.getElementById('numberModalBackdrop');
  const numberModalTitle = document.getElementById('numberModalTitle');
  const numberGrid = document.getElementById('numberGrid');
  const numberClear = document.getElementById('numberClear');
  const numberClose = document.getElementById('numberClose');

  for (let n = 1; n <= 10; n++) {
    const nBtn = document.createElement('button');
    nBtn.type = 'button';
    nBtn.textContent = String(n);
    nBtn.dataset.value = n;
    numberGrid.appendChild(nBtn);
  }

  let activeNumberBtn = null;

  function openNumberModal(cellBtn) {
    activeNumberBtn = cellBtn;
    const key = cellBtn.dataset.key;
    const current = data.checks[key] || null;
    numberModalTitle.textContent = month + '月' + cellBtn.dataset.day + '日　' + cellBtn.dataset.label;
    numberGrid.querySelectorAll('button').forEach(function (nBtn) {
      nBtn.classList.toggle('selected', String(current) === nBtn.dataset.value);
    });
    numberModalBackdrop.classList.add('show');
  }
  numberModalOpener = openNumberModal;

  function closeNumberModal() {
    numberModalBackdrop.classList.remove('show');
    activeNumberBtn = null;
  }
  function applyNumberToCell(value) {
    if (!activeNumberBtn) return;
    const key = activeNumberBtn.dataset.key;
    if (value === null) {
      delete data.checks[key];
      activeNumberBtn.classList.remove('checked');
      activeNumberBtn.textContent = '';
    } else {
      data.checks[key] = value;
      activeNumberBtn.classList.add('checked');
      activeNumberBtn.textContent = String(value);
    }
    saveData();
  }
  numberGrid.addEventListener('click', function (e) {
    const nBtn = e.target.closest('button');
    if (!nBtn) return;
    applyNumberToCell(Number(nBtn.dataset.value));
    closeNumberModal();
  });
  numberClear.addEventListener('click', function () { applyNumberToCell(null); closeNumberModal(); });
  numberClose.addEventListener('click', closeNumberModal);
  numberModalBackdrop.addEventListener('click', function (e) {
    if (e.target === numberModalBackdrop) closeNumberModal();
  });

  /* =====================================================================
     今月のふりかえり
     ===================================================================== */

  const REFLECT_FIELDS = [
    { key: 'reflectGood', label: 'よくできたこと' },
    { key: 'reflectEffort', label: '工夫したこと' },
    { key: 'reflectNext', label: '来月に活かすこと・改善したいこと' }
  ];
  const reflectList = document.getElementById('reflectList');
  REFLECT_FIELDS.forEach(function (field) {
    const row = document.createElement('div');
    row.className = 'reflect-row';
    const label = document.createElement('label');
    label.textContent = field.label;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'reflect-input';
    input.maxLength = 60;
    input.value = data[field.key] || '';
    input.addEventListener('input', function () {
      data[field.key] = input.value;
      saveData();
    });
    row.appendChild(label);
    row.appendChild(input);
    reflectList.appendChild(row);
  });

  /* =====================================================================
     今月のまとめ（動的集計）
     ===================================================================== */

  const SUMMARY_ROWS = [
    { key: 'exerciseDays', label: '運動した日数', unit: '／' + daysInMonth + '日' },
    { key: 'pilates', label: 'ピラティス', unit: '回' },
    { key: 'cardio', label: '有酸素運動', unit: '回' },
    { key: 'strength', label: '筋トレ', unit: '回' },
    { key: 'stretch', label: 'ストレッチ・ほぐし', unit: '回' }
  ];
  const summaryList = document.getElementById('summaryList');
  const summaryValueEls = {};
  SUMMARY_ROWS.forEach(function (row) {
    const r = document.createElement('div');
    r.className = 'summary-row';
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = row.label;
    const valWrap = document.createElement('span');
    const val = document.createElement('span');
    val.className = 'value';
    val.textContent = '0';
    const unit = document.createElement('span');
    unit.className = 'unit';
    unit.textContent = row.unit;
    valWrap.appendChild(val);
    valWrap.appendChild(unit);
    r.appendChild(label);
    r.appendChild(valWrap);
    summaryList.appendChild(r);
    summaryValueEls[row.key] = val;
  });

  function recalcSummary() {
    const ids = ['pilates', 'cardio', 'strength', 'stretch'];
    const counts = { pilates: 0, cardio: 0, strength: 0, stretch: 0 };
    let exerciseDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      let any = false;
      ids.forEach(function (id) {
        if (data.checks[id + '_' + day]) { counts[id]++; any = true; }
      });
      if (any) exerciseDays++;
    }
    summaryValueEls.exerciseDays.textContent = exerciseDays;
    summaryValueEls.pilates.textContent = counts.pilates;
    summaryValueEls.cardio.textContent = counts.cardio;
    summaryValueEls.strength.textContent = counts.strength;
    summaryValueEls.stretch.textContent = counts.stretch;
  }
  recalcSummary();

  /* =====================================================================
     自分へのひとこと
     ===================================================================== */

  const selfNoteArea = document.getElementById('selfNoteArea');
  selfNoteArea.value = data.selfNote || '';
  selfNoteArea.addEventListener('input', function () {
    data.selfNote = selfNoteArea.value;
    saveData();
  });

  /* =====================================================================
     リセット（確認ダイアログ付き）
     ===================================================================== */

  const resetBtn = document.getElementById('resetBtn');
  const resetModalBackdrop = document.getElementById('resetModalBackdrop');
  const resetCancel = document.getElementById('resetCancel');
  const resetConfirm = document.getElementById('resetConfirm');

  resetBtn.addEventListener('click', function () { resetModalBackdrop.classList.add('show'); });
  resetCancel.addEventListener('click', function () { resetModalBackdrop.classList.remove('show'); });
  resetModalBackdrop.addEventListener('click', function (e) {
    if (e.target === resetModalBackdrop) resetModalBackdrop.classList.remove('show');
  });
  resetConfirm.addEventListener('click', function () {
    data.goals = DEFAULT_GOALS.slice();
    data.checks = {};
    data.reflectGood = '';
    data.reflectEffort = '';
    data.reflectNext = '';
    data.selfNote = '';
    saveData();

    document.querySelectorAll('.goal-input').forEach(function (el, i) { el.value = DEFAULT_GOALS[i]; });
    document.querySelectorAll('.cell-btn.checked').forEach(function (btn) {
      btn.classList.remove('checked');
      if (btn.classList.contains('num')) btn.textContent = '';
    });
    document.querySelectorAll('.reflect-input').forEach(function (el) { el.value = ''; });
    selfNoteArea.value = '';
    recalcSummary();

    resetModalBackdrop.classList.remove('show');
  });

  /* =====================================================================
     フレーム描画（レイアウト確定後に実行）
     ===================================================================== */

  applyFrames();
})();
