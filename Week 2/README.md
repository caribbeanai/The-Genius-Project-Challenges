# Week 2: Predicting World Cup Matches

*The Genius Project Year 3*

This week you build four prediction models, plus a bonus deep learning model. Each one reads
real football stats and predicts an upcoming World Cup match. Every notebook gives you the same
three things:

1. **The win probability for each team.**
2. **The expected scoreline** (predicted goals for both teams).
3. **The stats that mattered most** for the prediction.

**Football note:** we call the sport *football* (some countries call it soccer). Every stat is
explained in plain words inside each notebook, so you do not need to be a fan to take part.

---

## Do the notebooks in this order

| Order | Notebook | What it teaches |
| --- | --- | --- |
| 1 | `01-logic-model.ipynb` | The logic model (logistic regression). It weighs each stat and adds up the evidence. The easiest model to read. |
| 2 | `02-decision-tree-model.ipynb` | A decision tree. A flowchart of yes and no questions. You can draw it as a picture. |
| 3 | `03-neural-network-model.ipynb` | A small neural network that mixes every stat at once to spot patterns a single rule would miss. |
| 4 | `04-cluster-model.ipynb` | Clustering. Groups teams by playing style, then predicts from how those groups have clashed before. |
| 5 (bonus) | `05-bonus-deep-learning.ipynb` | A deeper network built with TensorFlow and Keras, the exact tools used in real AI labs. |

Start each notebook at the top and press **Shift + Enter** to run one box at a time.

## The data

Everything lives in the `data` folder:

- `teams.csv` - one row per national team, with many stats (attack, defence, form, squad value, and more).
- `matches.csv` - 900 past matches for the models to learn from.
- `upcoming_matches.csv` - the fixtures you predict.
- `variable_dictionary.md` - every column explained in plain words.

The data is a realistic teaching set. The numbers are believable and the patterns are real, but
they are not official statistics. The goal is to learn how the models think.

## What "good" looks like

There are three possible results (team A win, draw, team B win), so pure guessing gets about
33 percent right. Football is full of upsets, so a model that lands around 50 to 60 percent is
doing real work. Each notebook prints its accuracy next to the guessing baseline so you can see
the difference for yourself.

## Submit your prediction

Once you have run a model and picked a match, enter your prediction here:

**https://beagenius.org/tgp-2026teens-week2/06-quiz-and-predict.html**

Bring the win probability for each team, the predicted scoreline, and one sentence on which
stat mattered most.

## New to Python?

Start in the **Introduction to Python** folder first. Nine short notebooks take you from your
first line of code to reading this football dataset with pandas.
