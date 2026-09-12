(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const STORAGE_KEY = 'habitTrackerCards';

  const CARDS = [
    { theme: 'pink', rows: 5 },
    { theme: 'blue', rows: 5 },
    { theme: 'blue', rows: 6 },
    { theme: 'pink', rows: 6 }
  ];
  const COLS = 6;

  /* =====================================================================
     保存データ
     ===================================================================== */

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      /* 保存できなくてもアプリ自体は動作を続ける */
    }
  }

  const data = Object.assign(
    { month: '', year: '', habits: ['', '', '', ''], checks: [{}, {}, {}, {}] },
    loadData()
  );

  /* =====================================================================
     SVGパーツ
     ===================================================================== */

  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }

  // 手描き風にゆがんだ角丸長方形の枠線
  function wobbleFrame(color, filterId, viewW, viewH, strokeW) {
    const svg = svgEl('svg', {
      class: 'frame-svg',
      viewBox: '0 0 ' + viewW + ' ' + viewH,
      preserveAspectRatio: 'none'
    });
    const pad = strokeW * 1.4;
    const rect = svgEl('rect', {
      x: pad, y: pad,
      width: viewW - pad * 2,
      height: viewH - pad * 2,
      rx: Math.min(viewW, viewH) * 0.1,
      fill: 'none',
      stroke: color,
      'stroke-width': strokeW,
      'vector-effect': 'non-scaling-stroke',
      filter: 'url(#' + filterId + ')'
    });
    svg.appendChild(rect);
    return svg;
  }

  // 四方に線が伸びるきらめき（スパークル）アクセント
  function sparkle(color, rotation) {
    const svg = svgEl('svg', { class: 'sparkle', viewBox: '0 0 40 40' });
    const g = svgEl('g', {
      stroke: color,
      'stroke-width': 4.2,
      'stroke-linecap': 'round',
      filter: 'url(#wobble2)',
      transform: 'rotate(' + rotation + ' 20 20)'
    });
    [
      [20, 5, 20, 35],
      [5, 20, 35, 20],
      [10, 10, 30, 30],
      [30, 10, 10, 30]
    ].forEach(function (p) {
      g.appendChild(svgEl('line', { x1: p[0], y1: p[1], x2: p[2], y2: p[3] }));
    });
    svg.appendChild(g);
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
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 3.2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }));
    return svg;
  }

  /* =====================================================================
     見出しバッジ（星 ＋ ピル）
     ===================================================================== */

  const badgeRow = document.getElementById('badgeRow');
  badgeRow.appendChild(starIcon());
  const pill = document.createElement('div');
  pill.className = 'pill';
  pill.textContent = 'On my way to meet the new version of me';
  badgeRow.appendChild(pill);
  badgeRow.appendChild(starIcon());

  /* =====================================================================
     Month / Year
     ===================================================================== */

  const dateRow = document.getElementById('dateRow');

  function buildDateBox(labelText, key, placeholder) {
    const box = document.createElement('div');
    box.className = 'date-box';
    box.appendChild(wobbleFrame('var(--blue)', 'wobble1', 400, 100, 5));

    const inner = document.createElement('div');
    inner.className = 'date-inner';

    const label = document.createElement('span');
    label.className = 'date-label';
    label.textContent = labelText;
    inner.appendChild(label);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'date-input';
    input.placeholder = placeholder;
    input.value = data[key];
    input.addEventListener('input', function () {
      data[key] = input.value;
      saveData();
    });
    inner.appendChild(input);

    box.appendChild(inner);
    return box;
  }

  dateRow.appendChild(buildDateBox('Month:', 'month', 'e.g. September'));
  dateRow.appendChild(buildDateBox('Year:', 'year', 'e.g. 2026'));

  /* =====================================================================
     4つのハビットカード
     ===================================================================== */

  const cardsGrid = document.getElementById('cardsGrid');

  CARDS.forEach(function (cardDef, cardIndex) {
    const frameColor = cardDef.theme === 'pink' ? 'var(--pink)' : 'var(--blue)';
    const accentColorA = cardDef.theme === 'pink' ? 'var(--pink)' : 'var(--blue)';
    const accentColorB = cardDef.theme === 'pink' ? 'var(--blue)' : 'var(--pink)';

    const card = document.createElement('div');
    card.className = 'tracker-card theme-' + cardDef.theme;

    card.appendChild(wobbleFrame(frameColor, 'wobble' + ((cardIndex % 3) + 1), 400, 500, 6));

    // 対角2か所にスパークルの飾り
    const s1 = sparkle(accentColorA, cardIndex % 2 === 0 ? -12 : 10);
    s1.style.top = '-14px';
    s1.style.right = '-10px';
    card.appendChild(s1);

    const s2 = sparkle(accentColorB, cardIndex % 2 === 0 ? 14 : -8);
    s2.style.bottom = '4px';
    s2.style.left = '-16px';
    card.appendChild(s2);

    const head = document.createElement('div');
    head.className = 'habit-head';
    const label = document.createElement('span');
    label.className = 'habit-label';
    label.textContent = 'Habit:';
    head.appendChild(label);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'habit-name-input';
    nameInput.placeholder = 'Name your habit';
    nameInput.maxLength = 40;
    nameInput.value = data.habits[cardIndex];
    nameInput.addEventListener('input', function () {
      data.habits[cardIndex] = nameInput.value;
      saveData();
    });
    head.appendChild(nameInput);
    card.appendChild(head);

    const hr = document.createElement('hr');
    hr.className = 'habit-underline';
    card.appendChild(hr);

    const grid = document.createElement('div');
    grid.className = 'habit-grid';
    const totalCells = COLS * cardDef.rows;

    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.setAttribute('aria-label', 'Day ' + (i + 1));
      cell.appendChild(checkMark());

      const cellKey = String(i);
      if (data.checks[cardIndex][cellKey]) {
        cell.classList.add('checked');
      }
      cell.addEventListener('click', function () {
        const checked = cell.classList.toggle('checked');
        if (checked) {
          data.checks[cardIndex][cellKey] = true;
        } else {
          delete data.checks[cardIndex][cellKey];
        }
        saveData();
      });
      grid.appendChild(cell);
    }

    card.appendChild(grid);
    cardsGrid.appendChild(card);
  });
})();
