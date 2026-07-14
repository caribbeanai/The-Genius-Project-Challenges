# Week 3: Machine Learning for Finance and Budgeting

*The Genius Project Year 3*

This week you learn the tools that banks, budgeting apps, and trading desks use to make
sense of money. You start with the plain statistics of your own budget and build all the
way up to a neural network. There is **no football this week** &mdash; instead you work
with realistic, made-up money data so you can focus on the ideas.

Along the way you meet the big ideas the request set out: **statistics**, **Monte Carlo
simulation**, **stationarity**, **time-series forecasting**, and **machine-learning
models** &mdash; each one building on the last.

---

## Do the notebooks in this order

Each notebook builds on the one before, so work through them top to bottom.

| Order | Notebook | What it teaches |
| --- | --- | --- |
| 1 | `01-money-and-statistics.ipynb` | Read a budget like an analyst: average, median, spread, histograms, and seasonality. The statistical foundation everything else stands on. |
| 2 | `02-monte-carlo-simulation.ipynb` | **Monte Carlo simulation.** Play out thousands of random futures to find the real chance of hitting a savings goal &mdash; and how one habit changes the odds. |
| 3 | `03-time-series-and-stationarity.ipynb` | **Time series and stationarity.** Why prices drift and returns do not, plus differencing and autocorrelation &mdash; the most important idea in forecasting. |
| 4 | `04-time-series-forecasting.ipynb` | **Forecasting.** Naive, moving-average, exponential-smoothing, and autoregression forecasts, all graded honestly against a baseline. |
| 5 | `05-machine-learning-for-finance.ipynb` | **Machine-learning models.** Regression to predict next month's spending, and classification to predict the stock's next-day direction. |
| 6 (bonus) | `06-bonus-neural-network.ipynb` | A small **neural network** &mdash; the family of models behind modern AI &mdash; taking on a near-random market. |

Start each notebook at the top and press **Shift + Enter** to run one box at a time.

## The learning arc

The week is built as one climb, from describing the past to modelling the future:

```
statistics  ->  simulation  ->  stationarity  ->  forecasting  ->  machine learning
 (describe)      (Monte Carlo)   (tame the data)   (predict + grade)   (find patterns)
```

Two honest lessons run through all six notebooks:

1. **Always beat a baseline.** A forecast or model only matters if it clearly beats a
   dumb guess. Every notebook prints the baseline first.
2. **The edge is in the data, not the model.** Predictable problems (your spending) yield
   to simple tools. Near-random ones (stock prices) resist even a neural network. Knowing
   which is which is the real skill.

## The data

Everything lives in the `data` folder:

- `monthly_budget.csv` &mdash; 48 months of one teenager's income and spending.
- `daily_stock.csv` &mdash; about three years of daily prices for a made-up company, Coral
  Reef Games (ticker `REEF`).
- `variable_dictionary.md` &mdash; every column explained in plain words, plus the real
  patterns hidden in the data.

The data is a realistic teaching set generated from a fixed random seed. The numbers are
believable and the patterns are real, but they are not records of any real person or
company. The goal is to learn how the tools think.

## How to run the notebooks

You need Python with a few common libraries. Install them once:

```bash
pip install pandas numpy scikit-learn matplotlib jupyter
```

Then launch Jupyter and open any notebook:

```bash
jupyter notebook
```

Run a notebook one box at a time with **Shift + Enter**. Read the note above each box, run
it, then try the "Try it yourself" ideas at the bottom. You cannot break anything by
running code.

## New to Python or machine learning?

Start in the **Introduction to Python** folder first, then do **Week 2** (predicting World
Cup matches). Week 3 reuses the same models you met there &mdash; logistic regression,
decision trees, and neural networks &mdash; so seeing them on football first makes the
finance versions click faster.
