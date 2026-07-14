# Data Dictionary, Week 3

*The Genius Project Year 3*

This folder holds the money data the Week 3 notebooks learn from. Everything here is a
realistic **teaching dataset**. The numbers are believable and the patterns are real, so
the models learn genuine financial logic, but they are not real records of any person or
company. Use them to learn how the tools think.

There is **no football this week**. Instead you work with two kinds of money data that
professionals meet every day: a personal budget, and a company's share price.

---

## `monthly_budget.csv`

Four years (48 months) of one teenager's money, one row per month. This is the data for
Notebooks 1 (statistics), 2 (Monte Carlo), and part of 5 (machine learning).

| Column | What it means |
| --- | --- |
| `month` | The month, written as year-month, for example `2024-07`. |
| `allowance` | Money given by family that month, in dollars. |
| `side_job` | Money earned from work, like tutoring or a weekend shift. Higher in summer and December. |
| `gifts` | One-off money, such as a birthday (spring) or holiday (December) gift. |
| `income` | All money that came in that month: `allowance + side_job + gifts`. |
| `food` | Spent on snacks, drinks, and eating out. |
| `transport` | Spent on the bus, train, or fuel. |
| `entertainment` | Spent on games, cinema, and going out. Rises in summer and December. |
| `clothes` | Spent on clothes and shoes. Rises in December. |
| `phone` | A fixed monthly phone plan (the same every month). |
| `other` | Anything that does not fit the boxes above. |
| `spending` | All money that went out that month: the six categories added up. |
| `saved` | `income - spending`. Can be negative in a heavy-spending month. |
| `balance` | The running total in the savings jar after that month. |
| `over_budget` | `1` if `spending` was greater than `income` that month, otherwise `0`. |

**Patterns built into the data (real things the notebooks uncover):**

- Income drifts **upward** over the four years (small yearly raises).
- Spending is **seasonal** &mdash; summer (June&ndash;August) and December are the
  expensive months.
- A little **lifestyle creep**: higher-income months bring slightly higher spending.
- The saver keeps roughly 20% of income on average, with a few over-budget months.

---

## `daily_stock.csv`

About three years of daily trading for a **made-up company, Coral Reef Games** (ticker
`REEF`), one row per weekday. This is the data for Notebooks 3 (stationarity), 4
(forecasting), and part of 5 and 6 (machine learning).

| Column | What it means |
| --- | --- |
| `date` | The trading day, as a date. Weekdays only, like a real market. |
| `price` | The share price at the end of that day, in dollars. |
| `volume` | How many shares changed hands that day. |

**Patterns built into the data (real things the notebooks uncover):**

- The `price` is a **random walk with drift**: it trends up over the three years but
  wanders unpredictably day to day. This makes it **non-stationary**.
- The daily **returns** (percent change of the price) wobble around zero with a fairly
  steady spread, which makes them **roughly stationary**.
- The size of the swings comes and goes in calm and stormy stretches (**volatility
  clustering**), and `volume` is higher on big-move days.
- Crucially, the returns have **almost no memory** (autocorrelation near zero) &mdash;
  which is exactly why predicting the direction is so hard in Notebooks 5 and 6.

---

## How the notebooks use this data

| Notebook | Dataset | What it does with it |
| --- | --- | --- |
| 1 &mdash; Statistics | `monthly_budget.csv` | Averages, spread, histograms, seasonality, savings rate. |
| 2 &mdash; Monte Carlo | `monthly_budget.csv` | Simulates thousands of possible future years to find the odds of hitting a savings goal. |
| 3 &mdash; Stationarity | `daily_stock.csv` | Shows why prices drift (non-stationary) and returns do not (stationary). |
| 4 &mdash; Forecasting | `daily_stock.csv` | Forecasts tomorrow's price and grades each method against a naive baseline. |
| 5 &mdash; Machine learning | both | Predicts next month's spending (easy) and the stock's next-day direction (hard). |
| 6 &mdash; Bonus neural net | `daily_stock.csv` | A small neural network takes on the near-random market. |

Both files are generated from a fixed random seed, so the numbers are the same every time
you load them. The point is never the exact figures &mdash; it is learning how the tools
think about money.
