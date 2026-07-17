# Harbour Street — The JSE Stock Market Game

A voxel 3D stock market simulation of the **Jamaica Stock Exchange**, named after the JSE's real
address: 40 Harbour Street, Kingston. Built for The Genius Project as an edutainment game: players
open an account, get J$1,000,000 in virtual cash, and grow it by trading real JSE-listed companies
in a simulated market that runs months in minutes.

**Everything on day one is real.** 49 actual JSE companies (NCB Financial, GraceKennedy, Wisynco,
Supreme Ventures, Fontana, EduFocal and more) seeded with real mid-2026 prices, market caps and
index levels (JSE Combined ~367,345). Real trading rules too: the 15% circuit breaker with a
one-hour halt, T+1 settlement, ~2% broker commission plus JSE cess plus GCT on fees, 15% dividend
withholding, and no capital gains tax. From day two onward the simulation writes its own history.

## How the market is simulated

- **Factor model.** Each stock's daily return = market factor + sector factor + company-specific
  noise + news jumps + seasonal drift, scaled by its beta and volatility.
- **Economic engine.** BOJ policy rate, inflation (vs the 4-6% target band), the JMD/USD rate,
  GDP growth and global sentiment evolve as mean-reverting AR(1) processes and drive the market's
  drift. Rate decisions arrive on an MPC-style calendar.
- **Regimes and volatility clustering.** A Markov chain switches the market between calm, boom and
  bust; volatility follows an EWMA process, so storms cluster the way they do in real markets.
- **Seasonality.** Tourist high season (Dec-Apr), hurricane season (Jun-Nov), Christmas retail,
  the January small-cap effect.
- **JSE microstructure.** Thin trading (illiquid names skip days), bid/ask spread, square-root
  price impact for large orders, volume that swells on big moves.
- **News that moves prices.** Quarterly earnings (beats and misses), BOJ decisions, tourism and
  remittance reports, company events — plus worst-case scenarios: hurricanes (seasonal hazard,
  Beryl/Melissa-scale direct hits), global crashes, currency slides, and rare pandemics. Every
  story carries a one-line lesson.
- **Time series toolkit.** Candlestick charts with SMA 20/50, Bollinger bands, RSI(14) and volume.

## The voxel city

Every company is a tower in a voxel Kingston: height follows market cap, sector sets the colour and
district, and the rooftop beacon glows green or red with the day's move (flashing amber = circuit
breaker halt). The JSE building sits on the waterfront, the Blue Mountains behind, palms on the
beach. Weather follows the simulation — hurricanes darken the sky, whip the palms and shake the
camera. Drag to orbit, scroll to zoom, right-drag to pan, click a tower to trade.

## Files

| File | What it is |
|---|---|
| `index.html` | UI shell: login, HUD, dashboards, windows, ticker |
| `js/data.js` | Real JSE companies, sectors, index levels, macro snapshot |
| `js/engine.js` | Market simulation engine + technical analysis toolkit |
| `js/news.js` | News event generator (earnings, BOJ, hurricanes, crashes) |
| `js/voxel.js` | Three.js voxel Kingston scene |
| `js/charts.js` | Canvas candlestick/line chart renderer |
| `js/game.js` | Accounts, portfolio, trading, time controls, learn content |
| `js/three.min.js` | Three.js r160 (vendored) |

No build step. Serve the folder statically (`python3 -m http.server`) or deploy it to Netlify with
this folder as the base directory. Accounts and portfolios save to the browser's localStorage.

## Educational disclaimer

A learning simulation, not financial advice. Real company names and real day-one prices are used so
students recognise the market they live in, but simulated price paths cannot predict real returns.
