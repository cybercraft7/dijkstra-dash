# Dijkstra Dash

A browser game about shortest paths and a small ice-cream warehouse. You preview Dijkstra or A* on a 12×12 grid, then steer a chicken along that line. Staying on the path pays. Leaving it costs a penalty and the route is drawn again.

The game is three files: `index.html`, `styles.css`, and `script.js`. Progress stays in the browser. There is no account and no build step.

## Run

Open `index.html` in a current browser.

Some browsers limit pages opened as local files. If the board does not start, serve the folder and open that address:

```bash
py -3 -m http.server 8761
```

Then visit `http://127.0.0.1:8761/`.

Fonts load from Google Fonts. The rest of the game, including the city map, runs without a map service.

## A day

1. On **Warehouse**, pick Cream, Sugar, or Dry Ice. Click a shelf, or press `1`, `2`, or `3`.
2. Move the source and the destination by choosing that end and clicking an open tile.
3. Preview **Dijkstra** (`D`) or **A\*** (`A`). **Shuffle board** (`R`) only builds a new layout. It does not choose an algorithm. **Play the route** stays off until you pick one. `Enter` starts the run. `Esc` leaves planning.
4. After a three-second countdown, move with the arrow keys, WASD, or the on-screen pad. The chicken should stay on the green line.
5. Stepping off the line adds 3 to the route cost and subtracts ₹10 from the payout. A Web Worker recalculates the rest of the path from where the chicken stands.
6. At the destination the day closes. You are paid, the daily cost comes off, and up to four units go into storage.

`Instruction` on the warehouse panel opens these steps and closes when you click outside it.

## Pay

A clean run in New York is worth ₹100 before the day's cost. Other cities multiply that payout. Efficiency is the optimal cost divided by the cost you actually drove, capped at 100%.

| Result | What you get |
| --- | --- |
| Earnings | `max(₹20, round(₹100 × city pay × efficiency) − ₹10 × deviations)` |
| Units stored | 4 at a clean run, then 3, 2, or 1 as efficiency falls. A full shelf stores fewer. A shortage day stores half, and at least 1. |
| Daily cost | ₹20 at level 1, plus ₹8 for each level after that |
| Net | Earnings minus the daily cost. If that would clear you out, the day still ends at least ₹5 ahead. |

The result is green for 4 units stored, blue for 3, amber for 2, red for 1, and stone for 0.

Each morning rolls an event: clear roads (half the time), a traffic jam that raises tile costs, or a shortage on one material.

`Payments Rules` on **Upgrades** shows the same breakdown for the city you are driving.

## Cities

Ten cities sit on one path. New York is open. You can buy only the next locked city, and the button asks you to confirm. Driving a city changes the wall count, the traffic count, and the pay for the next run.

| Layer | City | Price | Pay |
| --- | --- | --- | --- |
| 1 | New York | Open | 1× |
| 2 | Jersey docks | ₹1,200 | 1.2× |
| 3 | Brooklyn sugar | ₹2,800 | 1.4× |
| 4 | Queens yard | ₹5,200 | 1.65× |
| 5 | Hoboken pier | ₹9,000 | 1.9× |
| 6 | Newark freight | ₹14,000 | 2.2× |
| 7 | Staten crossing | ₹21,000 | 2.5× |
| 8 | Harlem night | ₹30,000 | 2.9× |
| 9 | Bronx lots | ₹42,000 | 3.3× |
| 10 | Long Island run | ₹60,000 | 3.8× |

Click a node on the map and that city's card scrolls into view. The list shows three cities at a time.

## Warehouse levels

Storage starts at 10 of each material. Each upgrade adds 10 and ₹8 a day, up to level 10 (100 of each, ₹92 a day). The cost to reach level `n` is `200 × (n − 1) × n`:

| Level | Cost | Capacity each | Daily cost |
| --- | --- | --- | --- |
| 1 | Start | 10 | ₹20 |
| 2 | ₹400 | 20 | ₹28 |
| 3 | ₹1,200 | 30 | ₹36 |
| 4 | ₹2,400 | 40 | ₹44 |
| 5 | ₹4,000 | 50 | ₹52 |
| 6 | ₹6,000 | 60 | ₹60 |
| 7 | ₹8,400 | 70 | ₹68 |
| 8 | ₹11,200 | 80 | ₹76 |
| 9 | ₹14,400 | 90 | ₹84 |
| 10 | ₹18,000 | 100 | ₹92 |

The tier list and the upgrade button use that same cost. Level 10 cannot be upgraded further.

## Transfer

**Transfer** writes the warehouse to a text code: funds, day, level, shelves, best efficiency, owned cities, and the city you are driving. Paste a code on another browser and confirm before it replaces the save there.

Today's walls, traffic, and a run still in progress are not in the code. `Transfer guide` explains what moves and what stays behind.

The save also lives in `localStorage` under `dijkstraDash_save_v1`. **Reset progress** asks you to confirm before it clears that save.

## Files

| File | Role |
| --- | --- |
| `index.html` | Pages: warehouse, upgrades, cities, transfer |
| `styles.css` | Layout and the paper visual style |
| `script.js` | Board, Dijkstra, A*, the chicken run, economy, and save |
| `LICENSE` | MIT |

Dijkstra and A* run on the main thread for the preview. Leaving the path sends the same search to a Web Worker so the chicken can keep moving while the new line is found.
