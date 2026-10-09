const ROWS = 12, COLS = 12;
const CELL = 60;
const VIEW = ROWS * CELL;
const START_NODE = { r: 1, c: 1 };
const DEFAULT_GOAL = { r: 10, c: 10 };
let goalNode = { ...DEFAULT_GOAL };
let wallCells = new Set([
  "3,2", "3,3", "3,4", "3,5",
  "7,6", "7,7", "7,8",
]);
let trafficCells = [];
let costs = [];
let baseCellCost = 1;


function randomizeCosts(min = 1, max = 6, start = START_NODE, trafficCount) {
  baseCellCost = min;
  costs = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => min)
  );
  const availableCells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = key(r, c);
      if (
        !wallCells.has(cell) &&
        cell !== key(start.r, start.c) &&
        cell !== key(goalNode.r, goalNode.c)
      ) {
        availableCells.push(cell);
      }
    }
  }
  shuffle(availableCells);
  const count = trafficCount ?? (10 + Math.floor(Math.random() * 9));
  trafficCells = availableCells.slice(0, Math.min(count, availableCells.length));
  trafficCells.forEach((cell) => {
    const [r, c] = cell.split(",").map(Number);
    costs[r][c] = max;
  });
}
randomizeCosts(1, 6);


function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}


function randomizeWalls(start, wallCount) {
  const protectedCells = new Set([
    key(start.r, start.c),
    key(goalNode.r, goalNode.c),
  ]);
  for (const point of [start, goalNode]) {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const r = point.r + dr, c = point.c + dc;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) protectedCells.add(key(r, c));
    }
  }
  const candidates = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = key(r, c);
      if (!protectedCells.has(cell)) candidates.push(cell);
    }
  }
  shuffle(candidates);
  const count = wallCount ?? (14 + Math.floor(Math.random() * 10));
  wallCells = new Set(candidates.slice(0, Math.min(count, candidates.length)));
}


function key(r, c) { return `${r},${c}`; }
function neighbors(grid, r, c, blocked) {
  const out = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !blocked.has(key(nr, nc))) {
      out.push({ r: nr, c: nc, cost: grid[nr][nc] });
    }
  }
  return out;
}


function dijkstra(grid, start, end, blocked) {
  const dist = new Map(), prev = new Map(), visited = new Set();
  const explored = [];
  const unvisited = new Set();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const nodeKey = key(r, c);
    if (!blocked.has(nodeKey)) { dist.set(nodeKey, Infinity); unvisited.add(nodeKey); }
  }
  const startKey = key(start.r, start.c), endKey = key(end.r, end.c);
  if (blocked.has(startKey) || blocked.has(endKey)) return { path: [], cost: Infinity, explored };
  dist.set(startKey, 0);
  while (unvisited.size) {
    let ck = null, best = Infinity;
    for (const k of unvisited) if (dist.get(k) < best) { best = dist.get(k); ck = k; }
    if (ck === null) break;
    const [r, c] = ck.split(",").map(Number);
    unvisited.delete(ck); visited.add(ck); explored.push({ r, c });
    if (r === end.r && c === end.c) break;
    for (const n of neighbors(grid, r, c, blocked)) {
      const nk = key(n.r, n.c);
      if (visited.has(nk)) continue;
      const alt = dist.get(ck) + n.cost;
      if (alt < dist.get(nk)) { dist.set(nk, alt); prev.set(nk, ck); }
    }
  }
  return { path: reconstruct(prev, start, end), cost: dist.get(endKey), explored };
}


function astar(grid, start, end, blocked) {
  const g = new Map(), f = new Map(), prev = new Map();
  const explored = [];
  const startKey = key(start.r, start.c), endKey = key(end.r, end.c);
  if (blocked.has(startKey) || blocked.has(endKey)) return { path: [], cost: Infinity, explored };
  const traversableCosts = grid.flatMap((row, r) => row.filter((_, c) => !blocked.has(key(r, c))));
  const minCost = Math.min(...traversableCosts);
  const heuristic = (r, c) => (Math.abs(end.r - r) + Math.abs(end.c - c)) * minCost;
  const open = new Set([startKey]);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const nodeKey = key(r, c);
    if (!blocked.has(nodeKey)) { g.set(nodeKey, Infinity); f.set(nodeKey, Infinity); }
  }
  g.set(startKey, 0);
  f.set(startKey, heuristic(start.r, start.c));
  while (open.size) {
    let ck = null, best = Infinity;
    for (const k of open) if (f.get(k) < best) { best = f.get(k); ck = k; }
    const [r, c] = ck.split(",").map(Number);
    open.delete(ck);
    explored.push({ r, c });
    if (r === end.r && c === end.c) return { path: reconstruct(prev, start, end), cost: g.get(ck), explored };
    for (const n of neighbors(grid, r, c, blocked)) {
      const nk = key(n.r, n.c);
      const tentative = g.get(ck) + n.cost;
      if (tentative < g.get(nk)) { prev.set(nk, ck); g.set(nk, tentative); f.set(nk, tentative + heuristic(n.r, n.c)); open.add(nk); }
    }
  }
  return { path: [], cost: Infinity, explored };
}


function reconstruct(prev, start, end) {
  const sk = key(start.r, start.c), ek = key(end.r, end.c);
  if (sk === ek) return [start];
  const out = [];
  let ck = ek;
  while (ck !== undefined) {
    const [r, c] = ck.split(",").map(Number);
    out.unshift({ r, c });
    if (ck === sk) break;
    ck = prev.get(ck);
  }
  return out[0] && key(out[0].r, out[0].c) === sk ? out : [];
}


const workerSrc = `
  ${key.toString()}
  ${neighbors.toString().replace(/ROWS/g, "self.__ROWS").replace(/COLS/g, "self.__COLS")}
  ${dijkstra.toString().replace(/ROWS/g, "self.__ROWS").replace(/COLS/g, "self.__COLS")}
  ${astar.toString().replace(/ROWS/g, "self.__ROWS").replace(/COLS/g, "self.__COLS")}
  ${reconstruct.toString()}

  self.onmessage = function(e) {
    self.__ROWS = e.data.ROWS;
    self.__COLS = e.data.COLS;
    const blocked = new Set(e.data.walls);
    const algo = e.data.algo === "astar" ? astar : dijkstra;
    const result = algo(e.data.grid, e.data.start, e.data.end, blocked);
    self.postMessage({ path: result.path, cost: result.cost, requestId: e.data.requestId });
  };
`;
const worker = new Worker(URL.createObjectURL(new Blob([workerSrc], { type: "application/javascript" })));

const SAVE_KEY = "dijkstraDash_save_v1";
const MATERIALS = {
  cream:  { label: "Cream",   color: "#b08968", mark: "01" },
  sugar:  { label: "Sugar",   color: "#6d7f92", mark: "02" },
  dryice: { label: "Dry Ice", color: "#5e8f7b", mark: "03" },
};
const CITIES = [
  { id: "newyork", name: "New York", price: 0, pay: 1, walls: 16, traffic: 12, note: "The first layer. Open streets and a fair pay." },
  { id: "jersey", name: "Jersey docks", price: 1200, pay: 1.2, walls: 10, traffic: 8, note: "Layer two. Fewer walls, just across the water." },
  { id: "brooklyn", name: "Brooklyn sugar", price: 2800, pay: 1.4, walls: 18, traffic: 16, note: "Layer three. Heavier traffic, higher pay." },
  { id: "queens", name: "Queens yard", price: 5200, pay: 1.65, walls: 20, traffic: 14, note: "Layer four. Longer blocks between the gates." },
  { id: "hoboken", name: "Hoboken pier", price: 9000, pay: 1.9, walls: 12, traffic: 18, note: "Layer five. Traffic stacks along the pier." },
  { id: "newark", name: "Newark freight", price: 14000, pay: 2.2, walls: 22, traffic: 12, note: "Layer six. Freight walls, and the route winds." },
  { id: "staten", name: "Staten crossing", price: 21000, pay: 2.5, walls: 16, traffic: 20, note: "Layer seven. The crossing costs more to drive." },
  { id: "harlem", name: "Harlem night", price: 30000, pay: 2.9, walls: 24, traffic: 16, note: "Layer eight. Tight blocks, a much larger purse." },
  { id: "bronx", name: "Bronx lots", price: 42000, pay: 3.3, walls: 26, traffic: 18, note: "Layer nine. Walled lots. Stay on the line." },
  { id: "longisland", name: "Long Island run", price: 60000, pay: 3.8, walls: 14, traffic: 22, note: "The outer layer. The longest haul and the largest pay." },
];
const MAP_W = 1100;
const MAP_H = 680;

const BASE_PAYOUT = 100;
const MIN_PAYOUT = 20;
const MIN_NET_PER_DAY = 5;
const INK = "#1c1917";
const PAPER = "#fbfaf7";
const ACCENT = "#1e5c40";
const YIELD_COLORS = ["#6b6560", "#9f3d3d", "#a16207", "#2c6e8a", "#1e5c40"];
const SERIF = "'Instrument Serif', Georgia, serif";
const SANS = "'Plus Jakarta Sans', sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

const MAX_WAREHOUSE_LEVEL = 10;


function dailyOpex(s) {
  return 20 + (s.warehouseLevel - 1) * 8;
}


function costToReach(level) {
  const step = level - 1;
  return 200 * step * (step + 1);
}


function upgradeCost(s) {
  if (s.warehouseLevel >= MAX_WAREHOUSE_LEVEL) return 0;
  return costToReach(s.warehouseLevel + 1);
}


const EVENT_TYPES = ["normal", "traffic", "shortage"];
const EVENT_WEIGHTS = [0.5, 0.25, 0.25];


function rollDailyEvent() {
  const r = Math.random();
  let acc = 0, chosen = "normal";
  for (let i = 0; i < EVENT_TYPES.length; i++) {
    acc += EVENT_WEIGHTS[i];
    if (r < acc) { chosen = EVENT_TYPES[i]; break; }
  }
  if (chosen === "shortage") {
    const materials = Object.keys(MATERIALS);
    const material = materials[Math.floor(Math.random() * materials.length)];
    return { type: "shortage", material };
  }
  return { type: chosen };
}


function eventDescription(ev) {
  if (ev.type === "traffic") return "Traffic jam. Every open tile costs more today.";
  if (ev.type === "shortage") return `${MATERIALS[ev.material].label} is short. That run yields half the units.`;
  return "Clear roads. Normal yields today.";
}


function defaultState() {
  return {
    funds: 200,
    day: 1,
    warehouseLevel: 1,
    inventory: { cream: 0, sugar: 0, dryice: 0 },
    bestEfficiency: 0,
    ownedCities: ["newyork"],
    activeCity: "newyork",
  };
}


function sanitizeState(parsed) {
  const base = defaultState();
  const owned = Array.isArray(parsed.ownedCities)
    ? parsed.ownedCities.filter((id) => CITIES.some((city) => city.id === id))
    : [];
  if (!owned.includes("newyork")) owned.unshift("newyork");
  const active = owned.includes(parsed.activeCity) ? parsed.activeCity : "newyork";
  const warehouseLevel = clampInt(parsed.warehouseLevel, 1, 1, MAX_WAREHOUSE_LEVEL);
  const cap = 10 * warehouseLevel;
  const inventory = { ...base.inventory };
  for (const id of Object.keys(MATERIALS)) {
    inventory[id] = clampInt(parsed.inventory?.[id], 0, 0, cap);
  }
  return {
    ...base,
    ...parsed,
    funds: clampInt(parsed.funds, base.funds, 0, 99999999),
    day: clampInt(parsed.day, 1, 1, 99999),
    warehouseLevel,
    inventory,
    bestEfficiency: clampInt(parsed.bestEfficiency, 0, 0, 100),
    ownedCities: owned,
    activeCity: active,
  };
}


function clampInt(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}


function cityById(id) {
  return CITIES.find((city) => city.id === id) || CITIES[0];
}


function activeCity() {
  return cityById(state.activeCity);
}


function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultState();
    return sanitizeState(JSON.parse(raw));
  } catch (e) {
    console.warn("Save data unreadable, starting fresh.", e);
    return defaultState();
  }
}


function saveState() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}


function encodeSave(s) {
  const json = JSON.stringify(s);
  return btoa(unescape(encodeURIComponent(json)));
}


function decodeSave(code) {
  const json = decodeURIComponent(escape(atob(code.trim())));
  return JSON.parse(json);
}


function capacityFor(level = state.warehouseLevel) {
  return 10 * level;
}


let state = loadState();
let currentMaterial = null;
let todayEvent = { type: "normal" };


function setText(id, value) {
  const el = document.getElementById(id);
  const next = String(value);
  if (el.textContent === next) return;
  el.textContent = next;
  el.classList.remove("tick");
  void el.offsetWidth;
  el.classList.add("tick");
}


function renderMetrics() {
  setText("resFunds", `₹${state.funds}`);
  setText("resDay", state.day);
  setText("resLevel", state.warehouseLevel);
  setText("resOpex", `₹${dailyOpex(state)}`);
}


function renderDashboard() {
  renderMetrics();

  const banner = document.getElementById("eventBanner");
  banner.textContent = eventDescription(todayEvent);
  banner.className = "event " + todayEvent.type;

  const best = document.getElementById("bestLine");
  best.hidden = !(state.bestEfficiency > 0);
  best.textContent = `Best efficiency ${state.bestEfficiency}%`;

  const list = document.getElementById("inventoryList");
  list.innerHTML = "";
  for (const [id, info] of Object.entries(MATERIALS)) {
    const amount = state.inventory[id];
    const cap = capacityFor();
    const pct = Math.min(100, Math.round((amount / cap) * 100));
    const short = todayEvent.type === "shortage" && todayEvent.material === id;
    const row = document.createElement("button");
    row.type = "button";
    row.className = "stock";
    row.innerHTML = `
      <span class="stock-top">
        <span class="stock-name">${info.label}${short ? '<span class="tag">Short</span>' : ""}</span>
        <span class="stock-go">Run</span>
      </span>
      <span class="stock-meta"><span>${amount} / ${cap}</span><span>${info.mark}</span></span>
      <span class="bar"><i style="width:${pct}%;background:${info.color}"></i></span>
    `;
    row.onclick = () => startMaterial(id);
    row.onmouseenter = () => { hoveredBay = id; if (phase === "dashboard") draw(); };
    row.onmouseleave = () => { if (hoveredBay === id) { hoveredBay = null; if (phase === "dashboard") draw(); } };
    list.appendChild(row);
  }

  renderUpgradesTab();
  renderManifest();
}


function renderManifest() {
  const el = document.getElementById("manifestBody");
  if (!el) return;
  const rows = [
    ["Funds", `₹${state.funds}`],
    ["Day", String(state.day)],
    ["Warehouse", `Level ${state.warehouseLevel}`],
    ["Daily cost", `₹${dailyOpex(state)}`],
    ["City", activeCity().name],
    ["Best route", state.bestEfficiency ? `${state.bestEfficiency}%` : "—"],
    ...Object.entries(MATERIALS).map(([id, info]) => [info.label, `${state.inventory[id]} / ${capacityFor()}`]),
  ];
  el.innerHTML = `<dl class="ledger">${rows.map(([name, value]) => `<div><dt>${name}</dt><dd>${value}</dd></div>`).join("")}</dl><p class="note">Today: ${eventDescription(todayEvent)}</p>`;
}


function renderUpgradesTab() {
  const currentCap = capacityFor();
  const maxed = state.warehouseLevel >= MAX_WAREHOUSE_LEVEL;
  const nextLevel = maxed ? state.warehouseLevel : state.warehouseLevel + 1;
  const nextCap = capacityFor(nextLevel);
  const cost = upgradeCost(state);
  const nextOpex = dailyOpex({ warehouseLevel: nextLevel });

  document.getElementById("upLevel").textContent = state.warehouseLevel;
  document.getElementById("upCapacityFill").style.width = `${(currentCap / capacityFor(MAX_WAREHOUSE_LEVEL)) * 100}%`;
  document.getElementById("upCurrentCap").textContent = currentCap;
  document.getElementById("upNextCap").textContent = maxed ? "Full" : nextCap;
  document.getElementById("upCost").textContent = maxed ? "—" : `₹${cost}`;
  document.getElementById("upNextOpex").textContent = `₹${nextOpex}`;
  document.getElementById("upFundsAvail").textContent = `₹${state.funds}`;

  const ladder = document.getElementById("upgradeLadder");
  ladder.innerHTML = "";
  for (let level = 1; level <= MAX_WAREHOUSE_LEVEL; level++) {
    const cap = capacityFor(level);
    const opex = dailyOpex({ warehouseLevel: level });
    const now = level === state.warehouseLevel;
    const price = level === 1 ? "Start" : `₹${costToReach(level)}`;
    const row = document.createElement("div");
    row.className = "tier" + (now ? " is-now" : "");
    row.innerHTML = `<b>Level ${level}</b><span>${cap} each · ₹${opex} a day</span><em>${now ? "Now" : price}</em>`;
    ladder.appendChild(row);
  }

  const stock = document.getElementById("upgradeStock");
  stock.innerHTML = Object.entries(MATERIALS).map(([id, info]) => {
    const amount = state.inventory[id];
    const cap = capacityFor();
    const pct = Math.min(100, Math.round((amount / cap) * 100));
    return `<div class="shelf-card"><div class="row-between"><b>${info.label}</b><span>${amount} / ${cap}</span></div><div class="bar"><i style="width:${pct}%;background:${info.color}"></i></div></div>`;
  }).join("");

  const btn = document.getElementById("btnUpgrade2");
  btn.disabled = maxed || state.funds < cost;
  btn.textContent = maxed
    ? "Fully upgraded"
    : state.funds < cost
      ? `Need ₹${cost - state.funds} more`
      : `Upgrade to level ${nextLevel}`;

  const opex = dailyOpex(state);
  const city = activeCity();
  const cityPay = Math.round(BASE_PAYOUT * city.pay);
  const bestNet = Math.max(0, cityPay - opex);
  const book = document.getElementById("payBook");
  if (book) {
    const cells = [
      ["Clean delivery", `₹${cityPay} in ${city.name}, before the day’s cost`],
      ["Today’s overhead", `₹${opex} comes off when the chicken arrives`],
      ["Best net", `₹${bestNet} if the line is kept and the shelves are full`],
      ["Leaving the line", "+3 on the route, and −₹10 on the pay, each time"],
      ["Short shelves", "The run still goes. Only half the units leave."],
      ["Today", eventDescription(todayEvent)],
    ];
    book.innerHTML = cells.map(([title, detail]) => `<div class="pay-cell"><span>${title}</span><b>${detail}</b></div>`).join("");
  }
}


function startMaterial(id) {
  if (phase !== "dashboard" || activeTab !== "warehouse") return;
  currentMaterial = id;
  const info = MATERIALS[id];
  const full = state.inventory[id] >= capacityFor();
  goToPlanning();
  if (full) showToast(`${info.label} is full. This run still pays, but new units will not fit.`);
}


let resetArmed = false;
let resetTimer = null;

function bindDisclosure(buttonId, boxId) {
  const button = document.getElementById(buttonId);
  const box = document.getElementById(boxId);
  button.onclick = (event) => {
    event.stopPropagation();
    const open = box.hidden;
    box.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  };
  document.addEventListener("click", (event) => {
    if (box.hidden || box.contains(event.target)) return;
    box.hidden = true;
    button.setAttribute("aria-expanded", "false");
  });
}

bindDisclosure("btnInstructions", "runInstructions");
bindDisclosure("btnPayRules", "payRules");
bindDisclosure("btnTransferGuide", "transferGuide");


document.getElementById("btnResetSave").onclick = () => {
  const btn = document.getElementById("btnResetSave");
  if (!resetArmed) {
    resetArmed = true;
    btn.textContent = "Confirm reset";
    btn.classList.add("is-armed");
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      resetArmed = false;
      btn.textContent = "Reset progress";
      btn.classList.remove("is-armed");
    }, 2800);
    return;
  }
  clearTimeout(resetTimer);
  resetArmed = false;
  btn.textContent = "Reset progress";
  btn.classList.remove("is-armed");
  state = defaultState();
  todayEvent = rollDailyEvent();
  saveState();
  renderDashboard();
  draw();
  showToast("Progress reset");
};


document.getElementById("btnUpgrade2").onclick = () => {
  if (state.warehouseLevel >= MAX_WAREHOUSE_LEVEL) return;
  const cost = upgradeCost(state);
  if (state.funds < cost) return;
  state.funds -= cost;
  state.warehouseLevel += 1;
  saveState();
  renderDashboard();
  draw();
  showToast(`Warehouse is now level ${state.warehouseLevel}`);
};


document.getElementById("btnExport").onclick = () => {
  const code = encodeSave(state);
  const box = document.getElementById("exportOutput");
  box.value = code;
  box.hidden = false;
  document.getElementById("btnCopyExport").hidden = false;
  document.getElementById("exportStatus").textContent = "Code ready. Paste it into Dijkstra Dash on another device.";
};


document.getElementById("btnCopyExport").onclick = async () => {
  const box = document.getElementById("exportOutput");
  box.select();
  box.setSelectionRange(0, box.value.length);
  const status = document.getElementById("exportStatus");
  try {
    await navigator.clipboard.writeText(box.value);
    status.textContent = "Copied.";
  } catch (e) {
    status.textContent = "The code is selected. Copy it with Ctrl+C.";
  }
};

let importArmed = false;
let importTimer = null;

document.getElementById("btnImport").onclick = () => {
  const raw = document.getElementById("importInput").value;
  const status = document.getElementById("importStatus");
  const btn = document.getElementById("btnImport");
  if (!raw.trim()) {
    status.textContent = "Paste a code first.";
    return;
  }
  if (!importArmed) {
    importArmed = true;
    btn.textContent = "Replace current save";
    btn.classList.add("is-armed");
    status.textContent = "This replaces the warehouse on this device.";
    clearTimeout(importTimer);
    importTimer = setTimeout(() => {
      importArmed = false;
      btn.textContent = "Restore save";
      btn.classList.remove("is-armed");
    }, 3200);
    return;
  }
  clearTimeout(importTimer);
  importArmed = false;
  btn.textContent = "Restore save";
  btn.classList.remove("is-armed");
  try {
    state = sanitizeState(decodeSave(raw));
    todayEvent = rollDailyEvent();
    saveState();
    renderDashboard();
    draw();
    status.textContent = `Loaded day ${state.day}, ₹${state.funds}, level ${state.warehouseLevel}.`;
    document.getElementById("importInput").value = "";
    showToast("Save restored");
  } catch (e) {
    status.textContent = "That code could not be read. Copy the whole thing and try again.";
  }
};

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const tip = document.getElementById("cellTip");
const gameToast = document.getElementById("gameToast");


function setupCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = VIEW * dpr;
  canvas.height = VIEW * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
setupCanvas();

let phase = "dashboard";
let startNode = { ...START_NODE };
let previewPath = [];
let plannedPath = [];
let exploredCells = [];
let algoUsed = "dijkstra";
let optimalCost = null;
let vis = { token: 0, explored: 0, path: 0 };
let hoveredBay = null;
let hoveredCell = null;
let countdownLabel = "";

let segment = 0;
let playerPosition = { ...START_NODE };
let trail = [];
let facing = "right";
let penaltyCell = null;
let placeMode = "start";
let totalCost = 0;
let penaltyCount = 0;
let deliveryYield = 0;
let recalculating = false;
let countdownTimer = null;
let toastTimeout = null;
let runReady = false;
let seenRouteSignatures = new Set();
let seenMapSignatures = new Set();
let requestCounter = 0;


function showToast(message, ms = 2400) {
  clearTimeout(toastTimeout);
  gameToast.textContent = message;
  gameToast.classList.add("visible");
  if (ms) toastTimeout = setTimeout(hideToast, ms);
}


function hideToast() {
  gameToast.classList.remove("visible");
}


function announce(text) {
  const el = document.getElementById("liveStatus");
  el.textContent = "";
  setTimeout(() => { el.textContent = text; }, 20);
}


function log(msg, cls) {
  const el = document.getElementById("log");
  const div = document.createElement("div");
  if (cls) div.className = cls;
  div.textContent = msg;
  el.prepend(div);
}


function formatCost(n) {
  return Number.isFinite(n) ? String(n) : "—";
}


function fillRound(x, y, w, h, radius, color) {
  ctx.beginPath();
  ctx.fillStyle = color;
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, radius);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}


function strokeRound(x, y, w, h, radius, color, width) {
  ctx.beginPath();
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, radius);
  else ctx.rect(x, y, w, h);
  ctx.stroke();
}


function cellBox(r, c) {
  const g = 3.5;
  return [c * CELL + g, r * CELL + g, CELL - g * 2, CELL - g * 2];
}


function wrapText(text, x, y, maxWidth, lineHeight) {
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const words = text.split(" ");
  let line = "";
  let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
      lines++;
      if (lines >= 2) return;
    } else {
      line = test;
    }
  }
  if (line && lines < 2) ctx.fillText(line, x, y);
}


function warehouseLayout() {
  const padX = 28;
  const gap = 14;
  const y = 132;
  const h = VIEW - y - 24;
  const w = (VIEW - padX * 2 - gap * 2) / 3;
  return Object.keys(MATERIALS).map((id, i) => ({
    id,
    x: padX + i * (w + gap),
    y, w, h,
  }));
}


function hitBay(x, y) {
  for (const bay of warehouseLayout()) {
    if (x >= bay.x && x <= bay.x + bay.w && y >= bay.y && y <= bay.y + bay.h) return bay.id;
  }
  return null;
}


function draw() {
  ctx.clearRect(0, 0, VIEW, VIEW);
  if (phase === "dashboard") {
    drawWarehouse();
    return;
  }
  drawGrid();
}


function drawWarehouse() {
  ctx.fillStyle = "#f3f0ea";
  ctx.fillRect(0, 0, VIEW, VIEW);

  ctx.fillStyle = INK;
  ctx.font = `400 34px ${SERIF}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`Day ${state.day}`, 36, 28);

  ctx.fillStyle = "#5e5a54";
  ctx.font = `500 13px ${MONO}`;
  ctx.textAlign = "right";
  ctx.fillText(`₹${state.funds}`, VIEW - 36, 36);

  ctx.fillStyle = "#5e5a54";
  ctx.font = `400 15px ${SANS}`;
  wrapText(eventDescription(todayEvent), 36, 72, VIEW - 88, 22);

  for (const bay of warehouseLayout()) {
    const info = MATERIALS[bay.id];
    const hot = hoveredBay === bay.id;
    const cap = capacityFor();
    const amount = state.inventory[bay.id];
    const short = todayEvent.type === "shortage" && todayEvent.material === bay.id;

    fillRound(bay.x, bay.y, bay.w, bay.h, 18, hot ? "#ffffff" : PAPER);
    strokeRound(bay.x, bay.y, bay.w, bay.h, 18, hot ? INK : "rgba(28,25,23,0.08)", hot ? 1.5 : 1);

    const left = bay.x + 16;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#5e5a54";
    ctx.font = `500 12px ${MONO}`;
    ctx.fillText(info.mark, left, bay.y + 16);
    if (short) {
      ctx.fillStyle = "#9f3d3d";
      ctx.textAlign = "right";
      ctx.fillText("SHORT", bay.x + bay.w - 16, bay.y + 16);
    }

    ctx.textAlign = "left";
    ctx.fillStyle = INK;
    ctx.font = `400 28px ${SERIF}`;
    ctx.fillText(info.label, left, bay.y + 36);
    ctx.fillStyle = "#5e5a54";
    ctx.font = `500 13px ${MONO}`;
    ctx.fillText(`${amount} / ${cap}`, left, bay.y + 70);

    drawShelf(bay, amount, cap, info.color);

    ctx.font = `500 14px ${SANS}`;
    ctx.textAlign = "left";
    ctx.fillStyle = hot ? ACCENT : "#5e5a54";
    ctx.fillText(hot ? "Send the chicken" : "Open this bay", left, bay.y + bay.h - 28);
  }
}


function drawShelf(bay, amount, cap, color) {
  const pad = 16;
  const top = bay.y + 98;
  const bottom = bay.y + bay.h - 48;
  const availW = bay.w - pad * 2;
  const availH = Math.max(40, bottom - top);
  const cols = 4;
  const shown = Math.min(cap, 20);
  const rows = Math.ceil(shown / cols);
  const gap = 8;
  const slotW = (availW - gap * (cols - 1)) / cols;
  const slotH = (availH - gap * (rows - 1)) / rows;
  const ox = bay.x + pad;
  const oy = top;

  for (let i = 0; i < shown; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = ox + col * (slotW + gap);
    const y = oy + row * (slotH + gap);
    const filled = i < amount;
    fillRound(x, y, slotW, slotH, 7, filled ? color : "rgba(28,25,23,0.07)");
    if (!filled) {
      ctx.strokeStyle = "rgba(28,25,23,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}


function drawGrid() {
  ctx.fillStyle = "#f3f0ea";
  ctx.fillRect(0, 0, VIEW, VIEW);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const wall = wallCells.has(key(r, c));
      const [x, y, w, h] = cellBox(r, c);
      fillRound(x, y, w, h, 10, wall ? "#e4dfd4" : PAPER);
    }
  }

  if (phase === "planning") drawExplored();

  const deliveryColor = phase === "finished" ? YIELD_COLORS[deliveryYield] : ACCENT;
  if (phase === "planning") {
    drawRoute(previewPath.slice(0, vis.path), ACCENT, 3.25);
  } else if (trail.length > 1) {
    drawRoute(trail, phase === "finished" ? deliveryColor : "rgba(28,25,23,0.4)", phase === "finished" ? 3.25 : 2.5);
  }
  if (phase === "running") drawRoute(plannedPath.slice(segment), ACCENT, 3.25);

  ctx.font = `500 11px ${MONO}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#8a6232";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (costs[r][c] <= baseCellCost) continue;
      if (wallCells.has(key(r, c))) continue;
      if ((r === startNode.r && c === startNode.c && phase === "planning") || (r === goalNode.r && c === goalNode.c)) continue;
      const [x, y, w] = cellBox(r, c);
      ctx.fillText(String(costs[r][c]), x + w - 7, y + 6);
    }
  }

  if (phase === "planning") {
    drawTerminal(startNode, INK, "");
    drawChickenAt(startNode.c * CELL + CELL / 2, startNode.r * CELL + CELL / 2, 1, "right");
    drawTerminal(goalNode, ACCENT, "D");
    if (hoveredCell) {
      const [x, y, w, h] = cellBox(hoveredCell.r, hoveredCell.c);
      strokeRound(x, y, w, h, 10, INK, 1.5);
    }
  } else {
    const onGoal = playerPosition.r === goalNode.r && playerPosition.c === goalNode.c;
    drawTerminal(goalNode, deliveryColor, onGoal ? "" : "D");
    const nextStep = plannedPath[segment + 1];
    if (phase === "running" && nextStep && !recalculating) drawNext(nextStep.r, nextStep.c);
    drawChickenAt(playerPosition.c * CELL + CELL / 2, playerPosition.r * CELL + CELL / 2, 1.65, facing);
    if (penaltyCell && phase === "running") {
      ctx.font = `600 12px ${MONO}`;
      ctx.fillStyle = "#9f3d3d";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("+3", penaltyCell.c * CELL + CELL / 2, (penaltyCell.r + 1) * CELL - 5);
    }
  }

  if (phase === "running" && countdownLabel) {
    ctx.fillStyle = "rgba(243,240,234,0.82)";
    ctx.fillRect(0, 0, VIEW, VIEW);
    ctx.fillStyle = INK;
    ctx.font = `400 148px ${SERIF}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(countdownLabel, VIEW / 2, VIEW / 2 + 6);
  }
}


function drawExplored() {
  const settled = previewPath.length > 0 && vis.explored >= exploredCells.length && vis.path >= previewPath.length;
  if (settled) return;
  const cells = exploredCells.slice(0, vis.explored);
  const n = cells.length;
  cells.forEach((p, i) => {
    if ((p.r === startNode.r && p.c === startNode.c) || (p.r === goalNode.r && p.c === goalNode.c)) return;
    const latest = i >= n - 8;
    ctx.beginPath();
    ctx.fillStyle = latest ? ACCENT : "rgba(28,25,23,0.28)";
    ctx.arc(p.c * CELL + CELL / 2, p.r * CELL + CELL / 2, latest ? 4 : 2.3, 0, Math.PI * 2);
    ctx.fill();
  });
}


function drawRoute(path, color, width) {
  if (!path || path.length < 2) return;
  ctx.beginPath();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  path.forEach((p, i) => {
    const x = p.c * CELL + CELL / 2;
    const y = p.r * CELL + CELL / 2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}


function drawTerminal(node, color, label) {
  const [x, y, w, h] = cellBox(node.r, node.c);
  fillRound(x, y, w, h, 10, color);
  ctx.fillStyle = PAPER;
  ctx.font = `600 15px ${SANS}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
}


function drawChickenAt(x, y, scale, dir) {
  ctx.save();
  ctx.translate(x, y);
  const turn = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[dir] || 0;
  ctx.rotate(turn);
  ctx.scale(scale, scale);

  ctx.fillStyle = "rgba(28,25,23,0.14)";
  ctx.beginPath();
  ctx.ellipse(0, 11, 11, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 1.25;
  ctx.strokeStyle = INK;
  ctx.fillStyle = "#f7f4ee";
  ctx.beginPath();
  ctx.moveTo(-7, -1);
  ctx.lineTo(-15, -8);
  ctx.lineTo(-15, 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(-1, 1, 10, 7.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(-1, 2, 4.2, 3, 0.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(8, -3, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#c4534a";
  ctx.beginPath();
  ctx.arc(6.2, -8, 2.1, 0, Math.PI * 2);
  ctx.arc(9.1, -8.3, 1.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e2a23a";
  ctx.beginPath();
  ctx.moveTo(12, -4);
  ctx.lineTo(17.5, -2.1);
  ctx.lineTo(12, -0.4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(9.6, -3.4, 0.95, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#e2a23a";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-2, 8);
  ctx.lineTo(-4, 13);
  ctx.moveTo(3, 8);
  ctx.lineTo(4, 13);
  ctx.stroke();
  ctx.restore();
}


function drawNext(r, c) {
  ctx.beginPath();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1.5;
  ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, 13, 0, Math.PI * 2);
  ctx.stroke();
}


function setChrome({ badge, kicker, hint, dashboard = false, planning = false, run = false, restart = false, restartLabel = "Back to warehouse" }) {
  document.getElementById("phaseBadge").textContent = badge;
  document.getElementById("stageKicker").textContent = kicker;
  document.getElementById("stageHint").textContent = hint;
  document.getElementById("dashboardControls").hidden = !dashboard;
  document.getElementById("planningControls").hidden = !planning;
  document.getElementById("runControls").hidden = !run;
  const restartBtn = document.getElementById("btnRestart");
  restartBtn.hidden = !restart;
  restartBtn.textContent = restartLabel;
  const pad = document.getElementById("stagePad");
  pad.hidden = !run;
  if (!run) pad.classList.remove("is-locked");
  document.body.dataset.phase = phase;
  setNavVisible(dashboard);
  canvas.setAttribute("aria-label", `${kicker}. ${hint}`);
}


function clearBoardSearch() {
  vis.token++;
  previewPath = [];
  exploredCells = [];
  vis.explored = 0;
  vis.path = 0;
}


function goToDashboard({ newDay = false, announceDay = false } = {}) {
  clearInterval(countdownTimer);
  clearTimeout(toastTimeout);
  countdownTimer = null;
  countdownLabel = "";
  runReady = false;
  hideToast();
  phase = "dashboard";
  startNode = { ...START_NODE };
  goalNode = { ...DEFAULT_GOAL };
  placeMode = "start";
  penaltyCell = null;
  clearBoardSearch();
  plannedPath = [];
  currentMaterial = null;
  recalculating = false;
  hoveredBay = null;
  hoveredCell = null;
  tip.hidden = true;
  if (newDay) todayEvent = rollDailyEvent();
  renderDashboard();
  setChrome({
    badge: "Warehouse",
    kicker: activeCity().name,
    hint: "Select a bay to collect",
    dashboard: true,
  });
  document.getElementById("stats").textContent = "";
  document.getElementById("log").innerHTML = "";
  draw();
  if (announceDay) {
    showToast(eventDescription(todayEvent));
    announce(eventDescription(todayEvent));
  }
}


function goToPlanning() {
  phase = "planning";
  startNode = { ...START_NODE };
  goalNode = { ...DEFAULT_GOAL };
  placeMode = "start";
  penaltyCell = null;
  clearBoardSearch();
  seenRouteSignatures = new Set();
  seenMapSignatures = new Set();
  hoveredCell = null;
  tip.hidden = true;
  const city = activeCity();
  randomizeWalls(startNode, city.walls);
  if (todayEvent.type === "traffic") randomizeCosts(3, 8, startNode, city.traffic + 6);
  else randomizeCosts(1, 6, startNode, city.traffic);
  seenMapSignatures.add(mapSignature());
  const info = MATERIALS[currentMaterial];
  document.getElementById("planningHeading").textContent = `Plan the ${info.label.toLowerCase()} run`;
  setChrome({
    badge: `Planning · ${info.label}`,
    kicker: city.name,
    hint: "Move either end, then pick Dijkstra or A*.",
    planning: true,
    restart: true,
    restartLabel: "Cancel",
  });
  document.getElementById("stats").textContent = "";
  document.getElementById("log").innerHTML = "";
  updateChoiceUI();
  updatePlaceButtons();
  announce(`Planning the ${info.label} run.`);
  draw();
}


function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * VIEW / rect.width,
    y: (e.clientY - rect.top) * VIEW / rect.height,
  };
}


function cellTipText(r, c) {
  const where = `Row ${r + 1}  ·  Col ${c + 1}`;
  const cell = key(r, c);
  if (wallCells.has(cell)) return `${where}  ·  Wall`;
  if (r === goalNode.r && c === goalNode.c) return `${where}  ·  Delivery`;
  const cost = `Cost ${costs[r][c]}`;
  if (r === startNode.r && c === startNode.c) return `${where}  ·  Start  ·  ${cost}`;
  if (trafficCells.includes(cell)) return `${where}  ·  Traffic  ·  ${cost}`;
  return `${where}  ·  ${cost}`;
}


function positionTip(clientX, clientY) {
  tip.hidden = false;
  const pad = 12;
  const w = tip.offsetWidth;
  const h = tip.offsetHeight;
  let left = clientX + 14;
  let top = clientY + 16;
  if (left + w > window.innerWidth - pad) left = clientX - w - 14;
  if (top + h > window.innerHeight - pad) top = clientY - h - 12;
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

canvas.addEventListener("mousemove", (e) => {
  const p = canvasPoint(e);
  if (phase === "dashboard") {
    const bay = hitBay(p.x, p.y);
    canvas.style.cursor = bay ? "pointer" : "default";
    if (bay !== hoveredBay) {
      hoveredBay = bay;
      draw();
    }
    return;
  }
  if (phase !== "planning") {
    canvas.style.cursor = "default";
    return;
  }
  const c = Math.floor(p.x / CELL);
  const r = Math.floor(p.y / CELL);
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) {
    hoveredCell = null;
    tip.hidden = true;
    canvas.style.cursor = "default";
    draw();
    return;
  }
  const wall = wallCells.has(key(r, c));
  const onSource = r === startNode.r && c === startNode.c;
  const onDest = r === goalNode.r && c === goalNode.c;
  const blockedEnd = placeMode === "start" ? onDest : onSource;
  canvas.style.cursor = wall || blockedEnd ? "not-allowed" : "pointer";
  const same = hoveredCell && hoveredCell.r === r && hoveredCell.c === c;
  if (!same) {
    hoveredCell = { r, c };
    draw();
  }
  tip.textContent = cellTipText(r, c);
  positionTip(e.clientX, e.clientY);
});

canvas.addEventListener("mouseleave", () => {
  const shouldDraw = hoveredBay || hoveredCell;
  hoveredBay = null;
  hoveredCell = null;
  tip.hidden = true;
  canvas.style.cursor = "default";
  if (shouldDraw && (phase === "dashboard" || phase === "planning")) draw();
});

window.addEventListener("scroll", () => { tip.hidden = true; }, { passive: true });

canvas.addEventListener("click", (e) => {
  const p = canvasPoint(e);
  if (phase === "dashboard") {
    const id = hitBay(p.x, p.y);
    if (id) startMaterial(id);
    return;
  }
  if (phase !== "planning") return;
  const c = Math.floor(p.x / CELL);
  const r = Math.floor(p.y / CELL);
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
  if (wallCells.has(key(r, c))) {
    showToast("That tile is blocked.");
    return;
  }
  const label = placeMode === "goal" ? "Destination" : "Source";
  if (placeMode === "start" && r === goalNode.r && c === goalNode.c) {
    showToast("The destination is already on that tile.");
    return;
  }
  if (placeMode === "goal" && r === startNode.r && c === startNode.c) {
    showToast("The chicken already starts on that tile.");
    return;
  }
  if (placeMode === "goal") goalNode = { r, c };
  else startNode = { r, c };
  clearBoardSearch();
  updateChoiceUI();
  document.getElementById("stats").textContent = "";
  document.getElementById("stageHint").textContent = `${label} at row ${r + 1}, column ${c + 1}`;
  draw();
});


function updatePlaceButtons() {
  document.getElementById("btnPlaceStart").classList.toggle("is-selected", placeMode === "start");
  document.getElementById("btnPlaceGoal").classList.toggle("is-selected", placeMode === "goal");
}


function setPlaceMode(mode) {
  placeMode = mode;
  updatePlaceButtons();
  document.getElementById("stageHint").textContent = mode === "goal"
    ? "Click a tile to move the destination."
    : "Click a tile to move the source.";
}

document.getElementById("btnPlaceStart").onclick = () => setPlaceMode("start");
document.getElementById("btnPlaceGoal").onclick = () => setPlaceMode("goal");


function updateChoiceUI() {
  const ready = previewPath.length > 0;
  document.getElementById("btnLock").disabled = !ready;
  document.getElementById("btnPlanDijkstra").classList.toggle("is-selected", ready && algoUsed === "dijkstra");
  document.getElementById("btnPlanAstar").classList.toggle("is-selected", ready && algoUsed === "astar");
  document.getElementById("btnPlanDijkstra").setAttribute("aria-pressed", String(ready && algoUsed === "dijkstra"));
  document.getElementById("btnPlanAstar").setAttribute("aria-pressed", String(ready && algoUsed === "astar"));
}


function renderPreviewStats(results, algo) {
  const stats = document.getElementById("stats");
  const result = results[algo];
  if (!result.path.length) {
    stats.innerHTML = `<p class="lede">No route reaches delivery from this tile. Move the start, or shuffle the board.</p>`;
    return;
  }
  const card = (name, data, on) => `
    <div class="${on ? "is-on" : ""}">
      <span>${name}</span>
      <strong>${formatCost(data.cost)}</strong>
      <em>${data.explored.length} visited</em>
    </div>`;
  stats.innerHTML = `
    <div class="compare">
      ${card("Dijkstra", results.dijkstra, algo === "dijkstra")}
      ${card("A*", results.astar, algo === "astar")}
    </div>
    <p class="note">Visited is how much of the city each search opened. The cost is the route itself.</p>`;
}


function animateSearch() {
  const token = ++vis.token;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !exploredCells.length) {
    vis.explored = exploredCells.length;
    vis.path = previewPath.length;
    draw();
    return;
  }
  vis.explored = 0;
  vis.path = 0;
  draw();
  const exploreStep = Math.max(1, Math.ceil(exploredCells.length / 18));
  const pathStep = previewPath.length > 28 ? 2 : 1;
  const tick = () => {
    if (token !== vis.token || phase !== "planning") return;
    if (vis.explored < exploredCells.length) {
      vis.explored = Math.min(exploredCells.length, vis.explored + exploreStep);
      draw();
      requestAnimationFrame(tick);
      return;
    }
    if (vis.path < previewPath.length) {
      vis.path = Math.min(previewPath.length, vis.path + pathStep);
      draw();
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
}


function previewRoute(algo) {
  algoUsed = algo;
  const start = { ...startNode };
  const results = {
    dijkstra: dijkstra(costs, start, goalNode, wallCells),
    astar: astar(costs, start, goalNode, wallCells),
  };
  const result = results[algo];
  previewPath = result.path;
  optimalCost = result.cost;
  exploredCells = result.explored;
  if (result.path.length) seenRouteSignatures.add(routeSignature(result.path));
  updateChoiceUI();
  renderPreviewStats(results, algo);
  document.getElementById("stageHint").textContent = result.path.length
    ? `${algo === "astar" ? "A*" : "Dijkstra"} · cost ${result.cost}`
    : "No route from this tile";
  animateSearch();
}


function routeSignature(path) {
  return path.map(({ r, c }) => key(r, c)).join("|");
}


function mapSignature() {
  return [
    [...wallCells].sort().join(","),
    [...trafficCells].sort().join(","),
    baseCellCost,
  ].join(";");
}

document.getElementById("btnPlanDijkstra").onclick = () => previewRoute("dijkstra");
document.getElementById("btnPlanAstar").onclick = () => previewRoute("astar");

document.getElementById("btnRandomize").onclick = () => {
  const city = activeCity();
  const min = todayEvent.type === "traffic" ? 3 : 1;
  const max = todayEvent.type === "traffic" ? 8 : 6;
  const traffic = city.traffic + (todayEvent.type === "traffic" ? 6 : 0);
  const previousWalls = wallCells;
  const previousCosts = costs;
  const previousTrafficCells = trafficCells;
  const previousBaseCellCost = baseCellCost;
  let foundNewRoute = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    randomizeWalls(startNode, city.walls);
    randomizeCosts(min, max, startNode, traffic);
    const result = dijkstra(costs, startNode, goalNode, wallCells);
    const pathId = routeSignature(result.path);
    const mapId = mapSignature();
    if (result.path.length && !seenRouteSignatures.has(pathId) && !seenMapSignatures.has(mapId)) {
      foundNewRoute = true;
      break;
    }
  }
  if (!foundNewRoute) {
    wallCells = previousWalls;
    costs = previousCosts;
    trafficCells = previousTrafficCells;
    baseCellCost = previousBaseCellCost;
    showToast("Could not find a fresh board. Try again.");
    draw();
    return;
  }
  seenMapSignatures.add(mapSignature());
  clearBoardSearch();
  updateChoiceUI();
  document.getElementById("stats").textContent = "";
  document.getElementById("stageHint").textContent = "Board shuffled. Pick Dijkstra or A*.";
  draw();
};

document.getElementById("btnLock").onclick = () => {
  if (!previewPath.length) {
    showToast("Preview a route first.");
    return;
  }
  plannedPath = previewPath.map(({ r, c }) => ({ r, c }));
  vis.token++;
  startRun();
};


function renderLiveStats() {
  const left = recalculating ? "…" : Math.max(0, plannedPath.length - 1 - segment);
  document.getElementById("stats").innerHTML = `
    <dl class="ledger">
      <div><dt>Cost so far</dt><dd>${totalCost}</dd></div>
      <div><dt>Optimal</dt><dd>${formatCost(optimalCost)}</dd></div>
      <div><dt>Penalties</dt><dd>${penaltyCount}${penaltyCount ? ` · +${penaltyCount * 3}` : ""}</dd></div>
      <div><dt>Steps left</dt><dd>${left}</dd></div>
    </dl>`;
}


function startRun() {
  phase = "running";
  segment = 0;
  playerPosition = { ...plannedPath[0] };
  trail = [{ ...plannedPath[0] }];
  penaltyCell = null;
  const firstStep = plannedPath[1];
  facing = !firstStep ? "right"
    : firstStep.c > playerPosition.c ? "right"
    : firstStep.c < playerPosition.c ? "left"
    : firstStep.r > playerPosition.r ? "down" : "up";
  totalCost = 0;
  penaltyCount = 0;
  runReady = false;
  recalculating = false;
  tip.hidden = true;
  const info = MATERIALS[currentMaterial];
  setChrome({
    badge: `Run · ${info.label}`,
    kicker: info.label,
    hint: "Get ready",
    run: true,
    restart: true,
    restartLabel: "Quit run",
  });
  document.getElementById("stagePad").classList.add("is-locked");
  document.getElementById("log").innerHTML = "";
  log(`Route locked with ${algoUsed === "astar" ? "A*" : "Dijkstra"}. Optimal cost ${optimalCost}.`);
  renderLiveStats();

  let secondsLeft = 3;
  countdownLabel = "3";
  draw();
  countdownTimer = setInterval(() => {
    secondsLeft--;
    if (secondsLeft > 0) {
      countdownLabel = String(secondsLeft);
      draw();
      return;
    }
    clearInterval(countdownTimer);
    countdownTimer = null;
    countdownLabel = "";
    runReady = true;
    document.getElementById("stagePad").classList.remove("is-locked");
    document.getElementById("stageHint").textContent = "Guide the chicken";
    showToast("Go", 900);
    announce("Go");
    draw();
  }, 1000);
}

const DIRS = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};
const KEY_DIR = {
  arrowup: "up", w: "up",
  arrowdown: "down", s: "down",
  arrowleft: "left", a: "left",
  arrowright: "right", d: "right",
};


function flashDir(dir) {
  const btn = document.querySelector(`.stage-pad [data-dir="${dir}"]`);
  if (!btn) return;
  btn.classList.add("is-down");
  setTimeout(() => btn.classList.remove("is-down"), 120);
}


function tryMove(dr, dc) {
  if (phase !== "running" || !runReady || recalculating) return;
  const next = { r: playerPosition.r + dr, c: playerPosition.c + dc };
  if (next.r < 0 || next.r >= ROWS || next.c < 0 || next.c >= COLS || wallCells.has(key(next.r, next.c))) return;
  const nextStep = plannedPath[segment + 1];
  const matchesPlannedMove = nextStep && next.r === nextStep.r && next.c === nextStep.c;
  facing = dr < 0 ? "up" : dr > 0 ? "down" : dc < 0 ? "left" : "right";
  playerPosition = next;
  trail.push({ ...next });
  totalCost += costs[next.r][next.c];

  if (matchesPlannedMove) {
    segment++;
    penaltyCell = null;
    if (next.r === goalNode.r && next.c === goalNode.c) finishRun();
    else {
      renderLiveStats();
      draw();
    }
    return;
  }

  penaltyCount++;
  totalCost += 3;
  penaltyCell = { ...next };
  showToast("Off the path. Penalty +3.");
  log(`The chicken left the path at row ${next.r + 1}, column ${next.c + 1}. Penalty +3.`, "penalty");
  if (next.r === goalNode.r && next.c === goalNode.c) {
    finishRun();
    return;
  }

  recalculating = true;
  document.getElementById("stageHint").textContent = "Recalculating";
  plannedPath = [next];
  segment = 0;
  renderLiveStats();
  draw();
  worker.postMessage({
    ROWS, COLS,
    grid: costs,
    start: next,
    end: goalNode,
    walls: [...wallCells],
    algo: algoUsed,
    requestId: ++requestCounter,
  });
}

document.querySelectorAll(".stage-pad button").forEach((btn) => {
  let timer = null;
  const stop = () => {
    clearTimeout(timer);
    timer = null;
  };
  const fire = () => {
    const [dr, dc] = DIRS[btn.dataset.dir];
    tryMove(dr, dc);
  };
  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    btn.setPointerCapture(e.pointerId);
    fire();
    const repeat = () => {
      fire();
      timer = setTimeout(repeat, 140);
    };
    timer = setTimeout(repeat, 280);
  });
  btn.addEventListener("pointerup", stop);
  btn.addEventListener("pointercancel", stop);
});

window.addEventListener("keydown", (e) => {
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === "TEXTAREA" || tag === "INPUT") return;

  if (e.key === "Escape" && (phase === "planning" || phase === "finished")) {
    document.getElementById("btnRestart").click();
    return;
  }

  if (phase === "planning") {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === "d") { e.preventDefault(); previewRoute("dijkstra"); return; }
    if (k === "a") { e.preventDefault(); previewRoute("astar"); return; }
    if (k === "r") { e.preventDefault(); document.getElementById("btnRandomize").click(); return; }
    if (e.key === "Enter") {
      if (tag === "BUTTON") return;
      e.preventDefault();
      if (!previewPath.length) { showToast("Preview a route first."); return; }
      document.getElementById("btnLock").click();
    }
    return;
  }

  if (phase === "dashboard" && activeTab === "warehouse") {
    if (e.repeat) return;
    const material = { "1": "cream", "2": "sugar", "3": "dryice" }[e.key];
    if (material) {
      e.preventDefault();
      startMaterial(material);
    }
    return;
  }

  if (phase !== "running") return;
  const dir = KEY_DIR[e.key.toLowerCase()];
  if (!dir) return;
  e.preventDefault();
  flashDir(dir);
  const [dr, dc] = DIRS[dir];
  tryMove(dr, dc);
});

worker.onmessage = (e) => {
  if (phase !== "running" || e.data.requestId !== requestCounter) return;
  const { path, cost } = e.data;
  if (!path.length) {
    recalculating = false;
    runReady = false;
    countdownLabel = "";
    log("No route from that tile. The run has stopped.", "penalty");
    phase = "finished";
    setChrome({
      badge: "No route",
      kicker: "Stopped",
      hint: "This tile cannot reach delivery",
      restart: true,
      restartLabel: "Back to warehouse",
    });
    draw();
    return;
  }
  plannedPath = path;
  segment = 0;
  playerPosition = { ...path[0] };
  recalculating = false;
  document.getElementById("stageHint").textContent = "Guide the chicken";
  log(`Recalculated. Remaining cost ${cost}.`, "recalc");
  renderLiveStats();
  draw();
};


function finishRun() {
  runReady = false;
  clearTimeout(toastTimeout);
  hideToast();
  countdownLabel = "";
  phase = "finished";

  const efficiency = Math.max(0, Math.min(100, Math.round((optimalCost / totalCost) * 100)));
  const city = activeCity();
  const earnings = Math.max(MIN_PAYOUT, Math.round(BASE_PAYOUT * city.pay * (efficiency / 100)) - penaltyCount * 10);

  let materialWanted = Math.min(4, Math.max(1, Math.round(efficiency / 25)));
  const shortageHit = todayEvent.type === "shortage" && todayEvent.material === currentMaterial;
  if (shortageHit) materialWanted = Math.max(1, Math.floor(materialWanted / 2));

  const cap = capacityFor();
  const spaceLeft = Math.max(0, cap - state.inventory[currentMaterial]);
  const materialGained = Math.min(materialWanted, spaceLeft);
  const wasFull = materialGained < materialWanted;

  const opex = dailyOpex(state);
  let netFunds = earnings - opex;
  const bailoutUsed = netFunds < MIN_NET_PER_DAY;
  if (bailoutUsed) netFunds = MIN_NET_PER_DAY;

  state.funds += netFunds;
  state.inventory[currentMaterial] += materialGained;
  state.day += 1;
  state.bestEfficiency = Math.max(state.bestEfficiency, efficiency);
  deliveryYield = materialGained;
  saveState();
  renderMetrics();

  const info = MATERIALS[currentMaterial];
  setChrome({
    badge: "Delivered",
    kicker: info.label,
    hint: `${efficiency}% efficient`,
    restart: true,
    restartLabel: "Back to warehouse",
  });

  const notes = [];
  if (bailoutUsed) notes.push("A small bailout kept the day from clearing your funds.");
  if (shortageHit) notes.push(`${info.label} was short, so fewer units were stored.`);
  if (wasFull) notes.push(`Storage was full. Upgrade to keep the rest.`);

  const stats = document.getElementById("stats");
  stats.className = `stats yield-${materialGained}`;
  stats.innerHTML = `
    <p class="result-kicker">${info.label}</p>
    <p class="result-score">${efficiency}<span>%</span></p>
    <div class="meter" aria-hidden="true"><div style="width:${efficiency}%"></div></div>
    <dl class="ledger">
      <div><dt>City</dt><dd>${city.name} · ${city.pay}×</dd></div>
      <div><dt>Route cost</dt><dd>${totalCost} <em>/ ${formatCost(optimalCost)}</em></dd></div>
      <div><dt>Deviations</dt><dd>${penaltyCount}</dd></div>
      <div><dt>Earnings</dt><dd>₹${earnings}</dd></div>
      <div><dt>Operating cost</dt><dd>−₹${opex}</dd></div>
      <div class="ledger-net"><dt>Net</dt><dd>${netFunds >= 0 ? "+" : "−"}₹${Math.abs(netFunds)}</dd></div>
      <div><dt>Stored</dt><dd>+${materialGained}</dd></div>
    </dl>
    ${notes.map((n) => `<p class="note">${n}</p>`).join("")}
  `;
  document.getElementById("log").innerHTML = "";
  announce(`${info.label} delivered. ${efficiency}% efficient.`);
  const bar = document.querySelector("#stats .meter > div");
  if (bar) {
    bar.style.width = "0";
    requestAnimationFrame(() => { bar.style.width = `${efficiency}%`; });
  }
  draw();
}

document.getElementById("btnRestart").onclick = () => {
  const finished = phase === "finished";
  goToDashboard({ newDay: finished, announceDay: finished });
};

let activeTab = "warehouse";


function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.getElementById("warehouseSection").hidden = tab !== "warehouse";
  document.getElementById("upgradesSection").hidden = tab !== "upgrades";
  document.getElementById("citiesSection").hidden = tab !== "cities";
  document.getElementById("transferSection").hidden = tab !== "transfer";
  if (tab === "upgrades") renderUpgradesTab();
  if (tab === "cities") showCities();
  if (tab === "warehouse") draw();
}

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.onclick = () => switchTab(btn.dataset.tab);
});

function setNavVisible(visible) {
  document.querySelector(".bottom-nav").style.display = visible ? "flex" : "none";
}

let focusedCity = "newyork";
let cityBuyArmed = null;
let cityBuyTimer = null;


function showCities() {
  if (!state.ownedCities.includes(focusedCity)) focusedCity = state.activeCity;
  renderCities();
  drawCityMap();
}


function nextLockedCity() {
  return CITIES.find((city) => !state.ownedCities.includes(city.id))?.id || null;
}


function renderCities() {
  const list = document.getElementById("cityList");
  if (!list) return;
  const nextId = nextLockedCity();
  list.innerHTML = "";
  CITIES.forEach((city, index) => {
    const owned = state.ownedCities.includes(city.id);
    const driving = state.activeCity === city.id;
    const isNext = city.id === nextId;
    const card = document.createElement("article");
    card.dataset.city = city.id;
    card.className = "card city-card" + (driving ? " is-live" : "") + (focusedCity === city.id ? " is-focus" : "");
    const status = driving ? "Driving" : owned ? "Owned" : isNext ? "Next layer" : "Locked";
    const payLabel = city.pay === 1 ? "Standard pay" : `${city.pay}× pay`;
    card.innerHTML = `
      <p class="kicker">Layer ${index + 1} · ${status}</p>
      <h3>${city.name}</h3>
      <p>${city.note}</p>
      <p class="pay">${payLabel} · ${city.walls} walls · ${city.traffic} traffic tiles</p>
    `;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn gap-top " + (owned && !driving ? "primary" : "ghost");
    if (driving) {
      button.textContent = "On this map";
      button.disabled = true;
    } else if (owned) {
      button.className = "btn primary gap-top";
      button.textContent = "Drive this city";
      button.onclick = () => driveCity(city.id);
    } else if (!isNext) {
      button.textContent = "Locked";
      button.disabled = true;
    } else if (state.funds < city.price) {
      button.textContent = `Need ₹${city.price - state.funds} more`;
      button.disabled = true;
    } else if (cityBuyArmed === city.id) {
      button.className = "btn primary gap-top is-armed";
      button.textContent = `Confirm ₹${city.price}`;
      button.onclick = () => buyCity(city.id);
    } else {
      button.textContent = `Unlock · ₹${city.price}`;
      button.onclick = () => buyCity(city.id);
    }
    card.appendChild(button);
    card.addEventListener("click", (event) => {
      if (event.target === button) return;
      focusedCity = city.id;
      markFocusedCity();
      drawCityMap();
    });
    list.appendChild(card);
  });
}


function buyCity(id) {
  const city = cityById(id);
  if (id !== nextLockedCity() || state.funds < city.price) return;
  if (cityBuyArmed !== id) {
    cityBuyArmed = id;
    focusedCity = id;
    clearTimeout(cityBuyTimer);
    cityBuyTimer = setTimeout(() => {
      if (cityBuyArmed === id) {
        cityBuyArmed = null;
        renderCities();
      }
    }, 2800);
    renderCities();
    drawCityMap();
    return;
  }
  clearTimeout(cityBuyTimer);
  cityBuyArmed = null;
  state.funds -= city.price;
  state.ownedCities.push(id);
  state.activeCity = id;
  focusedCity = id;
  saveState();
  renderDashboard();
  renderCities();
  drawCityMap();
  if (phase === "dashboard") draw();
  showToast(`${city.name} is open`);
}


function driveCity(id) {
  if (!state.ownedCities.includes(id)) return;
  state.activeCity = id;
  focusedCity = id;
  saveState();
  renderDashboard();
  switchTab("warehouse");
  showToast(`Driving ${cityById(id).name}`);
}


function roundBox(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}


function markFocusedCity() {
  document.querySelectorAll("#cityList .city-card").forEach((card) => {
    card.classList.toggle("is-focus", card.dataset.city === focusedCity);
  });
}


function fitCityPane() {
  const list = document.getElementById("cityList");
  if (!list) return;
  const cards = [...list.children].slice(0, 3);
  if (cards.length < 3) return;
  const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
  const height = Math.ceil(cards.reduce((sum, card) => sum + card.getBoundingClientRect().height, 0) + gap * (cards.length - 1));
  list.style.height = `${height}px`;
  const mapCard = document.querySelector(".map-card");
  if (mapCard) mapCard.style.height = `${height}px`;
}


function cityNode(index, width, height) {
  const cols = 5;
  const row = Math.floor(index / cols);
  const colInRow = index % cols;
  const col = row % 2 === 0 ? colInRow : cols - 1 - colInRow;
  const padX = Math.max(120, width * 0.1);
  const top = Math.max(78, height * 0.18);
  const bottom = height - Math.max(86, height * 0.2);
  return {
    x: padX + col * ((width - padX * 2) / (cols - 1)),
    y: row === 0 ? top : bottom,
  };
}

let mapDraw = { w: MAP_W, h: MAP_H };


function drawCityMap() {
  const map = document.getElementById("cityMap");
  const section = document.getElementById("citiesSection");
  if (!map || !section || section.hidden) return;
  fitCityPane();
  const rect = map.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return;
  const width = rect.width;
  const height = rect.height;
  mapDraw = { w: width, h: height };
  const c = map.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  map.width = width * dpr;
  map.height = height * dpr;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);

  c.fillStyle = "#e4dfd6";
  c.fillRect(0, 0, width, height);

  c.lineCap = "round";
  c.lineJoin = "round";
  for (let index = 0; index < CITIES.length - 1; index++) {
    const a = cityNode(index, width, height);
    const b = cityNode(index + 1, width, height);
    const linked = state.ownedCities.includes(CITIES[index].id) && state.ownedCities.includes(CITIES[index + 1].id);
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.strokeStyle = linked ? "#1e5c40" : "rgba(28,25,23,0.28)";
    c.lineWidth = linked ? 4 : 2.5;
    c.stroke();
  }

  const nextId = nextLockedCity();
  const nodeRadius = Math.max(28, Math.min(width, height) * 0.055);
  CITIES.forEach((city, index) => {
    const point = cityNode(index, width, height);
    const owned = state.ownedCities.includes(city.id);
    const driving = state.activeCity === city.id;
    const isNext = city.id === nextId;
    const focused = focusedCity === city.id;
    const radius = driving ? nodeRadius + 8 : nodeRadius;

    c.beginPath();
    c.arc(point.x, point.y, radius, 0, Math.PI * 2);
    c.fillStyle = driving ? "#1e5c40" : owned ? "#fbfaf7" : isNext ? "#f7f1e4" : "rgba(251,250,247,0.7)";
    c.fill();
    c.lineWidth = focused || isNext ? 2.5 : 1.25;
    c.strokeStyle = driving ? "#143f2c" : focused ? "#1c1917" : "rgba(28,25,23,0.28)";
    c.stroke();

    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = driving ? "#fbfaf7" : "#1c1917";
    c.font = `500 15px ${MONO}`;
    c.fillText(String(index + 1), point.x, point.y + 0.5);

    const detail = driving ? "Driving" : owned ? "Owned" : `₹${city.price}`;
    c.textBaseline = "top";
    c.fillStyle = owned || isNext ? "#1c1917" : "#6d6862";
    c.font = `400 20px ${SERIF}`;
    c.fillText(city.name, point.x, point.y + radius + 12);
    c.fillStyle = "#5e5a54";
    c.font = `500 13px ${MONO}`;
    c.fillText(detail, point.x, point.y + radius + 36);
  });
}

document.getElementById("cityMap").addEventListener("click", (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * mapDraw.w;
  const y = (e.clientY - rect.top) / rect.height * mapDraw.h;
  let hit = null;
  let best = Math.max(64, Math.min(mapDraw.w, mapDraw.h) * 0.08);
  CITIES.forEach((city, index) => {
    const point = cityNode(index, mapDraw.w, mapDraw.h);
    const dist = Math.hypot(x - point.x, y - point.y);
    if (dist < best) {
      best = dist;
      hit = city;
    }
  });
  if (!hit) return;
  focusedCity = hit.id;
  markFocusedCity();
  drawCityMap();
  const list = document.getElementById("cityList");
  const card = list?.querySelector(`[data-city="${hit.id}"]`);
  if (!list || !card) return;
  const top = card.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  list.scrollTo({ top, behavior: motion });
});

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => draw());
}

goToDashboard({ newDay: true });
