/* Agentic benchmark saturation explorer.
 * Loads the dataset built by research/benchlm-saturation/pipeline.py and computes
 * the S-index, labels and saturation score in the browser so thresholds stay adjustable.
 * Needs d3 v7 on the page. Data from BenchLM.ai (CC BY-NC 4.0). */
(function () {
const root = document.getElementById('sat-app');
if (!root) return;
// Minimal data layer: one dataset plus derived calculations, re-run on load and resize.
const dash = (() => {
  const calcs = {}, subs = [];
  let rows = null, failed = false;
  return {
    calc(id, o) { calcs[id] = o; },
    data(id) {
      if (failed) return { status: 'error', data: [] };
      if (!rows) return { status: 'loading', data: [] };
      return { status: 'ok', data: calcs[id] ? calcs[id].fn(rows) : rows };
    },
    onData(fn) { subs.push(fn); fn(); },
    load(url) {
      fetch(url).then((r) => r.json()).then((j) => { rows = j.rows; subs.forEach((f) => f()); })
        .catch(() => { failed = true; subs.forEach((f) => f()); });
      let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => subs.forEach((f) => f()), 150); });
    },
  };
})();
dash.calc('sat_index', {
  inputs: ['agentic_stats'],
  title: 'Saturation index S',
  description: 'Akhtar et al. (2026): S = exp(−R²), R = (top 1 − top 5) / SE of the difference, with n_eff = n^α for α = 0.5, 0.8 and 1.',
  fn: (agentic_stats) => agentic_stats
    .filter((r) => r.percent_like && r.n && r.top5 != null && r.n_families >= 5)
    .map((r) => {
      const s1 = r.top1 / 100, s5 = r.top5 / 100;
      const S = (a) => {
        if (s1 === s5) return 1;
        const ne = Math.pow(r.n, a);
        const se = Math.sqrt((s1 * (1 - s1) + s5 * (1 - s5)) / ne);
        const R = (s1 - s5) / se;
        return Math.round(Math.exp(-R * R) * 1000) / 1000;
      };
      return { key: r.key, s_a05: S(0.5), s_a08: S(0.8), s_a10: S(1) };
    }),
});
(function () {
  const $ = (id) => document.getElementById(id);
  const CL = {
    sat:   { label: 'Saturated', color: 'var(--st-sat)', order: 0 },
    near:  { label: 'Near ceiling', color: 'var(--st-near)', order: 1 },
    under: { label: 'Under-powered', color: 'var(--st-under)', order: 2 },
    disc:  { label: 'Discriminative', color: 'var(--st-disc)', order: 3 },
    thin:  { label: 'Insufficient data', color: 'transparent', order: 4 },
    na:    { label: 'Not a % score', color: 'transparent', order: 5 },
  };
  const MAIN = ['sat', 'near', 'under', 'disc'];
  const AL = { '0.5': 's_a05', '0.8': 's_a08', '1': 's_a10' };
  const P = { h: 10, t: 0.7, alpha: '0.8', g: 5 };
  let sortK = '_cls', sortDir = 1, query = '';
  const f1 = d3.format('.1f'), f2 = d3.format('.2f'), fc = d3.format(',');

  const quad = (close, notSep) => (close ? (notSep ? 'sat' : 'near') : (notSep ? 'under' : 'disc'));
  function classify(r, sRow) {
    if (!r.percent_like) return { cls: 'na', method: null };
    if (r.n_families < 5 || r.spread_1_5 == null) return { cls: 'thin', method: null };
    const close = r.headroom <= P.h;
    if (sRow) {
      const at = (a) => quad(close, sRow[AL[a]] >= P.t);
      const set = ['0.5', '0.8', '1'].map(at);
      const uniq = [...new Set(set)];
      return { cls: at(P.alpha), method: 's', rob: uniq.length === 1 ? 'Stable' : 'Varies: ' + uniq.map((k) => CL[k].label).join(' / '), stable: uniq.length === 1 };
    }
    return { cls: quad(close, r.spread_1_5 <= P.g), method: 'gap', rob: 'n unknown', stable: null };
  }

  [['r-h', 'o-h', 'h', String], ['r-t', 'o-t', 't', f2], ['r-g', 'o-g', 'g', String]].forEach(([r, o, k, fmt]) => {
    $(r).addEventListener('input', () => { P[k] = +$(r).value; $(o).textContent = fmt(P[k]); render(); });
  });
  $('alpha').addEventListener('change', () => { P.alpha = $('alpha').value; $('th-s').setAttribute('data-field', AL[P.alpha]); render(); });
  $('q').addEventListener('input', () => { query = $('q').value.trim().toLowerCase(); render(); });
  $('tbl').querySelectorAll('th button').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.k;
    if (sortK === k) sortDir = -sortDir; else { sortK = k; sortDir = (k === '_s' || k === '_sat') ? -1 : 1; }
    render();
  }));

  const NS = 'http://www.w3.org/2000/svg';
  function legend(el, withShapes) {
    el.replaceChildren();
    MAIN.forEach((k) => {
      const s = document.createElement('span');
      const d = document.createElement('i'); d.className = 'sw'; d.style.background = CL[k].color;
      s.append(d, document.createTextNode(CL[k].label)); el.append(s);
    });
    if (withShapes) {
      [['circle', '● Item count known (S-index)'], ['diamond', '◆ Estimated (no item count)']].forEach(([shape, label]) => {
        const s = document.createElement('span');
        s.textContent = label; el.append(s);
      });
    }
  }

  function axes(svg, x, y, W, H, m, xl, yl, yfmt) {
    x.ticks(6).forEach((t) => svg.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', m.t).attr('y2', H - m.b).attr('stroke', 'var(--grid)'));
    y.ticks(5).forEach((t) => svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', 'var(--grid)'));
    const st = (g) => { g.attr('font-size', null).attr('font-family', null); g.selectAll('text').attr('fill', 'var(--muted)').attr('font-size', 11); g.selectAll('line,path').attr('stroke', 'var(--axis)'); };
    svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(6).tickSizeOuter(0)).call(st);
    svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(yfmt || null).tickSizeOuter(0)).call(st);
    svg.append('text').attr('x', (m.l + W - m.r) / 2).attr('y', H - 8).attr('text-anchor', 'middle').attr('fill', 'var(--fg2)').attr('font-size', 12).text(xl);
    svg.append('text').attr('transform', `translate(12,${(m.t + H - m.b) / 2}) rotate(-90)`).attr('text-anchor', 'middle').attr('fill', 'var(--fg2)').attr('font-size', 12).text(yl);
  }

  function hover(svg, box, tipId, pts, px, py, lines, W) {
    if (!pts.length) return;
    const ring = svg.append('circle').attr('r', 9).attr('fill', 'none').attr('stroke', 'var(--fg)').attr('stroke-width', 1.5).attr('opacity', 0);
    const del = d3.Delaunay.from(pts, px, py);
    const tip = $(tipId);
    const hide = () => { tip.style.opacity = 0; ring.attr('opacity', 0); };
    svg.on('pointerleave', hide).on('pointermove', (ev) => {
      const [mx, my] = d3.pointer(ev, svg.node());
      const k = W / svg.node().getBoundingClientRect().width;
      const r = pts[del.find(mx, my)];
      const cx = px(r), cy = py(r);
      if (Math.hypot(cx - mx, cy - my) > 24 * k) return hide();
      ring.attr('cx', cx).attr('cy', cy).attr('opacity', 1);
      tip.replaceChildren();
      lines(r).forEach(([t, c]) => { const d = document.createElement('div'); if (c) d.className = c; d.textContent = t; tip.append(d); });
      tip.style.opacity = 1;
      tip.style.left = Math.max(0, Math.min(box.clientWidth - tip.offsetWidth, cx / k + 12)) + 'px';
      tip.style.top = Math.max(0, cy / k - tip.offsetHeight - 12) + 'px';
    });
  }

  const tipLines = (r) => {
    const out = [[r.family_label, 'v']];
    if (r.family_label !== r.name) out.push(['Entry shown: ' + r.name + (r._variants.length ? ' (+' + r._variants.length + ' related)' : ''), 's']);
    out.push([CL[r._c.cls].label + (r._c.method === 'gap' ? ' · est. (no item count)' : '') + (r._sat != null ? ' · saturation ' + Math.round(r._sat * 100) + '%' : ''), 's'],
      ['Top 1 ' + f1(r.top1) + ' · Top 5 ' + f1(r.top5) + ' · headroom ' + f1(r.headroom), '']);
    if (r._s) out.push(['S = ' + f2(r._s[AL[P.alpha]]) + ' at α = ' + P.alpha + ' (range ' + f2(r._s.s_a10) + '–' + f2(r._s.s_a05) + ')', ''], ['n = ' + fc(r.n) + ' · ' + r.n_conf + ' · ' + r._c.rob, 's']);
    out.push(['Leader: ' + r.top1_model, 's']);
    return out;
  };

  function sChart(rows) {
    const box = $('chartbox2'); box.querySelectorAll('svg').forEach((n) => n.remove());
    const pts = rows.filter((r) => r._primary && r._s && MAIN.includes(r._c.cls));
    const W = Math.max(280, box.clientWidth), H = W < 520 ? 340 : 400, m = { l: 48, r: 16, t: 12, b: 44 };
    const x = d3.scaleLinear([0, Math.ceil((d3.max(pts, (r) => r.headroom) || 80) / 10) * 10], [m.l, W - m.r]);
    const y = d3.scaleLinear([0, 1], [H - m.b, m.t]);
    const svg = d3.create('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Scatter of headroom against S-index for benchmarks with known item counts; full values in the table below');
    svg.append('rect').attr('x', x(0)).attr('y', y(1)).attr('width', Math.max(0, x(P.h) - x(0))).attr('height', Math.max(0, y(P.t) - y(1))).attr('fill', 'var(--st-sat)').attr('opacity', 0.08);
    axes(svg, x, y, W, H, m, 'Headroom = 100 − top score (pts)', 'S-index (higher = leaders less separable)', d3.format('.1f'));
    svg.append('line').attr('x1', x(P.h)).attr('x2', x(P.h)).attr('y1', m.t).attr('y2', H - m.b).attr('stroke', 'var(--ref)');
    svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(P.t)).attr('y2', y(P.t)).attr('stroke', 'var(--ref)');
    const g = svg.append('g');
    pts.forEach((r) => g.append('line').attr('x1', x(r.headroom)).attr('x2', x(r.headroom)).attr('y1', y(r._s.s_a10)).attr('y2', y(r._s.s_a05)).attr('stroke', 'var(--chart-muted)').attr('stroke-width', 1.5).attr('stroke-linecap', 'round'));
    pts.forEach((r) => g.append('circle').attr('cx', x(r.headroom)).attr('cy', y(r._s[AL[P.alpha]])).attr('r', 5).attr('fill', CL[r._c.cls].color).attr('stroke', 'var(--panel)').attr('stroke-width', 2));
    svg.append('text').attr('x', x(P.h) - 6).attr('y', m.t + 12).attr('text-anchor', 'end').attr('fill', 'var(--muted)').attr('font-size', 11).text('close to ceiling');
    const lab = pts.filter((r) => r._c.cls === 'sat');
    lab.forEach((r, i) => svg.append('text').attr('x', x(r.headroom) + 9).attr('y', y(r._s[AL[P.alpha]]) + 4 + (i % 2 ? 10 : 0)).attr('fill', 'var(--fg2)').attr('font-size', 11).text(r.family_label));
    box.append(svg.node());
    hover(svg, box, 'tip2', pts, (r) => x(r.headroom), (r) => y(r._s[AL[P.alpha]]), tipLines, W);
  }

  function allChart(rows) {
    const box = $('chartbox1'); box.querySelectorAll('svg').forEach((n) => n.remove());
    const pts = rows.filter((r) => r._primary && MAIN.includes(r._c.cls));
    const W = Math.max(280, box.clientWidth), H = W < 520 ? 340 : 400, m = { l: 48, r: 16, t: 12, b: 44 };
    const x = d3.scaleLinear([0, Math.ceil((d3.max(pts, (r) => r.headroom) || 80) / 10) * 10], [m.l, W - m.r]);
    const y = d3.scaleLinear([0, Math.ceil((d3.max(pts, (r) => r.spread_1_5) || 50) / 10) * 10], [H - m.b, m.t]);
    const svg = d3.create('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Scatter of headroom against top-5 gap for all classifiable benchmarks; full values in the table below');
    axes(svg, x, y, W, H, m, 'Headroom = 100 − top score (pts)', 'Top 1 − top 5 (pts)');
    svg.append('line').attr('x1', x(P.h)).attr('x2', x(P.h)).attr('y1', m.t).attr('y2', H - m.b).attr('stroke', 'var(--ref)');
    const g = svg.append('g');
    const diamond = d3.symbol(d3.symbolDiamond, 110);
    pts.forEach((r) => {
      const cx = x(r.headroom), cy = y(r.spread_1_5);
      if (r._c.method === 'gap') g.append('path').attr('d', diamond()).attr('transform', `translate(${cx},${cy})`).attr('fill', CL[r._c.cls].color).attr('stroke', 'var(--panel)').attr('stroke-width', 2);
      else g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 5).attr('fill', CL[r._c.cls].color).attr('stroke', 'var(--panel)').attr('stroke-width', 2);
    });
    const lab = [d3.greatest(pts, (r) => r.headroom), d3.greatest(pts, (r) => r.spread_1_5)].filter(Boolean);
    [...new Set(lab)].forEach((r) => { const left = x(r.headroom) > W * 0.6; svg.append('text').attr('x', x(r.headroom) + (left ? -9 : 9)).attr('y', y(r.spread_1_5) + 4).attr('text-anchor', left ? 'end' : 'start').attr('fill', 'var(--fg2)').attr('font-size', 11).text(r.family_label); });
    box.append(svg.node());
    hover(svg, box, 'tip1', pts, (r) => x(r.headroom), (r) => y(r.spread_1_5), tipLines, W);
  }

  function tiles(rows) {
    const t = $('tiles'); t.replaceChildren();
    rows = rows.filter((r) => r._primary);
    const cnt = {}; Object.keys(CL).forEach((k) => (cnt[k] = 0)); rows.forEach((r) => cnt[r._c.cls]++);
    Object.keys(CL).forEach((k) => {
      const d = document.createElement('div'); d.className = 'tile';
      const b = document.createElement('b'); b.textContent = String(cnt[k]);
      const s = document.createElement('span');
      const dot = document.createElement('i'); dot.className = 'sw'; dot.style.background = CL[k].color;
      if (!MAIN.includes(k)) { dot.style.border = '1.5px solid var(--chart-muted)'; dot.style.boxSizing = 'border-box'; }
      s.append(dot, document.createTextNode(CL[k].label)); d.append(b, s); t.append(d);
    });
    const sat = rows.filter((r) => r._c.cls === 'sat');
    const satS = sat.filter((r) => r._c.method === 's'), stable = satS.filter((r) => r._c.stable);
    const judged = MAIN.reduce((a, k) => a + cnt[k], 0);
    $('take').textContent = 'Of ' + judged + ' classifiable agentic benchmarks (one per family), ' + cnt.sat + ' are saturated, ' + cnt.near + ' near the ceiling, ' + cnt.under + ' under-powered and ' + cnt.disc + ' still discriminative. '
      + satS.length + ' of the saturated calls use a known item count' + (satS.length ? ' (' + stable.length + ' stable across α' + (stable.length ? ': ' + stable.map((r) => r.family_label).join(', ') : '') + ')' : '') + '; ' + (sat.length - satS.length) + ' are estimated.';
  }

  function table(rows) {
    const tb = $('tbody'); tb.replaceChildren();
    const num = (v) => (v == null ? '—' : f1(v));
    const val = (r, k) => (k === '_role' ? (r._primary ? 0 : 1) : k === '_sat' ? r._sat : k === '_cls' ? CL[r._c.cls].order : k === '_rob' ? (r._c.rob || '') : k === '_s' ? (r._s ? r._s[AL[P.alpha]] : null) : r[k]);
    let list = rows.filter((r) => !query || r.name.toLowerCase().includes(query) || r.key.toLowerCase().includes(query) || r.family_label.toLowerCase().includes(query));
    list = list.slice().sort((a, b) => {
      const va = val(a, sortK), vb = val(b, sortK);
      if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1;
      const c = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      return c * sortDir || (a.headroom ?? 999) - (b.headroom ?? 999);
    });
    list.forEach((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = r.key;
      const add = (t, c) => { const td = document.createElement('td'); td.textContent = t; if (c) td.className = c; tr.append(td); return td; };
      if (!r._primary) tr.className = 'variant';
      add(r.name); add(r.family_label); add(r._primary ? 'Primary' : 'Variant');
      const cl = add('', 'cls'); const dot = document.createElement('i'); dot.style.background = CL[r._c.cls].color;
      if (!MAIN.includes(r._c.cls)) dot.style.border = '1.5px solid var(--chart-muted)';
      cl.append(dot, document.createTextNode(CL[r._c.cls].label + (r._c.method === 'gap' ? ' (est.)' : '')));
      add(r._sat == null ? '—' : Math.round(r._sat * 100) + '%', 'num');
      add(r._c.rob || '—');
      add(String(r.n_families), 'num'); add(num(r.top1), 'num'); add(num(r.top5), 'num');
      add(r.percent_like ? num(r.headroom) : '—', 'num'); add(r.percent_like ? num(r.spread_1_5) : '—', 'num');
      add(r.n == null ? '—' : fc(r.n), 'num'); add(r.n_conf);
      add(r._s ? f2(r._s[AL[P.alpha]]) : '—', 'num'); add(r.top1_model);
      tb.append(tr);
    });
    $('tbl').querySelectorAll('th').forEach((th) => { const k = th.querySelector('button').dataset.k; th.setAttribute('aria-sort', k === sortK ? (sortDir > 0 ? 'ascending' : 'descending') : 'none'); });
  }

  let showAll = false;
  $('more').addEventListener('click', () => { showAll = !showAll; render(); });
  // Saturation score in [0,1]: ceiling proximity × leader indistinguishability.
  // Without n, S is approximated as T^((gap/g)^2), so a gap equal to the fallback threshold maps to S = T.
  const satScore = (r) => {
    if (!MAIN.includes(r._c.cls)) return null;
    const s = r._s ? r._s[AL[P.alpha]] : Math.pow(P.t, Math.pow(r.spread_1_5 / P.g, 2));
    return Math.max(0, Math.min(1, r.top1 / 100)) * s;
  };
  const expanded = new Set();
  const EST_TIP = 'No item count found; saturation estimated from the top-5 gap';
  function meterRow(r, variant) {
    const row = document.createElement('div'); row.className = 'mrow' + (variant ? ' variant' : '');
    const nm = document.createElement('div'); nm.className = 'nm';
    nm.textContent = variant ? r.name : r.family_label;
    if (r._sat != null) {
      if (r._c.method === 'gap') { const t = document.createElement('span'); t.className = 'est-tag'; t.textContent = 'est.'; t.title = EST_TIP; nm.append(t); }
      row.title = r.name + ' · ' + CL[r._c.cls].label + ' · top ' + f1(r.top1) + (r._c.method === 'gap' ? ' · ' + EST_TIP : '');
    }
    if (!variant && r._variants.length) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'vbtn';
      b.textContent = (expanded.has(r.family) ? '−' : '+') + r._variants.length;
      b.setAttribute('aria-expanded', String(expanded.has(r.family)));
      b.setAttribute('aria-label', (expanded.has(r.family) ? 'Hide ' : 'Show ') + r._variants.length + ' related entries');
      b.addEventListener('click', () => { expanded.has(r.family) ? expanded.delete(r.family) : expanded.add(r.family); render(); });
      nm.append(b);
    }
    const pc = document.createElement('div'); pc.className = 'pct';
    if (r._sat == null) {
      const why = document.createElement('div'); why.className = 'why';
      why.textContent = !r.percent_like ? 'not a % score' : 'too few models (' + r.n_families + ')';
      pc.textContent = '—'; row.append(nm, why, pc); return row;
    }
    const tr = document.createElement('div'); tr.className = 'track';
    tr.setAttribute('role', 'meter'); tr.setAttribute('aria-valuemin', '0'); tr.setAttribute('aria-valuemax', '100'); tr.setAttribute('aria-valuenow', String(Math.round(r._sat * 100))); tr.setAttribute('aria-label', (variant ? r.name : r.family_label) + ' saturation');
    const fl = document.createElement('div'); fl.className = 'fill' + (r._c.method === 'gap' ? ' est' : ''); fl.style.width = (r._sat * 100).toFixed(1) + '%'; fl.style.background = CL[r._c.cls].color;
    tr.append(fl);
    pc.textContent = Math.round(r._sat * 100) + '%';
    row.append(nm, tr, pc); return row;
  }
  function meters(rows) {
    const el = $('meters'); el.replaceChildren();
    const list = rows.filter((r) => r._primary && r._sat != null).sort((a, b) => b._sat - a._sat);
    const shown = showAll ? list : list.slice(0, 15);
    shown.forEach((r) => {
      el.append(meterRow(r, false));
      if (expanded.has(r.family)) r._variants.slice().sort((a, b) => (b._sat ?? -1) - (a._sat ?? -1)).forEach((v) => el.append(meterRow(v, true)));
    });
    $('more').textContent = showAll ? 'Show top 15' : 'Show all ' + list.length;
    $('more').hidden = list.length <= 15;
  }

  function render() {
    const d = dash.data('agentic_stats');
    if (d.status !== 'ok') { $('take').textContent = d.status === 'error' ? 'Could not load the data file.' : 'Loading…'; return; }
    const sc = dash.data('sat_index');
    const sMap = new Map((sc.status === 'ok' ? sc.data : []).map((r) => [r.key, r]));
    const rows = d.data.map((r) => { const s = sMap.get(r.key) || null; return Object.assign({}, r, { _s: s, _c: classify(r, s) }); });
    rows.forEach((r) => { r._sat = satScore(r); r._primary = false; r._variants = []; });
    // One primary entry per family: classifiable first, then known item count, then most model families.
    d3.group(rows, (r) => r.family).forEach((members) => {
      const rank = (r) => [MAIN.includes(r._c.cls) ? 1 : 0, r._s ? 1 : 0, r.n_families];
      const best = members.slice().sort((a, b) => { const x = rank(a), y = rank(b); return (y[0] - x[0]) || (y[1] - x[1]) || (y[2] - x[2]); })[0];
      best._primary = true; best._variants = members.filter((m) => m !== best);
    });
    legend($('legend0'), false); legend($('legend2'), false); legend($('legend1'), true);
    tiles(rows); meters(rows); sChart(rows); allChart(rows); table(rows);
  }
  dash.onData(render);
})();
dash.load(root.dataset.src);
})();
