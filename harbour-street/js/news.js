/* =========================================================================
   Harbour Street — news engine
   Generates market-moving headlines: scheduled (earnings, rate decisions,
   tourism reports) and random (hurricanes, global shocks, company events).
   Every event carries factor shocks the simulation engine applies.
   ========================================================================= */

'use strict';

const NEWS = (() => {

  // ---- utility -----------------------------------------------------------
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function fmtPct(x) { return (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + '%'; }

  /* An event object:
     {
       id, day, headline, body, kind,          // display
       severity: 'info'|'good'|'bad'|'severe', // ticker colour
       marketShock,                            // one-off market factor jump (log return)
       sectorShocks: { sector: shock },        // per-sector jumps
       stockShocks: { SYM: shock },            // per-stock jumps
       volBoost,                               // multiplies market vol for `decay` days
       decay,                                  // days the vol boost lingers
       macro: { policyRate, inflation, usdJmd, gdpGrowth }, // deltas to macro state
       lesson                                  // one-line "why this matters" for students
     }
  */

  // ---- scheduled: quarterly earnings ------------------------------------
  function earningsEvent(rng, co, beatProb) {
    const beat = rng() < beatProb;
    const surprise = (beat ? 1 : -1) * (0.02 + rng() * 0.10);
    const growth = Math.round((beat ? 5 + rng() * 30 : -(3 + rng() * 22)));
    const headlines = beat ? [
      `${co.name} profits jump ${growth}% — beats analyst forecasts`,
      `${co.name} posts strong quarter, earnings up ${growth}%`,
      `Record quarter: ${co.name} earnings climb ${growth}%`,
    ] : [
      `${co.name} misses forecasts as profits slip ${Math.abs(growth)}%`,
      `${co.name} reports weak quarter, earnings down ${Math.abs(growth)}%`,
      `Rising costs squeeze ${co.name} — profits fall ${Math.abs(growth)}%`,
    ];
    return {
      kind: 'earnings',
      severity: beat ? 'good' : 'bad',
      headline: pick(rng, headlines),
      body: `${co.name} (${co.sym}) filed quarterly results with the Jamaica Stock Exchange. ` +
            (beat ? `Net profit rose about ${growth}% year over year, ahead of what the market expected.`
                  : `Net profit fell about ${Math.abs(growth)}%, below what the market expected.`),
      stockShocks: { [co.sym]: surprise },
      volBoost: 1.2, decay: 3,
      lesson: 'Prices move on the gap between results and expectations, not on the results alone.',
    };
  }

  // ---- scheduled: BOJ rate decision -------------------------------------
  function rateDecision(rng, macro) {
    const r = rng();
    let move = 0;
    // BOJ reacts to inflation vs its 4-6% target band
    if (macro.inflation > 0.065) move = r < 0.7 ? 0.005 : 0.0025;
    else if (macro.inflation < 0.04) move = r < 0.6 ? -0.0025 : 0;
    else move = r < 0.7 ? 0 : (r < 0.85 ? -0.0025 : 0.0025);
    const newRate = Math.max(0.005, macro.policyRate + move);
    const dir = move > 0 ? 'raises' : move < 0 ? 'cuts' : 'holds';
    const sev = move > 0 ? 'bad' : move < 0 ? 'good' : 'info';
    return {
      kind: 'rates',
      severity: sev,
      headline: `Bank of Jamaica ${dir} policy rate ${move !== 0 ? 'to ' + (newRate * 100).toFixed(2) + '%' : 'at ' + (newRate * 100).toFixed(2) + '%'}`,
      body: `The BOJ Monetary Policy Committee ${dir === 'holds' ? 'kept' : dir === 'raises' ? 'lifted' : 'lowered'} its overnight rate. ` +
            `Inflation is running near ${(macro.inflation * 100).toFixed(1)}% against the 4-6% target band. ` +
            (move > 0 ? 'Higher rates make loans dearer and savings sweeter, which usually cools stock prices.'
             : move < 0 ? 'Cheaper money tends to push investors from savings accounts into stocks.'
             : 'No change: markets drift on the guidance instead.'),
      marketShock: -move * 4,                     // 50bp hike ≈ -2% market move
      sectorShocks: move !== 0 ? { finance: -move * 2, realestate: -move * 6 } : {},
      macro: { policyRate: move },
      volBoost: 1.15, decay: 2,
      lesson: 'Interest rates are gravity for stock prices: when rates rise, valuations feel the pull.',
    };
  }

  // ---- scheduled: tourism report (seasonal) ------------------------------
  function tourismReport(rng, month) {
    const highSeason = (month <= 3 || month === 11);   // Dec-Apr winter season
    const strong = rng() < (highSeason ? 0.65 : 0.45);
    const n = Math.round(3 + rng() * 12);
    return {
      kind: 'tourism',
      severity: strong ? 'good' : 'bad',
      headline: strong ? `Tourist arrivals up ${n}% — hotels running near capacity`
                       : `Tourism slows: arrivals down ${n}% on soft demand`,
      body: strong ? `The Jamaica Tourist Board reports arrivals rose about ${n}% year over year. Strong visitor spending lifts hotels, attractions, food producers and the wider economy.`
                   : `Arrivals slipped about ${n}%. Tourism earns Jamaica a large share of its foreign exchange, so weak numbers ripple through the market.`,
      sectorShocks: { tourism: (strong ? 1 : -1) * (0.015 + rng() * 0.03), manufacturing: (strong ? 1 : -1) * 0.006 },
      macro: { gdpGrowth: (strong ? 1 : -1) * 0.001, usdJmd: (strong ? -1 : 1) * 0.4 },
      lesson: 'Tourism is one of Jamaica\'s biggest foreign-exchange earners — its health moves many stocks at once.',
    };
  }

  // ---- scheduled: remittances -------------------------------------------
  function remittanceReport(rng) {
    const strong = rng() < 0.55;
    const n = Math.round(2 + rng() * 8);
    return {
      kind: 'macro',
      severity: strong ? 'good' : 'bad',
      headline: strong ? `Remittances climb ${n}% as diaspora sends more home`
                       : `Remittance inflows dip ${n}%`,
      body: `Money sent home by Jamaicans abroad ${strong ? 'rose' : 'fell'} about ${n}%. Remittances are roughly a sixth of Jamaica's economy — they fund spending in shops, banks and phone credit.`,
      sectorShocks: { finance: (strong ? 1 : -1) * 0.008, retail: (strong ? 1 : -1) * 0.012 },
      macro: { usdJmd: (strong ? -1 : 1) * 0.5, gdpGrowth: (strong ? 1 : -1) * 0.0005 },
      lesson: 'Remittances (money sent home from abroad) are a quiet engine of the Jamaican economy.',
    };
  }

  // ---- random company news ----------------------------------------------
  const GOOD_CO = [
    { h: (c) => `${c.name} lands major new contract`, s: () => 0.03 + 0.05 * Math.random(), l: 'New business means future earnings — the market prices it in today.' },
    { h: (c) => `${c.name} announces expansion into the Eastern Caribbean`, s: () => 0.02 + 0.06 * Math.random(), l: 'Growth plans raise expected future profits, lifting the price now.' },
    { h: (c) => `${c.name} declares special dividend`, s: () => 0.02 + 0.04 * Math.random(), l: 'Dividends are cash returned to shareholders — a signal of confidence.' },
    { h: (c) => `Takeover talk: overseas investor eyes stake in ${c.name}`, s: () => 0.05 + 0.08 * Math.random(), l: 'Acquirers usually pay a premium over the market price, so rumours alone move stocks.' },
    { h: (c) => `${c.name} wins export approval for US market`, s: () => 0.03 + 0.05 * Math.random(), l: 'Bigger markets mean bigger potential sales.' },
  ];
  const BAD_CO = [
    { h: (c) => `${c.name} warns profits will miss targets`, s: () => -(0.04 + 0.07 * Math.random()), l: 'A profit warning resets expectations downward — prices follow fast.' },
    { h: (c) => `Fire disrupts operations at ${c.name} facility`, s: () => -(0.03 + 0.06 * Math.random()), l: 'One-off disasters hit the stock, but markets judge how permanent the damage is.' },
    { h: (c) => `${c.name} CEO resigns unexpectedly`, s: () => -(0.02 + 0.05 * Math.random()), l: 'Markets hate uncertainty, and sudden leadership changes create it.' },
    { h: (c) => `Regulator queries ${c.name} filings`, s: () => -(0.03 + 0.08 * Math.random()), l: 'Trust is an asset. Governance questions make investors demand a discount.' },
    { h: (c) => `Supply chain trouble raises costs at ${c.name}`, s: () => -(0.02 + 0.04 * Math.random()), l: 'Higher input costs shrink profit margins unless prices can rise too.' },
  ];

  function companyNews(rng, co) {
    const good = rng() < 0.5;
    const t = pick(rng, good ? GOOD_CO : BAD_CO);
    const shock = t.s();
    return {
      kind: 'company', severity: good ? 'good' : 'bad',
      headline: t.h(co),
      body: `${co.name} (${co.sym}), ${co.blurb} Analysts expect a move of roughly ${fmtPct(shock)} as the market digests the news.`,
      stockShocks: { [co.sym]: shock },
      lesson: t.l,
    };
  }

  // ---- worst-case scenarios ---------------------------------------------
  function hurricane(rng, name) {
    const major = rng() < 0.4;         // category 4-5 direct hit vs brush
    return {
      kind: 'disaster', severity: 'severe',
      headline: major ? `HURRICANE ${name.toUpperCase()} MAKES DIRECT HIT — island-wide damage reported`
                      : `Hurricane ${name} brushes the coast: flooding and outages`,
      body: major
        ? `A powerful hurricane has struck Jamaica. Hotels, crops, power lines and roads are damaged. Insurers face heavy claims, tourism bookings collapse, and rebuilding will strain the budget. History lesson: Hurricane Gilbert (1988) and Hurricane Beryl (2024) both dealt billions in damage.`
        : `The storm passed close enough to cause flooding and wind damage. Markets fear the cost but relief rallies often follow a near miss.`,
      marketShock: major ? -(0.06 + rng() * 0.08) : -(0.015 + rng() * 0.03),
      sectorShocks: major
        ? { tourism: -(0.08 + rng() * 0.10), insurance: -(0.07 + rng() * 0.09), agriculture: -(0.08 + rng() * 0.10), manufacturing: -(0.03 + rng() * 0.04), conglomerate: -0.03 }
        : { tourism: -(0.03 + rng() * 0.03), insurance: -(0.02 + rng() * 0.04), agriculture: -(0.03 + rng() * 0.04) },
      macro: major ? { gdpGrowth: -0.012, inflation: 0.008, usdJmd: 2.5 } : { gdpGrowth: -0.003, inflation: 0.002, usdJmd: 0.8 },
      volBoost: major ? 2.2 : 1.5, decay: major ? 15 : 6,
      weather: major ? 'hurricane' : 'storm',
      lesson: 'Hurricane risk is priced into Caribbean markets every season — diversification is your umbrella.',
    };
  }

  function globalCrash(rng) {
    const t = pick(rng, [
      { h: 'GLOBAL MARKETS PLUNGE: Wall Street suffers worst day in years', b: 'A panic on overseas markets is dragging down stock exchanges worldwide. Foreign investors pull money from smaller markets first — but the JSE\'s low correlation with world markets softens the blow. In 2008 the JSE fell far less than Wall Street.' },
      { h: 'US recession fears slam markets worldwide', b: 'Weak data from Jamaica\'s biggest trading partner spooks investors. Fewer US tourists and thinner remittances would hit the island\'s economy directly.' },
      { h: 'Oil price shock rattles global markets', b: 'Energy prices spiked overnight. Jamaica imports nearly all its fuel, so costly oil feeds straight into electricity bills, transport and inflation.' },
    ]);
    return {
      kind: 'global', severity: 'severe',
      headline: t.h, body: t.b,
      marketShock: -(0.04 + rng() * 0.07),
      sectorShocks: { finance: -(0.02 + rng() * 0.04), energy: 0.01 + rng() * 0.03 },
      macro: { gdpGrowth: -0.006, inflation: 0.006, usdJmd: 1.8 },
      volBoost: 1.9, decay: 12,
      lesson: 'When the world sneezes, small open economies catch cold — through tourism, trade and remittances.',
    };
  }

  function currencyCrisis(rng) {
    return {
      kind: 'currency', severity: 'severe',
      headline: 'Jamaican dollar slides sharply against the US dollar',
      body: 'The JMD is weakening fast. Importers pay more for goods, inflation climbs, and the BOJ may need to raise rates or sell reserves. Exporters and tourism earners, paid in US dollars, actually benefit.',
      marketShock: -(0.02 + rng() * 0.04),
      sectorShocks: { manufacturing: -(0.02 + rng() * 0.03), retail: -(0.02 + rng() * 0.03), tourism: 0.01 + rng() * 0.02, mining: 0.01 + rng() * 0.02 },
      macro: { usdJmd: 4 + rng() * 5, inflation: 0.012, policyRate: 0.005 },
      volBoost: 1.7, decay: 10,
      lesson: 'A weaker JMD is bad for importers, good for exporters. Every currency move creates winners and losers.',
    };
  }

  function pandemic(rng) {
    return {
      kind: 'pandemic', severity: 'severe',
      headline: 'HEALTH EMERGENCY: borders tighten as new outbreak spreads',
      body: 'A fast-spreading outbreak is closing borders and grounding flights. Tourism stops almost overnight — the worst case for an island economy. In 2020, COVID-19 cut Jamaica\'s GDP by about 10% and the JSE index fell over 20%.',
      marketShock: -(0.08 + rng() * 0.10),
      sectorShocks: { tourism: -(0.15 + rng() * 0.15), finance: -(0.04 + rng() * 0.05), retail: -(0.04 + rng() * 0.06), communication: 0.02 + rng() * 0.04 },
      macro: { gdpGrowth: -0.02, usdJmd: 3, policyRate: -0.005 },
      volBoost: 2.5, decay: 25,
      lesson: 'True black swans hit everything at once. Cash reserves and patience are what survive them.',
    };
  }

  const HURRICANE_NAMES = ['Alma', 'Bertram', 'Cassia', 'Delroy', 'Esther', 'Fitzroy', 'Gwen', 'Horace', 'Imani', 'Josiah', 'Kadene', 'Lennox', 'Mavis', 'Nigel', 'Ophelia'];

  // ---- flavour headlines (no market impact, keeps ticker alive) ----------
  const FLAVOUR = [
    'JSE hosts investor education week for high school students',
    'Junior Market marks another year of tax-incentive listings',
    'Analysts debate whether the market is cheap or fairly priced',
    'BOJ reports Net International Reserves remain healthy',
    'Kingston tech startups eye future JSE listings',
    'JSE\'s online trading platform sees record new accounts',
    'Financial literacy drive reaches 10,000 students island-wide',
    'Diaspora conference explores investing back home',
  ];

  function flavour(rng) {
    return { kind: 'flavour', severity: 'info', headline: pick(rng, FLAVOUR), body: 'Background market chatter. Not everything in the news moves prices — learning to tell signal from noise is half of investing.', lesson: 'Most news is noise. Prices move on surprises, not on chatter.' };
  }

  return { earningsEvent, rateDecision, tourismReport, remittanceReport, companyNews, hurricane, globalCrash, currencyCrisis, pandemic, flavour, HURRICANE_NAMES };
})();
