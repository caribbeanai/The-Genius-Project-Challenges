/* =========================================================================
   Harbour Street — canvas chart renderer
   Candlestick charts with the time-series toolkit: SMA 20/50, Bollinger
   bands, RSI(14) subpanel and volume bars. Stateless: call draw() with
   candles and options, it repaints. Colours follow the game's navy theme.
   ========================================================================= */

'use strict';

const Charts = (() => {

  const C = {
    up: '#2ECC71', down: '#EE5A52', grid: 'rgba(79,181,230,0.10)',
    axis: 'rgba(158,177,204,0.85)', sma20: '#FFD93D', sma50: '#4FB5E6',
    boll: 'rgba(31,200,200,0.55)', bollFill: 'rgba(31,200,200,0.07)',
    vol: 'rgba(79,181,230,0.35)', rsi: '#F5A623', cross: 'rgba(255,255,255,0.35)',
    line: '#1FC8C8',
  };

  function draw(canvas, candles, opts = {}) {
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.clientWidth, H = canvas.clientHeight;
    if (!W || !H) return;
    if (canvas.width !== W * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    if (!candles || candles.length < 2) {
      ctx.fillStyle = C.axis; ctx.font = '12px Inter, sans-serif';
      ctx.fillText('Not enough trading history yet…', 12, 24);
      return;
    }

    const showRsi = opts.rsi !== false;
    const rsiH = showRsi ? Math.floor(H * 0.2) : 0;
    const volH = Math.floor(H * 0.1);
    const priceH = H - rsiH - volH - 18;      // 18px bottom for date axis
    const padR = 52;
    const plotW = W - padR;

    const closes = candles.map(c => c.c);
    let lo = Infinity, hi = -Infinity, vmax = 0;
    for (const c of candles) {
      if (c.l < lo) lo = c.l;
      if (c.h > hi) hi = c.h;
      if (c.v > vmax) vmax = c.v;
    }
    const boll = opts.boll ? TA.bollinger(closes) : null;
    if (boll) for (let i = 0; i < closes.length; i++) {
      if (boll.up[i] !== null) { hi = Math.max(hi, boll.up[i]); lo = Math.min(lo, boll.lo[i]); }
    }
    const span = (hi - lo) || 1;
    lo -= span * 0.05; hi += span * 0.05;

    const n = candles.length;
    const xw = plotW / n;
    const X = i => i * xw + xw / 2;
    const Y = p => priceH - ((p - lo) / (hi - lo)) * priceH;

    // grid + price axis
    ctx.font = '10px Inter, sans-serif';
    for (let g = 0; g <= 4; g++) {
      const p = lo + ((hi - lo) * g) / 4, y = Y(p);
      ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(plotW, y); ctx.stroke();
      ctx.fillStyle = C.axis; ctx.fillText(fmtP(p), plotW + 4, Math.max(9, y + 3));
    }
    // date axis (start / mid / end)
    ctx.fillStyle = C.axis;
    const dt = t => new Date(t).toLocaleDateString('en-JM', { month: 'short', year: '2-digit' });
    ctx.fillText(dt(candles[0].t), 2, H - 4);
    ctx.fillText(dt(candles[Math.floor(n / 2)].t), plotW / 2 - 20, H - 4);
    ctx.fillText(dt(candles[n - 1].t), plotW - 48, H - 4);

    // Bollinger fill + lines
    if (boll) {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < n; i++) if (boll.up[i] !== null) {
        started ? ctx.lineTo(X(i), Y(boll.up[i])) : ctx.moveTo(X(i), Y(boll.up[i]));
        started = true;
      }
      for (let i = n - 1; i >= 0; i--) if (boll.lo[i] !== null) ctx.lineTo(X(i), Y(boll.lo[i]));
      ctx.closePath();
      ctx.fillStyle = C.bollFill; ctx.fill();
      ctx.strokeStyle = C.boll; ctx.lineWidth = 1;
      strokeSeries(ctx, boll.up, X, Y);
      strokeSeries(ctx, boll.lo, X, Y);
    }

    // volume
    for (let i = 0; i < n; i++) {
      const c = candles[i];
      const vh = vmax ? (c.v / vmax) * volH : 0;
      ctx.fillStyle = C.vol;
      ctx.fillRect(X(i) - xw * 0.3, priceH + volH - vh, xw * 0.6, vh);
    }

    // candles (thin line mode when too dense)
    const candleW = Math.max(1, xw * 0.62);
    if (xw < 2.5) {
      ctx.strokeStyle = C.line; ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < n; i++) i ? ctx.lineTo(X(i), Y(closes[i])) : ctx.moveTo(X(i), Y(closes[i]));
      ctx.stroke();
    } else {
      for (let i = 0; i < n; i++) {
        const c = candles[i];
        const up = c.c >= c.o;
        ctx.strokeStyle = ctx.fillStyle = up ? C.up : C.down;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(X(i), Y(c.h)); ctx.lineTo(X(i), Y(c.l)); ctx.stroke();
        const yo = Y(c.o), yc = Y(c.c);
        ctx.fillRect(X(i) - candleW / 2, Math.min(yo, yc), candleW, Math.max(1, Math.abs(yc - yo)));
      }
    }

    // moving averages
    ctx.lineWidth = 1.4;
    if (opts.sma20) { ctx.strokeStyle = C.sma20; strokeSeries(ctx, TA.sma(closes, 20), X, Y); }
    if (opts.sma50) { ctx.strokeStyle = C.sma50; strokeSeries(ctx, TA.sma(closes, 50), X, Y); }

    // RSI subpanel
    if (showRsi) {
      const top = priceH + volH + 4;
      const rh = rsiH - 8;
      const RY = v => top + rh - (v / 100) * rh;
      ctx.strokeStyle = C.grid;
      for (const lvl of [30, 70]) {
        ctx.beginPath(); ctx.moveTo(0, RY(lvl)); ctx.lineTo(plotW, RY(lvl)); ctx.stroke();
      }
      ctx.fillStyle = C.axis;
      ctx.fillText('RSI 70', plotW + 4, RY(70) + 3);
      ctx.fillText('RSI 30', plotW + 4, RY(30) + 3);
      const rsi = TA.rsi(closes, 14);
      ctx.strokeStyle = C.rsi; ctx.lineWidth = 1.3;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < n; i++) if (rsi[i] !== null) {
        started ? ctx.lineTo(X(i), RY(rsi[i])) : ctx.moveTo(X(i), RY(rsi[i]));
        started = true;
      }
      ctx.stroke();
    }

    // crosshair + readout
    if (opts.hoverX != null) {
      const i = Math.max(0, Math.min(n - 1, Math.round((opts.hoverX / plotW) * n - 0.5)));
      const c = candles[i];
      ctx.strokeStyle = C.cross;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(X(i), 0); ctx.lineTo(X(i), priceH + volH); ctx.stroke();
      ctx.setLineDash([]);
      const txt = `${new Date(c.t).toLocaleDateString('en-JM', { day: 'numeric', month: 'short', year: 'numeric' })}  O ${fmtP(c.o)} H ${fmtP(c.h)} L ${fmtP(c.l)} C ${fmtP(c.c)}  Vol ${fmtV(c.v)}`;
      ctx.font = '11px Inter, sans-serif';
      const tw = ctx.measureText(txt).width;
      ctx.fillStyle = 'rgba(8,15,31,0.9)';
      ctx.fillRect(6, 4, tw + 12, 18);
      ctx.fillStyle = '#EAF1F8';
      ctx.fillText(txt, 12, 17);
    }
  }

  // simple line chart (indices, net worth)
  function drawLine(canvas, points, opts = {}) {
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.clientWidth, H = canvas.clientHeight;
    if (!W || !H) return;
    if (canvas.width !== W * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!points || points.length < 2) return;
    let lo = Infinity, hi = -Infinity;
    for (const p of points) { if (p < lo) lo = p; if (p > hi) hi = p; }
    const span = (hi - lo) || 1; lo -= span * 0.08; hi += span * 0.08;
    const X = i => (i / (points.length - 1)) * W;
    const Y = v => H - ((v - lo) / (hi - lo)) * H;
    const rising = points[points.length - 1] >= points[0];
    const col = opts.color || (rising ? C.up : C.down);
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, col + '44'); grad.addColorStop(1, col + '00');
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let i = 0; i < points.length; i++) ctx.lineTo(X(i), Y(points[i]));
    ctx.lineTo(W, H); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) i ? ctx.lineTo(X(i), Y(points[i])) : ctx.moveTo(X(i), Y(points[i]));
    ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.stroke();
  }

  function strokeSeries(ctx, series, X, Y) {
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < series.length; i++) {
      if (series[i] === null) continue;
      started ? ctx.lineTo(X(i), Y(series[i])) : ctx.moveTo(X(i), Y(series[i]));
      started = true;
    }
    ctx.stroke();
  }

  function fmtP(p) { return p >= 100 ? p.toFixed(0) : p >= 10 ? p.toFixed(1) : p.toFixed(2); }
  function fmtV(v) { return v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : String(v); }

  return { draw, drawLine };
})();
