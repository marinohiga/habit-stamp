(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const WEEKDAY_JP = ['日', '月', '火', '水', '木', '金', '土'];
  const STORAGE_KEY = 'habitTrackerRetroTabs';

  const DEFAULT_GOALS = [
    '疲れにくい体にしたい（体力をつけたい）',
    '身体を引き締めたい',
    'ストレス解消・将来の健康維持'
  ];

  function isFriday(y, m, d) {
    return new Date(y, m - 1, d).getDay() === 5;
  }

  function emptyTab(year, month) {
    return {
      id: year + '-' + month + '-' + Date.now(),
      year: year,
      month: month,
      goals: DEFAULT_GOALS.slice(),
      checks: {},
      reflectGood: '',
      reflectEffort: '',
      reflectNext: '',
      selfNote: ''
    };
  }

  /* =====================================================================
     保存データ（タブの配列）
     ===================================================================== */

  const now = new Date();
  const realYear = now.getFullYear();
  const realMonth = now.getMonth() + 1;
  const realToday = now.getDate();

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* noop */ }
    return null;
  }
  function saveStore() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (e) { /* noop */ }
  }

  let store = loadStore();
  if (!store || !store.tabs || !store.tabs.length) {
    store = { activeIndex: 0, tabs: [emptyTab(realYear, realMonth)] };
    saveStore();
  }

  /* =====================================================================
     SVGパーツ（スパークル・ハート吹き出し・チェック）
     ===================================================================== */

  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }

  function sparkleSVG(color, size) {
    const svg = svgEl('svg', { viewBox: '0 0 40 40', width: size, height: size });
    svg.appendChild(svgEl('path', {
      d: 'M20 2 C21 13 22 18 34 20 C22 22 21 27 20 38 C19 27 18 22 6 20 C18 18 19 13 20 2 Z',
      fill: color, stroke: 'var(--ink)', 'stroke-width': 1.4, 'stroke-linejoin': 'round'
    }));
    return svg;
  }

  function heartBubbleSVG(heartColor, size) {
    const svg = svgEl('svg', { viewBox: '0 0 44 40', width: size, height: size * (40 / 44) });
    svg.appendChild(svgEl('path', {
      d: 'M4 4 h36 a2 2 0 0 1 2 2 v20 a2 2 0 0 1 -2 2 H16 l-7 8 v-8 H4 a2 2 0 0 1 -2 -2 V6 a2 2 0 0 1 2 -2 Z',
      fill: '#fff', stroke: 'var(--ink)', 'stroke-width': 2, 'stroke-linejoin': 'round'
    }));
    svg.appendChild(svgEl('path', {
      d: 'M22 12 C19 7 11 9 11 15 C11 20 17 23 22 27 C27 23 33 20 33 15 C33 9 25 7 22 12 Z',
      fill: heartColor, stroke: 'var(--ink)', 'stroke-width': 1.6, 'stroke-linejoin': 'round'
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

  /* =====================================================================
     浮遊する装飾モチーフ（アイドル時はふわふわ、スクロールでパララックス）
     ===================================================================== */

  const floaters = document.getElementById('floaters');
  const FLOATER_DEFS = [
    { type: 'sparkle', color: 'var(--pink)', top: '1%', left: '3%', size: 26, depth: 0.15, dur: 4.5 },
    { type: 'sparkle', color: 'var(--lavender)', top: '6%', left: '92%', size: 20, depth: 0.3, dur: 5.5 },
    { type: 'heart', color: 'var(--pink)', top: '15%', left: '88%', size: 38, depth: 0.2, dur: 6 },
    { type: 'heart', color: 'var(--lavender)', top: '0.5%', left: '8%', size: 30, depth: 0.35, dur: 5 },
    { type: 'sparkle', color: 'var(--ink)', top: '19%', left: '4%', size: 16, depth: 0.4, dur: 4 },
    { type: 'sparkle', color: 'var(--pink)', top: '55%', left: '94%', size: 20, depth: 0.25, dur: 5 },
    { type: 'sparkle', color: 'var(--lavender)', top: '75%', left: '3%', size: 22, depth: 0.18, dur: 6.5 }
  ];
  const parallaxEls = [];
  FLOATER_DEFS.forEach(function (def, i) {
    const wrap = document.createElement('div');
    wrap.className = 'floater';
    wrap.style.top = def.top;
    wrap.style.left = def.left;
    wrap.style.setProperty('--rot', (i % 2 === 0 ? -8 : 8) + 'deg');
    wrap.style.animationDuration = def.dur + 's';
    wrap.style.animationDelay = (i * 0.4) + 's';
    wrap.appendChild(def.type === 'sparkle' ? sparkleSVG(def.color, def.size) : heartBubbleSVG(def.color, def.size));
    floaters.appendChild(wrap);
    parallaxEls.push({ el: wrap, depth: def.depth });
  });

  let ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      const y = window.scrollY;
      parallaxEls.forEach(function (p) {
        p.el.style.marginTop = (-y * p.depth) + 'px';
      });
      ticking = false;
    });
  }, { passive: true });

  /* =====================================================================
     カードのスクロール出現アニメーション
     ===================================================================== */

  const revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  /* =====================================================================
     チェック時のポップアニメーション（ハート／スパークルが飛び出す）
     ===================================================================== */

  function popAt(cellBtn, glyph) {
    const pop = document.createElement('span');
    pop.className = 'cell-pop';
    pop.textContent = glyph;
    cellBtn.appendChild(pop);
    pop.addEventListener('animationend', function () { pop.remove(); });
  }

  /* =====================================================================
     タブバー
     ===================================================================== */

  const tabBar = document.getElementById('tabBar');
  const tabContent = document.getElementById('tabContent');

  function tabLabel(tab) { return tab.year + '年' + tab.month + '月'; }

  function renderTabBar() {
    tabBar.innerHTML = '';
    store.tabs.forEach(function (tab, i) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab-btn' + (i === store.activeIndex ? ' active' : '');

      const label = document.createElement('span');
      label.textContent = tabLabel(tab);
      btn.appendChild(label);

      if (store.tabs.length > 1) {
        const close = document.createElement('span');
        close.className = 'tab-close';
        close.textContent = '✕';
        close.addEventListener('click', function (e) {
          e.stopPropagation();
          requestDeleteTab(i);
        });
        btn.appendChild(close);
      }

      btn.addEventListener('click', function () {
        if (store.activeIndex === i) return;
        store.activeIndex = i;
        saveStore();
        renderTabBar();
        renderActiveTab();
      });
      tabBar.appendChild(btn);
    });

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'tab-add';
    addBtn.textContent = '＋';
    addBtn.setAttribute('aria-label', '新しい月のタブを追加');
    addBtn.addEventListener('click', function () {
      addBtn.classList.remove('pulse');
      void addBtn.offsetWidth;
      addBtn.classList.add('pulse');

      const last = store.tabs[store.tabs.length - 1];
      let ny = last.year, nm = last.month + 1;
      if (nm > 12) { nm = 1; ny++; }
      store.tabs.push(emptyTab(ny, nm));
      store.activeIndex = store.tabs.length - 1;
      saveStore();
      renderTabBar();
      renderActiveTab();
    });
    tabBar.appendChild(addBtn);
  }

  let deleteTargetIndex = null;
  const deleteModalBackdrop = document.getElementById('deleteModalBackdrop');
  const deleteModalTitle = document.getElementById('deleteModalTitle');
  const deleteCancel = document.getElementById('deleteCancel');
  const deleteConfirm = document.getElementById('deleteConfirm');

  function requestDeleteTab(i) {
    deleteTargetIndex = i;
    deleteModalTitle.textContent = tabLabel(store.tabs[i]) + 'のタブを削除しますか？';
    deleteModalBackdrop.classList.add('show');
  }
  deleteCancel.addEventListener('click', function () { deleteModalBackdrop.classList.remove('show'); });
  deleteModalBackdrop.addEventListener('click', function (e) {
    if (e.target === deleteModalBackdrop) deleteModalBackdrop.classList.remove('show');
  });
  deleteConfirm.addEventListener('click', function () {
    if (deleteTargetIndex === null) return;
    store.tabs.splice(deleteTargetIndex, 1);
    if (store.activeIndex >= store.tabs.length) store.activeIndex = store.tabs.length - 1;
    saveStore();
    renderTabBar();
    renderActiveTab();
    deleteModalBackdrop.classList.remove('show');
    deleteTargetIndex = null;
  });

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
  let activeTabData = null;

  function openNumberModal(cellBtn) {
    activeNumberBtn = cellBtn;
    const key = cellBtn.dataset.key;
    const current = activeTabData.checks[key] || null;
    numberModalTitle.textContent = cellBtn.dataset.month + '月' + cellBtn.dataset.day + '日　' + cellBtn.dataset.label;
    numberGrid.querySelectorAll('button').forEach(function (nBtn) {
      nBtn.classList.toggle('selected', String(current) === nBtn.dataset.value);
    });
    numberModalBackdrop.classList.add('show');
  }
  function closeNumberModal() {
    numberModalBackdrop.classList.remove('show');
    activeNumberBtn = null;
  }
  function applyNumberToCell(value) {
    if (!activeNumberBtn) return;
    const key = activeNumberBtn.dataset.key;
    if (value === null) {
      delete activeTabData.checks[key];
      activeNumberBtn.classList.remove('checked');
      activeNumberBtn.textContent = '';
    } else {
      activeTabData.checks[key] = value;
      activeNumberBtn.classList.add('checked');
      activeNumberBtn.textContent = String(value);
      popAt(activeNumberBtn, '✦');
    }
    saveStore();
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
     リセット（アクティブなタブのみ）
     ===================================================================== */

  const resetModalBackdrop = document.getElementById('resetModalBackdrop');
  const resetCancel = document.getElementById('resetCancel');
  const resetConfirm = document.getElementById('resetConfirm');

  resetCancel.addEventListener('click', function () { resetModalBackdrop.classList.remove('show'); });
  resetModalBackdrop.addEventListener('click', function (e) {
    if (e.target === resetModalBackdrop) resetModalBackdrop.classList.remove('show');
  });
  resetConfirm.addEventListener('click', function () {
    const t = activeTabData;
    t.goals = DEFAULT_GOALS.slice();
    t.checks = {};
    t.reflectGood = '';
    t.reflectEffort = '';
    t.reflectNext = '';
    t.selfNote = '';
    saveStore();
    resetModalBackdrop.classList.remove('show');
    renderActiveTab();
  });

  /* =====================================================================
     習慣グループ定義（金曜日の疲労度は行として独立させず、
     疲労度の行の金曜セルを強調表示する）
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
        { id: 'fatigue', label: '疲労度', highlightFriday: true },
        { id: 'mood', label: '気分' },
        { id: 'soreness', label: '首・肩・腰のこり' }
      ]
    }
  ];

  /* =====================================================================
     タブの中身（目標／表／ふりかえり／まとめ／ひとこと）を描画
     ===================================================================== */

  function renderActiveTab() {
    activeTabData = store.tabs[store.activeIndex];
    const t = activeTabData;
    const daysInMonth = new Date(t.year, t.month, 0).getDate();
    const isRealMonth = t.year === realYear && t.month === realMonth;

    tabContent.innerHTML = '';
    tabContent.classList.remove('switching');
    void tabContent.offsetWidth;
    tabContent.classList.add('switching');

    function makeCard(themeClass) {
      const c = document.createElement('section');
      c.className = 'card' + (themeClass ? ' ' + themeClass : '');
      revealObserver.observe(c);
      return c;
    }

    // ---- 今月の目標 ----
    const goalsCard = makeCard('theme-lav');
    goalsCard.innerHTML = '<div class="card-head"><h2 class="card-title">今月の目標</h2></div>';
    const goalsList = document.createElement('div');
    goalsList.className = 'goals-list';
    t.goals.forEach(function (val, i) {
      const row = document.createElement('div');
      row.className = 'goal-row';
      const num = document.createElement('span');
      num.className = 'goal-num nums';
      num.textContent = String(i + 1);
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'goal-input';
      input.maxLength = 60;
      input.value = val;
      input.addEventListener('input', function () { t.goals[i] = input.value; saveStore(); });
      row.appendChild(num);
      row.appendChild(input);
      goalsList.appendChild(row);
    });
    goalsCard.appendChild(goalsList);
    tabContent.appendChild(goalsCard);

    // ---- 習慣トラッカー ----
    const gridCard = makeCard('');
    gridCard.innerHTML = '<div class="card-head"><h2 class="card-title">習慣トラッカー</h2></div>' +
      '<p class="card-hint">運動・生活習慣はタップで✓、体調・メンタルはタップで1〜10を選択。<br>疲労度の金曜セルは自動でハイライトされます。</p>';
    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';
    const table = document.createElement('table');
    table.className = 'tracker-table';

    const thead = document.createElement('thead');
    const rowNum = document.createElement('tr');
    const rowWd = document.createElement('tr');
    rowNum.appendChild(document.createElement('th')).className = 'row-label';
    rowWd.appendChild(document.createElement('th')).className = 'row-label';

    for (let day = 1; day <= daysInMonth; day++) {
      const wd = new Date(t.year, t.month - 1, day).getDay();
      const isToday = isRealMonth && day === realToday;
      const thN = document.createElement('th');
      thN.className = 'daynum nums' + (isToday ? ' today-col' : '');
      thN.textContent = day;
      const thW = document.createElement('th');
      thW.className = 'wd' + (isToday ? ' today-col' : '');
      thW.textContent = WEEKDAY_JP[wd];
      rowNum.appendChild(thN);
      rowWd.appendChild(thW);
    }
    thead.appendChild(rowNum);
    thead.appendChild(rowWd);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    GROUPS.forEach(function (group) {
      const headTr = document.createElement('tr');
      headTr.className = 'group-head ' + group.cls;
      const headTd = document.createElement('td');
      headTd.textContent = group.title;
      headTr.appendChild(headTd);
      for (let day = 1; day <= daysInMonth; day++) headTr.appendChild(document.createElement('td'));
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
          const dayIsFriday = isFriday(t.year, t.month, day);
          if (isRealMonth && day === realToday) td.classList.add('today-col');
          if (row.highlightFriday && dayIsFriday) td.classList.add('friday-cell');

          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'cell-btn' + (group.type === 'number' ? ' num' : '');
          const key = row.id + '_' + day;
          btn.dataset.key = key;
          btn.dataset.label = row.label;
          btn.dataset.day = day;
          btn.dataset.month = t.month;

          if (group.type === 'check') {
            btn.setAttribute('aria-label', t.month + '月' + day + '日 ' + row.label);
            btn.appendChild(checkMark());
            if (t.checks[key]) btn.classList.add('checked');
            btn.addEventListener('click', function () {
              const checked = btn.classList.toggle('checked');
              if (checked) {
                t.checks[key] = true;
                popAt(btn, '♥');
              } else {
                delete t.checks[key];
              }
              saveStore();
              recalcSummary();
            });
          } else {
            if (t.checks[key]) { btn.classList.add('checked'); btn.textContent = t.checks[key]; }
            btn.addEventListener('click', function () { openNumberModal(btn); });
          }

          td.appendChild(btn);
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      });
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    gridCard.appendChild(tableWrap);
    tabContent.appendChild(gridCard);

    // ---- 今月のふりかえり ----
    const REFLECT_FIELDS = [
      { key: 'reflectGood', label: 'よくできたこと' },
      { key: 'reflectEffort', label: '工夫したこと' },
      { key: 'reflectNext', label: '来月に活かすこと・改善したいこと' }
    ];
    const reflectCard = makeCard('');
    reflectCard.innerHTML = '<div class="card-head"><h2 class="card-title">今月のふりかえり</h2></div>';
    const reflectList = document.createElement('div');
    reflectList.className = 'reflect-list';
    REFLECT_FIELDS.forEach(function (field) {
      const row = document.createElement('div');
      row.className = 'reflect-row';
      const label = document.createElement('label');
      label.textContent = field.label;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'reflect-input';
      input.maxLength = 60;
      input.value = t[field.key] || '';
      input.addEventListener('input', function () { t[field.key] = input.value; saveStore(); });
      row.appendChild(label);
      row.appendChild(input);
      reflectList.appendChild(row);
    });
    reflectCard.appendChild(reflectList);
    tabContent.appendChild(reflectCard);

    // ---- 今月のまとめ ----
    const summaryCard = makeCard('theme-lav');
    summaryCard.innerHTML = '<div class="card-head"><h2 class="card-title">今月のまとめ</h2></div>';
    const summaryList = document.createElement('div');
    summaryList.className = 'summary-list';
    const SUMMARY_ROWS = [
      { key: 'exerciseDays', label: '運動した日数', unit: '／' + daysInMonth + '日' },
      { key: 'pilates', label: 'ピラティス', unit: '回' },
      { key: 'cardio', label: '有酸素運動', unit: '回' },
      { key: 'strength', label: '筋トレ', unit: '回' },
      { key: 'stretch', label: 'ストレッチ・ほぐし', unit: '回' }
    ];
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
    summaryCard.appendChild(summaryList);
    tabContent.appendChild(summaryCard);

    function recalcSummary() {
      const ids = ['pilates', 'cardio', 'strength', 'stretch'];
      const counts = { pilates: 0, cardio: 0, strength: 0, stretch: 0 };
      let exerciseDays = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        let any = false;
        ids.forEach(function (id) {
          if (t.checks[id + '_' + day]) { counts[id]++; any = true; }
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

    // ---- 自分へのひとこと ----
    const noteCard = makeCard('');
    noteCard.innerHTML = '<div class="card-head"><h2 class="card-title">自分へのひとこと</h2></div>';
    const noteArea = document.createElement('textarea');
    noteArea.className = 'note-area';
    noteArea.rows = 5;
    noteArea.maxLength = 400;
    noteArea.placeholder = '今月の自分にひとこと';
    noteArea.value = t.selfNote || '';
    noteArea.addEventListener('input', function () { t.selfNote = noteArea.value; saveStore(); });
    noteCard.appendChild(noteArea);
    tabContent.appendChild(noteCard);

    // ---- リセットボタン ----
    const btnRow = document.createElement('div');
    btnRow.className = 'btn-row';
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn-pill';
    resetBtn.textContent = '↺ このタブをリセット';
    resetBtn.addEventListener('click', function () { resetModalBackdrop.classList.add('show'); });
    btnRow.appendChild(resetBtn);
    tabContent.appendChild(btnRow);
  }

  renderTabBar();
  renderActiveTab();
})();
