# Week 4: Neural Networks and Deep Learning

*Caribbean AI - Adrian Dunkley*

This week you climb from a **single neuron you build by hand** all the way to
**deep neural networks** that predict real things across the Caribbean: World Cup
matches, stock prices, oil prices, GDP growth, and city safety. Every example
uses Caribbean data and names Caribbean people, teams, and countries, so the
ideas feel close to home.

By the end you will have used **Keras and TensorFlow**, the exact tools working
AI engineers reach for every day.

---

## Do the notebooks in this order

Each notebook builds on the one before, so work through them top to bottom.

| Order | Notebook | What it teaches |
| --- | --- | --- |
| 1 | `01-what-is-a-neural-network.ipynb` | Build **one neuron from scratch** in plain NumPy. Weights, bias, the sigmoid, loss, and gradient descent, with nothing hidden. Predicts whether a Caribbean student passes an exam. |
| 2 | `02-deep-learning-with-keras.ipynb` | Stack neurons into a **deep network with Keras** and predict **Caribbean World Cup matches** (win, draw, or loss). Layers, softmax, learning curves, and a confusion matrix. |
| 3 | `03-predicting-stock-prices.ipynb` | A network takes on the **Jamaica Stock Exchange**. The honest lesson: a near-random market barely beats a dumb baseline, no matter how deep the network. |
| 4 | `04-predicting-oil-prices.ipynb` | Forecast **Trinidad and Tobago crude oil** from demand, production, the dollar, and hurricane season. When data has real signal, the network shines. Plus feature importance. |
| 5 | `05-predicting-gdp.ipynb` | Predict **GDP growth for twelve Caribbean economies**. See a network **beat linear regression** by learning interactions like "a pandemic hurts tourism economies most". |
| 6 | `06-predicting-crime.ipynb` | Predict **monthly incidents for Caribbean cities** to guide prevention, with an ethics-first framing: plan for groups, never judge individuals. |

Start each notebook at the top and press **Shift + Enter** to run one box at a time.

## The learning arc

```
one neuron  ->  deep network  ->  a hard problem  ->  three problems with real signal
 (by hand)      (Keras)           (stock: humbling)    (oil, GDP, crime: it works)
```

Two honest lessons run through the whole week:

1. **Always beat a baseline.** A model only matters if it clearly beats a dumb
   guess. Every notebook prints the baseline first.
2. **The edge is in the data, not the model.** A near-random stock price resists
   even a deep network; oil, GDP, and crime carry real signal and yield to it.
   Knowing which is which is the real skill.

## Caribbean examples in this week

- **Football:** Jamaica, Trinidad and Tobago, Haiti, Curacao, Cuba, Guyana,
  Barbados, Bahamas, Grenada, Suriname, and many more CONCACAF nations.
- **Stocks:** Blue Mountain Holdings (BMH), a company on the Jamaica Stock Exchange.
- **Oil:** Trinidad and Tobago crude, the region's biggest energy producer.
- **GDP:** twelve economies, from tourism islands (Barbados, Bahamas, Saint Lucia)
  to oil exporters (Trinidad, Guyana, Suriname) to remittance-reliant Haiti.
- **Safety:** Kingston, Port of Spain, Nassau, Bridgetown, Georgetown, Castries,
  San Juan, and Santo Domingo.

## The data

Everything lives in the `data` folder and is explained in
`data/variable_dictionary.md`. Every file is a realistic **teaching dataset**
built from a fixed random seed: the numbers are believable and the patterns are
real, so the networks learn genuine logic, but they are **not** official records
of any real person, team, company, or country.

## How to run the notebooks

You need Python with a few common libraries plus TensorFlow. Install them once:

```bash
pip install pandas numpy scikit-learn matplotlib jupyter tensorflow
```

Then launch Jupyter and open any notebook:

```bash
jupyter notebook
```

Run a notebook one box at a time with **Shift + Enter**. Read the note above each
box, run it, then try the "Try it yourself" ideas at the bottom. You cannot break
anything by running code.

## New to Python or machine learning?

Start in the **Introduction to Python** folder, then do **Week 2** (predicting
World Cup matches) and **Week 3** (machine learning for finance). Week 4 reuses
ideas you met there, so seeing them first makes the neural-network versions click
faster. Next up is **Week 5: CNNs and Computer Vision**, where networks learn to
*see*.
