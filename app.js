(function () {
  'use strict';

  /* =====================================================================
     グリッド座標（元画像 1149×1369px を解析して取得した実測値・%表示）
     画像はリサイズ・編集せず、この座標だけを使って透明ボタンを重ねる。
     ===================================================================== */

  // 日付列の境界線（左端〜31日分の右端まで、32個の点＝31列）
  const COL_PCT = [
    21.323, 23.934, 26.414, 28.851, 31.288, 33.735, 36.172, 38.642,
    41.123, 43.598, 46.040, 48.520, 50.957, 53.394, 55.836, 58.328,
    60.748, 63.229, 65.666, 68.146, 70.583, 72.977, 75.462, 77.894,
    80.287, 82.724, 85.161, 87.511, 89.948, 92.298, 94.696, 97.128
  ];

  // 対象8項目・行の境界線（9個の点＝8行）／✓スタンプ方式
  const ROW_PCT = [
    17.166, 21.658, 26.282, 30.789, 35.318, 39.627, 43.937, 48.320, 52.776
  ];

  // 体調・メンタル4項目の境界線（5個の点＝4行）／1〜10選択方式
  const ROW2_PCT = [
    52.776, 57.110, 61.468, 65.851, 70.161
  ];

  // 日付ヘッダー行の上端（今日ハイライト帯の開始位置）
  const HEADER_TOP = 12.235;
  const GRID_BOTTOM = ROW2_PCT[ROW2_PCT.length - 1];

  const ROWS = [
    { id: 'pilates',  label: 'ピラティス' },
    { id: 'cardio',   label: '有酸素運動' },
    { id: 'strength', label: '筋トレ' },
    { id: 'stretch',  label: 'ストレッチ・ほぐし' },
    { id: 'sleep',    label: '7時間以上の睡眠' },
    { id: 'meal',     label: 'バランスのよい食事' },
    { id: 'water',    label: '水を1.5L以上飲む' },
    { id: 'bath',     label: '湯船につかる・リラックス' }
  ];

  const ROWS2 = [
    { id: 'fatigue', label: '疲労度' },
    { id: 'mood',    label: '気分' },
    { id: 'soreness',label: '首・肩・腰のこり・痛み' },
    { id: 'friFatigue', label: '金曜日の疲労度' }
  ];

  /* =====================================================================
     日付・保存キー
     ===================================================================== */

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.getDate();
  const daysInMonth = new Date(year, month, 0).getDate();
  const STORAGE_KEY = 'habitStamp:' + year + '-' + String(month).padStart(2, '0');

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
  function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      /* 保存領域が使えない場合は何もしない（アプリは動作を続ける） */
    }
  }

  let data = loadData();

  /* =====================================================================
     DOM構築
     ===================================================================== */

  const overlay = document.getElementById('overlay');
  const trackerWrap = document.getElementById('trackerWrap');
  const trackerInner = document.getElementById('trackerInner');
  const monthLabel = document.getElementById('monthLabel');

  monthLabel.textContent = year + '年' + month + '月';

  function setBox(el, leftPct, topPct, widthPct, heightPct) {
    el.style.left = leftPct + '%';
    el.style.top = topPct + '%';
    el.style.width = widthPct + '%';
    el.style.height = heightPct + '%';
  }

  // 今日の列をうすくハイライト
  if (today >= 1 && today <= 31) {
    const l = COL_PCT[today - 1];
    const r = COL_PCT[today];
    const band = document.createElement('div');
    band.className = 'today-col';
    setBox(band, l, HEADER_TOP, r - l, GRID_BOTTOM - HEADER_TOP);
    overlay.appendChild(band);
  }

  // 今月に存在しない日（例：2月30日・31日）はうすくマスクして押せなくする
  if (daysInMonth < 31) {
    const l = COL_PCT[daysInMonth];
    const r = COL_PCT[31];
    const mask = document.createElement('div');
    mask.className = 'oob-mask';
    setBox(mask, l, HEADER_TOP, r - l, GRID_BOTTOM - HEADER_TOP);
    overlay.appendChild(mask);
  }

  // 8項目 × 31日ぶんの透明タップボタンを生成
  ROWS.forEach(function (row, ri) {
    const top = ROW_PCT[ri];
    const bottom = ROW_PCT[ri + 1];

    for (let day = 1; day <= 31; day++) {
      const left = COL_PCT[day - 1];
      const right = COL_PCT[day];
      const key = row.id + '_' + day;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cell-btn';
      btn.dataset.key = key;
      btn.setAttribute('aria-label', month + '月' + day + '日 ' + row.label);
      btn.setAttribute('aria-pressed', 'false');
      setBox(btn, left, top, right - left, bottom - top);

      const stamp = document.createElement('span');
      stamp.className = 'stamp';
      stamp.textContent = '✓';
      stamp.setAttribute('aria-hidden', 'true');
      btn.appendChild(stamp);

      if (day > daysInMonth) {
        btn.disabled = true;
      } else {
        if (data[key]) {
          btn.classList.add('checked');
          btn.setAttribute('aria-pressed', 'true');
        }
        btn.addEventListener('click', function () {
          const isChecked = btn.classList.toggle('checked');
          btn.setAttribute('aria-pressed', isChecked ? 'true' : 'false');
          if (isChecked) {
            data[key] = true;
          } else {
            delete data[key];
          }
          saveData(data);
        });
      }

      overlay.appendChild(btn);
    }
  });

  // 体調・メンタル4項目 × 31日ぶんの透明タップボタンを生成（タップで1〜10選択モーダルを開く）
  ROWS2.forEach(function (row, ri) {
    const top = ROW2_PCT[ri];
    const bottom = ROW2_PCT[ri + 1];

    for (let day = 1; day <= 31; day++) {
      const left = COL_PCT[day - 1];
      const right = COL_PCT[day];
      const key = row.id + '_' + day;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cell-btn';
      btn.dataset.key = key;
      btn.dataset.label = row.label;
      btn.dataset.day = day;
      btn.setAttribute('aria-label', month + '月' + day + '日 ' + row.label + '（1〜10を選択）');
      setBox(btn, left, top, right - left, bottom - top);

      const stamp = document.createElement('span');
      stamp.className = 'stamp num';
      stamp.setAttribute('aria-hidden', 'true');
      btn.appendChild(stamp);

      if (day > daysInMonth) {
        btn.disabled = true;
      } else {
        if (data[key]) {
          btn.classList.add('checked');
          stamp.textContent = data[key];
        }
        btn.addEventListener('click', function () {
          openNumberModal(btn);
        });
      }

      overlay.appendChild(btn);
    }
  });

  /* =====================================================================
     1〜10 数値選択モーダル（体調・メンタル用）
     ===================================================================== */

  const numberModalBackdrop = document.getElementById('numberModalBackdrop');
  const numberModalTitle = document.getElementById('numberModalTitle');
  const numberGrid = document.getElementById('numberGrid');
  const numberClear = document.getElementById('numberClear');
  const numberClose = document.getElementById('numberClose');

  // 1〜10のボタンをあらかじめ作っておく
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
    const current = data[key] || null;

    numberModalTitle.textContent = month + '月' + cellBtn.dataset.day + '日　' + cellBtn.dataset.label;
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
    const stamp = activeNumberBtn.querySelector('.stamp');
    if (value === null) {
      delete data[key];
      activeNumberBtn.classList.remove('checked');
      stamp.textContent = '';
    } else {
      data[key] = value;
      activeNumberBtn.classList.add('checked');
      stamp.textContent = String(value);
    }
    saveData(data);
  }

  numberGrid.addEventListener('click', function (e) {
    const nBtn = e.target.closest('button');
    if (!nBtn) return;
    applyNumberToCell(Number(nBtn.dataset.value));
    closeNumberModal();
  });
  numberClear.addEventListener('click', function () {
    applyNumberToCell(null);
    closeNumberModal();
  });
  numberClose.addEventListener('click', closeNumberModal);
  numberModalBackdrop.addEventListener('click', function (e) {
    if (e.target === numberModalBackdrop) closeNumberModal();
  });

  /* =====================================================================
     今日の列が見えるように、横スクロール位置を自動調整
     ===================================================================== */

  function scrollToToday() {
    if (today < 1 || today > 31) return;
    const innerWidth = trackerInner.getBoundingClientRect().width;
    if (!innerWidth) return;
    const centerPct = (COL_PCT[today - 1] + COL_PCT[today]) / 2;
    const centerPx = innerWidth * (centerPct / 100);
    const target = centerPx - trackerWrap.clientWidth / 2;
    trackerWrap.scrollLeft = Math.max(0, target);
  }
  requestAnimationFrame(scrollToToday);
  window.addEventListener('load', scrollToToday);

  /* =====================================================================
     全体表示／拡大表示 切り替え
     タップしやすい拡大表示を初期状態にしつつ、ボタンひとつで
     画面幅にフィットした全体表示に切り替えられるようにする。
     ===================================================================== */

  const zoomToggleBtn = document.getElementById('zoomToggleBtn');
  let isOverview = false;

  zoomToggleBtn.addEventListener('click', function () {
    isOverview = !isOverview;
    trackerInner.style.setProperty('--zoom-min-width', isOverview ? '0px' : '1800px');
    zoomToggleBtn.textContent = isOverview ? '🔍 拡大表示' : '⤢ 全体表示';
    zoomToggleBtn.setAttribute('aria-pressed', isOverview ? 'true' : 'false');
    if (isOverview) {
      trackerWrap.scrollLeft = 0;
    } else {
      requestAnimationFrame(scrollToToday);
    }
  });

  /* =====================================================================
     リセット（確認ダイアログ付き）
     ===================================================================== */

  const modalBackdrop = document.getElementById('modalBackdrop');
  const resetBtn = document.getElementById('resetBtn');
  const modalCancel = document.getElementById('modalCancel');
  const modalConfirm = document.getElementById('modalConfirm');

  resetBtn.addEventListener('click', function () {
    modalBackdrop.classList.add('show');
  });
  modalCancel.addEventListener('click', function () {
    modalBackdrop.classList.remove('show');
  });
  modalBackdrop.addEventListener('click', function (e) {
    if (e.target === modalBackdrop) modalBackdrop.classList.remove('show');
  });
  modalConfirm.addEventListener('click', function () {
    data = {};
    saveData(data);
    document.querySelectorAll('.cell-btn.checked').forEach(function (b) {
      b.classList.remove('checked');
      if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', 'false');
      const stamp = b.querySelector('.stamp.num');
      if (stamp) stamp.textContent = '';
    });
    modalBackdrop.classList.remove('show');
  });

  /* =====================================================================
     PWA: Service Worker登録（オフライン対応）
     ===================================================================== */

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {
        /* 登録に失敗してもアプリ自体は通常どおり動作する */
      });
    });
  }
})();
