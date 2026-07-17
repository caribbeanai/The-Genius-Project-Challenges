/* =========================================================================
   Harbour Street — game controller
   Accounts, portfolio, the time machine, dashboards and trading UI.
   Money amounts are JMD. Starting bankroll: J$1,000,000 virtual dollars.
   ========================================================================= */

'use strict';

(() => {

  const START_CASH = 1_000_000;
  const STORE_KEY = 'harbourStreet.accounts.v1';
  const DIV_WITHHOLDING = 0.15;      // 15% tax withheld on dividends (real JSE rule)

  // time speeds: sim days per real second
  const SPEEDS = [
    { label: 'Pause', dps: 0 },
    { label: 'Normal · 1 day / 5s', dps: 0.2 },
    { label: 'Fast · 1 day / sec', dps: 1 },
    { label: 'Rapid · 1 week / sec', dps: 5 },
    { label: 'Warp · 1 month / sec', dps: 21 },
  ];

  let sim = null;
  let player = null;           // active account object
  let accounts = {};
  let speedIdx = 0;
  let dayAcc = 0, todPhase = 0.55;
  let selectedSym = null;
  let chartRange = 130, chartHover = null;
  let chartOpts = { sma20: true, sma50: false, boll: false, rsi: true };
  let lastFrame = 0;
  let daysSinceSave = 0;
  let rafId = null;
  let city = null;
  let tickerItems = [];
  let uiDirty = true;

  const $ = id => document.getElementById(id);
  const fmt = n => 'J$' + Math.round(n).toLocaleString('en-JM');
  const fmt2 = n => 'J$' + n.toLocaleString('en-JM', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(2) + '%';
  const cls = x => x > 0.0001 ? 'up' : x < -0.0001 ? 'down' : 'flat';

  // ======================================================================
  // accounts
  // ======================================================================
  function loadAccounts() {
    try { accounts = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { accounts = {}; }
  }
  function saveAccounts() {
    if (player && sim) {
      player.simState = sim.toJSON();
      player.lastPlayed = Date.now();
    }
    try { localStorage.setItem(STORE_KEY, JSON.stringify(accounts)); }
    catch (e) {
      // storage full: shed old candles and retry once
      if (player && player.simState) {
        for (const s of Object.values(player.simState.stocks)) s.history = s.history.slice(-260);
        try { localStorage.setItem(STORE_KEY, JSON.stringify(accounts)); } catch (e2) { /* give up quietly */ }
      }
    }
  }

  function createAccount(name, color) {
    const id = 'acc_' + Date.now().toString(36);
    const seed = (Math.floor(Math.random() * 2 ** 31)) >>> 0;
    accounts[id] = {
      id, name, color, seed,
      cash: START_CASH,
      holdings: {},            // sym -> {shares, cost}
      realized: 0, dividends: 0,
      txs: [],                 // {t, kind, sym, qty, price, fees, total}
      netWorthHistory: [],
      benchStart: null,
      achievements: {},
      createdAt: Date.now(), lastPlayed: Date.now(),
      simState: null,
    };
    return accounts[id];
  }

  function netWorth(acc, simRef) {
    let v = acc.cash;
    for (const [sym, h] of Object.entries(acc.holdings)) {
      const st = simRef ? simRef.stocks[sym] : null;
      if (st && h.shares > 0) v += h.shares * st.price;
    }
    return v;
  }

  // ======================================================================
  // login screen
  // ======================================================================
  function renderLogin() {
    loadAccounts();
    const list = $('account-list');
    list.innerHTML = '';
    const accs = Object.values(accounts).sort((a, b) => (b.lastNetWorth || 0) - (a.lastNetWorth || 0));
    if (!accs.length) {
      list.innerHTML = '<div class="login-empty">No traders yet. Create your account below and claim your J$1,000,000 starting bankroll.</div>';
    }
    accs.forEach((acc, rank) => {
      const nw = acc.lastNetWorth ?? START_CASH;
      const gain = nw / START_CASH - 1;
      const row = document.createElement('div');
      row.className = 'account-row';
      row.innerHTML = `
        <span class="acc-medal">${rank === 0 && accs.length > 1 ? '🏆' : ''}</span>
        <span class="acc-avatar" style="background:${acc.color}">${acc.name.slice(0, 1).toUpperCase()}</span>
        <span class="acc-name">${escapeHtml(acc.name)}</span>
        <span class="acc-worth ${cls(gain)}">${fmt(nw)} <small>(${pct(gain)})</small></span>
        <button class="acc-del" title="Delete this account">✕</button>`;
      row.querySelector('.acc-del').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete ${acc.name}'s account and portfolio? This cannot be undone.`)) {
          delete accounts[acc.id]; saveAccounts(); renderLogin();
        }
      });
      row.addEventListener('click', () => startGame(acc));
      list.appendChild(row);
    });
  }

  function startGame(acc) {
    player = acc;
    if (acc.simState) {
      try { sim = MarketSim.fromJSON(acc.simState); }
      catch (e) { sim = new MarketSim(acc.seed, new Date(2026, 6, 20)); }
    } else {
      sim = new MarketSim(acc.seed, new Date(2026, 6, 20));
    }
    if (acc.benchStart === null) acc.benchStart = sim.indices.combined.value;

    $('login-screen').style.display = 'none';
    $('game-ui').style.display = 'block';

    if (!city) {
      city = VoxelCity.init($('scene-canvas'), JSE_DATA.companies, JSE_DATA.sectors, onPickStock);
      window.addEventListener('resize', () => city.resize());
    }
    buildMarketList();
    rebuildTicker();
    setSpeed(1);
    uiDirty = true;
    if (!acc.achievements.welcomed) {
      acc.achievements.welcomed = true;
      showBanner('Welcome to Harbour Street', `${acc.name}, you have ${fmt(START_CASH)} to invest on the Jamaica Stock Exchange. Click any tower to meet a company. Start here.`, 'info');
    }
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function exitToLogin() {
    setSpeed(0);
    player.lastNetWorth = netWorth(player, sim);
    saveAccounts();
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    player = null;
    $('game-ui').style.display = 'none';
    $('login-screen').style.display = 'flex';
    renderLogin();
  }

  // ======================================================================
  // main loop
  // ======================================================================
  function loop(ts) {
    if (!player) return;
    const dt = Math.min(0.1, (ts - lastFrame) / 1000 || 0.016);
    lastFrame = ts;

    const dps = SPEEDS[speedIdx].dps;
    if (dps > 0) {
      dayAcc += dt * dps;
      todPhase += dt * dps;
      let steps = 0;
      while (dayAcc >= 1 && steps < 30) {
        dayAcc -= 1; steps++;
        sim.stepDay();
        postDay();
      }
      if (steps) uiDirty = true;
    }

    // 3D scene
    city.update(dt, {
      timeOfDay: (0.3 + todPhase) % 1,
      weather: sim.activeWeather,
      stocks: sim.stocks,
    });

    if (uiDirty) { renderHud(); renderMarketList(); uiDirty = false; }
    // charts redraw cheaply only when a window is open
    if (selectedSym && $('stock-window').style.display !== 'none') renderStockWindow(false);

    rafId = requestAnimationFrame(loop);
  }

  // per-day bookkeeping after each sim step
  function postDay() {
    // dividends to holders (15% withholding, as on the real JSE)
    for (const d of (sim.dividendsToday || [])) {
      const h = player.holdings[d.sym];
      if (h && h.shares > 0) {
        const gross = h.shares * d.amount;
        const net = gross * (1 - DIV_WITHHOLDING);
        player.cash += net;
        player.dividends += net;
        player.txs.unshift({ t: sim.date.getTime(), kind: 'dividend', sym: d.sym, qty: h.shares, price: d.amount, fees: gross * DIV_WITHHOLDING, total: net });
        toast(`💰 Dividend: ${d.sym} paid you ${fmt(net)} (after 15% withholding tax)`, 'good');
        unlock('firstDividend', 'First dividend collected! Total return = price moves + dividends.');
      }
    }

    // net worth history (with index benchmark)
    const nw = netWorth(player, sim);
    player.netWorthHistory.push({ t: sim.date.getTime(), v: Math.round(nw), ix: sim.indices.combined.value });
    if (player.netWorthHistory.length > 1600) player.netWorthHistory.shift();
    player.lastNetWorth = nw;

    // surface fresh news
    const fresh = sim.newsLog.filter(n => n.day === sim.date.getTime());
    for (const n of fresh) {
      if (n.severity === 'severe') {
        showBanner(n.headline, n.body, 'severe');
        if (n.kind === 'disaster') unlockLater('hurricaneSeen');
      }
    }
    if (fresh.length) rebuildTicker();

    // achievements
    if (nw >= START_CASH * 2) unlock('doubled', 'Portfolio doubled! You turned J$1M into J$2M.');
    if (player.achievements.hurricaneSeen && !player.achievements.survivedHurricane && nw > START_CASH) {
      unlock('survivedHurricane', 'Storm rider: your portfolio weathered a hurricane and stayed in profit.');
    }
    const sectors = new Set(Object.entries(player.holdings).filter(([, h]) => h.shares > 0).map(([s]) => sim.stocks[s].sector));
    if (sectors.size >= 5) unlock('diversified', 'Diversified: holdings across 5+ sectors. One storm can\'t sink you now.');

    if (++daysSinceSave >= 20) { daysSinceSave = 0; saveAccounts(); }
  }

  function unlock(key, msg) {
    if (player.achievements[key]) return;
    player.achievements[key] = true;
    if (msg) toast('🏅 ' + msg, 'achieve');
  }
  function unlockLater(key) { player.achievements[key] = true; }

  // ======================================================================
  // HUD
  // ======================================================================
  function renderHud() {
    $('hud-date').textContent = sim.date.toLocaleDateString('en-JM', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const rg = sim.regime;
    const regimeChip = $('hud-regime');
    regimeChip.textContent = rg === 'boom' ? '🐂 Bull market' : rg === 'bust' ? '🐻 Bear market' : '〰 Calm market';
    regimeChip.className = 'chip ' + (rg === 'boom' ? 'up' : rg === 'bust' ? 'down' : 'flat');

    renderIndex('idx-combined', sim.indices.combined);
    renderIndex('idx-junior', sim.indices.junior);

    $('macro-rate').textContent = 'BOJ ' + (sim.macro.policyRate * 100).toFixed(2) + '%';
    $('macro-inf').textContent = 'Inflation ' + (sim.macro.inflation * 100).toFixed(1) + '%';
    $('macro-fx').textContent = 'US$1 = J$' + sim.macro.usdJmd.toFixed(0);
    const g = sim.macro.gdpGrowth;
    $('macro-gdp').textContent = 'GDP ' + (g * 100).toFixed(1) + '%';
    $('macro-gdp').className = 'chip ' + cls(g);

    const nw = netWorth(player, sim);
    $('hud-cash').textContent = fmt(player.cash);
    $('hud-networth').textContent = fmt(nw);
    const gain = nw / START_CASH - 1;
    const nwChg = $('hud-networth-chg');
    nwChg.textContent = pct(gain);
    nwChg.className = 'hud-sub ' + cls(gain);

    if ($('portfolio-window').style.display !== 'none') renderPortfolio();
    if ($('news-window').style.display !== 'none') renderNewsFeed();
  }

  function renderIndex(id, ix) {
    const el = $(id);
    const hist = ix.history;
    const prev = hist.length > 1 ? hist[hist.length - 2].c : ix.value;
    const chg = ix.value / prev - 1;
    el.querySelector('.idx-val').textContent = Math.round(ix.value).toLocaleString();
    const c = el.querySelector('.idx-chg');
    c.textContent = pct(chg);
    c.className = 'idx-chg ' + cls(chg);
  }

  // ======================================================================
  // market watch panel
  // ======================================================================
  let marketRows = {};
  function buildMarketList() {
    const wrap = $('market-list');
    wrap.innerHTML = '';
    marketRows = {};
    const sorted = [...JSE_DATA.companies].sort((a, b) => a.sector.localeCompare(b.sector) || b.price * b.sharesOut - a.price * a.sharesOut);
    let lastSector = null;
    for (const co of sorted) {
      if (co.sector !== lastSector) {
        lastSector = co.sector;
        const h = document.createElement('div');
        h.className = 'market-sector';
        h.textContent = JSE_DATA.sectors[co.sector].name;
        h.style.borderLeftColor = '#' + JSE_DATA.sectors[co.sector].color.toString(16).padStart(6, '0');
        wrap.appendChild(h);
      }
      const row = document.createElement('div');
      row.className = 'market-row';
      row.dataset.sym = co.sym;
      row.innerHTML = `<span class="m-sym">${co.sym}${co.market === 'junior' ? '<sup>J</sup>' : ''}</span>
        <span class="m-price"></span><span class="m-chg"></span>`;
      row.addEventListener('click', () => onPickStock(co.sym));
      wrap.appendChild(row);
      marketRows[co.sym] = row;
    }
  }

  function renderMarketList() {
    const q = ($('market-search').value || '').toUpperCase();
    for (const [sym, row] of Object.entries(marketRows)) {
      const st = sim.stocks[sym];
      const match = !q || sym.includes(q) || st.name.toUpperCase().includes(q);
      row.style.display = match ? '' : 'none';
      const chg = (st.price - st.prevClose) / st.prevClose;
      row.querySelector('.m-price').textContent = st.price.toFixed(2);
      const c = row.querySelector('.m-chg');
      c.textContent = st.halted ? 'HALT' : pct(chg);
      c.className = 'm-chg ' + (st.halted ? 'halt' : cls(chg));
      row.classList.toggle('held', !!(player.holdings[sym] && player.holdings[sym].shares > 0));
      row.classList.toggle('selected', sym === selectedSym);
    }
  }

  // ======================================================================
  // stock window
  // ======================================================================
  function onPickStock(sym) {
    selectedSym = sym;
    city.setSelected(sym);
    city.focusOn(sym);
    openWindow('stock-window');
    renderStockWindow(true);
    renderMarketList();
  }

  function renderStockWindow(full) {
    const st = sim.stocks[selectedSym];
    if (!st) return;
    const chg = (st.price - st.prevClose) / st.prevClose;

    if (full) {
      $('sw-sym').textContent = st.sym;
      $('sw-name').textContent = st.name;
      $('sw-sector').textContent = JSE_DATA.sectors[st.sector].name + (st.market === 'junior' ? ' · Junior Market' : ' · Main Market');
      $('sw-blurb').textContent = capFirst(st.blurb);
      $('trade-qty').value = '';
      renderTradeQuote();
    }
    $('sw-price').textContent = fmt2(st.price);
    const c = $('sw-chg');
    c.textContent = pct(chg) + ' today';
    c.className = 'sw-chg ' + cls(chg);
    $('sw-halt').style.display = st.halted ? 'inline-block' : 'none';

    // stats
    const capB = st.price * st.sharesOut / 1000;
    const hist = st.history;
    let hi52 = -Infinity, lo52 = Infinity;
    for (let i = Math.max(0, hist.length - 252); i < hist.length; i++) {
      if (hist[i].h > hi52) hi52 = hist[i].h;
      if (hist[i].l < lo52) lo52 = hist[i].l;
    }
    $('sw-stats').innerHTML =
      statRow('Market cap', 'J$' + capB.toFixed(1) + 'B') +
      statRow('Dividend yield', (st.divYield * 100).toFixed(1) + '%') +
      statRow('52-week range', lo52.toFixed(2) + ' – ' + hi52.toFixed(2)) +
      statRow('Volume today', st.dayVolume.toLocaleString()) +
      statRow('Liquidity', st.liquidity > 0.7 ? 'High' : st.liquidity > 0.4 ? 'Medium' : 'Thin — trades rarely');

    // position
    const h = player.holdings[st.sym];
    if (h && h.shares > 0) {
      const val = h.shares * st.price;
      const pl = val - h.cost;
      $('sw-pos').innerHTML = `You hold <b>${h.shares.toLocaleString()}</b> shares · value <b>${fmt(val)}</b> · avg cost ${fmt2(h.cost / h.shares)} · P&L <b class="${cls(pl)}">${(pl >= 0 ? '+' : '') + fmt(pl).slice(0)}</b>`;
    } else {
      $('sw-pos').innerHTML = 'You hold no shares yet.';
    }

    // chart
    const candles = st.history.slice(-chartRange);
    Charts.draw($('sw-chart'), candles, { ...chartOpts, hoverX: chartHover });
  }

  function statRow(k, v) { return `<div class="stat"><span>${k}</span><b>${v}</b></div>`; }

  function renderTradeQuote() {
    const st = sim.stocks[selectedSym];
    const qty = Math.max(0, Math.floor(Number($('trade-qty').value) || 0));
    const out = $('trade-quote');
    if (!st || !qty) { out.innerHTML = '<span class="muted">Enter a number of shares to see the full cost, fees included.</span>'; return; }
    const qBuy = sim.quote(st.sym, qty, 'buy');
    const qSell = sim.quote(st.sym, qty, 'sell');
    const buyVal = qty * qBuy.price, sellVal = qty * qSell.price;
    const fBuy = MarketSim.costs(buyVal), fSell = MarketSim.costs(sellVal);
    out.innerHTML = `
      <div class="quote-row"><span>Buy ~${fmt2(qBuy.price)}/sh</span><b>${fmt(buyVal + fBuy.total)}</b></div>
      <div class="quote-row"><span>Sell ~${fmt2(qSell.price)}/sh</span><b>${fmt(Math.max(0, sellVal - fSell.total))}</b></div>
      <div class="quote-fees">Fees on buy: broker ${fmt(fBuy.commission)} + cess ${fmt(fBuy.cess)} + GCT ${fmt(fBuy.gct)}${qBuy.slippagePct > 1 ? ` · <span class="down">big order: ~${qBuy.slippagePct.toFixed(1)}% price impact</span>` : ''}</div>`;
  }

  function doTrade(side) {
    const st = sim.stocks[selectedSym];
    if (!st) return;
    if (st.halted) { toast('⛔ ' + st.sym + ' is halted by the circuit breaker. Wait for the next session.', 'bad'); return; }
    const qty = Math.max(0, Math.floor(Number($('trade-qty').value) || 0));
    if (!qty) { toast('Enter how many shares first.', 'bad'); return; }

    const q = sim.quote(st.sym, qty, side);
    const value = qty * q.price;
    const fees = MarketSim.costs(value);

    if (side === 'buy') {
      const total = value + fees.total;
      if (total > player.cash) { toast(`Not enough cash: that costs ${fmt(total)} with fees, you have ${fmt(player.cash)}.`, 'bad'); return; }
      player.cash -= total;
      const h = player.holdings[st.sym] = player.holdings[st.sym] || { shares: 0, cost: 0 };
      h.shares += qty; h.cost += total;
      player.txs.unshift({ t: sim.date.getTime(), kind: 'buy', sym: st.sym, qty, price: q.price, fees: fees.total, total });
      toast(`✅ Bought ${qty.toLocaleString()} ${st.sym} @ ${fmt2(q.price)} — settles T+1, ${fmt(total)} total`, 'good');
      unlock('firstTrade', 'First trade on the board! You are officially a JSE investor.');
    } else {
      const h = player.holdings[st.sym];
      if (!h || h.shares < qty) { toast(`You only hold ${h ? h.shares : 0} shares of ${st.sym}.`, 'bad'); return; }
      const proceeds = value - fees.total;
      if (proceeds <= 0) { toast(`⛔ Order too small: fees (minimum ${fmt(500)} commission) would eat the whole ${fmt(value)} sale. Sell more shares at once.`, 'bad'); return; }
      const costOut = h.cost * (qty / h.shares);
      player.cash += proceeds;
      player.realized += proceeds - costOut;
      h.shares -= qty; h.cost -= costOut;
      player.txs.unshift({ t: sim.date.getTime(), kind: 'sell', sym: st.sym, qty, price: q.price, fees: fees.total, total: proceeds });
      toast(`✅ Sold ${qty.toLocaleString()} ${st.sym} @ ${fmt2(q.price)} — ${fmt(proceeds)} after fees (no capital gains tax in Jamaica!)`, 'good');
    }
    if (player.txs.length > 400) player.txs.pop();
    saveAccounts();
    uiDirty = true;
    renderStockWindow(true);
  }

  // ======================================================================
  // portfolio window
  // ======================================================================
  function renderPortfolio() {
    const nw = netWorth(player, sim);
    let invested = 0, unrealized = 0;
    const rows = [];
    for (const [sym, h] of Object.entries(player.holdings)) {
      if (h.shares <= 0) continue;
      const st = sim.stocks[sym];
      const val = h.shares * st.price;
      invested += val;
      const pl = val - h.cost;
      unrealized += pl;
      rows.push({ sym, h, st, val, pl });
    }
    rows.sort((a, b) => b.val - a.val);

    const gain = nw / START_CASH - 1;
    const benchGain = sim.indices.combined.value / player.benchStart - 1;
    const alpha = gain - benchGain;
    $('pf-summary').innerHTML = `
      ${sumCard('Net worth', fmt(nw), gain)}
      ${sumCard('Cash', fmt(player.cash), null)}
      ${sumCard('Invested', fmt(invested), null)}
      ${sumCard('Unrealized P&L', fmt(unrealized), unrealized / START_CASH)}
      ${sumCard('Realized P&L', fmt(player.realized), player.realized / START_CASH)}
      ${sumCard('Dividends', fmt(player.dividends), null)}`;
    $('pf-bench').innerHTML = `You: <b class="${cls(gain)}">${pct(gain)}</b> &nbsp;·&nbsp; JSE Combined Index: <b class="${cls(benchGain)}">${pct(benchGain)}</b> &nbsp;·&nbsp; ${alpha >= 0 ? `You are <b class="up">beating the market by ${(alpha * 100).toFixed(1)} points</b> 🎉` : `The index is ahead by <b class="down">${(-alpha * 100).toFixed(1)} points</b> — even pros struggle to beat it.`}`;
    if (alpha > 0.10 && player.netWorthHistory.length > 252) unlock('beatIndex', 'Market beater: 10+ points ahead of the JSE index over a year.');

    const tb = $('pf-holdings');
    tb.innerHTML = rows.length ? '' : '<tr><td colspan="6" class="muted">No holdings yet. Click a tower in the city or a stock in Market Watch to buy your first shares.</td></tr>';
    for (const r of rows) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="m-sym">${r.sym}</td><td>${r.h.shares.toLocaleString()}</td>
        <td>${fmt2(r.h.cost / r.h.shares)}</td><td>${fmt2(r.st.price)}</td>
        <td>${fmt(r.val)}</td><td class="${cls(r.pl)}">${(r.pl >= 0 ? '+' : '') + fmt(r.pl)}</td>`;
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => onPickStock(r.sym));
      tb.appendChild(tr);
    }

    const txb = $('pf-txs');
    txb.innerHTML = player.txs.length ? '' : '<tr><td colspan="5" class="muted">No transactions yet.</td></tr>';
    for (const tx of player.txs.slice(0, 60)) {
      const tr = document.createElement('tr');
      const d = new Date(tx.t).toLocaleDateString('en-JM', { day: 'numeric', month: 'short', year: '2-digit' });
      const kindLabel = tx.kind === 'buy' ? '<span class="down">BUY</span>' : tx.kind === 'sell' ? '<span class="up">SELL</span>' : '<span class="up">DIV</span>';
      tr.innerHTML = `<td>${d}</td><td>${kindLabel}</td><td class="m-sym">${tx.sym}</td>
        <td>${tx.qty.toLocaleString()} @ ${fmt2(tx.price)}</td><td>${fmt(tx.total)}</td>`;
      txb.appendChild(tr);
    }

    Charts.drawLine($('pf-chart'), player.netWorthHistory.map(p => p.v), {});
  }

  function sumCard(label, val, chg) {
    return `<div class="sum-card"><span>${label}</span><b>${val}</b>${chg !== null ? `<small class="${cls(chg)}">${pct(chg)}</small>` : '<small>&nbsp;</small>'}</div>`;
  }

  // ======================================================================
  // news
  // ======================================================================
  function rebuildTicker() {
    tickerItems = sim.newsLog.slice(0, 10);
    const track = $('ticker-track');
    track.innerHTML = '';
    const make = () => {
      for (const n of tickerItems) {
        const s = document.createElement('span');
        s.className = 'tick-item ' + n.severity;
        s.textContent = n.headline;
        s.addEventListener('click', () => { openWindow('news-window'); renderNewsFeed(); });
        track.appendChild(s);
      }
    };
    make(); make();   // duplicate for seamless scroll
  }

  function renderNewsFeed() {
    const wrap = $('news-list');
    wrap.innerHTML = '';
    for (const n of sim.newsLog) {
      const d = document.createElement('div');
      d.className = 'news-item ' + n.severity;
      d.innerHTML = `<div class="news-head"><span class="news-date">${new Date(n.day).toLocaleDateString('en-JM', { day: 'numeric', month: 'short' })}</span> ${escapeHtml(n.headline)}</div>
        <div class="news-body" style="display:none">${escapeHtml(n.body || '')}${n.lesson ? `<div class="news-lesson">📚 ${escapeHtml(n.lesson)}</div>` : ''}</div>`;
      d.querySelector('.news-head').addEventListener('click', () => {
        const b = d.querySelector('.news-body');
        b.style.display = b.style.display === 'none' ? 'block' : 'none';
      });
      wrap.appendChild(d);
    }
  }

  // ======================================================================
  // toasts, banner, windows
  // ======================================================================
  function toast(msg, kind) {
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = msg;
    $('toasts').appendChild(t);
    setTimeout(() => t.classList.add('show'), 20);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 5200);
  }

  function showBanner(title, body, kind) {
    $('banner-title').textContent = title;
    $('banner-body').textContent = body;
    const b = $('event-banner');
    b.className = 'event-banner ' + kind;
    b.style.display = 'flex';
    if (kind === 'severe') setSpeed(Math.min(speedIdx, 1));  // slow down for drama
  }

  function openWindow(id) {
    $(id).style.display = 'flex';
    // bring to front
    document.querySelectorAll('.window').forEach(w => w.style.zIndex = 30);
    $(id).style.zIndex = 40;
  }

  function makeDraggable(win) {
    const bar = win.querySelector('.win-title');
    let drag = null;
    bar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      drag = { x: e.clientX - win.offsetLeft, y: e.clientY - win.offsetTop };
      bar.setPointerCapture(e.pointerId);
      document.querySelectorAll('.window').forEach(w => w.style.zIndex = 30);
      win.style.zIndex = 40;
    });
    bar.addEventListener('pointermove', (e) => {
      if (!drag) return;
      win.style.left = Math.max(0, Math.min(window.innerWidth - 120, e.clientX - drag.x)) + 'px';
      win.style.top = Math.max(44, Math.min(window.innerHeight - 80, e.clientY - drag.y)) + 'px';
      win.style.right = 'auto';
    });
    bar.addEventListener('pointerup', () => drag = null);
  }

  // ======================================================================
  // speed controls
  // ======================================================================
  function setSpeed(i) {
    speedIdx = i;
    document.querySelectorAll('.speed-btn').forEach((b, j) => b.classList.toggle('active', j === i));
    $('speed-label').textContent = SPEEDS[i].label;
    if (i === 0) saveAccounts();
  }

  // ======================================================================
  // wiring
  // ======================================================================
  function initUi() {
    // login
    const swatches = document.querySelectorAll('.color-swatch');
    let chosenColor = swatches[0].dataset.c;
    swatches.forEach(s => {
      s.style.background = s.dataset.c;
      s.addEventListener('click', () => {
        swatches.forEach(x => x.classList.remove('active'));
        s.classList.add('active');
        chosenColor = s.dataset.c;
      });
    });
    swatches[0].classList.add('active');
    $('btn-create').addEventListener('click', () => {
      const name = $('new-name').value.trim().slice(0, 24);
      if (!name) { $('new-name').focus(); return; }
      const acc = createAccount(name, chosenColor);
      saveAccounts();
      $('new-name').value = '';
      startGame(acc);
    });
    $('new-name').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-create').click(); });

    // speed buttons
    document.querySelectorAll('.speed-btn').forEach((b, i) => b.addEventListener('click', () => setSpeed(i)));

    // top bar buttons
    $('btn-portfolio').addEventListener('click', () => { openWindow('portfolio-window'); renderPortfolio(); });
    $('btn-news').addEventListener('click', () => { openWindow('news-window'); renderNewsFeed(); });
    $('btn-learn').addEventListener('click', () => openWindow('learn-window'));
    $('btn-market').addEventListener('click', () => {
      const p = $('market-panel');
      p.style.display = p.style.display === 'none' ? 'flex' : 'none';
    });
    $('btn-exit').addEventListener('click', exitToLogin);
    $('market-search').addEventListener('input', () => uiDirty = true);

    // windows: close buttons + drag
    document.querySelectorAll('.window').forEach(w => {
      makeDraggable(w);
      const closeBtn = w.querySelector('.win-close');
      if (closeBtn) closeBtn.addEventListener('click', () => {
        w.style.display = 'none';
        if (w.id === 'stock-window') { selectedSym = null; city.setSelected(null); uiDirty = true; }
      });
    });

    // banner dismiss
    $('banner-close').addEventListener('click', () => $('event-banner').style.display = 'none');

    // trade
    $('btn-buy').addEventListener('click', () => doTrade('buy'));
    $('btn-sell').addEventListener('click', () => doTrade('sell'));
    $('trade-qty').addEventListener('input', renderTradeQuote);
    document.querySelectorAll('.qty-preset').forEach(b => b.addEventListener('click', () => {
      const st = sim.stocks[selectedSym];
      if (!st) return;
      if (b.dataset.q === 'max') {
        // solve approx max shares affordable including ~2.5% fees and slippage
        const q = sim.quote(st.sym, 100, 'buy');
        let est = Math.floor(player.cash / (q.price * 1.05));
        for (let k = 0; k < 6 && est > 0; k++) {
          const qq = sim.quote(st.sym, est, 'buy');
          const tot = est * qq.price + MarketSim.costs(est * qq.price).total;
          if (tot > player.cash) est = Math.floor(est * 0.96); else break;
        }
        $('trade-qty').value = Math.max(0, est);
      } else {
        $('trade-qty').value = b.dataset.q;
      }
      renderTradeQuote();
    }));

    // chart controls
    document.querySelectorAll('.range-btn').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.range-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      chartRange = Number(b.dataset.r) || 5000;
      renderStockWindow(false);
    }));
    document.querySelectorAll('.ov-toggle').forEach(t => t.addEventListener('change', () => {
      chartOpts[t.dataset.ov] = t.checked;
      renderStockWindow(false);
    }));
    const chart = $('sw-chart');
    chart.addEventListener('pointermove', e => {
      const r = chart.getBoundingClientRect();
      chartHover = e.clientX - r.left;
    });
    chart.addEventListener('pointerleave', () => chartHover = null);

    // learn window content
    $('learn-content').innerHTML = buildLearnContent();
    document.querySelectorAll('.learn-tab').forEach(t => t.addEventListener('click', () => {
      document.querySelectorAll('.learn-tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      document.querySelectorAll('.learn-page').forEach(p => p.style.display = p.dataset.page === t.dataset.page ? 'block' : 'none');
    }));

    window.addEventListener('beforeunload', () => { if (player) { player.lastNetWorth = netWorth(player, sim); saveAccounts(); } });
    renderLogin();
  }

  // ======================================================================
  // learn content
  // ======================================================================
  function buildLearnContent() {
    const M = JSE_DATA.meta;
    return `
    <div class="learn-tabs">
      <button class="learn-tab active" data-page="jse">The real JSE</button>
      <button class="learn-tab" data-page="how">How to play</button>
      <button class="learn-tab" data-page="glossary">Glossary</button>
    </div>
    <div class="learn-page" data-page="jse" style="display:block">
      <h3>The Jamaica Stock Exchange</h3>
      <p>Founded in ${M.founded}, trading since ${M.firstTradingDay}, from ${M.address} — the same street this game is named after. It was one of the first stock exchanges in the Caribbean.</p>
      <ul>
        <li><b>Hours:</b> ${M.hours} (this game compresses each day into seconds).</li>
        <li><b>Platform:</b> ${M.platform}.</li>
        <li><b>Settlement:</b> ${M.settlement}. You pay today, the shares are officially yours the next business day.</li>
        <li><b>Circuit breaker:</b> ${M.circuitBreaker}</li>
        <li><b>Junior Market:</b> ${M.juniorMarket} Stocks marked <sup>J</sup> in this game are Junior Market listings.</li>
        <li><b>No capital gains tax</b> on JSE shares in Jamaica, but dividends carry 15% withholding tax — both modelled in this game.</li>
        <li><b>Bragging rights:</b> ${M.bestYears}</li>
      </ul>
      <p>Every company in this game is a real JSE-listed company, seeded with real mid-2026 prices, market caps and index levels. From there, the simulation writes its own history — so no, you cannot use this game to predict Monday's prices. You can use it to understand them.</p>
    </div>
    <div class="learn-page" data-page="how" style="display:none">
      <h3>How to play</h3>
      <ul>
        <li><b>You start with J$1,000,000.</b> Grow it. Your score is your net worth, and the leaderboard lives on the login screen.</li>
        <li><b>The city is the market.</b> Every tower is a company: height = size, rooftop light = today's move (green up, red down, flashing amber = halted). Drag to orbit, scroll to zoom, right-drag to pan, click a tower to trade it.</li>
        <li><b>Control time.</b> Pause to think, warp a month per second to see results. Long-term investing takes minutes, not decades.</li>
        <li><b>Fees are real.</b> Broker commission (~2%), JSE cess, GCT on fees, and price impact when your order is big for a thin stock. Frequent trading is expensive — exactly like real life.</li>
        <li><b>Watch the news.</b> Earnings, BOJ rate decisions, tourism numbers, hurricanes. Prices move on surprises. Every story carries a 📚 lesson.</li>
        <li><b>Seasons matter.</b> Tourist high season (Dec–Apr), hurricane season (Jun–Nov), Christmas retail. The charts have SMA, Bollinger bands and RSI so you can hunt the patterns.</li>
        <li><b>Worst cases happen.</b> Hurricanes, global crashes, currency slides, even a pandemic. Diversify across sectors so one storm cannot sink you.</li>
      </ul>
    </div>
    <div class="learn-page" data-page="glossary" style="display:none">
      <h3>Glossary</h3>
      ${[
        ['Share', 'A tiny piece of ownership in a company.'],
        ['Index', 'One number that tracks a whole basket of stocks. The JSE Combined Index covers Main and Junior markets.'],
        ['Dividend', 'Cash a company pays its shareholders, usually every quarter.'],
        ['Dividend yield', 'Annual dividends as a percentage of the share price.'],
        ['Market cap', 'Share price × number of shares. What the whole company is worth on paper.'],
        ['Bid / ask spread', 'The gap between the best buying and selling prices. Wide in thin markets — that gap is a cost you pay.'],
        ['Liquidity', 'How easily you can trade without moving the price. Many JSE stocks trade thinly.'],
        ['Circuit breaker', 'An automatic trading halt after a 15% move, to stop panic.'],
        ['Volatility', 'How wildly a price swings. Higher volatility = higher risk and possibility.'],
        ['Beta', 'How much a stock moves when the whole market moves.'],
        ['SMA', 'Simple Moving Average: the average closing price over N days. Smooths the noise to show trend.'],
        ['RSI', 'Relative Strength Index (0-100). Above 70 often means overbought, below 30 oversold.'],
        ['Bollinger bands', 'A moving average ± two standard deviations. Prices near the bands are stretched.'],
        ['Bull / bear market', 'A rising market / a falling market.'],
        ['Diversification', 'Spreading money across sectors so one disaster cannot take it all.'],
        ['T+1 settlement', 'Trades finalize one business day after you make them.'],
        ['BOJ policy rate', 'The Bank of Jamaica\'s interest rate. Higher rates pull money out of stocks into savings.'],
        ['Inflation', 'Rising prices. The BOJ aims to keep it between 4% and 6%.'],
        ['Remittances', 'Money Jamaicans abroad send home — about a sixth of the economy.'],
        ['GCT', 'General Consumption Tax: Jamaica\'s sales tax, charged on your broker fees.'],
      ].map(([k, v]) => `<div class="gloss"><b>${k}</b><span>${v}</span></div>`).join('')}
    </div>`;
  }

  function capFirst(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  document.addEventListener('DOMContentLoaded', initUi);
})();
