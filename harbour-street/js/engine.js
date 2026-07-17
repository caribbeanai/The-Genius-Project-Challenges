/* =========================================================================
   Harbour Street — market simulation engine
   A daily-step simulation of the Jamaica Stock Exchange.

   The model, in plain words:
   - Each trading day every stock's return = market factor + sector factor
     + its own company-specific noise + any news jumps + seasonal drift.
   - The market factor follows the macro economy (BOJ policy rate, inflation,
     FX rate, GDP growth, global sentiment), which evolves as slow
     mean-reverting AR(1) processes.
   - Volatility clusters (EWMA), and the whole market switches between
     calm / boom / bust regimes via a Markov chain — quiet stretches, then
     storms, like real markets.
   - JSE microstructure: thin trading (many stocks skip days), a 15% daily
     circuit breaker, bid/ask spread, price impact for big orders, broker
     fees and cess, T+1 settlement, quarterly dividends and earnings.
   ========================================================================= */

'use strict';

// ---- deterministic RNG (mulberry32) --------------------------------------
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Standard normal via Box-Muller
function makeGauss(rng) {
  let spare = null;
  return function () {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u = 0, v = 0;
    while (u === 0) u = rng();
    v = rng();
    const m = Math.sqrt(-2 * Math.log(u));
    spare = m * Math.sin(2 * Math.PI * v);
    return m * Math.cos(2 * Math.PI * v);
  };
}

const TRADING_DAYS = 252;

class MarketSim {
  constructor(seed, startDate) {
    this.rng = makeRng(seed);
    this.gauss = makeGauss(this.rng);
    this.seed = seed;

    this.date = startDate ? new Date(startDate) : new Date(2026, 0, 5); // first Monday of 2026
    this.dayCount = 0;

    // --- macro state (annualised rates as decimals) ---
    this.macro = {
      policyRate: JSE_DATA.macro.policyRate,
      inflation: JSE_DATA.macro.inflation,
      usdJmd: JSE_DATA.macro.usdJmd,
      gdpGrowth: JSE_DATA.macro.gdpGrowth,
      global: 0,               // global sentiment, mean-reverting around 0
    };
    this.macroAnchor = { ...JSE_DATA.macroAnchor, global: 0 }; // long-run means

    // --- regime Markov chain ---
    this.regime = 'calm';       // calm | boom | bust
    this.regimeDays = 0;

    // --- volatility state ---
    this.mktVol = 0.10 / Math.sqrt(TRADING_DAYS); // daily market factor vol (JSE index ~10% annual)
    this.volBoost = 1;
    this.volBoostDecay = 0;

    // --- stocks ---
    this.stocks = {};
    for (const co of JSE_DATA.companies) {
      this.stocks[co.sym] = {
        ...co,
        price: co.price,
        prevClose: co.price,
        dayOpen: co.price,
        dayHigh: co.price,
        dayLow: co.price,
        dayVolume: 0,
        halted: false,
        history: [],           // {t, o, h, l, c, v}
        pendingShocks: 0,      // news jumps applied on next step
        divPerShare: co.price * co.divYield / 4,
        totalDivPaid: 0,
      };
    }

    // --- indices (base values from real JSE levels) ---
    this.indices = {
      combined: { name: 'JSE Combined Index', value: JSE_DATA.indices.combined, history: [] },
      main: { name: 'JSE Main Index', value: JSE_DATA.indices.main, history: [] },
      junior: { name: 'Junior Market Index', value: JSE_DATA.indices.junior, history: [] },
    };

    // --- events ---
    this.pendingMarketShock = 0;
    this.pendingSectorShocks = {};
    this.newsLog = [];          // most recent first
    this.eventCounter = 0;
    this.activeWeather = null;  // 'storm' | 'hurricane' | null (for the voxel scene)
    this.weatherDays = 0;
    this.usedHurricaneNames = 0;

    // Warm up 130 trading days (~6 months) of history so charts and
    // indicators work from the first screen.
    this.warmingUp = true;
    this.date.setDate(this.date.getDate() - 183);
    this._alignToWeekday();
    for (let i = 0; i < 130; i++) this.stepDay();
    this.warmingUp = false;
    this.newsLog = this.newsLog.slice(0, 12); // keep a little history in the feed

    // Re-anchor to reality: rescale each stock's warmed-up history so day one
    // matches the real mid-2026 JSE snapshot exactly, then reset macro state
    // to the real numbers. History keeps its realistic shape; the endpoint is
    // the real market.
    for (const co of JSE_DATA.companies) {
      const st = this.stocks[co.sym];
      const ratio = co.price / st.price;
      st.price = co.price;
      st.prevClose = round2(st.prevClose * ratio);
      st.dayOpen = round2(st.dayOpen * ratio);
      st.dayHigh = round2(st.dayHigh * ratio);
      st.dayLow = round2(st.dayLow * ratio);
      st.divPerShare = st.price * co.divYield / 4;
      st.halted = false;
      for (const c of st.history) {
        c.o = round2(c.o * ratio); c.h = round2(c.h * ratio);
        c.l = round2(c.l * ratio); c.c = round2(c.c * ratio);
      }
    }
    for (const k of Object.keys(this.indices)) {
      const ix = this.indices[k];
      const ratio = JSE_DATA.indices[k] / ix.value;
      ix.value = JSE_DATA.indices[k];
      for (const c of ix.history) c.c *= ratio;
    }
    this.macro = { ...JSE_DATA.macro, global: 0 };
    this.volBoost = 1; this.volBoostDecay = 0;
    this.activeWeather = null; this.weatherDays = 0;
  }

  _alignToWeekday() {
    while (this.date.getDay() === 0 || this.date.getDay() === 6) {
      this.date.setDate(this.date.getDate() + 1);
    }
  }

  // ======================================================================
  // one trading day
  // ======================================================================
  stepDay() {
    // advance calendar to next weekday
    do { this.date.setDate(this.date.getDate() + 1); }
    while (this.date.getDay() === 0 || this.date.getDay() === 6);
    this.dayCount++;
    const month = this.date.getMonth();      // 0-11

    this._stepMacro();
    this._stepRegime();
    this._generateNews(month);

    // ---- market factor ----
    const m = this.macro;
    // macro drift: low rates, low inflation, decent growth and good global
    // mood push the market factor up; the reverse drags it down.
    let drift =
      (0.065 - m.policyRate) * 0.9 +
      (0.055 - m.inflation) * 0.6 +
      m.gdpGrowth * 2.2 +
      m.global * 0.018;
    if (this.regime === 'boom') drift += 0.22;
    if (this.regime === 'bust') drift -= 0.30;
    drift /= TRADING_DAYS;

    // vol clustering: EWMA pulled toward regime baseline
    const baseVol = (this.regime === 'bust' ? 0.17 : this.regime === 'boom' ? 0.12 : 0.09) / Math.sqrt(TRADING_DAYS);
    this.mktVol = 0.94 * this.mktVol + 0.06 * baseVol;
    if (this.volBoostDecay > 0) { this.volBoostDecay--; if (this.volBoostDecay === 0) this.volBoost = 1; }
    const sigma = this.mktVol * this.volBoost;

    let mktF = drift + sigma * this.gauss() + this.pendingMarketShock;
    this.pendingMarketShock = 0;

    // ---- sector factors ----
    const sectorF = {};
    for (const sec of Object.keys(JSE_DATA.sectors)) {
      let sf = 0.35 * sigma * this.gauss();
      sf += this._seasonalDrift(sec, month);
      if (this.pendingSectorShocks[sec]) { sf += this.pendingSectorShocks[sec]; }
      sectorF[sec] = sf;
    }
    this.pendingSectorShocks = {};

    // ---- per-stock returns ----
    for (const sym of Object.keys(this.stocks)) {
      this._stepStock(this.stocks[sym], mktF, sectorF, month);
    }

    this._payDividends();
    this._updateIndices();
    this._recordHistory();

    if (this.weatherDays > 0) { this.weatherDays--; if (this.weatherDays === 0) this.activeWeather = null; }
  }

  // ---- macro AR(1) mean-reverting walks --------------------------------
  _stepMacro() {
    const m = this.macro, a = this.macroAnchor, g = this.gauss;
    const rev = 0.01; // slow mean reversion per day
    m.inflation = Math.max(0.01, m.inflation + rev * (a.inflation - m.inflation) + 0.0006 * g());
    m.gdpGrowth = m.gdpGrowth + rev * (a.gdpGrowth - m.gdpGrowth) + 0.0004 * g();
    // FX drifts weaker over time (JMD has a long history of gradual depreciation)
    m.usdJmd = Math.max(80, m.usdJmd + 0.012 + 0.18 * g() + (m.inflation - 0.05) * 2);
    m.global = m.global * 0.985 + 0.25 * g();
    // policy rate changes only at MPC meetings (handled in news), but drifts
    // toward a Taylor-ish anchor very slowly between them
    m.policyRate = Math.max(0.005, m.policyRate);
  }

  // ---- regime switching -------------------------------------------------
  _stepRegime() {
    this.regimeDays++;
    const r = this.rng();
    const p = 1 / 120; // average regime lasts ~6 months
    if (this.regimeDays < 20) return;
    if (this.regime === 'calm') {
      if (r < p * 0.6) this._setRegime('boom');
      else if (r < p) this._setRegime('bust');
    } else if (this.regime === 'boom') {
      if (r < p * 1.2) this._setRegime('calm');
      else if (r < p * 1.5) this._setRegime('bust');
    } else {
      if (r < p * 1.8) this._setRegime('calm'); // busts end faster
    }
  }
  _setRegime(next) {
    this.regime = next; this.regimeDays = 0;
    if (this.warmingUp) return;
    const msgs = {
      boom: { headline: 'Bull run: investor confidence surges across the JSE', severity: 'good', body: 'Buying pressure is broad. The JSE topped world market rankings in 2015 and 2018 — strong runs are part of its history. Remember: booms end.', lesson: 'Markets move in regimes. Recognising the mood matters as much as picking stocks.' },
      bust: { headline: 'Market mood darkens: sellers take control', severity: 'bad', body: 'Investors are pulling back across the board. Downturns punish the over-extended and reward the patient — this is when watchlists earn their keep.', lesson: 'Bear markets transfer money from the impatient to the patient.' },
      calm: { headline: 'Markets settle into a steadier rhythm', severity: 'info', body: 'Volatility is easing back to normal levels.', lesson: 'Most of a market\'s life is spent doing very little. That is normal.' },
    };
    this._pushNews({ kind: 'regime', ...msgs[next] });
  }

  // ---- seasonality ------------------------------------------------------
  _seasonalDrift(sector, month) {
    let s = 0;
    const winter = (month === 11 || month <= 3);   // Dec-Apr high tourist season
    const hurricaneSeason = (month >= 5 && month <= 10);
    if (sector === 'tourism') { if (winter) s += 0.0009; if (hurricaneSeason) s -= 0.0004; }
    if (sector === 'insurance' && hurricaneSeason) s -= 0.0003;
    if (sector === 'agriculture' && hurricaneSeason) s -= 0.0002;
    if (sector === 'retail' && month === 11) s += 0.0012;          // Christmas trading
    if (sector === 'retail' && month === 0) s -= 0.0006;           // January slump
    if (sector === 'manufacturing' && month === 11) s += 0.0005;
    return s;
  }

  // ---- single stock day -------------------------------------------------
  _stepStock(st, mktF, sectorF, month) {
    st.prevClose = st.price;
    st.halted = false;

    // Thin trading: illiquid names often record no trade at all.
    const tradeProb = 0.25 + 0.75 * st.liquidity;
    const noTrade = this.rng() > tradeProb && Math.abs(st.pendingShocks) < 0.01;

    let ret = 0;
    if (!noTrade) {
      const idioVol = st.vol / Math.sqrt(TRADING_DAYS);
      ret = st.beta * mktF + (sectorF[st.sector] || 0) + idioVol * this.gauss();
      // January effect: small caps catch a bid in the new year
      if (month === 0 && st.market === 'junior') ret += 0.0008;
      // occasional idiosyncratic jump (block trade, rumour) more likely in thin names
      if (this.rng() < 0.015 * (1.5 - st.liquidity)) {
        ret += (this.rng() < 0.5 ? -1 : 1) * (0.02 + this.rng() * 0.05);
      }
    }
    ret += st.pendingShocks;
    st.pendingShocks = 0;

    // JSE circuit breaker: a stock may move at most 15% in a session;
    // beyond that trading is halted for the rest of the day.
    const CAP = 0.15;
    let gross = Math.exp(ret) - 1;
    if (gross > CAP) { gross = CAP; st.halted = true; }
    if (gross < -CAP) { gross = -CAP; st.halted = true; }

    const newPrice = Math.max(0.01, st.prevClose * (1 + gross));
    st.dayOpen = st.prevClose * (1 + gross * (0.2 + 0.4 * this.rng()));
    st.price = newPrice;
    const hi = Math.max(st.dayOpen, newPrice), lo = Math.min(st.dayOpen, newPrice);
    const wick = Math.abs(gross) * 0.4 + 0.002;
    st.dayHigh = hi * (1 + wick * this.rng());
    st.dayLow = Math.max(0.01, lo * (1 - wick * this.rng()));

    // volume: base turnover scaled by liquidity, bigger on big moves
    const baseVol = st.sharesOut * 1e6 * 0.0006 * st.liquidity;
    st.dayVolume = noTrade ? 0 : Math.round(baseVol * (0.3 + this.rng() * 1.4) * (1 + Math.abs(gross) * 25));

    if (st.halted && !this.warmingUp) {
      this._pushNews({
        kind: 'halt', severity: 'bad',
        headline: `Circuit breaker: ${st.sym} halted after ${gross > 0 ? '+15%' : '-15%'} move`,
        body: `${st.name} hit the JSE's 15% circuit breaker. On the real exchange the stock is halted for one hour, then re-opens with a new price band, so investors can absorb the news instead of stampeding.`,
        lesson: 'Circuit breakers force a time-out. They exist because panicking crowds make bad prices.',
      });
    }
  }

  // ---- dividends --------------------------------------------------------
  _payDividends() {
    this.dividendsToday = [];
    for (const sym of Object.keys(this.stocks)) {
      const st = this.stocks[sym];
      if (st.divYield <= 0) continue;
      // each stock pays quarterly on a day offset derived from its symbol
      const offset = (sym.charCodeAt(0) * 7 + sym.length * 13) % 63;
      if (this.dayCount % 63 === offset) {
        st.divPerShare = st.price * st.divYield / 4;
        this.dividendsToday.push({ sym, amount: st.divPerShare });
        if (!this.warmingUp && st.divPerShare >= 0.01) {
          this._pushNews({
            kind: 'dividend', severity: 'good',
            headline: `${st.name} pays J$${st.divPerShare.toFixed(2)} per share dividend`,
            body: `Shareholders of record receive cash today. At the current price that is a ${(st.divYield * 100).toFixed(1)}% annual yield.`,
            lesson: 'Total return = price change + dividends. Dividends quietly compound.',
          });
        }
      }
    }
  }

  // ---- indices ----------------------------------------------------------
  _updateIndices() {
    let mainCap = 0, mainPrev = 0, jrCap = 0, jrPrev = 0;
    for (const sym of Object.keys(this.stocks)) {
      const st = this.stocks[sym];
      const cap = st.price * st.sharesOut, prev = st.prevClose * st.sharesOut;
      if (st.market === 'junior') { jrCap += cap; jrPrev += prev; }
      else { mainCap += cap; mainPrev += prev; }
    }
    const allCap = mainCap + jrCap, allPrev = mainPrev + jrPrev;
    this.indices.main.value *= mainCap / mainPrev;
    this.indices.junior.value *= jrCap / jrPrev;
    this.indices.combined.value *= allCap / allPrev;
  }

  _recordHistory() {
    const t = this.date.getTime();
    for (const sym of Object.keys(this.stocks)) {
      const st = this.stocks[sym];
      st.history.push({ t, o: round2(st.dayOpen), h: round2(st.dayHigh), l: round2(st.dayLow), c: round2(st.price), v: st.dayVolume });
      if (st.history.length > 1600) st.history.shift();
    }
    for (const k of Object.keys(this.indices)) {
      const ix = this.indices[k];
      ix.history.push({ t, c: ix.value });
      if (ix.history.length > 1600) ix.history.shift();
    }
  }

  // ======================================================================
  // news generation
  // ======================================================================
  _generateNews(month) {
    const rng = this.rng;

    // BOJ rate decision roughly every 2 months (8 MPC meetings/year)
    if (this.dayCount % 42 === 17) this._applyEvent(NEWS.rateDecision(rng, this.macro));

    // earnings: each company reports once a quarter on its own schedule
    for (const sym of Object.keys(this.stocks)) {
      const st = this.stocks[sym];
      const offset = (sym.charCodeAt(0) * 11 + (sym.charCodeAt(1) || 7) * 3) % 63;
      if (this.dayCount % 63 === offset) {
        // beat probability tied to the economy: good times, more beats
        const beatProb = 0.5 + this.macro.gdpGrowth * 8 + (this.regime === 'boom' ? 0.12 : this.regime === 'bust' ? -0.12 : 0);
        this._applyEvent(NEWS.earningsEvent(rng, st, Math.max(0.15, Math.min(0.85, beatProb))));
      }
    }

    // monthly tourism + remittance reports
    if (this.dayCount % 21 === 5) this._applyEvent(NEWS.tourismReport(rng, month));
    if (this.dayCount % 21 === 12) this._applyEvent(NEWS.remittanceReport(rng));

    // random company news ~ every 3 days
    if (rng() < 0.30) {
      const syms = Object.keys(this.stocks);
      this._applyEvent(NEWS.companyNews(rng, this.stocks[syms[Math.floor(rng() * syms.length)]]));
    }

    // worst-case scenarios (rare)
    const hurricaneSeason = (month >= 5 && month <= 10);
    const peak = (month === 7 || month === 8);      // Aug-Sep peak
    if (hurricaneSeason && rng() < (peak ? 0.006 : 0.002)) {
      const name = NEWS.HURRICANE_NAMES[this.usedHurricaneNames++ % NEWS.HURRICANE_NAMES.length];
      const ev = NEWS.hurricane(rng, name);
      this._applyEvent(ev);
      this.activeWeather = ev.weather; this.weatherDays = ev.weather === 'hurricane' ? 8 : 4;
    }
    if (rng() < 0.0012) this._applyEvent(NEWS.globalCrash(rng));
    if (rng() < 0.0008) this._applyEvent(NEWS.currencyCrisis(rng));
    if (rng() < 0.0003) this._applyEvent(NEWS.pandemic(rng));

    // flavour headline ~ every 4 days
    if (rng() < 0.22) this._pushNews(NEWS.flavour(rng));
  }

  _applyEvent(ev) {
    if (ev.marketShock) this.pendingMarketShock += ev.marketShock;
    if (ev.sectorShocks) for (const s of Object.keys(ev.sectorShocks)) {
      this.pendingSectorShocks[s] = (this.pendingSectorShocks[s] || 0) + ev.sectorShocks[s];
    }
    if (ev.stockShocks) for (const sym of Object.keys(ev.stockShocks)) {
      if (this.stocks[sym]) this.stocks[sym].pendingShocks += ev.stockShocks[sym];
    }
    if (ev.volBoost) {
      this.volBoost = Math.max(this.volBoost, ev.volBoost);
      this.volBoostDecay = Math.max(this.volBoostDecay, ev.decay || 3);
    }
    if (ev.macro) {
      const m = ev.macro;
      if (m.policyRate) this.macro.policyRate = Math.max(0.005, this.macro.policyRate + m.policyRate);
      if (m.inflation) this.macro.inflation = Math.max(0.01, this.macro.inflation + m.inflation);
      if (m.usdJmd) this.macro.usdJmd += m.usdJmd;
      if (m.gdpGrowth) this.macro.gdpGrowth += m.gdpGrowth;
    }
    this._pushNews(ev);
  }

  _pushNews(ev) {
    ev.id = ++this.eventCounter;
    ev.day = this.date.getTime();
    this.newsLog.unshift(ev);
    if (this.newsLog.length > 80) this.newsLog.pop();
  }

  // ======================================================================
  // trading — what the player's orders actually cost
  // ======================================================================

  /* JSE-style transaction costs:
       broker commission  ~2% (small retail orders; min J$500)
       JSE cess           0.2%  (levy on the trade value)
       GCT                15% charged on the fees (not on the shares)
     No capital gains tax on JSE shares. Dividends carry 15% withholding.
     Settlement is T+1 on the real JSE; we settle instantly but show it. */
  static costs(value) {
    const commission = Math.max(500, value * 0.02);
    const cess = value * 0.002;
    const gct = (commission + cess) * 0.15;
    return { commission, cess, gct, total: commission + cess + gct };
  }

  // Execution price with spread + market impact. Big orders in thin stocks
  // move the price against you — a lesson in itself.
  quote(sym, qty, side) {
    const st = this.stocks[sym];
    const halfSpread = 0.002 + 0.02 * (1 - st.liquidity);       // 0.2% - 2.2%
    const avgDaily = Math.max(1000, st.sharesOut * 1e6 * 0.0006 * st.liquidity);
    const participation = qty / avgDaily;
    const impact = 0.08 * Math.sqrt(Math.max(0, participation)); // square-root impact law
    const slip = halfSpread + impact;
    const px = side === 'buy' ? st.price * (1 + slip) : st.price * Math.max(0.05, 1 - slip);
    return { price: round2(px), slippagePct: slip * 100, halted: st.halted };
  }

  // market snapshot helpers
  gainers() {
    return Object.values(this.stocks)
      .map(s => ({ sym: s.sym, chg: (s.price - s.prevClose) / s.prevClose }))
      .sort((a, b) => b.chg - a.chg);
  }
  totalMarketCap() {
    return Object.values(this.stocks).reduce((t, s) => t + s.price * s.sharesOut * 1e6, 0);
  }

  // ---- serialisation for save games ------------------------------------
  toJSON() {
    return {
      seed: this.seed, date: this.date.getTime(), dayCount: this.dayCount,
      macro: this.macro, regime: this.regime, regimeDays: this.regimeDays,
      mktVol: this.mktVol, volBoost: this.volBoost, volBoostDecay: this.volBoostDecay,
      stocks: Object.fromEntries(Object.entries(this.stocks).map(([k, s]) => [k, {
        price: s.price, prevClose: s.prevClose, dayVolume: s.dayVolume, halted: s.halted,
        history: s.history.slice(-780), totalDivPaid: s.totalDivPaid,
      }])),
      indices: Object.fromEntries(Object.entries(this.indices).map(([k, ix]) => [k, { value: ix.value, history: ix.history.slice(-780) }])),
      newsLog: this.newsLog.slice(0, 40), eventCounter: this.eventCounter,
      usedHurricaneNames: this.usedHurricaneNames,
    };
  }
  static fromJSON(data) {
    const sim = Object.create(MarketSim.prototype);
    sim.rng = makeRng((data.seed ^ data.dayCount) >>> 0);   // re-derive stream
    sim.gauss = makeGauss(sim.rng);
    sim.seed = data.seed;
    sim.date = new Date(data.date); sim.dayCount = data.dayCount;
    sim.macro = data.macro; sim.macroAnchor = { ...JSE_DATA.macroAnchor, global: 0 };
    sim.regime = data.regime; sim.regimeDays = data.regimeDays;
    sim.mktVol = data.mktVol; sim.volBoost = data.volBoost; sim.volBoostDecay = data.volBoostDecay;
    sim.pendingMarketShock = 0; sim.pendingSectorShocks = {};
    sim.newsLog = data.newsLog || []; sim.eventCounter = data.eventCounter || 0;
    sim.activeWeather = null; sim.weatherDays = 0;
    sim.usedHurricaneNames = data.usedHurricaneNames || 0;
    sim.warmingUp = false;
    sim.stocks = {};
    for (const co of JSE_DATA.companies) {
      const saved = data.stocks[co.sym] || {};
      sim.stocks[co.sym] = {
        ...co,
        price: saved.price ?? co.price, prevClose: saved.prevClose ?? co.price,
        dayOpen: saved.price ?? co.price, dayHigh: saved.price ?? co.price, dayLow: saved.price ?? co.price,
        dayVolume: saved.dayVolume ?? 0, halted: !!saved.halted,
        history: saved.history || [], pendingShocks: 0,
        divPerShare: (saved.price ?? co.price) * co.divYield / 4,
        totalDivPaid: saved.totalDivPaid || 0,
      };
    }
    sim.indices = {};
    for (const k of ['combined', 'main', 'junior']) {
      const saved = (data.indices || {})[k] || {};
      sim.indices[k] = {
        name: k === 'combined' ? 'JSE Combined Index' : k === 'main' ? 'JSE Main Index' : 'Junior Market Index',
        value: saved.value ?? JSE_DATA.indices[k], history: saved.history || [],
      };
    }
    sim.dividendsToday = [];
    return sim;
  }
}

function round2(x) { return Math.round(x * 100) / 100; }

// =========================================================================
// Technical analysis — the time-series toolkit shown on the charts
// =========================================================================
const TA = {
  sma(closes, n) {
    const out = new Array(closes.length).fill(null);
    let sum = 0;
    for (let i = 0; i < closes.length; i++) {
      sum += closes[i];
      if (i >= n) sum -= closes[i - n];
      if (i >= n - 1) out[i] = sum / n;
    }
    return out;
  },
  ema(closes, n) {
    const out = new Array(closes.length).fill(null);
    const k = 2 / (n + 1);
    let prev = null;
    for (let i = 0; i < closes.length; i++) {
      prev = prev === null ? closes[i] : closes[i] * k + prev * (1 - k);
      if (i >= n - 1) out[i] = prev;
    }
    return out;
  },
  rsi(closes, n = 14) {
    const out = new Array(closes.length).fill(null);
    let gain = 0, loss = 0;
    for (let i = 1; i < closes.length; i++) {
      const d = closes[i] - closes[i - 1];
      const up = Math.max(0, d), dn = Math.max(0, -d);
      if (i <= n) { gain += up / n; loss += dn / n; }
      else { gain = (gain * (n - 1) + up) / n; loss = (loss * (n - 1) + dn) / n; }
      if (i >= n) out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
    }
    return out;
  },
  bollinger(closes, n = 20, mult = 2) {
    const mid = TA.sma(closes, n);
    const up = new Array(closes.length).fill(null), lo = new Array(closes.length).fill(null);
    for (let i = n - 1; i < closes.length; i++) {
      let s = 0;
      for (let j = i - n + 1; j <= i; j++) s += (closes[j] - mid[i]) ** 2;
      const sd = Math.sqrt(s / n);
      up[i] = mid[i] + mult * sd; lo[i] = mid[i] - mult * sd;
    }
    return { mid, up, lo };
  },
};
