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

  // 運動・生活習慣8項目の境界線（9個の点＝8行）／✓スタンプ方式
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
    { id: 'fatigue',     label: '疲労度' },
    { id: 'mood',        label: '気分' },
    { id: 'soreness',    label: '首・肩・腰のこり・痛み' },
    { id: 'friFatigue',  label: '金曜日の疲労度' }
  ];

  // 今月のふりかえり：チェック項目の右の余白＝タップで一言メモ入力
  const REFLECT_FIELDS = [
    { key: 'reflectGood',   label: 'よくできたこと',               left: 14.36, top: 88.82, width: 22.11, height: 2.48 },
    { key: 'reflectEffort', label: '工夫したこと',                 left: 13.05, top: 91.67, width: 23.41, height: 2.48 },
    { key: 'reflectNext',   label: '来月に活かすこと・改善したいこと', left: 26.11, top: 94.52, width: 10.36, height: 2.48 }
  ];

  // 自分へのひとこと：白い枠＝タップで段落テキスト入力
  const SELF_NOTE_BOX = { left: 67.89, top: 89.41, width: 31.16, height: 9.50 };

  // 今月のまとめ：数字を表示する空白部分の位置
  const SUMMARY_SPOTS = [
    { key: 'exerciseDays', left: 49.78, top: 88.24, width: 6.35, height: 2.19 },
    { key: 'pilates',      left: 48.22, top: 90.79, width: 6.88, height: 2.19 },
    { key: 'cardio',       left: 48.56, top: 93.72, width: 6.18, height: 2.19 },
    { key: 'strength',     left: 45.08, top: 96.64, width: 9.40, height: 2.19 }
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

  function isFriday(y, m, d) {
    return new Date(y, m - 1, d).getDay() === 5;
  }

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
  const stretchChipValueEl = document.getElementById('stretchChipValue');

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

  /* =====================================================================
     今月のまとめ：動的カウント表示
     ===================================================================== */

  const summaryEls = {};
  SUMMARY_SPOTS.forEach(function (spot) {
    const el = document.createElement('div');
    el.className = 'summary-value';
    setBox(el, spot.left, spot.top, spot.width, spot.height);
    overlay.appendChild(el);
    summaryEls[spot.key] = el;
  });

  function recalcSummary() {
    const ids = ['pilates', 'cardio', 'strength', 'stretch'];
    const counts = { pilates: 0, cardio: 0, strength: 0, stretch: 0 };
    let exerciseDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      let any = false;
      ids.forEach(function (id) {
        if (data[id + '_' + day]) {
          counts[id]++;
          any = true;
        }
      });
      if (any) exerciseDays++;
    }

    summaryEls.exerciseDays.textContent = exerciseDays;
    summaryEls.pilates.textContent = counts.pilates;
    summaryEls.cardio.textContent = counts.cardio;
    summaryEls.strength.textContent = counts.strength;
    stretchChipValueEl.textContent = counts.stretch;
  }

  /* =====================================================================
     運動・生活習慣：8項目 × 31日ぶんの✓タップボタン
     ===================================================================== */

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
          recalcSummary();
        });
      }

      overlay.appendChild(btn);
    }
  });

  /* =====================================================================
     体調・メンタル：4項目 × 31日ぶんの1〜10選択ボタン
     （金曜日の疲労度は金曜日のみ有効）
     ===================================================================== */

  ROWS2.forEach(function (row, ri) {
    const top = ROW2_PCT[ri];
    const bottom = ROW2_PCT[ri + 1];
    const fridayOnly = row.id === 'friFatigue';

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

      const withinMonth = day <= daysInMonth;
      const allowedDay = !fridayOnly || isFriday(year, month, day);

      if (!withinMonth || !allowedDay) {
        btn.disabled = true;
        if (withinMonth && !allowedDay) {
          btn.classList.add('non-friday');
          btn.setAttribute('aria-label', month + '月' + day + '日 ' + row.label + '（金曜日のみ入力可）');
        }
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
     テキスト入力モーダル（ふりかえり／自分へのひとこと 共通）
     ===================================================================== */

  const textModalBackdrop = document.getElementById('textModalBackdrop');
  const textModalTitle = document.getElementById('textModalTitle');
  const textModalInput = document.getElementById('textModalInput');
  const textModalArea = document.getElementById('textModalArea');
  const textModalClear = document.getElementById('textModalClear');
  const textModalSave = document.getElementById('textModalSave');

  let textModalCtx = null;

  function openTextModal(ctx) {
    textModalCtx = ctx;
    textModalTitle.textContent = ctx.title;
    if (ctx.mode === 'paragraph') {
      textModalArea.style.display = 'block';
      textModalInput.style.display = 'none';
      textModalArea.value = ctx.value;
    } else {
      textModalInput.style.display = 'block';
      textModalArea.style.display = 'none';
      textModalInput.value = ctx.value;
    }
    textModalBackdrop.classList.add('show');
    setTimeout(function () {
      (ctx.mode === 'paragraph' ? textModalArea : textModalInput).focus();
    }, 60);
  }
  function closeTextModal() {
    textModalBackdrop.classList.remove('show');
    textModalCtx = null;
  }
  textModalSave.addEventListener('click', function () {
    if (!textModalCtx) return;
    const field = textModalCtx.mode === 'paragraph' ? textModalArea : textModalInput;
    textModalCtx.onSave(field.value.trim());
    closeTextModal();
  });
  textModalClear.addEventListener('click', function () {
    if (!textModalCtx) return;
    textModalCtx.onSave('');
    closeTextModal();
  });
  textModalBackdrop.addEventListener('click', function (e) {
    if (e.target === textModalBackdrop) closeTextModal();
  });

  /* =====================================================================
     今月のふりかえり：一言メモ（タップでテキスト入力）
     ===================================================================== */

  const reflectPreviews = [];

  function updateReflectPreview(el, value) {
    if (value) {
      el.textContent = value;
      el.classList.remove('placeholder');
    } else {
      el.textContent = 'タップで入力';
      el.classList.add('placeholder');
    }
  }

  REFLECT_FIELDS.forEach(function (field) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'reflect-btn';
    btn.setAttribute('aria-label', field.label + 'の一言メモ');
    setBox(btn, field.left, field.top, field.width, field.height);

    const preview = document.createElement('span');
    preview.className = 'preview';
    updateReflectPreview(preview, data[field.key]);
    btn.appendChild(preview);
    reflectPreviews.push({ field: field, el: preview });

    btn.addEventListener('click', function () {
      openTextModal({
        title: field.label,
        mode: 'line',
        value: data[field.key] || '',
        onSave: function (v) {
          if (v) {
            data[field.key] = v;
          } else {
            delete data[field.key];
          }
          saveData(data);
          updateReflectPreview(preview, data[field.key]);
        }
      });
    });

    overlay.appendChild(btn);
  });

  /* =====================================================================
     自分へのひとこと（タップで段落テキスト入力）
     ===================================================================== */

  const selfNoteBtn = document.createElement('button');
  selfNoteBtn.type = 'button';
  selfNoteBtn.className = 'selfnote-btn';
  selfNoteBtn.setAttribute('aria-label', '自分へのひとこと');
  setBox(selfNoteBtn, SELF_NOTE_BOX.left, SELF_NOTE_BOX.top, SELF_NOTE_BOX.width, SELF_NOTE_BOX.height);

  const selfNotePreview = document.createElement('span');
  selfNotePreview.className = 'preview';

  function updateSelfNotePreview() {
    if (data.selfNote) {
      selfNotePreview.textContent = data.selfNote;
      selfNotePreview.classList.remove('placeholder');
    } else {
      selfNotePreview.textContent = 'タップして今月の自分にひとこと';
      selfNotePreview.classList.add('placeholder');
    }
  }
  updateSelfNotePreview();
  selfNoteBtn.appendChild(selfNotePreview);

  selfNoteBtn.addEventListener('click', function () {
    openTextModal({
      title: '自分へのひとこと',
      mode: 'paragraph',
      value: data.selfNote || '',
      onSave: function (v) {
        if (v) {
          data.selfNote = v;
        } else {
          delete data.selfNote;
        }
        saveData(data);
        updateSelfNotePreview();
      }
    });
  });
  overlay.appendChild(selfNoteBtn);

  // 初期表示時点の集計を反映
  recalcSummary();

  /* =====================================================================
     ピンチズーム（最小＝画面に全体がおさまるサイズ、最大＝拡大表示）
     ===================================================================== */

  const MAX_WIDTH = 2400;
  const DEFAULT_WIDTH = 1800;
  const COMPACT_THRESHOLD = 900;

  function minWidth() {
    return trackerWrap.clientWidth;
  }

  function setTrackerWidth(px) {
    const w = Math.max(minWidth(), Math.min(MAX_WIDTH, px));
    trackerInner.style.width = w + 'px';
    trackerInner.classList.toggle('compact', w < COMPACT_THRESHOLD);
    return w;
  }

  setTrackerWidth(DEFAULT_WIDTH);

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

  function touchDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  let pinch = null;

  trackerWrap.addEventListener('touchstart', function (e) {
    if (e.touches.length === 2) {
      const wrapRect = trackerWrap.getBoundingClientRect();
      pinch = {
        startDist: touchDistance(e.touches[0], e.touches[1]),
        startWidth: trackerInner.getBoundingClientRect().width,
        startScrollLeft: trackerWrap.scrollLeft,
        midX: ((e.touches[0].clientX + e.touches[1].clientX) / 2) - wrapRect.left
      };
    }
  }, { passive: true });

  trackerWrap.addEventListener('touchmove', function (e) {
    if (e.touches.length === 2 && pinch) {
      e.preventDefault();
      const dist = touchDistance(e.touches[0], e.touches[1]);
      const ratio = dist / pinch.startDist;
      const contentX = pinch.startScrollLeft + pinch.midX;
      const contentRatio = contentX / pinch.startWidth;
      const newWidth = setTrackerWidth(pinch.startWidth * ratio);
      trackerWrap.scrollLeft = Math.max(0, contentRatio * newWidth - pinch.midX);
    }
  }, { passive: false });

  trackerWrap.addEventListener('touchend', function (e) {
    if (e.touches.length < 2) pinch = null;
  });
  trackerWrap.addEventListener('touchcancel', function () {
    pinch = null;
  });

  window.addEventListener('resize', function () {
    setTrackerWidth(trackerInner.getBoundingClientRect().width);
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

    reflectPreviews.forEach(function (item) {
      updateReflectPreview(item.el, '');
    });
    updateSelfNotePreview();

    recalcSummary();
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
