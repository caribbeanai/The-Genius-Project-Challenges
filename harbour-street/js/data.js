/* =========================================================================
   Harbour Street — market data
   Real Jamaica Stock Exchange listed companies, seeded with real prices,
   market caps, index levels and macro data as of mid-2026. Prices move
   daily in real life, so treat these as the game's "day zero" snapshot.

   sharesOut is in millions. divYield is annual. vol is annualised
   volatility of the company-specific noise. liquidity 0-1 drives how often
   the stock trades and how badly big orders move the price.
   ========================================================================= */

'use strict';

const JSE_DATA = {

  meta: {
    exchange: 'Jamaica Stock Exchange',
    address: '40 Harbour Street, Kingston',
    founded: 1968,
    firstTradingDay: 1969,
    platform: 'Nasdaq Matching Engine (since 2019), traded through JTrader',
    depository: 'Jamaica Central Securities Depository (JCSD)',
    hours: 'Monday to Friday, 9:00 a.m. - 2:00 p.m.',
    settlement: 'T+1 (trade date plus one business day)',
    circuitBreaker: 'A stock that moves 15% from its previous close is halted for one hour, then re-opens with a new price band.',
    juniorMarket: 'Launched 2009 for small and medium companies. Listing brings a 10-year corporate tax incentive.',
    bestYears: 'Bloomberg ranked the JSE the world\'s best-performing stock market in 2015 and again in 2018.',
  },

  sectors: {
    finance:       { name: 'Banking & Finance',   color: 0x2563EB, blurb: 'Banks, brokers and investment houses. Sensitive to interest rates.' },
    insurance:     { name: 'Insurance',           color: 0x4FB5E6, blurb: 'Insurers collect premiums and pay claims. Hurricanes are their nightmare.' },
    conglomerate:  { name: 'Conglomerates',       color: 0x1FC8C8, blurb: 'Groups that own many businesses at once. Steadier, spread-out risk.' },
    manufacturing: { name: 'Manufacturing & Food',color: 0xF5A623, blurb: 'Factories and food makers. Watch input costs and the FX rate.' },
    agriculture:   { name: 'Agriculture',         color: 0x7BC950, blurb: 'Farming and food production. Weather is everything.' },
    energy:        { name: 'Energy',              color: 0xFFD93D, blurb: 'Fuel and power. Jamaica imports most of its energy.' },
    infrastructure:{ name: 'Ports & Infrastructure', color: 0x8B9DC3, blurb: 'Wharves, toll roads. Steady tolls and fees, come rain or shine.' },
    tourism:       { name: 'Tourism & Attractions', color: 0xEE5A52, blurb: 'Visitors mean revenue. High season is December to April.' },
    retail:        { name: 'Retail & Distribution', color: 0xE884C0, blurb: 'Shops and distributors. Christmas is the big quarter.' },
    realestate:    { name: 'Real Estate',         color: 0xB68973, blurb: 'Property owners and REITs. Rate hikes bite hard here.' },
    communication: { name: 'Media',               color: 0x9B72CF, blurb: 'Broadcast and media houses. Advertising follows the economy.' },
    entertainment: { name: 'Gaming & Entertainment', color: 0xFF8C69, blurb: 'Lotteries, cinemas, events. Spare-cash businesses.' },
    health:        { name: 'Healthcare',          color: 0x5FD3BC, blurb: 'Pharmacies, labs and imaging. Defensive: people need care in any economy.' },
    tech:          { name: 'Technology & Education', color: 0x6C8CFF, blurb: 'Young digital companies on the Junior Market. High risk, high dream.' },
  },

  // price = JMD unless noted. sharesOut in millions. Real tickers.
  companies: [
    // --- Banking & Finance ---
    { sym: 'NCBFG',   name: 'NCB Financial Group',      sector: 'finance', market: 'main',   price: 71.90,  sharesOut: 2419,  beta: 1.25, vol: 0.34, divYield: 0.020, liquidity: 0.95, blurb: 'parent of National Commercial Bank, one of Jamaica\'s biggest companies.' },
    { sym: 'SGJ',     name: 'Scotia Group Jamaica',     sector: 'finance', market: 'main',   price: 58.00,  sharesOut: 3112,  beta: 1.05, vol: 0.24, divYield: 0.031, liquidity: 0.90, blurb: 'the Jamaican arm of Scotiabank, a steady dividend payer.' },
    { sym: 'JMMBGL',  name: 'JMMB Group',               sector: 'finance', market: 'main',   price: 15.35,  sharesOut: 1948,  beta: 1.15, vol: 0.28, divYield: 0.025, liquidity: 0.80, blurb: 'a money-market broker that grew into a regional financial group.' },
    { sym: 'BIL',     name: 'Barita Investments',       sector: 'finance', market: 'main',   price: 68.45,  sharesOut: 1201,  beta: 1.20, vol: 0.32, divYield: 0.040, liquidity: 0.70, blurb: 'an investment house known for bold expansion and fat dividends.' },
    { sym: 'PROVEN',  name: 'PROVEN Group',             sector: 'finance', market: 'main',   price: 10.30,  sharesOut: 806,   beta: 1.10, vol: 0.30, divYield: 0.035, liquidity: 0.55, blurb: 'a private-equity style investor in banks and businesses across the region.' },
    { sym: 'EPLY',    name: 'Eppley Limited',           sector: 'finance', market: 'main',   price: 32.99,  sharesOut: 194,   beta: 0.85, vol: 0.28, divYield: 0.030, liquidity: 0.35, blurb: 'a small specialist lender and asset manager.' },
    { sym: 'JSE',     name: 'Jamaica Stock Exchange',   sector: 'finance', market: 'main',   price: 9.04,   sharesOut: 697,   beta: 1.00, vol: 0.30, divYield: 0.025, liquidity: 0.60, blurb: 'yes — the exchange itself is listed on itself. It earns fees on every trade.' },
    { sym: 'AFS',     name: 'Access Financial Services',sector: 'finance', market: 'junior', price: 17.49,  sharesOut: 274,   beta: 0.90, vol: 0.35, divYield: 0.030, liquidity: 0.30, blurb: 'a microlender and the very first Junior Market listing in 2009.' },
    { sym: 'DOLLA',   name: 'Dolla Financial Services', sector: 'finance', market: 'junior', price: 2.99,   sharesOut: 2508,  beta: 1.00, vol: 0.45, divYield: 0.015, liquidity: 0.45, blurb: 'a fast-growing microloan company for small businesses.' },

    // --- Insurance ---
    { sym: 'GHL',     name: 'Guardian Holdings',        sector: 'insurance', market: 'main', price: 352.99, sharesOut: 252,   beta: 0.95, vol: 0.26, divYield: 0.035, liquidity: 0.45, blurb: 'a regional insurance giant and the highest-priced stock on the JSE.' },
    { sym: 'SJ',      name: 'Sagicor Group Jamaica',    sector: 'insurance', market: 'main', price: 38.65,  sharesOut: 3899,  beta: 1.05, vol: 0.25, divYield: 0.035, liquidity: 0.85, blurb: 'insurance, banking and investments under one roof.' },
    { sym: 'GENAC',   name: 'General Accident Insurance', sector: 'insurance', market: 'main', price: 8.60, sharesOut: 1035,  beta: 0.90, vol: 0.30, divYield: 0.040, liquidity: 0.40, blurb: 'motor and property insurance across three islands.' },

    // --- Conglomerates ---
    { sym: 'GK',      name: 'GraceKennedy',             sector: 'conglomerate', market: 'main', price: 76.00, sharesOut: 987,  beta: 0.90, vol: 0.22, divYield: 0.025, liquidity: 0.85, blurb: 'foods and finance, from Grace products to remittance services, since 1922.' },
    { sym: 'PJAM',    name: 'Pan Jamaica Group',        sector: 'conglomerate', market: 'main', price: 45.50, sharesOut: 1629, beta: 0.95, vol: 0.24, divYield: 0.030, liquidity: 0.65, blurb: 'property, infrastructure and food interests across the island.' },
    { sym: 'MASSY',   name: 'Massy Holdings',           sector: 'conglomerate', market: 'main', price: 75.00, sharesOut: 2263, beta: 0.85, vol: 0.22, divYield: 0.035, liquidity: 0.60, blurb: 'a Trinidad-based conglomerate cross-listed in Kingston.' },

    // --- Manufacturing & Food ---
    { sym: 'WISYNCO', name: 'Wisynco Group',            sector: 'manufacturing', market: 'main', price: 20.50, sharesOut: 3634, beta: 0.90, vol: 0.24, divYield: 0.030, liquidity: 0.85, blurb: 'maker of Wata, Bigga and Boom — drinks in every corner shop.' },
    { sym: 'SEP',     name: 'Seprod',                   sector: 'manufacturing', market: 'main', price: 74.50, sharesOut: 911,  beta: 0.85, vol: 0.24, divYield: 0.025, liquidity: 0.60, blurb: 'milk, cooking oil, flour and grains — the pantry of Jamaica.' },
    { sym: 'CAR',     name: 'Carreras',                 sector: 'manufacturing', market: 'main', price: 22.00, sharesOut: 4854, beta: 0.60, vol: 0.22, divYield: 0.080, liquidity: 0.75, blurb: 'the tobacco distributor famous for paying out nearly all profits as dividends.' },
    { sym: 'CCC',     name: 'Caribbean Cement',         sector: 'manufacturing', market: 'main', price: 106.75, sharesOut: 851, beta: 1.05, vol: 0.30, divYield: 0.020, liquidity: 0.55, blurb: 'the island\'s cement maker. Construction booms are its best friend.' },
    { sym: 'LASM',    name: 'Lasco Manufacturing',      sector: 'manufacturing', market: 'junior', price: 7.02, sharesOut: 4145, beta: 0.75, vol: 0.28, divYield: 0.020, liquidity: 0.55, blurb: 'maker of Lasco food and drink powders found in every Jamaican kitchen.' },
    { sym: 'HONBUN',  name: 'Honey Bun',                sector: 'manufacturing', market: 'junior', price: 5.56, sharesOut: 468, beta: 0.70, vol: 0.35, divYield: 0.020, liquidity: 0.35, blurb: 'the bakery behind the Buccaneer bun and school-lunch snacks.' },
    { sym: 'JAMT',    name: 'Jamaican Teas',            sector: 'manufacturing', market: 'junior', price: 2.15, sharesOut: 2186, beta: 0.75, vol: 0.38, divYield: 0.015, liquidity: 0.35, blurb: 'exporter of teas and instant porridge to the diaspora.' },
    { sym: 'KREMI',   name: 'Caribbean Cream (Kremi)',  sector: 'manufacturing', market: 'junior', price: 1.89, sharesOut: 381, beta: 0.70, vol: 0.45, divYield: 0.010, liquidity: 0.25, blurb: 'the Kremi ice cream company. Small stock, sweet product.' },
    { sym: 'FOSRICH', name: 'FosRich Company',          sector: 'manufacturing', market: 'junior', price: 1.42, sharesOut: 5282, beta: 0.95, vol: 0.42, divYield: 0.010, liquidity: 0.50, blurb: 'lighting, cables and electrical goods, plus a pipe factory.' },

    // --- Agriculture ---
    { sym: 'JBG',     name: 'Jamaica Broilers Group',   sector: 'agriculture', market: 'main', price: 13.80, sharesOut: 1000, beta: 0.85, vol: 0.38, divYield: 0.020, liquidity: 0.65, blurb: 'the Best Dressed Chicken company — poultry and feeds.' },
    { sym: 'JP',      name: 'Jamaica Producers Group',  sector: 'agriculture', market: 'main', price: 22.41, sharesOut: 1044, beta: 0.80, vol: 0.26, divYield: 0.020, liquidity: 0.45, blurb: 'bananas, juices and port logistics, farming since 1929.' },

    // --- Energy ---
    { sym: 'WIG',     name: 'Wigton Energy',            sector: 'energy', market: 'main',   price: 1.17,  sharesOut: 10513, beta: 0.80, vol: 0.32, divYield: 0.040, liquidity: 0.75, blurb: 'the Caribbean\'s largest wind farm, in the Manchester hills.' },
    { sym: 'FESCO',   name: 'Future Energy Source',     sector: 'energy', market: 'junior', price: 3.40,  sharesOut: 2500,  beta: 0.90, vol: 0.40, divYield: 0.010, liquidity: 0.55, blurb: 'a Jamaican-owned petrol station chain growing fast.' },

    // --- Ports & Infrastructure ---
    { sym: 'KW',      name: 'Kingston Wharves',         sector: 'infrastructure', market: 'main', price: 35.25, sharesOut: 1390, beta: 0.75, vol: 0.22, divYield: 0.025, liquidity: 0.55, blurb: 'the multipurpose port terminal on Kingston Harbour.' },
    { sym: 'TJH',     name: 'TransJamaican Highway',    sector: 'infrastructure', market: 'main', price: 9.20, sharesOut: 12500, beta: 0.70, vol: 0.20, divYield: 0.045, liquidity: 0.90, blurb: 'operator of Highway 2000. Every toll is revenue.' },

    // --- Tourism & Attractions ---
    { sym: 'DCOVE',   name: 'Dolphin Cove',             sector: 'tourism', market: 'main',   price: 14.50, sharesOut: 393,  beta: 1.10, vol: 0.35, divYield: 0.040, liquidity: 0.35, blurb: 'swim-with-dolphins attractions earning US dollars from cruise visitors.' },
    { sym: 'MTL',     name: 'Margaritaville (Turks)',   sector: 'tourism', market: 'main',   price: 11.00, sharesOut: 58,   beta: 1.15, vol: 0.45, divYield: 0.000, liquidity: 0.15, blurb: 'the Margaritaville bar at the Turks & Caicos cruise port.' },
    { sym: 'KEX',     name: 'Knutsford Express',        sector: 'tourism', market: 'junior', price: 6.48,  sharesOut: 494,  beta: 1.00, vol: 0.38, divYield: 0.015, liquidity: 0.45, blurb: 'the comfy coach service linking Kingston, MoBay and everywhere between.' },
    { sym: 'ECL',     name: 'Express Catering',         sector: 'tourism', market: 'junior', price: 2.37,  sharesOut: 1646, beta: 1.15, vol: 0.40, divYield: 0.020, liquidity: 0.45, blurb: 'runs the restaurants inside Sangster International Airport.' },

    // --- Retail & Distribution ---
    { sym: 'FTNA',    name: 'Fontana',                  sector: 'retail', market: 'junior', price: 6.50,  sharesOut: 1215, beta: 0.85, vol: 0.32, divYield: 0.015, liquidity: 0.60, blurb: 'the pharmacy chain with the famous Waterloo Road megastore.' },
    { sym: 'MAILPAC', name: 'Mailpac Group',            sector: 'retail', market: 'junior', price: 2.55,  sharesOut: 2510, beta: 0.90, vol: 0.38, divYield: 0.030, liquidity: 0.50, blurb: 'online shopping delivery from Miami to your door.' },
    { sym: 'LUMBER',  name: 'Lumber Depot',             sector: 'retail', market: 'junior', price: 2.68,  sharesOut: 709,  beta: 0.80, vol: 0.35, divYield: 0.025, liquidity: 0.40, blurb: 'a hardware yard in Papine serving builders big and small.' },
    { sym: 'TROPICAL',name: 'Tropical Battery',         sector: 'retail', market: 'junior', price: 1.40,  sharesOut: 1714, beta: 0.85, vol: 0.40, divYield: 0.015, liquidity: 0.45, blurb: 'car batteries and solar kits since 1950.' },

    // --- Real Estate ---
    { sym: 'KPREIT',  name: 'Kingston Properties',      sector: 'realestate', market: 'main', price: 9.90, sharesOut: 889,  beta: 0.80, vol: 0.28, divYield: 0.030, liquidity: 0.45, blurb: 'a property fund owning offices and warehouses across the region.' },
    { sym: 'SML',     name: 'Stanley Motta',            sector: 'realestate', market: 'main', price: 7.48, sharesOut: 762,  beta: 0.70, vol: 0.25, divYield: 0.035, liquidity: 0.30, blurb: 'landlord of 58HWT, the BPO campus in Half-Way-Tree.' },
    { sym: '138SL',   name: '138 Student Living',       sector: 'realestate', market: 'main', price: 3.00, sharesOut: 533,  beta: 0.65, vol: 0.30, divYield: 0.040, liquidity: 0.25, blurb: 'student housing at the UWI Mona campus.' },

    // --- Media ---
    { sym: 'RJR',     name: 'Radio Jamaica (RJRGLEANER)', sector: 'communication', market: 'main', price: 1.17, sharesOut: 2992, beta: 0.90, vol: 0.35, divYield: 0.010, liquidity: 0.50, blurb: 'TVJ, RJR 94FM and the Gleaner — the island\'s biggest newsroom.' },

    // --- Gaming & Entertainment ---
    { sym: 'SVL',     name: 'Supreme Ventures',         sector: 'entertainment', market: 'main', price: 18.30, sharesOut: 2629, beta: 0.85, vol: 0.26, divYield: 0.050, liquidity: 0.85, blurb: 'Cash Pot and sports betting. A steady cash machine.' },
    { sym: 'PAL',     name: 'Palace Amusement',         sector: 'entertainment', market: 'main', price: 0.40, sharesOut: 850,  beta: 1.00, vol: 0.45, divYield: 0.000, liquidity: 0.20, blurb: 'Carib 5 and Palace Cineplex — Jamaica\'s cinemas since 1921.' },

    // --- Healthcare ---
    { sym: 'INDIES',  name: 'Indies Pharma',            sector: 'health', market: 'junior', price: 2.74, sharesOut: 1350, beta: 0.70, vol: 0.32, divYield: 0.025, liquidity: 0.40, blurb: 'imports and distributes generic medicines.' },
    { sym: 'ELITE',   name: 'Elite Diagnostic',         sector: 'health', market: 'junior', price: 1.36, sharesOut: 353,  beta: 0.65, vol: 0.40, divYield: 0.000, liquidity: 0.25, blurb: 'X-ray, CT and MRI imaging centres.' },

    // --- Technology & Education ---
    { sym: 'ONE',     name: 'One on One Educational',   sector: 'tech', market: 'junior', price: 0.71, sharesOut: 1972, beta: 1.00, vol: 0.50, divYield: 0.000, liquidity: 0.35, blurb: 'e-learning platforms used by schools and firms across the region.' },
    { sym: '1GS',     name: 'One Great Studio',         sector: 'tech', market: 'junior', price: 0.22, sharesOut: 1682, beta: 1.00, vol: 0.55, divYield: 0.000, liquidity: 0.30, blurb: 'a Jamaican web and software studio that listed in 2023.' },
    { sym: 'LEARN',   name: 'EduFocal',                 sector: 'tech', market: 'junior', price: 0.19, sharesOut: 632,  beta: 1.05, vol: 0.60, divYield: 0.000, liquidity: 0.25, blurb: 'gamified exam-prep for PEP and CSEC students.' },
  ],

  // Real index levels, mid-July 2026
  indices: {
    combined: 367345.09,
    main: 361598.68,
    junior: 3010.19,
  },

  // Real macro snapshot, mid-2026
  macro: {
    policyRate: 0.055,     // BOJ overnight rate 5.50%
    inflation: 0.055,      // headline y/y, vs 4-6% BOJ target band
    usdJmd: 157.4,         // J$ per US$
    gdpGrowth: -0.010,     // 2026 forecast, still recovering from Hurricane Melissa (Oct 2025)
  },

  // long-run anchors the macro processes drift back toward
  macroAnchor: {
    policyRate: 0.055,
    inflation: 0.05,
    usdJmd: 157.4,
    gdpGrowth: 0.015,      // reconstruction rebound + trend growth
  },
};
