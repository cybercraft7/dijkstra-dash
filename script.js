const ROWS = 12, COLS = 12;
const CELL_W = 60, CELL_H = 60;
const START_NODE = { r: 1, c: 1 };
const GOAL_NODE = { r: 10, c: 10 };
let wallCells = new Set([
  "3,2", "3,3", "3,4", "3,5",
  "7,6", "7,7", "7,8",
]);
let trafficCells = [];
let costs = [];
let baseCellCost = 1;

function randomizeCosts(min = 1, max = 6, start = START_NODE) {
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
        cell !== key(GOAL_NODE.r, GOAL_NODE.c)
      ) {
        availableCells.push(cell);
      }
    }
  }
  shuffle(availableCells);
  const trafficCount = 10 + Math.floor(Math.random() * 9);
  trafficCells = availableCells.slice(0, trafficCount);
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

function randomizeWalls(start) {
  const protectedCells = new Set([
    key(start.r, start.c),
    key(GOAL_NODE.r, GOAL_NODE.c),
  ]);
  for (const point of [start, GOAL_NODE]) {
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
  const wallCount = 14 + Math.floor(Math.random() * 10);
  wallCells = new Set(candidates.slice(0, wallCount));
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

// =========================================================
// Web Worker — unchanged from Week 4 (verified: parses correctly
// and its output matches direct computation).
// =========================================================
const workerSrc = `
  ${key.toString()}
  ${neighbors.toString().replace(/ROWS/g, 'self.__ROWS').replace(/COLS/g, 'self.__COLS')}
  ${dijkstra.toString().replace(/ROWS/g, 'self.__ROWS').replace(/COLS/g, 'self.__COLS')}
  ${astar.toString().replace(/ROWS/g, 'self.__ROWS').replace(/COLS/g, 'self.__COLS')}
  ${reconstruct.toString()}

  self.onmessage = function(e) {
    self.__ROWS = e.data.ROWS;
    self.__COLS = e.data.COLS;
    const blocked = new Set(e.data.walls);
    const algo = e.data.algo === 'astar' ? astar : dijkstra;
    const result = algo(e.data.grid, e.data.start, e.data.end, blocked);
    self.postMessage({ path: result.path, cost: result.cost, requestId: e.data.requestId });
  };
`;
const worker = new Worker(URL.createObjectURL(new Blob([workerSrc], { type: "application/javascript" })));

// =========================================================
// NEW — Warehouse / economy state + LocalStorage save
// =========================================================
const SAVE_KEY = "dijkstraDash_save_v1";
const MATERIALS = {
  cream:  { label: "Cream",   color: "#F2A93B" },
  sugar:  { label: "Sugar",   color: "#2F6FED" },
  dryice: { label: "Dry Ice", color: "#0E9C8C" },
};
const BASE_PAYOUT = 100;
const MIN_PAYOUT = 20; // bailout floor — a bad run can't soft-lock the save
const MIN_NET_PER_DAY = 5; // bailout floor #2 — OPEX alone can't soft-lock the save either

function dailyOpex(s) {
  return 20 + (s.warehouseLevel - 1) * 8; // bigger warehouse = more overhead
}

function upgradeCost(s) {
  return 150 * s.warehouseLevel; // each level costs more than the last
}

// ---------- Daily events: "traffic jams" and "supplier shortages" ----------
const EVENT_TYPES = ["normal", "traffic", "shortage"];
const EVENT_WEIGHTS = [0.5, 0.25, 0.25]; // 50% normal, 25% traffic jam, 25% shortage

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
  if (ev.type === "traffic") return "🚧 Citywide traffic jam — routes cost more today.";
  if (ev.type === "shortage") return `⚠ ${MATERIALS[ev.material].label} shortage — that run yields half the usual units today.`;
  return "✅ Normal operations today.";
}

function defaultState() {
  return {
    funds: 200,
    day: 1,
    warehouseLevel: 1,
    inventory: { cream: 0, sugar: 0, dryice: 0 },
    bestEfficiency: 0,
  };
}

function sanitizeState(parsed) {
  // Shared by loadState() and importSave() — merges any partial/foreign
  // object with defaults so neither a corrupted localStorage entry nor a
  // hand-edited/older-format import code can crash the UI.
  return { ...defaultState(), ...parsed, inventory: { ...defaultState().inventory, ...(parsed.inventory || {}) } };
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

// ---------- "Digital Shipping Manifesto" — Base64 cross-device transfer ----------
function encodeSave(s) {
  const json = JSON.stringify(s);
  return btoa(unescape(encodeURIComponent(json))); // unicode-safe base64
}

function decodeSave(code) {
  const json = decodeURIComponent(escape(atob(code.trim())));
  return JSON.parse(json);
}

function capacityFor(material) {
  return 10 * state.warehouseLevel;
}

let state = loadState();
let currentMaterial = null;
let todayEvent = { type: "normal" };

function renderDashboard() {
  document.getElementById("dashFunds").textContent = `₹${state.funds}`;
  document.getElementById("dashDay").textContent = state.day;
  document.getElementById("dashLevel").textContent = state.warehouseLevel;
  document.getElementById("dashOpex").textContent = `₹${dailyOpex(state)}/day`;

  document.getElementById("resFunds").textContent = `₹${state.funds}`;
  document.getElementById("resDay").textContent = state.day;
  document.getElementById("resLevel").textContent = state.warehouseLevel;
  document.getElementById("resOpex").textContent = dailyOpex(state);

  const banner = document.getElementById("eventBanner");
  banner.textContent = eventDescription(todayEvent);
  banner.className = "event-banner " + todayEvent.type;

  const list = document.getElementById("inventoryList");
  list.innerHTML = "";
  for (const [id, info] of Object.entries(MATERIALS)) {
    const amount = state.inventory[id];
    const cap = capacityFor(id);
    const pct = Math.min(100, Math.round((amount / cap) * 100));
    const row = document.createElement("div");
    row.className = "material-row";
    row.innerHTML = `
      <div class="material-label"><span>${info.label}</span><span>${amount} / ${cap}</span></div>
      <div class="material-bar-bg"><div class="material-bar-fill" style="width:${pct}%;background:${info.color}"></div></div>
    `;
    list.appendChild(row);
  }

  renderUpgradesTab();
}

function renderUpgradesTab() {
  const currentCap = capacityFor("cream");
  const nextLevel = state.warehouseLevel + 1;
  const nextCap = 10 * nextLevel;
  const cost = upgradeCost(state);
  const nextOpex = 20 + (nextLevel - 1) * 8;

  document.getElementById("upLevel").textContent = state.warehouseLevel;
  document.getElementById("upCapacityFill").style.width = Math.min(100, (currentCap / 100) * 100) + "%";
  document.getElementById("upCurrentCap").textContent = currentCap;
  document.getElementById("upNextCap").textContent = nextCap;
  document.getElementById("upCost").textContent = `₹${cost}`;
  document.getElementById("upNextOpex").textContent = `₹${nextOpex}/day`;
  document.getElementById("upFundsAvail").textContent = `₹${state.funds}`;

  const btn = document.getElementById("btnUpgrade2");
  btn.disabled = state.funds < cost;
  btn.style.opacity = state.funds < cost ? 0.5 : 1;
  btn.textContent = state.funds < cost ? `Need ₹${cost - state.funds} more` : `Upgrade to Lv.${nextLevel}`;
}

document.querySelectorAll(".material-btn").forEach((btn) => {
  btn.onclick = () => {
    currentMaterial = btn.dataset.material;
    goToPlanning();
  };
});

document.getElementById("btnUpgrade2").onclick = () => {
  const cost = upgradeCost(state);
  if (state.funds < cost) return;
  state.funds -= cost;
  state.warehouseLevel += 1;
  saveState();
  renderDashboard();
  draw();
};

document.getElementById("btnResetSave").onclick = () => {
  if (!confirm("Reset all saved progress? This can't be undone.")) return;
  state = defaultState();
  todayEvent = rollDailyEvent();
  saveState();
  renderDashboard();
  draw();
};

// =========================================================
// NEW — Export / Import ("Digital Shipping Manifesto")
// =========================================================
document.getElementById("btnExport").onclick = () => {
  const code = encodeSave(state);
  const box = document.getElementById("exportOutput");
  box.value = code;
  box.style.display = "block";
  document.getElementById("btnCopyExport").style.display = "block";
  document.getElementById("exportStatus").textContent = `Code generated — ${code.length} characters. Copy it and paste it into Dijkstra Dash on another device.`;
};

document.getElementById("btnCopyExport").onclick = async () => {
  const box = document.getElementById("exportOutput");
  box.select();
  box.setSelectionRange(0, box.value.length);
  const status = document.getElementById("exportStatus");
  try {
    await navigator.clipboard.writeText(box.value);
    status.textContent = "Copied to clipboard!";
  } catch (e) {
    // Clipboard API needs a secure context (https/localhost); file:// or
    // http:// pages fall back to manual copy — the text is already
    // selected above, so Ctrl+C / Cmd+C works immediately.
    status.textContent = "Couldn't access the clipboard automatically — the code above is selected, press Ctrl+C (or Cmd+C) to copy it.";
  }
};

document.getElementById("btnImport").onclick = () => {
  const raw = document.getElementById("importInput").value;
  const status = document.getElementById("importStatus");
  if (!raw.trim()) {
    status.textContent = "Paste an export code first.";
    return;
  }
  if (!confirm("This will replace your current warehouse progress with the imported save. Continue?")) return;

  try {
    const decoded = decodeSave(raw);
    state = sanitizeState(decoded);
    todayEvent = rollDailyEvent();
    saveState();
    renderDashboard();
    draw();
    status.textContent = `Save loaded — Day ${state.day}, ₹${state.funds} funds, warehouse Lv.${state.warehouseLevel}.`;
    document.getElementById("importInput").value = "";
  } catch (e) {
    status.textContent = "That code couldn't be read — check that you copied the whole thing, with nothing added or missing.";
  }
};

// =========================================================
// Canvas + phase state
// =========================================================
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const OFFSET_X = (canvas.width - COLS * CELL_W) / 2;

let phase = "dashboard"; // "dashboard" | "planning" | "running" | "finished"
let startNode = { ...START_NODE };
let previewPath = [];
let plannedPath = [];
let algoUsed = "dijkstra";
let optimalCost = null;

let segment = 0;
let playerPosition = { ...START_NODE };
let totalCost = 0;
let penaltyCount = 0;
let recalculating = false;
let countdownTimer = null;
let toastTimeout = null;
let runReady = false;
let seenRouteSignatures = new Set();
let seenMapSignatures = new Set();
const gameToast = document.getElementById("gameToast");

function showToast(message) {
  clearTimeout(toastTimeout);
  gameToast.textContent = message;
  gameToast.classList.add("visible");
}

function hideToast() {
  gameToast.classList.remove("visible");
}

function log(msg, cls) {
  const el = document.getElementById("log");
  const div = document.createElement("div");
  if (cls) div.className = cls;
  div.textContent = msg;
  el.prepend(div);
}

// ---------- Drawing ----------
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (phase === "dashboard") {
    drawWarehouseVisual();
    return;
  }

  const emphasizeRoute = phase === "planning"
    ? previewPath.length > 0
    : phase === "running" || phase === "finished";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cellKey = key(r, c);
      const isStart = r === startNode.r && c === startNode.c;
      const isGoal = r === GOAL_NODE.r && c === GOAL_NODE.c;
      const isWall = wallCells.has(cellKey);
      const isTraffic = trafficCells.includes(cellKey);
      ctx.fillStyle = isWall
        ? (emphasizeRoute ? "#344256" : "#87949A")
        : isStart ? "#18B981"
        : isGoal ? "#F34566"
        : emphasizeRoute ? "#1E293B"
        : isTraffic ? "#FFD39A"
        : "#F8FBF8";
      ctx.fillRect(c * CELL_W, r * CELL_H, CELL_W, CELL_H);
      ctx.strokeStyle = emphasizeRoute ? "#172235" : "#cbd9cd";
      ctx.strokeRect(c * CELL_W, r * CELL_H, CELL_W, CELL_H);
    }
  }

  const pathToShow = phase === "planning" ? previewPath : plannedPath;
  ctx.fillStyle = "#0F9B91";
  pathToShow.forEach(({ r, c }) => {
    if (wallCells.has(key(r, c)) || (r === startNode.r && c === startNode.c) || (r === GOAL_NODE.r && c === GOAL_NODE.c)) return;
    ctx.fillRect(c * CELL_W, r * CELL_H, CELL_W, CELL_H);
  });

  if (emphasizeRoute) {
    trafficCells.forEach((cell) => {
      const [r, c] = cell.split(",").map(Number);
      if (r === startNode.r && c === startNode.c) return;
      ctx.fillStyle = "#F2A93B";
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`+${costs[r][c] - baseCellCost}`, c * CELL_W + CELL_W / 2, r * CELL_H + CELL_H / 2);
    });
  } else {
    trafficCells.forEach((cell) => {
      const [r, c] = cell.split(",").map(Number);
      ctx.fillStyle = "#9B4B12";
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`+${costs[r][c] - baseCellCost}`, c * CELL_W + CELL_W / 2, r * CELL_H + CELL_H / 2);
    });
  }

  if (phase === "planning") {
    drawCellLabel(startNode.r, startNode.c, "S");
    drawCellLabel(GOAL_NODE.r, GOAL_NODE.c, "G");
  } else if (phase === "running") {
    const nextStep = plannedPath[segment + 1];
    if (nextStep) drawGhost(nextStep.r, nextStep.c);
    drawMarker(playerPosition.r, playerPosition.c, "#0E9C8C", "");
    if (recalculating) {
      ctx.fillStyle = "rgba(30,39,97,0.75)";
      ctx.fillRect(0, 0, canvas.width, 60);
      ctx.fillStyle = "white";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Recalculating route...", canvas.width / 2, 35);
    }
  }
}

function drawCellLabel(r, c, label) {
  ctx.fillStyle = "white";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, c * CELL_W + CELL_W / 2, r * CELL_H + CELL_H / 2);
}

function drawWarehouseVisual() {
  ctx.fillStyle = "#1E2761";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Warehouse — Day " + state.day, canvas.width / 2, 40);
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#9FB0DD";
  ctx.fillText(`Lv.${state.warehouseLevel}  ·  OPEX ₹${dailyOpex(state)}/day`, canvas.width / 2, 60);
  if (todayEvent.type !== "normal") {
    ctx.fillStyle = todayEvent.type === "traffic" ? "#F2A93B" : "#E8536A";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(eventDescription(todayEvent), canvas.width / 2, 80);
  }

  const ids = Object.keys(MATERIALS);
  const barWidth = 70;
  const gap = 40;
  const totalWidth = ids.length * barWidth + (ids.length - 1) * gap;
  let x = (canvas.width - totalWidth) / 2;
  const baseY = canvas.height - 60;
  const maxBarHeight = 420;

  ids.forEach((id) => {
    const info = MATERIALS[id];
    const cap = capacityFor(id);
    const amount = state.inventory[id];
    const h = Math.max(4, (amount / cap) * maxBarHeight);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x, baseY - maxBarHeight, barWidth, maxBarHeight);

    ctx.fillStyle = info.color;
    ctx.fillRect(x, baseY - h, barWidth, h);

    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.strokeRect(x, baseY - maxBarHeight, barWidth, maxBarHeight);

    ctx.fillStyle = "white";
    ctx.font = "12px sans-serif";
    ctx.fillText(info.label, x + barWidth / 2, baseY + 20);
    ctx.fillText(`${amount}/${cap}`, x + barWidth / 2, baseY + 36);

    x += barWidth + gap;
  });
}

function drawMarker(vr, c, color, label) {
  const x = OFFSET_X + c * CELL_W + CELL_W / 2;
  const y = vr * CELL_H + CELL_H / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 17, 0, Math.PI * 2);
  ctx.fill();
  if (label) {
    ctx.fillStyle = "white";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y);
  }
}

function drawGhost(vr, c) {
  const x = OFFSET_X + c * CELL_W + CELL_W / 2;
  const y = vr * CELL_H + CELL_H / 2;
  ctx.strokeStyle = "#F2A93B";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 21, 0, Math.PI * 2);
  ctx.stroke();
}

// ---------- Phase transitions ----------
function setPhaseUI(badgeText, badgeColor, { dashboard = false, planning = false, run = false, restartVisible = false }) {
  document.getElementById("phaseBadge").textContent = badgeText;
  document.getElementById("phaseBadge").style.background = badgeColor;
  document.getElementById("dashboardControls").style.display = dashboard ? "block" : "none";
  document.getElementById("planningControls").style.display = planning ? "block" : "none";
  document.getElementById("runControls").style.display = run ? "block" : "none";
  document.getElementById("btnRestart").style.display = restartVisible ? "block" : "none";
  setNavVisible(dashboard);
}

function goToDashboard({ newDay = false } = {}) {
  clearInterval(countdownTimer);
  clearTimeout(toastTimeout);
  countdownTimer = null;
  runReady = false;
  hideToast();
  phase = "dashboard";
  startNode = { ...START_NODE };
  previewPath = []; plannedPath = []; currentMaterial = null;
  recalculating = false;
  if (newDay) todayEvent = rollDailyEvent();
  renderDashboard();
  setPhaseUI("WAREHOUSE", "var(--navy)", { dashboard: true });
  document.getElementById("stats").textContent = "";
  document.getElementById("log").innerHTML = "";
  draw();
}

function goToPlanning() {
  phase = "planning";
  startNode = { ...START_NODE };
  previewPath = [];
  seenRouteSignatures = new Set();
  seenMapSignatures = new Set();
  if (todayEvent.type === "traffic") {
    randomizeCosts(3, 8); // citywide traffic jam — everything costs more today
  } else {
    randomizeCosts(1, 6);
  }
  seenMapSignatures.add(mapSignature());
  const info = MATERIALS[currentMaterial];
  document.getElementById("planningHeading").textContent = `1. Plan your route — collecting ${info.label}`;
  setPhaseUI(`PLANNING · ${info.label.toUpperCase()}`, "var(--blue)", { planning: true, restartVisible: true });
  document.getElementById("stats").textContent = "Pick a start lane to preview a route.";
  draw();
}

// ---------- Planning phase ----------
canvas.addEventListener("click", (e) => {
  if (phase !== "planning") return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * canvas.width / rect.width - OFFSET_X;
  const y = (e.clientY - rect.top) * canvas.height / rect.height;
  const c = Math.floor(x / CELL_W);
  const r = Math.floor(y / CELL_H);
  if (r >= 0 && r < ROWS && c >= 0 && c < COLS && !wallCells.has(key(r, c)) && key(r, c) !== key(GOAL_NODE.r, GOAL_NODE.c)) {
    startNode = { r, c };
    previewPath = [];
    draw();
    document.getElementById("stats").textContent = `Start placed at row ${r + 1}, column ${c + 1}. Preview a route.`;
  }
});

function previewRoute(algo) {
  algoUsed = algo;
  const start = { ...startNode };
  const end = GOAL_NODE;
  const results = {
    dijkstra: dijkstra(costs, start, end, wallCells),
    astar: astar(costs, start, end, wallCells),
  };
  const result = results[algo];
  previewPath = result.path;
  optimalCost = result.cost;
  if (result.path.length) seenRouteSignatures.add(routeSignature(result.path));
  draw();
  if (!result.path.length) {
    document.getElementById("stats").textContent = "No route reaches the delivery goal. Choose another start tile.";
    return;
  }
  document.getElementById("stats").innerHTML =
    `<b>Selected:</b> ${algo === "astar" ? "A*" : "Dijkstra"} · ${result.explored.length} cells visited<br/>` +
    `<b>Dijkstra:</b> ${results.dijkstra.cost} cost · ${results.dijkstra.explored.length} visited<br/>` +
    `<b>A*:</b> ${results.astar.cost} cost · ${results.astar.explored.length} visited<br/>` +
    `<span>Both find the same optimal delivery cost. Switch previews to compare their search shapes.</span>`;
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
  const min = todayEvent.type === "traffic" ? 3 : 1;
  const max = todayEvent.type === "traffic" ? 8 : 6;
  const previousWalls = wallCells;
  const previousCosts = costs;
  const previousTrafficCells = trafficCells;
  const previousBaseCellCost = baseCellCost;
  let foundNewRoute = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    randomizeWalls(startNode);
    randomizeCosts(min, max, startNode);
    const result = algoUsed === "astar"
      ? astar(costs, startNode, GOAL_NODE, wallCells)
      : dijkstra(costs, startNode, GOAL_NODE, wallCells);
    const pathId = routeSignature(result.path);
    const mapId = mapSignature();
    if (
      result.path.length &&
      !seenRouteSignatures.has(pathId) &&
      !seenMapSignatures.has(mapId)
    ) {
      foundNewRoute = true;
      break;
    }
  }
  if (!foundNewRoute) {
    wallCells = previousWalls;
    costs = previousCosts;
    trafficCells = previousTrafficCells;
    baseCellCost = previousBaseCellCost;
    document.getElementById("stats").textContent = "Couldn't generate a new route this time. Try randomizing again.";
    draw();
    return;
  }
  seenMapSignatures.add(mapSignature());
  previewRoute(algoUsed);
  document.getElementById("stats").innerHTML += "<br/><span>New hurdles, traffic, and route generated.</span>";
};

document.getElementById("btnLock").onclick = () => {
  if (!previewPath.length) return alert("Preview a route with Dijkstra or A* first.");
  plannedPath = previewPath.map(({ r, c }) => ({ r, c }));
  startRun();
};

// ---------- Run phase ----------
function startRun() {
  phase = "running";
  segment = 0;
  playerPosition = { ...plannedPath[0] };
  totalCost = 0;
  penaltyCount = 0;
  runReady = false;
  const info = MATERIALS[currentMaterial];
  setPhaseUI(`RUN · ${info.label.toUpperCase()}`, "var(--teal)", { run: true, restartVisible: true });
  document.getElementById("log").innerHTML = "";
  log(`Route locked using ${algoUsed === "astar" ? "A*" : "Dijkstra"}. Optimal cost: ${optimalCost}.`);
  draw();

  let secondsLeft = 3;
  showToast(`Get ready — ${secondsLeft}`);
  countdownTimer = setInterval(() => {
    secondsLeft--;
    if (secondsLeft > 0) {
      showToast(`Get ready — ${secondsLeft}`);
      return;
    }
    clearInterval(countdownTimer);
    countdownTimer = null;
    runReady = true;
    showToast("Go! Use the arrow keys or WASD to move.");
    toastTimeout = setTimeout(hideToast, 1800);
  }, 1000);
}

window.addEventListener("keydown", (e) => {
  if (phase !== "running") return;
  const moves = {
    arrowup: [-1, 0], w: [-1, 0],
    arrowdown: [1, 0], s: [1, 0],
    arrowleft: [0, -1], a: [0, -1],
    arrowright: [0, 1], d: [0, 1],
  };
  const move = moves[e.key.toLowerCase()];
  if (!move) return;
  e.preventDefault();
  if (!runReady || recalculating) return;

  const next = { r: playerPosition.r + move[0], c: playerPosition.c + move[1] };
  if (next.r < 0 || next.r >= ROWS || next.c < 0 || next.c >= COLS || wallCells.has(key(next.r, next.c))) return;
  const nextStep = plannedPath[segment + 1];
  const matchesPlannedMove = nextStep && next.r === nextStep.r && next.c === nextStep.c;
  playerPosition = next;
  totalCost += costs[next.r][next.c];

  if (matchesPlannedMove) {
    segment++;
    if (next.r === GOAL_NODE.r && next.c === GOAL_NODE.c) finishRun();
    else draw();
    return;
  }

  penaltyCount++;
  totalCost += 3;
  const deviationStep = segment;
  log(`Deviated at step ${deviationStep} to row ${next.r + 1}, column ${next.c + 1}. +3 traffic penalty.`, "penalty");
  if (next.r === GOAL_NODE.r && next.c === GOAL_NODE.c) {
    finishRun();
    return;
  }

  recalculating = true;
  plannedPath = [next];
  segment = 0;
  draw();
  worker.postMessage({
    ROWS, COLS,
    grid: costs,
    start: next,
    end: GOAL_NODE,
    walls: [...wallCells],
    algo: algoUsed,
    requestId: ++requestCounter,
  });
});

let requestCounter = 0;
worker.onmessage = (e) => {
  const { path, cost } = e.data;
  if (!path.length) {
    recalculating = false;
    log("No route found from that tile. The delivery run has stopped.", "penalty");
    phase = "finished";
    runReady = false;
    hideToast();
    setPhaseUI("ROUTE BLOCKED", "var(--pink)", { restartVisible: true });
    return;
  }
  plannedPath = path;
  segment = 0;
  playerPosition = { ...path[0] };
  recalculating = false;
  log(`Recalculated: new remaining cost ${cost}.`, "recalc");
  draw();
};

// =========================================================
// NEW — run completion now feeds the economy instead of just
// reporting a score.
// =========================================================
function finishRun() {
  runReady = false;
  clearTimeout(toastTimeout);
  hideToast();
  phase = "finished";

  const efficiency = Math.max(0, Math.min(100, Math.round((optimalCost / totalCost) * 100)));
  const earnings = Math.max(MIN_PAYOUT, Math.round(BASE_PAYOUT * (efficiency / 100)) - penaltyCount * 10);

  let materialWanted = Math.min(4, Math.max(1, Math.round(efficiency / 25)));
  const shortageHit = todayEvent.type === "shortage" && todayEvent.material === currentMaterial;
  if (shortageHit) materialWanted = Math.max(1, Math.floor(materialWanted / 2));

  const cap = capacityFor(currentMaterial);
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
  saveState();

  setPhaseUI("RUN COMPLETE", "var(--navy)", { restartVisible: true });
  document.getElementById("btnRestart").textContent = "Back to Warehouse";

  const info = MATERIALS[currentMaterial];
  document.getElementById("stats").innerHTML = `
    <b>Final cost:</b> ${totalCost} &nbsp;(optimal was ${optimalCost})<br/>
    <b>Deviations:</b> ${penaltyCount}<br/>
    <b>Efficiency:</b> ${efficiency}%<br/>
    <b>Earnings:</b> ₹${earnings} &nbsp;<b>OPEX:</b> -₹${opex}<br/>
    <b>Net funds:</b> ${netFunds >= 0 ? "+" : ""}₹${netFunds}${bailoutUsed ? " (bailout applied)" : ""}<br/>
    <b>${info.label} collected:</b> +${materialGained}${shortageHit ? " (shortage today!)" : ""}${wasFull ? " (warehouse full — rest lost!)" : ""}
  `;
  log(`Run complete. Earnings ₹${earnings}, OPEX -₹${opex}, net ${netFunds >= 0 ? "+" : ""}₹${netFunds}.`, "earn");
  if (bailoutUsed) log(`Bailout applied — funds can't be driven to zero by OPEX alone.`, "recalc");
  if (shortageHit) log(`${info.label} shortage today — only ${materialGained} units collected.`, "penalty");
  if (wasFull) log(`Warehouse full for ${info.label} — upgrade storage to stop losing surplus.`, "penalty");
  draw();
}

document.getElementById("btnRestart").onclick = () => {
  document.getElementById("btnRestart").textContent = "Back to Warehouse";
  goToDashboard({ newDay: phase === "finished" });
};


let activeTab = "warehouse";

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.getElementById("warehouseSection").style.display = tab === "warehouse" ? "block" : "none";
  document.getElementById("upgradesSection").style.display = tab === "upgrades" ? "block" : "none";
  document.getElementById("citiesSection").style.display = tab === "cities" ? "block" : "none";
  document.getElementById("transferSection").style.display = tab === "transfer" ? "block" : "none";
  if (tab === "upgrades") renderUpgradesTab();
  if (tab === "cities") initCityMap();
}

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.onclick = () => switchTab(btn.dataset.tab);
});

// The bottom nav is only meaningful while you're at the warehouse, not
// mid-run — hide it during planning/running/finished so it can't be used
// to abandon an active run by accident.
function setNavVisible(visible) {
  document.querySelector(".bottom-nav").style.display = visible ? "flex" : "none";
}

// =========================================================
// NEW — Cities tab: real-world map, concept preview only.
// This is a visual preview for the future multi-city roadmap item —
// it is NOT wired to any gameplay. The colored grid is decorative.
// =========================================================
let cityMapInstance = null;

function initCityMap() {
  if (cityMapInstance) return; // only initialize once
  cityMapInstance = L.map("cityMap", { zoomControl: true }).setView([40.7128, -74.006], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 18,
  }).addTo(cityMapInstance);

  // Decorative "claimed territory" heatmap overlay — purely illustrative,
  // not derived from any real game state.
  const bounds = cityMapInstance.getBounds();
  const north = bounds.getNorth(), south = bounds.getSouth();
  const east = bounds.getEast(), west = bounds.getWest();
  const GRID = 10;
  const latStep = (north - south) / GRID;
  const lngStep = (east - west) / GRID;
  const palette = [
    { color: "#0E9C8C", weight: 0.30 }, // claimed
    { color: "#F2A93B", weight: 0.20 }, // contested
    { color: "#E8536A", weight: 0.15 }, // unclaimed
  ];

  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      if (Math.random() < 0.4) continue; // leave some cells empty, like the reference art
      const pick = palette[Math.floor(Math.random() * palette.length)];
      const cellBounds = [
        [south + i * latStep, west + j * lngStep],
        [south + (i + 1) * latStep, west + (j + 1) * lngStep],
      ];
      L.rectangle(cellBounds, { color: pick.color, weight: 0, fillOpacity: pick.weight }).addTo(cityMapInstance);
    }
  }
}

document.getElementById("btnCityComingSoon").onclick = () => {
  alert("Multi-city expansion is on the roadmap but isn't part of this build yet — this screen is a concept preview only.");
};

goToDashboard({ newDay: true });
