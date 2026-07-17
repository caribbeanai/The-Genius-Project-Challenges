# Data Dictionary, Week 4

*Caribbean AI - Adrian Dunkley*

This folder holds the Caribbean data the Week 4 neural networks learn from.
Everything here is a realistic **teaching dataset**. The numbers are believable
and the patterns are real, so the models learn genuine logic, but they are
**not** real records of any person, team, company, or country. Every file is
generated from a fixed random seed, so the numbers are the same every time you
load them.

---

## `caribbean_matches.csv` (Notebook 2)

1,600 past international football matches between Caribbean (CONCACAF) national
teams, one row per match.

| Column | What it means |
| --- | --- |
| `home_team` / `away_team` | The two Caribbean nations playing. |
| `home_rating` / `away_rating` | Team strength (higher is stronger). |
| `home_recent_form` / `away_recent_form` | Recent momentum (+ good, - poor). |
| `home_goals_avg` / `away_goals_avg` | Goals per game each side usually scores. |
| `home_goals` / `away_goals` | Goals actually scored in this match. |
| `result` | The outcome: `home_win`, `draw`, or `away_win`. |

**Pattern:** the stronger, in-form, home team wins more often, but real football
randomness keeps accuracy honestly in the 60s.

## `caribbean_upcoming_matches.csv` (Notebook 2)

Eight fixtures that have **not been played**, same columns as above minus the
results. The trained network predicts these.

---

## `jse_stock.csv` (Notebook 3)

About three years of daily trading for a made-up Jamaica Stock Exchange company,
**Blue Mountain Holdings (BMH)**, one row per weekday.

| Column | What it means |
| --- | --- |
| `date` | The trading day (weekdays only). |
| `price` | Closing share price in Jamaican dollars. |
| `volume` | Shares traded that day. |

**Pattern:** the price is a **random walk with drift** (non-stationary, hard to
predict day to day) with **volatility clustering**. This is why even a deep
network barely beats the "predict yesterday" baseline: the honest core lesson.

---

## `tt_oil_prices.csv` (Notebook 4)

Twenty years of monthly crude oil prices for **Trinidad and Tobago**, one row per
month.

| Column | What it means |
| --- | --- |
| `month` | The month (year-month). |
| `prev_month_price` | Last month's oil price (a strong hint; prices move slowly). |
| `global_demand_index` | World appetite for oil (100 = normal). |
| `tt_production_kbd` | Trinidad output, thousands of barrels per day. |
| `usd_index` | Strength of the US dollar. |
| `hurricane_season` | 1 in August-October (storm supply worries), else 0. |
| `oil_price_usd` | The price to predict, US$ per barrel. |

**Pattern:** price rises with demand and hurricane worries, falls with high
production and a strong dollar, and stays close to last month. Real signal, so
the network predicts it well.

---

## `caribbean_gdp.csv` (Notebook 5)

Twenty years (2004-2023) of yearly economic data for **twelve Caribbean
countries**, one row per country per year.

| Column | What it means |
| --- | --- |
| `country` / `year` | Which country and year. |
| `tourism_reliance` | Share of the economy from tourism (0 to 1). |
| `remittance_reliance` | Share from money sent home by relatives abroad (0 to 1). |
| `is_oil_exporter` | 1 for Trinidad, Guyana, Suriname; else 0. |
| `tourism_arrivals_growth` | Change in tourist numbers that year (%). |
| `oil_price_usd` | The world oil price that year. |
| `remittance_growth` | Change in remittances that year (%). |
| `inflation` | How fast prices rose that year (%). |
| `world_growth` | Global economic growth that year (%). |
| `crisis_year` | 1 in 2009 (financial crash) and 2020 (pandemic). |
| `pandemic_year` | 1 in 2020 only. |
| `gdp_growth` | The country's GDP growth to predict (%). |

**Pattern:** effects **interact**, for example the 2020 pandemic devastated
tourism economies but barely dented oil ones. A neural network beats linear
regression here because it can learn those "it depends" interactions.

---

## `caribbean_crime.csv` (Notebook 6)

Eight years (96 months) of monthly reported incidents for eight Caribbean urban
areas, one row per city per month. **For planning and prevention only, never for
judging individuals** (see the ethics note in Notebook 6).

| Column | What it means |
| --- | --- |
| `city` | The urban area (with its country). |
| `month` | The month (year-month). |
| `population_thousands` | City population in thousands. |
| `unemployment_rate` | Percent of people out of work. |
| `youth_population_pct` | Percent of people aged 15-24. |
| `police_per_1000` | Community officers per 1,000 people. |
| `is_summer` | 1 in June-August, else 0. |
| `reported_incidents` | Total reported incidents that month (what we predict). |

**Pattern:** totals rise with population, unemployment, youth share, and summer,
and fall with more community officers, plus a slow yearly decline. Big cities
have larger totals simply because they have more people, which is why this data
is for city-level planning, not comparing or judging places or people.
