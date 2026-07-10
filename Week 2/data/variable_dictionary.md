# Data Dictionary, Week 2

*The Genius Project Year 3*

This folder holds the football data the Week 2 models learn from. Everything here is a
realistic **teaching dataset**. The numbers are believable and the patterns are real, so
the models learn genuine football logic, but they are not official statistics. Use them to
learn how the models think.

**Football note:** this project uses the word *football* for the sport played with a round
ball and a net (called *soccer* in some countries). Every column is explained in plain words
below, so you do not need to follow football to take part.

---

## `teams.csv`

One row per national team, with the stats that describe how strong the team is and how it plays.

| Column | What it means |
| --- | --- |
| `team` | The national team, for example Brazil or Japan. |
| `confederation` | The region a team belongs to. UEFA is Europe, CONMEBOL is South America, CAF is Africa, AFC is Asia, CONCACAF is North and Central America. |
| `fifa_ranking` | The team's position on the official world ladder. 1 is the best. A smaller number is better. |
| `fifa_points` | The score behind the ranking. More points means a stronger team. |
| `elo_rating` | Another strength score, borrowed from chess. Higher is stronger. |
| `world_cup_titles` | How many times the team has won the World Cup. |
| `avg_goals_scored` | Goals the team scores in a typical match. This is their attack. Higher is better. |
| `avg_goals_conceded` | Goals the team lets in during a typical match. This is their defence. Lower is better. |
| `possession_pct` | The share of the match, out of 100, that the team keeps the ball. More possession usually means more control. |
| `pass_accuracy_pct` | Out of every 100 passes, how many reach a team mate. |
| `shots_per_game` | How many attempts at goal the team takes in a match. |
| `shots_on_target_per_game` | Shots that were heading into the net, whether or not they scored. |
| `big_chances_per_game` | Clear chances to score in a match, the kind a player is expected to finish. |
| `clean_sheet_pct` | Out of 100 matches, how many the team finishes without letting in a single goal. |
| `win_rate_last10` | The share of the last 10 matches the team won, from 0 to 1. 0.7 means they won 7 of 10. |
| `form_points_last5` | Points from the last 5 matches. A win is 3 points, a draw is 1, a loss is 0. The most is 15. |
| `squad_avg_age` | The average age of the players in the squad. |
| `squad_value_million_eur` | The total transfer value of the squad, in millions of euros. A rough measure of talent. |
| `top_league_player_share` | The share of players, from 0 to 1, who play for clubs in the strongest leagues. |
| `set_piece_goal_pct` | Out of 100 goals, how many come from free kicks and corners rather than open play. |
| `key_player_injuries` | How many important players are currently injured. |
| `is_2026_host` | 1 if the team is hosting the 2026 World Cup (USA, Canada, Mexico), otherwise 0. |

---

## `matches.csv`

The history the models study. One row per past match between two teams.

| Column | What it means |
| --- | --- |
| `tournament` | The competition the match was played in (World Cup, Continental Cup, Nations League, Qualifier, or Friendly). |
| `team_a` | The first team in the match. |
| `team_b` | The second team in the match. |
| `goals_a` | Goals scored by team A. |
| `goals_b` | Goals scored by team B. |
| `winner` | The name of the winning team, or `Draw` if the scores were level. |

---

## `upcoming_matches.csv`

The fixtures you predict. These have no result yet. That is the whole point.

| Column | What it means |
| --- | --- |
| `match_id` | A number that identifies the fixture. |
| `stage` | The round of the tournament (Group Stage, Round of 16, Quarter Final). |
| `team_a` | The first team in the fixture. |
| `team_b` | The second team in the fixture. |

---

## How the models use this

Every model takes two teams, looks up their stats in `teams.csv`, and compares them. The
main idea is the **gap** between the two teams on each stat. If team A scores more, concedes
fewer, and is in better form than team B, the model leans toward team A. The models learn
exactly how much each gap matters by studying the results in `matches.csv`.
