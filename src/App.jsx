import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
 ShoppingBag, Plus, Check, Star, Camera, ScanLine, Receipt, ChefHat, Wallet, TrendingUp, TrendingDown, Package, Trash2, X, ChevronRight, ChevronDown, Sparkles, Minus, Clock, Loader2, Pencil, RefreshCw, Leaf, Wheat, Milk, Fish, Snowflake, Coffee, Cookie, Heart, AlertCircle,
} from "lucide-react";

/* ─────────────────────────── design tokens ───────────────────────────
 Palette "market morning": deep basil ink, chalk paper, citron signature.
 Numbers live in mono (receipts, scales, price tags). Signature element:
 the receipt tape — dotted leader lines and a torn bottom edge.        */

const C = {
 ink: "#1B2A24",
 ink2: "#2C4038",
 canvas: "#F1F2ED",
 paper: "#FFFFFF",
 line: "#E3E4DC",
 muted: "#6E7A72",
 citron: "#BFD53F",
 citronDeep: "#8FA320",
 plum: "#7A4A63",
 amber: "#D08A2C",
 red: "#C4553D",
};

const PEOPLE = [
 { id: "K", name: "Kay", color: "#1B2A24" },
 { id: "M", name: "Maren", color: "#7A4A63" },
 { id: "G", name: "Guest", color: "#3F6E7A" },
];
const personOf = (id) => PEOPLE.find((p) => p.id === id) || PEOPLE[0];

const CATS = [
 { id: "produce", label: "Produce", icon: Leaf, color: "#4E7B3A" },
 { id: "bakery", label: "Bakery", icon: Wheat, color: "#B0793A" },
 { id: "dairy", label: "Dairy & eggs", icon: Milk, color: "#4C7C93" },
 { id: "meat", label: "Meat & fish", icon: Fish, color: "#A34F4F" },
 { id: "frozen", label: "Frozen", icon: Snowflake, color: "#5B7FA6" },
 { id: "pantry", label: "Pantry", icon: Package, color: "#8A6C3E" },
 { id: "drinks", label: "Drinks", icon: Coffee, color: "#6B4A63" },
 { id: "snacks", label: "Snacks", icon: Cookie, color: "#B5713C" },
 { id: "home", label: "Household", icon: Sparkles, color: "#4F6F6A" },
 { id: "care", label: "Personal care", icon: Heart, color: "#98566E" },
];
const SH1 = "0 1px 2px rgba(27,42,36,.05), 0 8px 24px -16px rgba(27,42,36,.35)";
const HAIR = "1px solid #E3E4DC";
const DASH = "1px dashed #E3E4DC";
const SURF = { background: "#FFFFFF", border: "1px solid #E3E4DC" };
const chipS = (on) => ({ background: on ? C.ink : C.paper, color: on ? "#F6F7F2" : C.ink2, border: `1px solid ${on ? C.ink : C.line}` });
const CHIP = "kp shrink-0 rounded-full px-3.5 py-2 f13 font-medium";
const EYEBROW = { fontSize: 10.5, letterSpacing: ".16em", color: C.muted };
const catOf = (id) => CATS.find((c) => c.id === id) || CATS[5];

const SHELF = { produce: 6, bakery: 3, dairy: 10, meat: 4, frozen: 120, pantry: 240, drinks: 45, snacks: 60, home: 365, care: 365 };
const PAYMENTS = { shared: "Shared card", personal: "Own card" };

const DAY = 86400000;
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const now = () => Date.now();
const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");
const money = (n, cur = "kr") => (Number(n) || 0).toFixed(2).replace(".", ",") + " " + cur;
const shortNum = (n) => (Math.abs(n) >= 1000 ? (Math.round(n / 100) / 10).toFixed(1).replace(".", ",") + "k" : String(Math.round(n)));
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const monthKey = (t) => iso(t).slice(0, 7);
const startOfMonth = (t = now()) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
const daysInMonth = (t = now()) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); };
const CYCLE_DAY = 15;
const cycleStart = (t = now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); if (d.getDate() >= CYCLE_DAY) return new Date(d.getFullYear(), d.getMonth(), CYCLE_DAY).getTime(); return new Date(d.getFullYear(), d.getMonth() - 1, CYCLE_DAY).getTime(); };
const cycleEnd = (t = now()) => { const s = new Date(cycleStart(t)); return new Date(s.getFullYear(), s.getMonth() + 1, CYCLE_DAY).getTime(); };
const cyclePrevStart = (t = now()) => { const s = new Date(cycleStart(t)); return new Date(s.getFullYear(), s.getMonth() - 1, CYCLE_DAY).getTime(); };
const cycleLabel = (t = now()) => { const s = new Date(cycleStart(t)), e = new Date(cycleEnd(t) - DAY); const m = (x) => x.toLocaleDateString(undefined, { day: "numeric", month: "short" }); return m(s) + " – " + m(e); };
const weekStart = (t) => { const d = new Date(t); const k = (d.getDay() + 6) % 7; d.setHours(0, 0, 0, 0); return d.getTime() - k * DAY; };
const rel = (t) => {
 if (!t) return "never";
 const d = Math.floor((now() - t) / DAY);
 if (d <= 0) return "today";
 if (d === 1) return "yesterday";
 if (d < 30) return d + "d ago";
 return Math.round(d / 30) + "mo ago";
};
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

/* ───────────────────── storage + two-device sync engine ─────────────────
 Every collection is a map of id → record carrying `updatedAt`. Merging
 two copies keeps the newer record per id, so both phones converge no
 matter who wrote last or in which order.                              */

const KEY = "kamase:v5:db";
const SHARED = true;
const COLLECTIONS = ["list", "catalog", "receipts", "recipes", "plan", "presence"];

async function loadDb() {
 try { const r = await window.storage.get(KEY, SHARED); return r ? JSON.parse(r.value) : null; }
 catch (e) { return null; }
}
async function saveDb(v) {
 try { await window.storage.set(KEY, JSON.stringify(v), SHARED); return true; }
 catch (e) { return false; }
}
function mergeColl(a = {}, b = {}) {
 const out = { ...a };
 for (const id of Object.keys(b)) {
  if (!out[id] || (b[id].updatedAt || 0) > (out[id].updatedAt || 0)) out[id] = b[id];
 }
 return out;
}
function mergeDb(local, remote) {
 if (!remote) return local;
 const out = { ...local };
 COLLECTIONS.forEach((c) => { out[c] = mergeColl(local[c], remote[c]); });
 out.settings = (remote.settings && (remote.settings.updatedAt || 0) > (local.settings.updatedAt || 0)) ? remote.settings : local.settings;
 return out;
}

const EMPTY = { list: {}, catalog: {}, receipts: {}, recipes: {}, plan: {}, presence: {}, settings: { budget: 0, currency: "kr", updatedAt: 0 } };

function useStore(me) {
 const [db, setDb] = useState(EMPTY);
 const [status, setStatus] = useState("connecting");
 const [ready, setReady] = useState(false);
 const ref = useRef(db); ref.current = db;
 const dirty = useRef(false);
 const busy = useRef(false);
 const timer = useRef(null);

 const sync = useCallback(async () => {
  if (busy.current) return;
  busy.current = true;
  const wasDirty = dirty.current;
  dirty.current = false;
  if (wasDirty) setStatus("syncing");
  try {
   const remote = await loadDb();
   const merged = mergeDb(ref.current, remote);
   if (wasDirty) await saveDb(merged);
   if (JSON.stringify(merged) !== JSON.stringify(ref.current)) setDb(merged);
   setStatus("live");
  } catch (e) { setStatus("offline"); }
  finally { busy.current = false; }
 }, []);

 const schedule = useCallback(() => {
  dirty.current = true;
  clearTimeout(timer.current);
  timer.current = setTimeout(sync, 700);
 }, [sync]);

 useEffect(() => {
  let alive = true;
  (async () => {
   const remote = await loadDb();
   if (!alive) return;
   if (remote && remote.list) setDb({ ...EMPTY, ...remote });
   else { setDb(EMPTY); saveDb(EMPTY); }
   setStatus("live");
   setReady(true);
  })();
  const iv = setInterval(() => { if (!document.hidden) sync(); }, 8000);
  const onShow = () => { if (!document.hidden) sync(); };
  document.addEventListener("visibilitychange", onShow);
  return () => { alive = false; clearInterval(iv); clearTimeout(timer.current); document.removeEventListener("visibilitychange", onShow); };
 }, [sync]);

 const put = useCallback((domain, rec) => {
  setDb((p) => ({ ...p, [domain]: { ...p[domain], [rec.id]: { ...rec, updatedAt: now() } } }));
  schedule();
 }, [schedule]);

 const patch = useCallback((domain, id, fields) => {
  setDb((p) => {
   const cur = p[domain][id];
   if (!cur) return p;
   const val = typeof fields === "function" ? fields(cur) : fields;
   return { ...p, [domain]: { ...p[domain], [id]: { ...cur, ...val, updatedAt: now() } } };
  });
  schedule();
 }, [schedule]);

 const remove = useCallback((domain, id) => patch(domain, id, { deleted: true }), [patch]);

 const setSettings = useCallback((fields) => {
  setDb((p) => ({ ...p, settings: { ...p.settings, ...fields, updatedAt: now() } }));
  schedule();
 }, [schedule]);

 return { db, status, ready, me, put, patch, remove, setSettings, sync };
}

const live = (m) => Object.values(m || {}).filter((x) => !x.deleted);

function usePantry(db) {
 return useMemo(() => {
  const t = now();
  return live(db.catalog).map((c) => {
   const avg = c.intervals && c.intervals.length ? mean(c.intervals) : null;
   const since = c.lastBought ? (t - c.lastBought) / DAY : null;
   const dueIn = avg != null && since != null ? Math.round(avg - since) : null;
   const pct = avg && since != null ? Math.min(1, since / avg) : null;
   let state = c.stock || "in";
   if (state !== "out" && dueIn != null && dueIn <= 0) state = "out";
   else if (state === "in" && dueIn != null && dueIn <= 2) state = "low";
   const last = c.prices && c.prices.length ? c.prices[c.prices.length - 1].p : null;
   const shelf = SHELF[c.cat] || 90;
   const from = c.freshFrom || c.lastBought;
   const daysFresh = from ? Math.round((from + shelf * DAY - t) / DAY) : null;
   const aging = state !== "out" && daysFresh != null && daysFresh <= 3 && shelf <= 30;
   return { ...c, avg, dueIn, pct, state, lastPrice: last, shelf, daysFresh, aging };
  }).sort((a, b) => (a.dueIn ?? 999) - (b.dueIn ?? 999));
 }, [db.catalog]);
}

function useSpend(db) {
 return useMemo(() => {
  const rs = live(db.receipts).sort((a, b) => b.at - a.at);
  const cs = cycleStart(), ce = cycleEnd();
  const month = rs.filter((r) => r.at >= cs && r.at < ce);
  const spent = month.reduce((s, r) => s + r.total, 0);
  const byCat = {}, byStore = {};
  month.forEach((r) => {
   byStore[r.store] = (byStore[r.store] || 0) + r.total;
   (r.items || []).forEach((i) => { byCat[i.cat || "pantry"] = (byCat[i.cat || "pantry"] || 0) + i.price; });
  });
  const weeks = [];
  for (let i = 5; i >= 0; i--) {
   const s = weekStart(now()) - i * 7 * DAY;
   const e = s + 7 * DAY;
   weeks.push({ start: s, total: rs.filter((r) => r.at >= s && r.at < e).reduce((x, r) => x + r.total, 0) });
  }
  const ps = cyclePrevStart();
  const prev = rs.filter((r) => r.at >= ps && r.at < cs).reduce((s, r) => s + r.total, 0);
  const pant = month.reduce((s, r) => s + (r.pant || 0), 0);
  const owed = rs.filter((r) => r.payment === "personal" && !r.reimbursed);
  const owedTotal = owed.reduce((s, r) => s + r.total, 0);
  const personalMonth = month.filter((r) => r.payment === "personal").reduce((s, r) => s + r.total, 0);
  return { rs, month, spent, byCat, byStore, weeks, prev, pant, owed, owedTotal, personalMonth };
 }, [db.receipts]);
}

const FONT_HREF = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap";
function useFonts() {
 useEffect(() => {
  if (document.getElementById("km-fonts")) return;
  const pre = document.createElement("link");
  pre.rel = "preconnect"; pre.href = "https://fonts.gstatic.com"; pre.crossOrigin = "";
  const l = document.createElement("link");
  l.id = "km-fonts"; l.rel = "stylesheet"; l.href = FONT_HREF;
  document.head.appendChild(pre); document.head.appendChild(l);
 }, []);
}

const Style = () => (
  <style>{`
.km * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
.km { font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif; color: ${C.ink}; -webkit-font-smoothing: antialiased; }
.kd { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 700; letter-spacing: -0.04em; }
.mo { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
.kc::-webkit-scrollbar { display: none; }
.kc { scrollbar-width: none; }
.km input, .km textarea, .km button { font-family: inherit; }
.km input:focus-visible, .km textarea:focus-visible, .km button:focus-visible { outline: 2px solid ${C.citronDeep}; outline-offset: 2px; }
.ka{color:#6E7A72}
.kb{color:#94A199}
.kn{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;font-weight:500;letter-spacing:.16em;color:#6E7A72;text-transform:uppercase}
.kw{background:#fff;border:1px solid #E3E4DC}
.kq{background:#EEF0E9;color:#2C4038}
.kr{border-top:1px solid #E3E4DC}
.kx{border-top:1px dashed #E3E4DC}
.km .j{text-transform:uppercase}
.km .ai{position:relative}
.km .ac{position:absolute}
.km .ar{top:0;right:0;bottom:0;left:0}
.km .bw{display:flex}
.km .g{align-items:center}
.km .p{justify-content:center}
.km .ao{flex-direction:column}
.km .cw{padding-top:12px}
.km .dk{padding-bottom:4px}
.km .di{padding-left:20px;padding-right:20px}
.km .cj{padding-bottom:8px}
.km .v{justify-content:space-between}
.km .h{font-weight:600}
.km .o{border-radius:9999px}
.km .cg{padding:6px}
.km .t{overflow-y:auto}
.km .de{padding-bottom:32px}
.km .dg{padding-top:4px}
.km .at{display:block}
.km .ck{margin-bottom:12px}
.km .bq{margin-bottom:6px}
.km .az{width:100%}
.km .u{border-radius:12px}
.km .bz{padding-left:14px;padding-right:14px}
.km .ch{padding-top:12px;padding-bottom:12px}
.km .b{display:inline-flex}
.km .e{font-weight:500}
.km .a{text-align:center}
.km .df{padding-left:32px;padding-right:32px}
.km .bl{padding-top:56px;padding-bottom:56px}
.km .l{border-radius:16px}
.km .dx{padding:12px}
.km .dn{margin-bottom:4px}
.km .c{line-height:1.625}
.km .cn{margin-bottom:16px}
.km .w{align-items:baseline}
.km .ca{margin-left:6px}
.km .cz{margin-left:8px}
.km .da{margin-top:12px}
.km .z{overflow:hidden}
.km .bi{margin-top:6px}
.km .cd{gap:8px}
.km .aa{overflow-x:auto}
.km .ae{align-items:flex-end}
.km .ax{flex:1 1 0%}
.km .ba{height:100%}
.km .aw{gap:6px}
.km .i{border-radius:6px}
.km .af{flex-wrap:wrap}
.km .cr{padding-left:12px;padding-right:12px}
.km .bu{padding-top:6px;padding-bottom:6px}
.km .bm{gap:12px}
.km .db{padding-left:8px;padding-right:8px}
.km .ds{padding-top:8px;padding-bottom:8px}
.km .s{border-radius:8px}
.km .cs{padding-left:16px;padding-right:16px}
.km .cv{margin-bottom:20px}
.km .as{position:sticky}
.km .bc{top:0}
.km .bb{gap:10px}
.km .bg{padding-top:10px;padding-bottom:10px}
.km .an{flex-shrink:0}
.km .n{background:transparent}
.km .aj{border:0}
.km .q{outline:none}
.km .dv{padding:8px}
.km .by{padding-bottom:2px}
.km .dd{margin-top:8px}
.km .ah{text-align:left}
.km .dj{margin-top:16px}
.km .dr{margin-bottom:8px}
.km .dt{padding-left:12px}
.km .be{padding-right:14px}
.km .ap>*+*{margin-top:12px}
.km .bs{padding-top:14px}
.km .cc{padding-bottom:10px}
.km .y{align-items:flex-start}
.km .bn{margin-top:-2px}
.km .au{min-width:0}
.km .ad{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.km .dz{padding:16px}
.km .ab>*+*{margin-top:10px}
.km .bj{padding-left:6px;padding-right:6px}
.km .dq{margin-right:8px}
.km .cb{margin-top:10px}
.km .am>*+*{margin-top:8px}
.km .ay{left:0}
.km .aq{right:0}
.km .m{pointer-events:auto}
.km .ce{padding-top:16px}
.km .cq{padding-bottom:12px}
.km .d{text-align:right}
.km .do{padding-top:4px;padding-bottom:4px}
.km .cp{padding-left:4px;padding-right:4px}
.km .cy{padding-top:16px;padding-bottom:16px}
.km .bh{gap:16px}
.km .ag>*+*{margin-top:6px}
.km .al{bottom:0}
.km .cu{padding-bottom:20px}
.km .dp{padding-top:24px}
.km .bd{gap:20px}
.km .r{line-height:1}
.km .cm{margin-top:4px}
.km .cf{padding:14px}
.km .bx{padding-left:10px;padding-right:10px}
.km .bp{padding-top:10px}
.km .x{line-height:1.25}
.km .bo{gap:4px}
.km .bf{padding-top:2px;padding-bottom:2px}
.km .bk{margin-right:10px}
.km .ct{margin-bottom:24px}
.km .co{padding-top:20px}
.km .ci{padding-bottom:24px}
.km .cl{margin-top:20px}
.km .br{margin-right:6px}
.km .dw{height:12px}
.km .dl{padding:10px}
.km .dm{margin-right:4px}
.km .bv{padding-top:48px;padding-bottom:48px}
.km .du{padding:20px}
.km .ak>*+*{margin-top:4px}
.km .cx{padding-left:8px}
.km .bt{padding-right:10px}
.km .dc{padding-bottom:16px}
.km .dh{margin-left:4px;margin-right:4px}
.km .dy{padding:4px}
.km .av{gap:2px}
.kl { flex: 1; border-bottom: 1px dotted ${C.line}; margin: 0 8px 5px 8px; min-width: 12px; }
${[10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 16, 17, 19, 20, 24, 25, 27, 30, 34, 40].map((v) => `.km .f${String(v).replace(".", "")}{font-size:${v}px}`).join("")}
.km .rounded-t-\\[28px\\]{border-top-left-radius:28px;border-top-right-radius:28px}
.kt { position: relative; }
.kt::after { content: ''; position: absolute; left: 0; right: 0; bottom: -9px; height: 10px;
  background-image: linear-gradient(45deg, transparent 50%, var(--tape) 50%), linear-gradient(-45deg, transparent 50%, var(--tape) 50%);
  background-size: 14px 14px; background-repeat: repeat-x; }
@keyframes kmUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
@keyframes kmSheet { from { transform: translateY(100%) } to { transform: none } }
@keyframes kmFade { from { opacity: 0 } to { opacity: 1 } }
@keyframes kmPop { 0% { transform: scale(.6); opacity: .4 } 60% { transform: scale(1.12) } 100% { transform: scale(1); opacity: 1 } }
@keyframes kmShine { 0% { background-position: -240px 0 } 100% { background-position: 240px 0 } }
@keyframes kmSpin { to { transform: rotate(360deg) } }
.ku { animation: kmUp .34s cubic-bezier(.2,.7,.3,1) both; }
.ke { animation: kmSheet .32s cubic-bezier(.2,.8,.25,1) both; }
.kv { animation: kmFade .2s ease both; }
.ko { animation: kmPop .28s cubic-bezier(.2,.8,.3,1) both; }
.kh { background: linear-gradient(90deg, #EFEFE9 0%, #F8F8F4 40%, #EFEFE9 80%); background-size: 240px 100%; animation: kmShine 1.1s linear infinite; }
.kp { transition: transform .12s ease, background .16s ease, opacity .16s ease; }
.kp:active { transform: scale(.97); }
@media (prefers-reduced-motion: reduce) { .km *, .km *::after { animation: none !important; transition: none !important; } }
`}</style>
);

const Btn = ({ children, onClick, tone = "ink", size = "md", full, style, disabled, ...p }) => {
 const tones = {
  ink: { background: C.ink, color: "#F6F7F2" },
  citron: { background: C.citron, color: C.ink },
  ghost: { background: "transparent", color: C.ink, boxShadow: `inset 0 0 0 1px ${C.line}` },
  quiet: { background: "#EBEDE6", color: C.ink2 },
  danger: { background: "transparent", color: C.red, boxShadow: `inset 0 0 0 1px ${C.red}33` },
 };
 const sizes = { sm: "px-3 py-1.5 f13", md: "px-4 py-2.5 f14", lg: "px-5 py-3.5 f15" };
 return (
  <button {...p} disabled={disabled} onClick={onClick}
   className={`kp rounded-full font-medium inline-flex items-center justify-center gap-1.5 ${sizes[size]} ${full ? "w-full" : ""}`}
   style={{ ...tones[tone], opacity: disabled ? 0.45 : 1, ...style }}>
   {children}
  </button>
 );
};

const Card = ({ children, className = "", style, ...p }) => (
 <div {...p} className={`rounded-2xl ${className}`} style={{ background: C.paper, boxShadow: "0 1px 2px rgba(27,42,36,.05), 0 6px 20px -12px rgba(27,42,36,.18)", ...style }}>{children}</div>
);

const Label = ({ children, style }) => (
 <div className="mo j" style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: ".16em", color: C.muted, ...style }}>{children}</div>
);

const Ring = ({ value, size = 64, stroke = 7, color = C.citron, track = "#E7E9E1", children }) => {
 const r = (size - stroke) / 2, c = 2 * Math.PI * r;
 const v = Math.max(0, Math.min(1, value || 0));
 return (
  <div className="ai" style={{ width: size, height: size }}>
   <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
     strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: "stroke-dashoffset .7s cubic-bezier(.3,.8,.3,1)" }} />
   </svg>
   <div className="ac ar bw g p">{children}</div>
  </div>
 );
};

const Sheet = ({ open, onClose, title, children, tall }) => {
 useEffect(() => {
  const h = (e) => e.key === "Escape" && onClose();
  window.addEventListener("keydown", h);
  return () => window.removeEventListener("keydown", h);
 }, [onClose]);
 if (!open) return null;
 return (
  <div className="ac ar z-50 bw ao justify-end">
   <div className="kv ac ar" style={{ background: "rgba(20,30,26,.42)", backdropFilter: "blur(2px)" }} onClick={onClose} />
   <div className="ke ai rounded-t-[28px] bw ao" style={{ background: C.canvas, maxHeight: tall ? "92%" : "82%", boxShadow: "0 -20px 60px -20px rgba(20,30,26,.5)" }}>
    <div className="cw dk bw p"><div style={{ width: 38, height: 4, borderRadius: 4, background: "#D6D9CF" }} /></div>
    <div className="di cj bw g v">
     <div className="kd f20 h">{title}</div>
     <button className="kp o cg" style={{ background: "#E7E9E1" }} onClick={onClose}><X size={16} color={C.ink2} /></button>
    </div>
    <div className="kc t di de dg">{children}</div>
   </div>
  </div>
 );
};

const Field = ({ label, ...p }) => (
 <label className="at ck">
  {label && <div className="bq"><Label>{label}</Label></div>}
  <input {...p} className="az u bz ch f15" style={{ ...SURF, color: C.ink }} />
 </label>
);

const Toggle = ({ on, onClick }) => (
 <button onClick={onClick} className="kp o ai" style={{ width: 46, height: 27, background: on ? C.citron : "#DDE0D6", transition: "background .2s" }}>
  <span className="ac o" style={{ width: 21, height: 21, top: 3, left: on ? 22 : 3, background: C.paper, transition: "left .22s cubic-bezier(.3,.8,.3,1)", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
 </button>
);

const Person = ({ id, size = 22 }) => {
 const p = personOf(id);
 return (
  <span className="mo b g p o e"
   style={{ width: size, height: size, fontSize: size * 0.45, background: p.color, color: "#F6F7F2" }}>{p.id}</span>
 );
};

const Empty = ({ icon: Icon, title, body, action }) => (
 <div className="ku bw ao g a df bl">
  <div className="l dx ck" style={{ background: "#E9EBE3" }}><Icon size={22} color={C.ink2} /></div>
  <div className="kd f17 h dn">{title}</div>
  <div className="f135 c cn ka">{body}</div>
  {action}
 </div>
);

const Row = ({ l, v, c, s: sub, w }) => (
 <div className="bw w">
  <span className="f135">{l}</span>
  {sub && <span className="f12 ca ka">{sub}</span>}
  <span className="kl" />
  <span className="mo f13" style={c ? { color: c } : undefined}>{v}</span>
  {w !== undefined && <span className="mo f115 cz" style={{ width: 54, textAlign: "right", color: c }}>{w}</span>}
 </div>
);

const Sec = ({ t, children, foot, cls = "p-4", d }) => (
 <Card className={"ku " + cls} style={d ? { animationDelay: d } : undefined}>
  {t && <Label>{t}</Label>}
  {children}
  {foot && <div className="f115 da cw kr ka">{foot}</div>}
 </Card>
);

const BarRow = ({ l, v, pct, c, icon: Ic, ic }) => (
 <div>
  <div className="bw w">
   {Ic && <Ic size={13} color={ic} style={{ transform: "translateY(2px)" }} />}
   <span className={"f135" + (Ic ? " ml-2" : "")}>{l}</span>
   <span className="kl" />
   <span className="mo f13">{v}</span>
  </div>
  <div className="o z bi" style={{ height: 4, background: "#EEF0E9" }}>
   <div style={{ width: pct + "%", height: "100%", background: c, transition: "width .6s" }} />
  </div>
 </div>
);

const Tabs = ({ v, set, opts, children }) => (
 <div className="kc bw cd aa dk ck">
  {opts.map((t) => (
   <button key={t.id} onClick={() => set(t.id)} className={CHIP} style={chipS(v === t.id)}>{t.label}</button>
  ))}
  {children}
 </div>
);

const Bars = ({ data, format = (v) => v, height = 92, color = C.ink }) => {
 const max = Math.max(1, ...data.map((d) => d.v));
 return (
  <div className="bw ae cd" style={{ height }}>
   {data.map((d, i) => (
    <div key={i} className="ax bw ao g justify-end ba aw">
     <div className="mo" style={{ fontSize: 9.5, color: C.muted }}>{d.v ? format(d.v) : ""}</div>
     <div className="az i" style={{
      height: `${Math.max(3, (d.v / max) * 100)}%`,
      background: d.hi ? color : "#DFE3D7", transition: "height .5s cubic-bezier(.3,.8,.3,1)",
     }} />
     <div className="mo" style={{ fontSize: 9.5, color: C.muted }}>{d.label}</div>
    </div>
   ))}
  </div>
 );
};

const Spark = ({ points, w = 260, h = 56, color = C.plum }) => {
 if (!points || points.length < 2) return null;
 const min = Math.min(...points), max = Math.max(...points);
 const span = max - min || 1;
 const pts = points.map((p, i) => [(i / (points.length - 1)) * w, h - ((p - min) / span) * (h - 10) - 5]);
 const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
 return (
  <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
   <path d={`${d} L${w},${h} L0,${h} Z`} fill={color} opacity=".08" />
   <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
   {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 3.5 : 2} fill={i === pts.length - 1 ? color : C.paper} stroke={color} strokeWidth="1.5" />)}
  </svg>
 );
};

function useActions(S, toast) {
 const { db } = S;
 return useMemo(() => ({
  addToList(name, opts = {}) {
   const n = norm(name);
   if (!n) return;
   const existing = live(db.list).find((i) => norm(i.name) === n);
   if (existing) { S.patch("list", existing.id, { qty: (existing.qty || 1) + 1, done: false }); toast(`${cap(existing.name)} — quantity increased`); return; }
   const c = db.catalog[n];
   S.put("list", {
    id: uid(), name: c ? c.name : cap(name.trim()), cat: opts.cat || (c && c.cat) || "pantry",
    qty: opts.qty || 1, unit: opts.unit || (c && c.unit) || "", note: opts.note || "",
    fav: opts.fav ?? (c ? !!c.fav : false), done: false, by: S.me,
   });
   toast(`${cap(name.trim())} added to the list`);
  },
  buyChecked() {
   const checked = live(db.list).filter((i) => i.done);
   checked.forEach((i) => {
    const id = norm(i.name);
    const c = db.catalog[id];
    if (c) {
     const gap = c.lastBought ? Math.max(1, Math.round((now() - c.lastBought) / DAY)) : null;
     S.put("catalog", { ...c, count: (c.count || 0) + 1, lastBought: now(), stock: "in", deleted: false, intervals: gap ? [...(c.intervals || []), gap].slice(-6) : c.intervals || [] });
    } else {
     S.put("catalog", { id, name: i.name, cat: i.cat, unit: i.unit || "", count: 1, lastBought: now(), stock: "in", intervals: [], prices: [], fav: !!i.fav });
    }
    S.remove("list", i.id);
   });
   toast(`${checked.length} bought — pantry updated`);
  },
  logReceipt(r) {
   let saved = 0, cheaper = 0;
   r.items.forEach((it) => {
    const c = db.catalog[norm(it.name)];
    if (c && (c.prices || []).length >= 2) {
     const avg = mean(c.prices.map((x) => x.p));
     if (it.price < avg * 0.95) { saved += avg - it.price; cheaper++; }
    }
   });
   S.put("receipts", {
    id: uid(), store: r.store || "Shop", at: r.at || now(), total: r.total, items: r.items,
    payment: r.payment || "shared", paidBy: r.payment === "personal" ? (r.paidBy || S.me) : null,
    reimbursed: false, pant: r.pant || 0,
   });
   r.items.forEach((it) => {
    const id = norm(it.name);
    const c = db.catalog[id];
    const price = { p: it.price, store: r.store || "Shop", at: r.at || now() };
    if (c) {
     const gap = c.lastBought ? Math.max(1, Math.round(((r.at || now()) - c.lastBought) / DAY)) : null;
     S.put("catalog", { ...c, count: (c.count || 0) + 1, lastBought: r.at || now(), stock: "in", deleted: false, prices: [...(c.prices || []), price].slice(-12), intervals: gap ? [...(c.intervals || []), gap].slice(-6) : c.intervals || [] });
    } else {
     S.put("catalog", { id, name: cap(it.name), cat: it.cat || "pantry", unit: it.unit || "", count: 1, lastBought: r.at || now(), stock: "in", intervals: [], prices: [price] });
    }
    const onList = live(db.list).find((l) => norm(l.name) === id);
    if (onList) S.remove("list", onList.id);
   });
   toast(cheaper
    ? `Saved — ${money(saved)} under your usual on ${cheaper} item${cheaper > 1 ? "s" : ""}`
    : `Receipt saved — ${r.items.length} items priced`);
  },
 }), [db, S, toast]);
}

function basketByStore(db, items) {
 const stores = new Set();
 live(db.catalog).forEach((c) => (c.prices || []).forEach((p) => stores.add(p.store)));
 return [...stores].map((store) => {
  let total = 0, known = 0;
  items.forEach((i) => {
   const c = db.catalog[norm(i.name)];
   const ps = (c && c.prices) || [];
   const here = [...ps].reverse().find((p) => p.store === store);
   const any = ps.length ? ps[ps.length - 1] : null;
   if (here) { total += here.p * (i.qty || 1); known++; }
   else if (any) total += any.p * (i.qty || 1);
  });
  return { store, total, known };
 }).filter((x) => x.total > 0).sort((a, b) => a.total - b.total);
}

function goodPrices(db, items) {
 return items.map((i) => {
  const c = db.catalog[norm(i.name)];
  if (!c || !(c.prices || []).length || c.prices.length < 2) return null;
  const avg = mean(c.prices.map((x) => x.p));
  const best = c.prices.reduce((a, b) => (b.p < a.p ? b : a));
  return best.p < avg * 0.93 ? { name: c.name, store: best.store, price: best.p, avg, save: avg - best.p } : null;
 }).filter(Boolean).sort((a, b) => b.save - a.save).slice(0, 3);
}

function basketIndex(db) {
 const items = live(db.catalog).filter((c) => (c.prices || []).length >= 2);
 if (items.length < 3) return null;
 const moves = items.map((c) => {
  const first = c.prices[0], last = c.prices[c.prices.length - 1];
  return { name: c.name, pct: ((last.p - first.p) / first.p) * 100, from: first.at, delta: last.p - first.p };
 });
 const span = Math.round((now() - Math.min(...items.map((c) => c.prices[0].at))) / (7 * DAY));
 return {
  pct: mean(moves.map((m) => m.pct)),
  span,
  count: items.length,
  up: moves.filter((m) => m.pct > 1).sort((a, b) => b.pct - a.pct).slice(0, 3),
  down: moves.filter((m) => m.pct < -1).sort((a, b) => a.pct - b.pct).slice(0, 3),
 };
}

function lastPrice(db, name) {
 const c = db.catalog[norm(name)];
 return c && c.prices && c.prices.length ? c.prices[c.prices.length - 1].p : null;
}

function ItemSheet({ open, onClose, S, item, onSave, onDelete }) {
 const [d, setD] = useState(item || {});
 useEffect(() => { setD(item || {}); }, [item, open]);
 if (!open) return null;
 const set = (k, v) => setD((p) => ({ ...p, [k]: v }));
 return (
  <Sheet open={open} onClose={onClose} title={item && item.id ? "Edit item" : "Add item"}>
   <Field label="Item" value={d.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Syltetøy" autoFocus />

   <div className="bq"><Label>How much?</Label></div>
   <div className="bw g cd u db ds kw" style={{ marginBottom: 8 }}>
    <button className="kp s cg kq" onClick={() => set("qty", Math.max(1, (d.qty || 1) - 1))}><Minus size={15} /></button>
    <input value={d.unit || ""} onChange={(e) => set("unit", e.target.value)} placeholder="1 boks · 200 g · 1 kg"
     className="mo ax a f15 n aj" style={{ background: "transparent", textAlign: "center", color: C.ink }} />
    <button className="kp s cg kq" onClick={() => set("qty", (d.qty || 1) + 1)}><Plus size={15} /></button>
   </div>
   {(d.qty || 1) > 1 && <div className="f12 db ka" style={{ marginTop: -4, marginBottom: 8, textAlign: "center" }}>{d.qty}× {d.unit || "of this"}</div>}
   <div className="bw af aw" style={{ gap: 6, marginBottom: 16 }}>
    {["1 boks", "1 pk", "200 g", "500 g", "1 kg", "1 l", "6 stk", "1 flaske", "1 pose", "1 glass"].map((u) => (
     <button key={u} onClick={() => set("unit", u)} className="kp o cr f125 e"
      style={{ padding: "6px 11px", background: d.unit === u ? C.ink : C.paper, color: d.unit === u ? "#F6F7F2" : C.ink2, border: `1px solid ${d.unit === u ? C.ink : C.line}` }}>{u}</button>
    ))}
   </div>

   <div className="bq"><Label>Category</Label></div>
   <div className="bw af aw cn">
    {CATS.map((c) => {
     const on = d.cat === c.id;
     return (
      <button key={c.id} onClick={() => set("cat", c.id)} className="kp o cr bu f125 e b g aw"
       style={chipS(on)}>
       <c.icon size={12.5} color={on ? C.citron : c.color} />{c.label}
      </button>
     );
    })}
   </div>
   <Field label="Note" value={d.note || ""} onChange={(e) => set("note", e.target.value)} placeholder="the ripe ones, for Sunday" />
   <div className="bw g v u cs ch cv kw">
    <div className="bw g cd"><Star size={15} color={d.fav ? C.amber : C.muted} fill={d.fav ? C.amber : "none"} /><span className="f14">Favourite</span></div>
    <Toggle on={!!d.fav} onClick={() => set("fav", !d.fav)} />
   </div>
   <Btn full size="lg" onClick={() => { if (!norm(d.name)) return; onSave(d); onClose(); }}>{item && item.id ? "Save changes" : "Add to list"}</Btn>
   {item && item.id && (
    <button className="kp az da ch f14 e o" style={{ color: C.red }}
     onClick={() => { onDelete(item.id); onClose(); }}>Remove from list</button>
   )}
  </Sheet>
 );
}

function ListScreen({ S, A, openScan, onStartShopping, toast }) {
 const { db, me } = S;
 const others = live(db.presence).filter((p) => p.id !== me && p.active && now() - p.at < 120000);
 const items = live(db.list);
 const pantry = usePantry(db);
 const [q, setQ] = useState("");
 const [focused, setFocused] = useState(false);
 const [sheet, setSheet] = useState(null);
 const [collapsed, setCollapsed] = useState({});

 const onList = new Set(items.map((i) => norm(i.name)));
 const matches = q.trim()
  ? live(db.catalog).filter((c) => norm(c.name).includes(norm(q)) && !onList.has(c.id)).slice(0, 5)
  : [];
 const suggestions = pantry.filter((p) => (p.state !== "in" || p.fav) && !onList.has(p.id)).slice(0, 8);

 const groups = CATS.map((c) => ({ cat: c, items: items.filter((i) => i.cat === c.id).sort((a, b) => (a.done === b.done ? a.name.localeCompare(b.name) : a.done ? 1 : -1)) })).filter((g) => g.items.length);
 const checked = items.filter((i) => i.done);
 const estimate = items.reduce((s, i) => s + (lastPrice(db, i.name) || 0) * (i.qty || 1), 0);


 const openAdd = () => {
  const n = norm(q);
  const c = n ? db.catalog[n] : null;
  setSheet({ name: q.trim() ? cap(q.trim()) : "", cat: (c && c.cat) || "pantry", qty: 1, unit: (c && c.unit) || "", note: "", fav: c ? !!c.fav : false });
  setQ("");
 };
 const submit = openAdd;

 return (
  <div className="pb-40">
   {/* add bar */}
   <div className="cs dg as bc z-20" style={{ background: `linear-gradient(${C.canvas} 78%, ${C.canvas}00)` }}>
    <div className="bw g bb l cr bg" style={{
     background: C.paper,
     boxShadow: focused ? `0 0 0 2px ${C.citron}, 0 10px 26px -18px rgba(27,42,36,.4)` : SH1,
     transition: "box-shadow .18s",
    }}>
     <button className="kp o bw g p an" style={{ width: 28, height: 28, background: C.citron }} onClick={openAdd} aria-label="Add item">
      <Plus size={16} color={C.ink} strokeWidth={2.5} />
     </button>
     <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      placeholder="Add an item to the list" className="ax f15 n aj q" style={{ color: C.ink }} />
     {q.trim()
      ? <Btn size="sm" onClick={submit}>Add</Btn>
      : <button className="kp o dv kq" onClick={openScan}><ScanLine size={15} color={C.ink2} /></button>}
    </div>
    {!q && (
     <div className="f115 bi db by ka">
      Type here to put something on the list.
     </div>
    )}
    {matches.length > 0 && (
     <Card className="ku dd z">
      {matches.map((m) => {
       const Ic = catOf(m.cat).icon;
       return (
        <button key={m.id} onClick={() => { A.addToList(m.name); setQ(""); }}
         className="kp az bw g bm cs ch ah" style={{ borderBottom: `1px solid ${C.line}` }}>
         <Ic size={15} color={catOf(m.cat).color} />
         <span className="ax f145">{m.name}</span>
         <span className="mo f12 ka">{m.prices && m.prices.length ? money(m.prices[m.prices.length - 1].p) : "—"}</span>
         <Plus size={15} color={C.muted} />
        </button>
       );
      })}
     </Card>
    )}
   </div>

   {others.length > 0 && (
    <div className="ku cs da">
     <div className="l cs ch bw g bm" style={{ background: C.ink }}>
      <Person id={others[0].id} size={30} />
      <div className="ax">
       <div className="f135 e" style={{ color: "#F6F7F2" }}>{personOf(others[0].id).name} is in the shop right now</div>
       <div className="f115" style={{ color: "#94A199" }}>Anything you add lands on their screen straight away</div>
      </div>
      <span className="ko o" style={{ width: 8, height: 8, background: C.citron }} />
     </div>
    </div>
   )}

   {/* suggestion rail */}
   {!q && suggestions.length > 0 && (
    <div className="dj">
     <div className="cs dr bw g cd">
      <Label>Usually about now</Label>
      <div className="kl" style={{ marginBottom: 2 }} />
     </div>
     <div className="kc bw cd aa cs dk">
      {suggestions.map((s) => (
       <button key={s.id} onClick={() => A.addToList(s.name)}
        className="kp an o dt be ds bw g cd"
        style={SURF}>
        <span className="o" style={{ width: 6, height: 6, background: s.state === "out" ? C.red : s.state === "low" ? C.amber : C.citronDeep }} />
        <span className="f13 e">{s.name}</span>
        <Plus size={13} color={C.muted} />
       </button>
      ))}
     </div>
    </div>
   )}

   {/* list */}
   <div className="cs dj ap">
    {groups.length === 0 && (
     <Empty icon={ShoppingBag} title="Nothing on the list" body="Type an item above, or scan a receipt and KaMaSe will learn what you buy."
      action={<Btn tone="citron" onClick={openScan}><Camera size={15} />Scan a receipt</Btn>} />
    )}
    {groups.map((g, gi) => {
     const Ic = g.cat.icon;
     const isOpen = !collapsed[g.cat.id];
     return (
      <Card key={g.cat.id} className="ku z" style={{ animationDelay: `${gi * 40}ms` }}>
       <button onClick={() => setCollapsed((p) => ({ ...p, [g.cat.id]: !p[g.cat.id] }))}
        className="az bw g bb cs bs cc ah">
        <span className="s cg" style={{ background: g.cat.color + "18" }}><Ic size={14} color={g.cat.color} /></span>
        <span className="kd f15 h ax">{g.cat.label}</span>
        <span className="mo f115 ka">{g.items.filter((i) => !i.done).length}/{g.items.length}</span>
        <ChevronDown size={15} color={C.muted} style={{ transform: isOpen ? "none" : "rotate(-90deg)", transition: "transform .2s" }} />
       </button>
       {isOpen && g.items.map((i) => {
        const p = lastPrice(db, i.name);
        return (
         <div key={i.id} className="bw y bm cs bg kr">
          <button onClick={() => S.patch("list", i.id, { done: !i.done })} className="kp bn o bw g p an"
           style={{ width: 22, height: 22, background: i.done ? C.citron : "transparent", border: `1.5px solid ${i.done ? C.citron : "#CFD4C7"}` }}>
           {i.done && <span className="ko bw"><Check size={13} color={C.ink} strokeWidth={3} /></span>}
          </button>
          <button className="ax ah au" onClick={() => setSheet({ ...i })}>
           <div className="bw w">
            <span className="f15 ad" style={{ textDecoration: i.done ? "line-through" : "none", color: i.done ? C.muted : C.ink }}>
             {i.name}{i.qty > 1 && <span className="mo ka"> ×{i.qty}</span>}
            </span>
            <span className="kl" />
            <span className="mo f125 an" style={{ color: p ? C.ink2 : C.line }}>{p ? money(p * (i.qty || 1)) : "—"}</span>
           </div>
           {(i.unit || i.note) && (
            <div className="f12 bn ad ka">
             {i.unit}{i.unit && i.note ? " · " : ""}{i.note}
            </div>
           )}
          </button>
          {i.fav && <Star size={13} color={C.amber} fill={C.amber} className="bi" />}
          <span className="bn"><Person id={i.by || "K"} size={20} /></span>
          <button className="kp o bn" onClick={() => { S.remove("list", i.id); toast(`${i.name} removed`); }} aria-label="Remove item"
           style={{ padding: 4, borderRadius: 9999 }}>
           <X size={15} color={C.muted} />
          </button>
         </div>
        );
       })}
      </Card>
     );
    })}
   </div>

   {/* what this basket costs where */}
   {items.length > 0 && (() => {
    const baskets = basketByStore(db, items);
    const deals = goodPrices(db, items);
    const cur = db.settings.currency;
    return (
     <div className="cs dj ap">
      {baskets.length > 1 && (
       <Card className="ku dz">
        <div className="bw g cd">
         <Label>This basket, priced by shop</Label>
         <div className="kl" style={{ marginBottom: 2 }} />
        </div>
        <div className="da ab">
         {baskets.slice(0, 4).map((b, i) => (
          <div key={b.store}>
           <div className="bw w">
            {i === 0 && <span className="mo o bj dq f10" style={{ background: C.citron, color: C.ink }}>BEST</span>}
            <span className="f14" style={{ fontWeight: i === 0 ? 500 : 400 }}>{b.store}</span>
            <span className="kl" />
            <span className="mo f14">{money(b.total, cur)}</span>
            <span className="mo f115 cz" style={{ width: 54, textAlign: "right", color: i === 0 ? C.citronDeep : C.red }}>
             {i === 0 ? "cheapest" : "+" + Math.round(b.total - baskets[0].total)}
            </span>
           </div>
           <div className="o z bi" style={{ height: 4, background: "#EEF0E9" }}>
            <div style={{ width: `${(b.total / baskets[baskets.length - 1].total) * 100}%`, height: "100%", background: i === 0 ? C.citronDeep : "#D8DCD0", transition: "width .6s" }} />
           </div>
          </div>
         ))}
        </div>
        <div className="f115 da cw kr ka">
         From what you paid. {baskets[0].known} of {items.length} priced at {baskets[0].store}; the rest use your last price anywhere.
        </div>
       </Card>
      )}

      {deals.length > 0 && (
       <Card className="ku dz">
        <Label>Below your usual</Label>
        <div className="cb am">
         {deals.map((d) => (
          <Row key={d.name} l={d.name} s={`at ${d.store}`} v={money(d.price, cur)} c={C.citronDeep} w={`−${Math.round(d.save)}`} />
         ))}
        </div>
        <div className="f115 da cw kr ka">
         Compared with the average you normally pay for these.
        </div>
       </Card>
      )}
     </div>
    );
   })()}

   {items.length > 0 && (
    <div className="ku fixed ay aq bw p m" style={{ bottom: 96 }}>
     <div className="m cs az" style={{ maxWidth: 430 }}>
      {checked.length > 0
       ? <Btn full size="lg" tone="citron" onClick={A.buyChecked}><Check size={16} strokeWidth={3} />Mark {checked.length} as bought</Btn>
       : <Btn full size="lg" onClick={onStartShopping}><ShoppingBag size={16} />Start shopping</Btn>}
     </div>
    </div>
   )}

   <ItemSheet open={!!sheet} onClose={() => setSheet(null)} S={S} item={sheet}
    onSave={(d) => {
     if (d.id) { S.patch("list", d.id, d); }
     else { A.addToList(d.name, { cat: d.cat, qty: d.qty, unit: d.unit, note: d.note, fav: d.fav }); }
    }} onDelete={(id) => S.remove("list", id)} />

  </div>
 );
}

function ShoppingMode({ S, A, onClose }) {
 const { db, me } = S;
 const cur = db.settings.currency;
 const items = live(db.list);
 const started = useRef(now());
 const [sortAisle, setSortAisle] = useState(true);

 useEffect(() => {
  const beat = () => S.put("presence", { id: me, at: now(), active: true });
  beat();
  const heart = setInterval(beat, 20000);
  const fast = setInterval(() => S.sync(), 5000);
  let lock;
  (async () => { try { lock = await navigator.wakeLock.request("screen"); } catch (e) {} })();
  return () => {
   clearInterval(heart); clearInterval(fast);
   S.put("presence", { id: me, at: now(), active: false });
   try { lock && lock.release(); } catch (e) {}
  };
 }, [me]);

 const others = live(db.presence).filter((p) => p.id !== me && p.active && now() - p.at < 120000);
 const pushed = items.filter((i) => i.by !== me && i.updatedAt > started.current && !i.done);
 const done = items.filter((i) => i.done);
 const spent = done.reduce((s, i) => s + (lastPrice(db, i.name) || 0) * (i.qty || 1), 0);
 const groups = CATS.map((c) => ({ cat: c, items: items.filter((i) => i.cat === c.id && !i.done) })).filter((g) => g.items.length);
 const rows = sortAisle ? groups : [{ cat: null, items: items.filter((i) => !i.done) }];

 return (
  <div className="ac ar z-50 bw ao" style={{ background: C.canvas }}>
   <div className="cs ce cq an satx" style={{ background: C.ink }}>
    <div className="bw g bm">
     <div className="ax">
      <div className="mo j f105" style={{ letterSpacing: ".16em", color: "#94A199" }}>In the shop</div>
      <div className="kd h f24" style={{ color: "#F6F7F2" }}>{done.length} of {items.length}</div>
     </div>
     <div className="d">
      <div className="mo j f105" style={{ letterSpacing: ".16em", color: "#94A199" }}>In the trolley</div>
      <div className="mo f19" style={{ color: C.citron }}>{money(spent, cur)}</div>
     </div>
     <button className="kp o dv" style={{ background: "rgba(246,247,242,.12)" }} onClick={onClose}><X size={17} color="#F6F7F2" /></button>
    </div>
    <div className="o z da" style={{ height: 5, background: "rgba(246,247,242,.15)" }}>
     <div style={{ width: `${items.length ? (done.length / items.length) * 100 : 0}%`, height: "100%", background: C.citron, transition: "width .4s" }} />
    </div>
    <div className="bw g cd da">
     {others.length > 0 && (
      <div className="bw g aw">
       <Person id={others[0].id} size={20} />
       <span className="f115" style={{ color: "#94A199" }}>{personOf(others[0].id).name} is here too</span>
      </div>
     )}
     <div className="ax" />
     <button onClick={() => setSortAisle(!sortAisle)} className="kp o cr do f115"
      style={{ background: "rgba(246,247,242,.12)", color: "#F6F7F2" }}>{sortAisle ? "By category" : "One long list"}</button>
    </div>
   </div>

   <div className="kc ax t cs cw pb-32">
    {pushed.length > 0 && (
     <div className="ku l cs ch ck bw g bm" style={{ background: C.citron }}>
      <Sparkles size={16} color={C.ink} />
      <div className="f135 e" style={{ color: C.ink }}>
       {personOf(pushed[0].by).name} just added {pushed.map((i) => i.name).join(", ")}
      </div>
     </div>
    )}

    {items.length === 0 && <Empty icon={Check} title="Trolley's full" body="Nothing left on the list." action={<Btn onClick={onClose}>Leave the shop</Btn>} />}

    {rows.map((g, gi) => (
     <div key={g.cat ? g.cat.id : "all"} className="cn">
      {g.cat && (
       <div className="bw g cd dr cp">
        <g.cat.icon size={13} color={g.cat.color} />
        <span className="kn">{g.cat.label}</span>
        <div className="kl" style={{ marginBottom: 2 }} />
       </div>
      )}
      <div className="am">
       {g.items.map((i) => {
        const pr = lastPrice(db, i.name);
        const isNew = i.by !== me && i.updatedAt > started.current;
        return (
         <button key={i.id} onClick={() => S.patch("list", i.id, { done: true })}
          className="kp az ah l cs cy bw g bh"
          style={{ background: C.paper, boxShadow: isNew ? `inset 0 0 0 2px ${C.citron}` : "0 1px 2px rgba(27,42,36,.05)" }}>
          <span className="o an" style={{ width: 28, height: 28, border: `2px solid #CFD4C7` }} />
          <span className="ax au">
           <span className="at f18 e ad">{i.name}{i.qty > 1 && <span className="mo ka"> ×{i.qty}</span>}</span>
           {(i.unit || i.note) && <span className="at f125 bn ad ka">{i.unit}{i.unit && i.note ? " · " : ""}{i.note}</span>}
          </span>
          <span className="mo f14 an" style={{ color: pr ? C.ink2 : C.line }}>{pr ? money(pr * (i.qty || 1), cur) : "—"}</span>
         </button>
        );
       })}
      </div>
     </div>
    ))}

    {done.length > 0 && (
     <div>
      <div className="bw g cd dr cp">
       <span className="kn">In the trolley</span>
       <div className="kl" style={{ marginBottom: 2 }} />
      </div>
      <div className="ag">
       {done.map((i) => (
        <button key={i.id} onClick={() => S.patch("list", i.id, { done: false })}
         className="kp az ah u cs bg bw g bm" style={{ background: "#E9EBE3" }}>
         <span className="o bw g p an" style={{ width: 22, height: 22, background: C.citron }}><Check size={13} color={C.ink} strokeWidth={3} /></span>
         <span className="ax f14" style={{ color: C.muted, textDecoration: "line-through" }}>{i.name}</span>
        </button>
       ))}
      </div>
     </div>
    )}
   </div>

   <div className="ac ay aq al cs cu dp sab" style={{ background: `linear-gradient(${C.canvas}00, ${C.canvas} 40%)` }}>
    <Btn full size="lg" tone="citron" disabled={!done.length} onClick={() => { A.buyChecked(); onClose(); }}>
     <Check size={16} strokeWidth={3} />Finish — {done.length} into the kitchen
    </Btn>
   </div>
  </div>
 );
}

function PantryScreen({ S, A }) {
 const { db } = S;
 const pantry = usePantry(db);
 const [filter, setFilter] = useState("attention");
 const onList = new Set(live(db.list).map((i) => norm(i.name)));

 const tabs = [
  { id: "attention", label: "Needs attention" },
  { id: "fresh", label: "Use soon" },
  { id: "all", label: "Everything" },
  { id: "fav", label: "Favourites" },
 ];
 const shown = (filter === "fresh" ? [...pantry].sort((a, b) => (a.daysFresh ?? 99) - (b.daysFresh ?? 99)) : pantry)
  .filter((p) => filter === "attention" ? p.state !== "in" : filter === "fresh" ? p.aging : filter === "fav" ? p.fav : true);
 const outCount = pantry.filter((p) => p.state === "out").length;
 const lowCount = pantry.filter((p) => p.state === "low").length;

 return (
  <div className="cs pb-28">
   <Card className="ku dz ck">
    <Label>Kitchen status</Label>
    <div className="bw ae bd dd">
     <div>
      <div className="kd f30 h r">{outCount}</div>
      <div className="f12 cm ka">run out</div>
     </div>
     <div>
      <div className="kd f30 h r" style={{ color: C.amber }}>{lowCount}</div>
      <div className="f12 cm ka">running low</div>
     </div>
     <div className="ax" />
     <div>
      <div className="kd f30 h r" style={{ color: C.plum }}>{pantry.filter((p) => p.aging).length}</div>
      <div className="f12 cm ka">use soon</div>
     </div>
     <div className="d">
      <div className="kd f30 h r" style={{ color: C.citronDeep }}>{pantry.length}</div>
      <div className="f12 cm ka">tracked</div>
     </div>
    </div>
    <div className="f125 c da cw kr ka">
     Timing comes from how often you rebuy each item.
    </div>
   </Card>

   <div className="kc bw cd aa dk ck">
    {tabs.map((t) => (
     <button key={t.id} onClick={() => setFilter(t.id)} className={CHIP}
      style={chipS(filter === t.id)}>{t.label}</button>
    ))}
   </div>

   {shown.length === 0 && <Empty icon={Package} title="All stocked" body="Nothing is close to running out. KaMaSe will nudge you when something is." />}

   <div className="ab">
    {shown.map((p, i) => {
     const Ic = catOf(p.cat).icon;
     const tone = p.state === "out" ? C.red : p.state === "low" ? C.amber : C.citronDeep;
     const added = onList.has(p.id);
     return (
      <Card key={p.id} className="ku cf" style={{ animationDelay: `${i * 25}ms` }}>
       <div className="bw g bm">
        <span className="u dv" style={{ background: catOf(p.cat).color + "18" }}><Ic size={15} color={catOf(p.cat).color} /></span>
        <div className="ax au">
         <div className="f15 e ad">{p.name}</div>
         <div className="f12 bn ka">
          Bought {rel(p.lastBought)}{p.avg ? ` · about every ${Math.round(p.avg)} days` : " · learning your rhythm"}
         </div>
        </div>
        <button disabled={added} onClick={() => A.addToList(p.name, { cat: p.cat, unit: p.unit })}
         className="kp o cr bu f125 e an"
         style={{ background: added ? "#EEF0E9" : C.ink, color: added ? C.muted : "#F6F7F2" }}>
         {added ? "On list" : "Add"}
        </button>
       </div>
       <div className="da bw g bm">
        <div className="ax o z" style={{ height: 5, background: "#EAECE4" }}>
         <div style={{ width: `${Math.round((p.pct ?? (p.state === "out" ? 1 : 0.3)) * 100)}%`, height: "100%", background: tone, transition: "width .6s" }} />
        </div>
        <div className="mo f11 an" style={{ color: tone }}>
         {p.state === "out" ? "out" : p.dueIn != null ? (p.dueIn <= 0 ? "due now" : `~${p.dueIn}d left`) : p.state}
        </div>
        <button onClick={() => S.patch("catalog", p.id, { stock: p.stock === "out" ? "in" : "out" })}
         className="kp o bx do f115 an" style={{ background: "#EEF0E9", color: C.ink2 }}>
         {p.stock === "out" ? "Restocked" : "Used up"}
        </button>
       </div>
       {p.aging && (
        <div className="cb bp bw g cd kr">
         <Clock size={12} color={C.plum} />
         <span className="f12" style={{ color: C.plum }}>
          {p.daysFresh <= 0 ? "Past its usual freshness — check it" : `Good for about ${p.daysFresh} more day${p.daysFresh === 1 ? "" : "s"}`}
         </span>
         <div className="ax" />
         <button onClick={() => S.patch("catalog", p.id, { freshFrom: now() })}
          className="kp o bx do f115" style={{ background: "#EEF0E9", color: C.ink2 }}>Still fresh</button>
        </div>
       )}
      </Card>
     );
    })}
   </div>
  </div>
 );
}

async function askClaude(content) {
 const r = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content }] }),
 });
 const d = await r.json();
 return (d.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
}
function parseJson(text) {
 const clean = String(text).replace(/```json/g, "").replace(/```/g, "").trim();
 const a = clean.indexOf("{"), b = clean.lastIndexOf("}");
 return JSON.parse(a >= 0 && b > a ? clean.slice(a, b + 1) : clean);
}
const fileToB64 = (f) => new Promise((res, rej) => {
 const r = new FileReader();
 r.onload = () => res(String(r.result).split(",")[1]);
 r.onerror = () => rej(new Error("Could not read that image"));
 r.readAsDataURL(f);
});

function matchRecipe(recipe, pantry) {
 const have = new Set(pantry.filter((p) => p.state !== "out").map((p) => p.id));
 const ings = (recipe.ingredients || []).map((i) => (typeof i === "string" ? { name: i } : i));
 const missing = ings.filter((i) => !have.has(norm(i.name)));
 return { ings, missing, ratio: ings.length ? (ings.length - missing.length) / ings.length : 0 };
}

function KitchenScreen({ S, A, toast }) {
 const { db } = S;
 const pantry = usePantry(db);
 const recipes = live(db.recipes);
 const [tab, setTab] = useState("recipes");
 const [detail, setDetail] = useState(null);
 const [editor, setEditor] = useState(null);
 const [picking, setPicking] = useState(null);
 const [thinking, setThinking] = useState(false);

 const [sortBy, setSortBy] = useState("ready");
 const agingSet = new Set(pantry.filter((p) => p.aging).map((p) => p.id));
 const scored = recipes
  .map((r) => {
   const m = matchRecipe(r, pantry);
   return { r, ...m, aging: m.ings.filter((i) => agingSet.has(norm(i.name))).length };
  })
  .sort((a, b) => (sortBy === "useup" ? b.aging - a.aging || b.ratio - a.ratio : b.ratio - a.ratio || b.aging - a.aging));
 const days = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(); d.setHours(12, 0, 0, 0);
  const t = d.getTime() + i * DAY;
  return { key: iso(t), t };
 });

 const suggest = async () => {
  setThinking(true);
  try {
   const stock = pantry.filter((p) => p.state !== "out").map((p) => p.name).join(", ");
   const txt = await askClaude(`Our kitchen currently has: ${stock}. Suggest one dinner recipe for 2 that uses mostly these ingredients. Reply with ONLY JSON, no prose: {"title":string,"minutes":number,"serves":number,"tag":string,"ingredients":[{"name":string,"qty":string}],"steps":[string]}. Keep ingredient names simple and singular, e.g. "olive oil".`);
   const j = parseJson(txt);
   S.put("recipes", { id: uid(), title: j.title, minutes: j.minutes || 30, serves: j.serves || 2, tag: j.tag || "From your pantry", ingredients: j.ingredients || [], steps: j.steps || [] });
   toast(`Saved “${j.title}”`);
  } catch (e) { toast("Couldn't reach the recipe helper — try again"); }
  setThinking(false);
 };

 const addMissing = (missing) => { missing.forEach((m) => A.addToList(m.name)); toast(`${missing.length} ingredients added to the list`); };

 return (
  <div className="cs pb-28">
   <div className="kc bw cd aa dk ck">
    {[{ id: "recipes", label: "Recipes" }, { id: "plan", label: "This week" }].map((t) => (
     <button key={t.id} onClick={() => setTab(t.id)} className={CHIP}
      style={chipS(tab === t.id)}>{t.label}</button>
    ))}
    <div className="ax" />
    {tab === "recipes" && (
     <>
      <button onClick={suggest} disabled={thinking} className="kp an o bz ds f13 e b g aw"
       style={{ background: C.citron, color: C.ink, opacity: thinking ? 0.6 : 1 }}>
       {thinking ? <Loader2 size={13} style={{ animation: "kmSpin 1s linear infinite" }} /> : <Sparkles size={13} />}
       {thinking ? "Thinking" : "From pantry"}
      </button>
      <button onClick={() => setEditor({ ingredients: [], steps: [] })} className="kp an o dv" style={{ background: C.ink }}><Plus size={15} color="#F6F7F2" /></button>
     </>
    )}
   </div>

   {tab === "recipes" && (
    <div className="ab">
     {recipes.length > 1 && (
      <div className="bw g cd cp by">
       <span className="kn">Sort</span>
       {[{ id: "ready", label: "Ready to cook" }, { id: "useup", label: "Use up first" }].map((o) => (
        <button key={o.id} onClick={() => setSortBy(o.id)} className="kp o bx do f115"
         style={{ background: sortBy === o.id ? C.ink : "transparent", color: sortBy === o.id ? "#F6F7F2" : C.muted, border: `1px solid ${sortBy === o.id ? C.ink : C.line}` }}>{o.label}</button>
       ))}
      </div>
     )}
     {scored.length === 0 && <Empty icon={ChefHat} title="No recipes yet" body="Save what you cook. Each one is checked against your kitchen."
      action={<Btn tone="citron" onClick={() => setEditor({ ingredients: [], steps: [] })}><Plus size={15} />Write a recipe</Btn>} />}
     {scored.map(({ r, ings, missing, ratio, aging }, i) => (
      <Card key={r.id} className="ku dz" style={{ animationDelay: `${i * 30}ms` }}>
       <button className="az ah" onClick={() => setDetail(r)}>
        <div className="bw y bm">
         <Ring value={ratio} size={46} stroke={5} color={missing.length === 0 ? C.citronDeep : C.amber}>
          <span className="mo f11" style={{ color: C.ink2 }}>{ings.length - missing.length}/{ings.length}</span>
         </Ring>
         <div className="ax au">
          <div className="kd f17 h x">{r.title}</div>
          <div className="f12 cm bw g cd af ka">
           <span className="b g bo"><Clock size={11} />{r.minutes} min</span>
           <span>·</span><span>serves {r.serves}</span>
           {r.tag && <><span>·</span><span>{r.tag}</span></>}
          </div>
          {aging > 0 && (
           <span className="b g bo o db bf bi f11" style={{ background: C.plum + "16", color: C.plum }}>
            <Clock size={10} />Uses {aging} thing{aging > 1 ? "s" : ""} going off
           </span>
          )}
         </div>
         <ChevronRight size={16} color={C.muted} className="dd" />
        </div>
       </button>
       <div className="da cw bw g cd kr">
        {missing.length === 0
         ? <div className="f13 e b g aw" style={{ color: C.citronDeep }}><Check size={14} strokeWidth={3} />You can cook this tonight</div>
         : <>
          <div className="f125 ax ad ka">Missing {missing.map((m) => m.name).join(", ")}</div>
          <Btn size="sm" tone="quiet" onClick={() => addMissing(missing)}><Plus size={13} />Add {missing.length}</Btn>
         </>}
       </div>
      </Card>
     ))}
    </div>
   )}

   {tab === "plan" && (
    <div>
     <div className="am cn">
      {days.map((d, i) => {
       const entry = live(db.plan).find((p) => p.date === d.key);
       const r = entry && db.recipes[entry.recipeId];
       const m = r ? matchRecipe(r, pantry) : null;
       return (
        <Card key={d.key} className="ku cf bw g bm" style={{ animationDelay: `${i * 25}ms` }}>
         <div className="a an" style={{ width: 40 }}>
          <div className="mo f10 j" style={{ color: C.muted, letterSpacing: ".1em" }}>{new Date(d.t).toLocaleDateString(undefined, { weekday: "short" })}</div>
          <div className="kd f20 h r bn">{new Date(d.t).getDate()}</div>
         </div>
         <div className="ax au">
          {r ? (
           <>
            <div className="f145 e ad">{r.title}</div>
            <div className="f12 bn" style={{ color: m.missing.length ? C.amber : C.citronDeep }}>
             {m.missing.length ? `${m.missing.length} to buy` : "everything on hand"}
            </div>
           </>
          ) : <button className="f14 ah ka" onClick={() => setPicking(d.key)}>Plan a dinner</button>}
         </div>
         {r
          ? <button className="kp o dv kq" onClick={() => S.remove("plan", entry.id)}><X size={14} color={C.ink2} /></button>
          : <button className="kp o dv" style={{ background: C.ink }} onClick={() => setPicking(d.key)}><Plus size={14} color="#F6F7F2" /></button>}
        </Card>
       );
      })}
     </div>
     <Btn full size="lg" tone="citron" onClick={() => {
      const planned = live(db.plan).map((p) => db.recipes[p.recipeId]).filter(Boolean);
      const need = [];
      planned.forEach((r) => matchRecipe(r, pantry).missing.forEach((m) => { if (!need.some((n) => norm(n) === norm(m.name))) need.push(m.name); }));
      if (!need.length) { toast("Your week is already covered"); return; }
      need.forEach((n) => A.addToList(n));
      toast(`${need.length} ingredients added for the week`);
     }}><ShoppingBag size={16} />Build the shopping list</Btn>
    </div>
   )}

   {/* recipe detail */}
   <Sheet open={!!detail} onClose={() => setDetail(null)} title={detail ? detail.title : ""} tall>
    {detail && (() => {
     const { ings, missing } = matchRecipe(detail, pantry);
     const have = (n) => !missing.some((m) => norm(m.name) === norm(n));
     return (
      <div>
       <div className="bw g bm f125 cn ka">
        <span className="b g bo"><Clock size={12} />{detail.minutes} min</span>
        <span>·</span><span>serves {detail.serves}</span>
       </div>
       <Card className="dz ck">
        <Label>Ingredients</Label>
        <div className="cb am">
         {ings.map((i, k) => (
          <div key={k} className="bw w">
           <span className="o bk an" style={{ width: 6, height: 6, background: have(i.name) ? C.citronDeep : C.amber, transform: "translateY(-2px)" }} />
           <span className="f145">{i.name}</span>
           <span className="kl" />
           <span className="mo f125 an" style={{ color: have(i.name) ? C.muted : C.amber }}>{i.qty || (have(i.name) ? "in kitchen" : "to buy")}</span>
          </div>
         ))}
        </div>
       </Card>
       {detail.steps && detail.steps.length > 0 && (
        <Card className="dz cn">
         <Label>Method</Label>
         <ol className="cb ap">
          {detail.steps.map((s, k) => (
           <li key={k} className="bw bm">
            <span className="mo f11 bn" style={{ color: C.citronDeep }}>{String(k + 1).padStart(2, "0")}</span>
            <span className="f14 c">{s}</span>
           </li>
          ))}
         </ol>
        </Card>
       )}
       <div className="bw cd">
        {missing.length > 0 && <Btn full tone="citron" onClick={() => { addMissing(missing); setDetail(null); }}><Plus size={15} />Add {missing.length} missing</Btn>}
        <Btn full tone="ghost" onClick={() => { setEditor(detail); setDetail(null); }}><Pencil size={14} />Edit</Btn>
       </div>
       <button className="kp az da ch f14 e o" style={{ color: C.red }}
        onClick={() => { S.remove("recipes", detail.id); setDetail(null); }}>Delete recipe</button>
      </div>
     );
    })()}
   </Sheet>

   <RecipeEditor open={!!editor} recipe={editor} onClose={() => setEditor(null)} onSave={(r) => { S.put("recipes", r.id ? r : { ...r, id: uid() }); toast("Recipe saved"); }} />

   <Sheet open={!!picking} onClose={() => setPicking(null)} title="Choose a dinner">
    <div className="am">
     {scored.map(({ r, missing }) => (
      <button key={r.id} className="kp az ah" onClick={() => {
       const ex = live(db.plan).find((p) => p.date === picking);
       if (ex) S.patch("plan", ex.id, { recipeId: r.id });
       else S.put("plan", { id: uid(), date: picking, recipeId: r.id });
       setPicking(null);
      }}>
       <Card className="cf bw g bm">
        <span className="u dv kq"><ChefHat size={15} color={C.ink2} /></span>
        <div className="ax au">
         <div className="f145 e ad">{r.title}</div>
         <div className="f12" style={{ color: missing.length ? C.amber : C.citronDeep }}>{missing.length ? `${missing.length} to buy` : "everything on hand"}</div>
        </div>
        <ChevronRight size={15} color={C.muted} />
       </Card>
      </button>
     ))}
    </div>
   </Sheet>
  </div>
 );
}

function RecipeEditor({ open, recipe, onClose, onSave }) {
 const [d, setD] = useState({ title: "", minutes: 30, serves: 2, tag: "", ingredients: [], steps: [] });
 const [ing, setIng] = useState("");
 const [step, setStep] = useState("");
 useEffect(() => { if (open) setD({ title: "", minutes: 30, serves: 2, tag: "", ingredients: [], steps: [], ...(recipe || {}) }); }, [open, recipe]);
 if (!open) return null;
 const set = (k, v) => setD((p) => ({ ...p, [k]: v }));
 return (
  <Sheet open={open} onClose={onClose} title={d.id ? "Edit recipe" : "New recipe"} tall>
   <Field label="Title" value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="Friday risotto" />
   <div className="bw bm">
    <div className="ax"><Field label="Minutes" type="number" value={d.minutes} onChange={(e) => set("minutes", Number(e.target.value))} /></div>
    <div className="ax"><Field label="Serves" type="number" value={d.serves} onChange={(e) => set("serves", Number(e.target.value))} /></div>
   </div>
   <div className="bq"><Label>Ingredients</Label></div>
   <div className="ag dr">
    {d.ingredients.map((i, k) => (
     <div key={k} className="bw g cd u bz bg kw">
      <span className="ax f14">{i.name}</span>
      <span className="mo f12 ka">{i.qty}</span>
      <button className="kp" onClick={() => set("ingredients", d.ingredients.filter((_, x) => x !== k))}><Trash2 size={14} color={C.muted} /></button>
     </div>
    ))}
   </div>
   <div className="bw cd cn">
    <input value={ing} onChange={(e) => setIng(e.target.value)} placeholder="Add an ingredient"
     onKeyDown={(e) => { if (e.key === "Enter" && ing.trim()) { set("ingredients", [...d.ingredients, { name: ing.trim(), qty: "" }]); setIng(""); } }}
     className="ax u bz ch f15 kw" />
    <Btn tone="quiet" onClick={() => { if (ing.trim()) { set("ingredients", [...d.ingredients, { name: ing.trim(), qty: "" }]); setIng(""); } }}><Plus size={15} /></Btn>
   </div>
   <div className="bq"><Label>Method</Label></div>
   <div className="ag dr">
    {d.steps.map((s, k) => (
     <div key={k} className="bw y cd u bz bg kw">
      <span className="mo f11 bn" style={{ color: C.citronDeep }}>{String(k + 1).padStart(2, "0")}</span>
      <span className="ax f14">{s}</span>
      <button className="kp" onClick={() => set("steps", d.steps.filter((_, x) => x !== k))}><Trash2 size={14} color={C.muted} /></button>
     </div>
    ))}
   </div>
   <div className="bw cd cv">
    <input value={step} onChange={(e) => setStep(e.target.value)} placeholder="Add a step"
     onKeyDown={(e) => { if (e.key === "Enter" && step.trim()) { set("steps", [...d.steps, step.trim()]); setStep(""); } }}
     className="ax u bz ch f15 kw" />
    <Btn tone="quiet" onClick={() => { if (step.trim()) { set("steps", [...d.steps, step.trim()]); setStep(""); } }}><Plus size={15} /></Btn>
   </div>
   <Btn full size="lg" onClick={() => { if (!d.title.trim()) return; onSave(d); onClose(); }}>Save recipe</Btn>
  </Sheet>
 );
}

function MoneyScreen({ S, toast }) {
 const { db } = S;
 const cur = db.settings.currency || "kr";
 const sp = useSpend(db);
 const [tab, setTab] = useState("overview");
 const [budgetSheet, setBudgetSheet] = useState(false);
 const [draft, setDraft] = useState(String(db.settings.budget || ""));
 const [receipt, setReceipt] = useState(null);
 const [priceItem, setPriceItem] = useState(null);
 const [plan, setPlan] = useState(null);
 const [thinking, setThinking] = useState(false);

 const budget = Number(db.settings.budget) || 0;
 const left = budget - sp.spent;
 const dLeft = Math.max(1, Math.round((cycleEnd() - now()) / DAY));
 const cycleLen = Math.round((cycleEnd() - cycleStart()) / DAY);
 const dElapsed = Math.max(1, Math.round((now() - cycleStart()) / DAY) + 1);
 const projected = (sp.spent / dElapsed) * cycleLen;
 const catRows = Object.entries(sp.byCat).sort((a, b) => b[1] - a[1]);
 const storeRows = Object.entries(sp.byStore).sort((a, b) => b[1] - a[1]);
 const tracked = live(db.catalog).filter((c) => (c.prices || []).length >= 2);
 const bi = basketIndex(db);

 const savingPlan = async () => {
  setThinking(true);
  try {
   const txt = await askClaude(`A two-person household spent ${money(sp.spent, cur)} on groceries this budget cycle against a ${money(budget, cur)} budget. By category: ${catRows.map(([k, v]) => catOf(k).label + " " + money(v, cur)).join("; ")}. By shop: ${storeRows.map(([k, v]) => k + " " + money(v, cur)).join("; ")}. Previous cycle: ${money(sp.prev, cur)}. Give three concrete ways to spend less without eating worse. ONLY JSON: {"tips":[{"title":string,"body":string}]}. Titles max 5 words, bodies max 22 words.`);
   setPlan(parseJson(txt).tips || []);
  } catch (e) { toast("Couldn't build a plan right now"); }
  setThinking(false);
 };

 return (
  <div className="cs pb-28">
   <Tabs v={tab} set={setTab} opts={[{ id: "overview", label: "Overview" }, { id: "receipts", label: "Receipts" }, { id: "cards", label: "Cards" }, { id: "insights", label: "Insights" }]} />

   {tab === "overview" && (
    <>
     <div className="kt ku ct" style={{ "--tape": C.paper }}>
      <div className="rounded-t-2xl di co ci" style={{ background: C.paper, boxShadow: "0 1px 2px rgba(27,42,36,.05), 0 10px 30px -18px rgba(27,42,36,.3)" }}>
       <div className="bw y v">
        <div>
         <Label>{cycleLabel()}</Label>
         <div className="kd h r dd" style={{ fontSize: 40 }}>{money(sp.spent, cur)}</div>
         <div className="f13 bi ka">{budget ? `of ${money(budget, cur)} set aside` : "tap below to set a budget"}</div>
        </div>
        <Ring value={budget ? sp.spent / budget : 0} size={64} color={left < 0 ? C.red : C.citron}>
         <span className="mo f12 e">{budget ? Math.round((sp.spent / budget) * 100) + "%" : "—"}</span>
        </Ring>
       </div>
       <div className="cl ce ab kx">
        {[
         ...(budget ? [
          ["Left to spend", money(Math.max(0, left), cur), left < 0 ? C.red : C.ink],
          ["Days remaining", String(dLeft), C.ink],
          ["That's per day", money(Math.max(0, left) / Math.max(1, dLeft), cur), C.ink],
          ["On this pace", money(projected, cur), projected > budget ? C.amber : C.citronDeep],
         ] : []),
         ...(sp.pant ? [["Pant returned", "+ " + money(sp.pant, cur), C.citronDeep]] : []),
         ...(sp.personalMonth ? [["On personal cards", money(sp.personalMonth, cur), C.plum]] : []),
        ].map(([k, v, c]) => <Row key={k} l={k} v={v} c={c} />)}
        {!budget && <div className="f13 ka" style={{ lineHeight: 1.6 }}>Set a monthly amount and KaMaSe tracks pace, per-day headroom and where every krone goes.</div>}
       </div>
       <button className="kp az cl o bg f135 e kq"
        onClick={() => { setDraft(String(budget)); setBudgetSheet(true); }}>
        <Pencil size={13} className="inline br bn" />Change the monthly amount
       </button>
      </div>
     </div>

     {sp.rs.length > 0 && (
      <Sec t="Last six weeks">
       <div className="da">
        <Bars data={sp.weeks.map((w, i) => ({ label: i === sp.weeks.length - 1 ? "now" : new Date(w.start).getDate() + "/" + (new Date(w.start).getMonth() + 1), v: w.total, hi: i === sp.weeks.length - 1 }))} format={shortNum} />
       </div>
      </Sec>
     )}

     <div className="dw" />
     <Sec t="Where it went this cycle">
      <div className="da ab">
       {!catRows.length && <div className="f135 ka">No receipts yet this cycle.</div>}
       {catRows.map(([k, v]) => (
        <BarRow key={k} l={catOf(k).label} v={money(v, cur)} icon={catOf(k).icon} ic={catOf(k).color}
         c={catOf(k).color} pct={(v / catRows[0][1]) * 100} />
       ))}
      </div>
     </Sec>

     <div className="dw" />
     <Sec t="By shop">
      <div className="da am">
       {!storeRows.length && <div className="f135 ka">Scan a receipt to start tracking shops.</div>}
       {storeRows.map(([k, v]) => <Row key={k} l={k} v={money(v, cur)} />)}
      </div>
     </Sec>
    </>
   )}

   {tab === "receipts" && (
    <div className="ab">
     {!sp.rs.length && <Empty icon={Receipt} title="No receipts yet" body="Photograph a receipt and KaMaSe reads the items, prices and total for both of you." />}
     {sp.rs.map((r, i) => (
      <button key={r.id} className="kp az ah" onClick={() => setReceipt(r)}>
       <Card className="ku dz bw g bm" style={{ animationDelay: `${i * 25}ms` }}>
        <span className="u dl kq"><Receipt size={15} color={C.ink2} /></span>
        <div className="ax au">
         <div className="f145 e">{r.store}</div>
         <div className="f12 ka">
          {new Date(r.at).toLocaleDateString(undefined, { day: "numeric", month: "short" })} · {(r.items || []).length} items
          {r.payment === "personal" && ` · ${personOf(r.paidBy).name}'s card`}
         </div>
        </div>
        <div className="mo f15">{money(r.total, cur)}</div>
       </Card>
      </button>
     ))}
    </div>
   )}

   {tab === "cards" && (
    <div className="ab">
     <Sec t="Waiting to be paid back">
      <div className="kd h r dd" style={{ fontSize: 34, color: sp.owedTotal ? C.plum : C.ink }}>{money(sp.owedTotal, cur)}</div>
      <div className="f13 bi ka">
       {sp.owed.length ? `${sp.owed.length} shop${sp.owed.length > 1 ? "s" : ""} paid on a personal card` : "Everything went on the shared card"}
      </div>
      {sp.owed.length > 0 && (
       <Btn full style={{ marginTop: 14 }} onClick={() => { sp.owed.forEach((r) => S.patch("receipts", r.id, { reimbursed: true })); toast("Marked as paid back"); }}>
        <Check size={15} strokeWidth={3} />Settle all
       </Btn>
      )}
     </Sec>

     {sp.owed.map((r, i) => (
      <Card key={r.id} className="ku cf bw g bm" style={{ animationDelay: `${i * 25}ms` }}>
       <Person id={r.paidBy || "K"} size={34} />
       <div className="ax au">
        <div className="f145 e ad">{r.store}</div>
        <div className="f12 ka">{personOf(r.paidBy).name}'s card · {new Date(r.at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</div>
       </div>
       <div className="mo f15 dm">{money(r.total, cur)}</div>
       <button className="kp o cr bu f125 e" style={{ background: C.ink, color: "#F6F7F2" }}
        onClick={() => { S.patch("receipts", r.id, { reimbursed: true }); toast("Paid back"); }}>Settle</button>
      </Card>
     ))}

     <Sec t="This month by card" foot="Both count towards the month; personal ones stay here until paid back.">
      <div className="da ab">
       {[["Shared card", sp.spent - sp.personalMonth, C.ink], ["Personal cards", sp.personalMonth, C.plum]].map(([k, v, c]) => (
        <BarRow key={k} l={k} v={money(v, cur)} c={c} pct={sp.spent ? (v / sp.spent) * 100 : 0} />
       ))}
      </div>
     </Sec>
    </div>
   )}

   {tab === "insights" && (
    <div className="ab">
     <Sec t="Cycle against cycle">
      <div className="bw ae bm dd">
       <div className="kd f30 h r">{money(sp.spent, cur)}</div>
       {sp.prev > 0 && (
        <div className="f13 dn b g bo" style={{ color: sp.spent > sp.prev ? C.red : C.citronDeep }}>
         {sp.spent > sp.prev ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
         {Math.abs(Math.round(((sp.spent - sp.prev) / sp.prev) * 100))}% vs last month
        </div>
       )}
      </div>
     </Sec>

     {bi && (
      <Sec t="Your basket index">
       <div className="bw ae bm dd">
        <div className="kd h r" style={{ fontSize: 34, color: bi.pct >= 0 ? C.red : C.citronDeep }}>
         {bi.pct >= 0 ? "+" : ""}{bi.pct.toFixed(1).replace(".", ",")}%
        </div>
        {bi.pct >= 0 ? <TrendingUp size={18} color={C.red} className="bq" /> : <TrendingDown size={18} color={C.citronDeep} className="bq" />}
       </div>
       <div className="f13 bi c ka">
        What your {bi.count} tracked items cost now against the first price KaMaSe saw — about {bi.span} weeks of your shopping.
       </div>
       {(bi.up.length > 0 || bi.down.length > 0) && (
        <div className="da cw am kr">
         {[...bi.up, ...bi.down].map((m) => (
          <Row key={m.name} l={m.name} v={`${m.pct > 0 ? "+" : ""}${m.pct.toFixed(0)}%`} c={m.pct > 0 ? C.red : C.citronDeep} />
         ))}
        </div>
       )}
      </Sec>
     )}

     {tracked.length > 0 && (
      <Sec t="Price history">
       <div className="cb am">
        {tracked.map((c) => {
         const ps = c.prices.map((x) => x.p);
         const d = ps[ps.length - 1] - ps[0];
         return (
          <button key={c.id} className="kp az ah" onClick={() => setPriceItem(c)}>
           <Row l={c.name} v={money(ps[ps.length - 1], cur)} c={d > 0.001 ? C.red : d < -0.001 ? C.citronDeep : C.muted}
            w={`${d > 0 ? "+" : ""}${d.toFixed(2)}`} />
          </button>
         );
        })}
       </div>
      </Sec>
     )}

     <Sec>
      <div className="bw g v">
       <div>
        <Label>Saving plan</Label>
        <div className="f13 cm ka">Three ideas from this month's numbers.</div>
       </div>
       <Btn size="sm" tone="citron" onClick={savingPlan} disabled={thinking}>
        {thinking ? <Loader2 size={13} style={{ animation: "kmSpin 1s linear infinite" }} /> : <Sparkles size={13} />}
        {thinking ? "Working" : "Build"}
       </Btn>
      </div>
      {plan && (
       <div className="dj ap">
        {plan.map((t, i) => (
         <div key={i} className="ku bw bm" style={{ animationDelay: `${i * 60}ms` }}>
          <span className="mo f11 bn" style={{ color: C.citronDeep }}>{String(i + 1).padStart(2, "0")}</span>
          <div>
           <div className="f14 e">{t.title}</div>
           <div className="f13 c bn ka">{t.body}</div>
          </div>
         </div>
        ))}
       </div>
      )}
     </Sec>
    </div>
   )}

   <Sheet open={budgetSheet} onClose={() => setBudgetSheet(false)} title="Monthly amount">
    <div className="f135 c cn ka">The total for each 15th-to-15th cycle. Everything is measured against it.</div>
    <Field label={`Amount (${cur})`} type="number" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
    <Btn full size="lg" onClick={() => { S.setSettings({ budget: Number(draft) || 0 }); setBudgetSheet(false); toast("Budget updated for both of you"); }}>Save amount</Btn>
   </Sheet>

   <Sheet open={!!receipt} onClose={() => setReceipt(null)} title={receipt ? receipt.store : ""} tall>
    {receipt && (
     <div>
      <div className="bw g cd cn">
       <span className="f13 ka">{new Date(receipt.at).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</span>
       <span className="o db bf f115" style={{ background: receipt.payment === "personal" ? C.plum + "16" : "#EEF0E9", color: receipt.payment === "personal" ? C.plum : C.ink2 }}>
        {receipt.payment === "personal" ? `${personOf(receipt.paidBy).name}'s card` : "Shared card"}
       </span>
       {receipt.payment === "personal" && (
        <span className="mo f11" style={{ color: receipt.reimbursed ? C.citronDeep : C.amber }}>{receipt.reimbursed ? "paid back" : "outstanding"}</span>
       )}
      </div>
      <Card className="dz">
       <div className="am">
        {(receipt.items || []).map((i, k) => <Row key={k} l={cap(i.name)} v={money(i.price, cur)} />)}
       </div>
       {receipt.pant > 0 && <div className="dd"><Row l="Pant returned" v={"+ " + money(receipt.pant, cur)} c={C.citronDeep} /></div>}
       <div className="bw w da cw kx">
        <span className="kd f15 h">Total</span>
        <span className="kl" />
        <span className="mo f16 e">{money(receipt.total, cur)}</span>
       </div>
      </Card>
      <div className="bw cd dj">
       <Btn full tone="ghost" onClick={() => {
        const n = receipt.payment === "personal" ? { payment: "shared", paidBy: null, reimbursed: false } : { payment: "personal", paidBy: S.me, reimbursed: false };
        S.patch("receipts", receipt.id, n); setReceipt({ ...receipt, ...n });
       }}>Switch card</Btn>
       {receipt.payment === "personal" && !receipt.reimbursed && (
        <Btn full tone="citron" onClick={() => { S.patch("receipts", receipt.id, { reimbursed: true }); setReceipt({ ...receipt, reimbursed: true }); toast("Paid back"); }}>Settle</Btn>
       )}
      </div>
      <button className="kp az da ch f14 e o" style={{ color: C.red }}
       onClick={() => { S.remove("receipts", receipt.id); setReceipt(null); }}>Delete receipt</button>
     </div>
    )}
   </Sheet>

   <Sheet open={!!priceItem} onClose={() => setPriceItem(null)} title={priceItem ? priceItem.name : ""}>
    {priceItem && (() => {
     const ps = priceItem.prices, vals = ps.map((p) => p.p);
     const best = ps.reduce((a, b) => (b.p < a.p ? b : a));
     return (
      <div>
       <Card className="dz ck">
        <div className="bw w bh ck">
         <div><Label>Now</Label><div className="kd f24 h">{money(vals[vals.length - 1], cur)}</div></div>
         <div><Label>Average</Label><div className="mo f16 cm">{money(mean(vals), cur)}</div></div>
         <div><Label>Best</Label><div className="mo f16 cm" style={{ color: C.citronDeep }}>{money(best.p, cur)}</div></div>
        </div>
        <Spark points={vals} />
       </Card>
       <Sec t="Every time you bought it" cls="p-4 mb-3">
        <div className="cb am">
         {[...ps].reverse().map((p, k) => (
          <Row key={k} l={p.store} s={new Date(p.at).toLocaleDateString(undefined, { day: "numeric", month: "short" })} v={money(p.p, cur)} />
         ))}
        </div>
       </Sec>
       <div className="f13 c cp ka">
        Cheapest at <span style={{ color: C.ink, fontWeight: 500 }}>{best.store}</span> — {money(vals[vals.length - 1] - best.p, cur)} less than last time.
       </div>
      </div>
     );
    })()}
   </Sheet>
  </div>
 );
}

function ScanSheet({ open, onClose, S, A, toast }) {
 const [mode, setMode] = useState("receipt");
 const [state, setState] = useState("idle");
 const [result, setResult] = useState(null);
 const [preview, setPreview] = useState(null);
 const fileRef = useRef(null);

 useEffect(() => { if (open) { setState("idle"); setResult(null); setPreview(null); } }, [open]);

 const handle = async (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  setState("reading");
  try {
   const b64 = await fileToB64(f);
   setPreview(URL.createObjectURL(f));
   const prompt = mode === "receipt"
    ? `Read this Norwegian shop receipt (prices are in kroner, decimals may use a comma). Reply with ONLY JSON: {"store":string,"date":"YYYY-MM-DD","total":number,"pant":number,"items":[{"name":string,"price":number,"cat":string}]}. "pant" is the bottle deposit refunded on this receipt as a positive number, or 0 if there is none. Clean each name into a plain product name in sentence case (for example "MLK WHL 1L" becomes "Whole milk"). cat must be one of: ${CATS.map((c) => c.id).join(", ")}. Exclude discounts and deposits from items but keep the printed total. If the receipt is unreadable reply {"error":"unreadable"}.`
    : `Identify the packaged product in this photo (it may show a barcode or the packaging). Reply with ONLY JSON: {"name":string,"unit":string,"cat":string}. cat must be one of: ${CATS.map((c) => c.id).join(", ")}. If you cannot tell, reply {"error":"unknown"}.`;
   const txt = await askClaude([
    { type: "image", source: { type: "base64", media_type: f.type || "image/jpeg", data: b64 } },
    { type: "text", text: prompt },
   ]);
   const j = parseJson(txt);
   if (j.error) { setState("failed"); return; }
   if (mode === "receipt") {
    setResult({ payment: "shared", paidBy: S.me, pant: j.pant || 0, ...j, items: (j.items || []).map((i) => ({ ...i, keep: true })) });
   } else setResult(j);
   setState("review");
  } catch (err) { setState("failed"); }
  if (fileRef.current) fileRef.current.value = "";
 };

 const save = () => {
  if (mode === "receipt") {
   const items = result.items.filter((i) => i.keep).map(({ name, price, cat }) => ({ name: cap(name), price: Number(price) || 0, cat }));
   const at = result.date ? new Date(result.date + "T12:00:00").getTime() : now();
   A.logReceipt({
    store: result.store || "Shop", at, total: Number(result.total) || items.reduce((s, i) => s + i.price, 0), items,
    payment: result.payment || "shared", paidBy: result.paidBy || S.me, pant: Number(result.pant) || 0,
   });
  } else {
   A.addToList(result.name, { cat: result.cat, unit: result.unit });
  }
  onClose();
 };

 return (
  <Sheet open={open} onClose={onClose} title="Scan" tall>
   <div className="bw cd cn">
    {[{ id: "receipt", label: "Receipt", icon: Receipt }, { id: "barcode", label: "Product", icon: ScanLine }].map((m) => (
     <button key={m.id} onClick={() => { setMode(m.id); setState("idle"); setResult(null); }}
      className="kp ax l ch bw ao g aw"
      style={chipS(mode === m.id)}>
      <m.icon size={17} color={mode === m.id ? C.citron : C.ink2} />
      <span className="f13 e">{m.label}</span>
     </button>
    ))}
   </div>

   <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handle} style={{ display: "none" }} />

   {state === "idle" && (
    <div>
     <button onClick={() => fileRef.current && fileRef.current.click()}
      className="kp az l bv bw ao g bm"
      style={{ background: C.paper, border: `1.5px dashed ${C.line}` }}>
      <span className="l cf" style={{ background: C.citron }}><Camera size={20} color={C.ink} /></span>
      <span className="kd f16 h">{mode === "receipt" ? "Photograph the receipt" : "Photograph the product"}</span>
      <span className="f13 df a c ka">
       {mode === "receipt" ? "Items, prices and total land in your budget, and prices attach to each item." : "The label is read and turned into a list item with the right category."}
      </span>
     </button>
    </div>
   )}

   {state === "reading" && (
    <div className="l du kw">
     <div className="bw g cd cn f14"><Loader2 size={15} style={{ animation: "kmSpin 1s linear infinite" }} />Reading the {mode === "receipt" ? "receipt" : "label"}…</div>
     {[92, 76, 84, 60, 88].map((w, i) => <div key={i} className="kh i dr" style={{ height: 12, width: `${w}%` }} />)}
    </div>
   )}

   {state === "failed" && (
    <Empty icon={AlertCircle} title="That one didn't read" body="Try again with the whole receipt in frame, flat and evenly lit."
     action={<Btn onClick={() => setState("idle")}>Take another photo</Btn>} />
   )}

   {state === "review" && result && mode === "receipt" && (
    <div>
     <div className="bw bm ck">
      {preview && <img src={preview} alt="" className="u object-cover" style={{ width: 64, height: 64 }} />}
      <div className="ax">
       <input value={result.store || ""} onChange={(e) => setResult({ ...result, store: e.target.value })}
        className="az u cr ds f14 bq kw" />
       <input value={result.date || ""} onChange={(e) => setResult({ ...result, date: e.target.value })}
        className="mo az u cr ds f13 kw" />
      </div>
     </div>
     <Card className="dz ck">
      <Label>Paid with</Label>
      <div className="bw cd cb">
       {Object.entries(PAYMENTS).map(([k, label]) => {
        const on = (result.payment || "shared") === k;
        return (
         <button key={k} onClick={() => setResult({ ...result, payment: k })}
          className="kp ax u bg f13 e"
          style={{ background: on ? C.ink : "transparent", color: on ? "#F6F7F2" : C.ink2, border: `1px solid ${on ? C.ink : C.line}` }}>{label}</button>
        );
       })}
      </div>
      {result.payment === "personal" && (
       <div className="da">
        <Label>Whose card</Label>
        <div className="bw cd dd">
         {PEOPLE.map((pp) => {
          const on = (result.paidBy || S.me) === pp.id;
          return (
           <button key={pp.id} onClick={() => setResult({ ...result, paidBy: pp.id })}
            className="kp ax u ds bw ao g bo"
            style={{ background: on ? "#EEF0E9" : "transparent", border: `1px solid ${on ? C.citronDeep : C.line}` }}>
            <Person id={pp.id} size={26} />
            <span className="f115">{pp.name}</span>
           </button>
          );
         })}
        </div>
        <div className="f115 cb ka">It'll sit under Money → Cards until it's paid back.</div>
       </div>
      )}
     </Card>

     <Card className="dz cn">
      <Label>Tap to exclude anything that isn't yours</Label>
      <div className="cb ak">
       {result.items.map((i, k) => (
        <button key={k} className="kp az bw w ah do"
         onClick={() => setResult({ ...result, items: result.items.map((x, j) => (j === k ? { ...x, keep: !x.keep } : x)) })}
         style={{ opacity: i.keep ? 1 : 0.35 }}>
         <span className="o bk bw g p an" style={{ width: 16, height: 16, background: i.keep ? C.citron : "transparent", border: `1.5px solid ${i.keep ? C.citron : "#CFD4C7"}` }}>
          {i.keep && <Check size={10} color={C.ink} strokeWidth={3} />}
         </span>
         <span className="f14">{cap(i.name)}</span>
         <span className="kl" />
         <span className="mo f13">{money(i.price)}</span>
        </button>
       ))}
      </div>
      {Number(result.pant) > 0 && (
       <div className="bw w da">
        <span className="f135" style={{ color: C.citronDeep }}>Pant returned</span>
        <span className="kl" />
        <span className="mo f13" style={{ color: C.citronDeep }}>+ {money(result.pant)}</span>
       </div>
      )}
      <div className="bw w da cw kx">
       <span className="kd f15 h">Total</span>
       <span className="kl" />
       <span className="mo f16 e">{money(result.total)}</span>
      </div>
     </Card>
     <Btn full size="lg" tone="citron" onClick={save}><Check size={16} strokeWidth={3} />Save receipt</Btn>
    </div>
   )}

   {state === "review" && result && mode === "barcode" && (
    <div>
     <Card className="du cn bw g bh">
      {preview && <img src={preview} alt="" className="u object-cover" style={{ width: 64, height: 64 }} />}
      <div>
       <div className="kd f19 h">{cap(result.name)}</div>
       <div className="f13 cm ka">{result.unit} · {catOf(result.cat).label}</div>
      </div>
     </Card>
     <Btn full size="lg" tone="citron" onClick={save}><Plus size={16} />Add to the list</Btn>
    </div>
   )}
  </Sheet>
 );
}

const TABS = [
 { id: "list", label: "List", icon: ShoppingBag, title: "Shopping list", sub: "Shared, live, always current" },
 { id: "pantry", label: "Kitchen", icon: Package, title: "Kitchen", sub: "What you have and what's about to run out" },
 { id: "recipes", label: "Cook", icon: ChefHat, title: "Cook", sub: "Recipes matched to your shelves" },
 { id: "money", label: "Money", icon: Wallet, title: "Money", sub: "Receipts, budget and where it goes" },
];

export default function KaMaSe() {
 useFonts();
 const [me, setMe] = useState("K");
 const S = { ...useStore(me), me };
 const [tab, setTab] = useState("list");
 const [scan, setScan] = useState(false);
 const [who, setWho] = useState(false);
 const [shopping, setShopping] = useState(false);
 const [toastMsg, setToastMsg] = useState(null);
 const toast = useCallback((m) => setToastMsg({ m, k: Math.random() }), []);
 const A = useActions(S, toast);
 const scrollRef = useRef(null);

 useEffect(() => { if (!toastMsg) return; const t = setTimeout(() => setToastMsg(null), 2400); return () => clearTimeout(t); }, [toastMsg]);
 useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [tab]);

 const meta = TABS.find((t) => t.id === tab);
 const dot = S.status === "live" ? C.citron : S.status === "syncing" ? C.amber : C.red;

 return (
  <div className="km az bw g p" style={{ height: "100dvh", minHeight: "100vh", background: C.ink }}>
   <Style />
   <div className="ai z bw ao az" style={{ maxWidth: 430, height: "100%", maxHeight: "100dvh", background: C.canvas }}>

    {/* header */}
    <div className="cs ce cj an sat" style={{ background: C.canvas }}>
     <div className="bw g v">
      <div>
       <div className="kd h r" style={{ fontSize: 23, letterSpacing: "0.02em" }}>
        Ka<span style={{ color: C.citronDeep }}>Ma</span>Se
       </div>
       <div className="f115 cm ka">{meta.sub}</div>
      </div>
      <div className="bw g cd">
       <button onClick={S.sync} className="kp o cx bt bu bw g aw kw">
        {S.status === "syncing"
         ? <RefreshCw size={11} color={C.amber} style={{ animation: "kmSpin 1s linear infinite" }} />
         : <span className="o" style={{ width: 7, height: 7, background: dot }} />}
        <span className="mo f105 j" style={{ letterSpacing: ".08em", color: C.muted }}>{S.status === "live" ? "live" : S.status}</span>
       </button>
       <button className="kp bw g aw" onClick={() => setWho(true)}>
        <Person id={me} size={30} />
        <ChevronDown size={13} color={C.muted} />
       </button>
      </div>
     </div>
     <div className="kd h da" style={{ fontSize: 25, letterSpacing: "-0.03em" }}>{meta.title}</div>
    </div>

    {/* content */}
    <div ref={scrollRef} className="kc ax t">
     {!S.ready ? (
      <div className="cs cw ap">
       <div className="kh l" style={{ height: 52 }} />
       <div className="kh l" style={{ height: 120 }} />
      </div>
     ) : (
      <>
       {tab === "list" && <ListScreen S={S} A={A} openScan={() => setScan(true)} onStartShopping={() => setShopping(true)} toast={toast} />}
       {tab === "pantry" && <PantryScreen S={S} A={A} />}
       {tab === "recipes" && <KitchenScreen S={S} A={A} toast={toast} />}
       {tab === "money" && <MoneyScreen S={S} toast={toast} />}
      </>
     )}
    </div>

    {/* toast */}
    {toastMsg && (
     <div key={toastMsg.k} className="ku ac ay aq bw p cs z-40" style={{ bottom: 104 }}>
      <div className="o cs bg f135 e" style={{ background: C.ink, color: "#F6F7F2", boxShadow: "0 10px 30px -12px rgba(0,0,0,.5)" }}>{toastMsg.m}</div>
     </div>
    )}

    {/* nav */}
    <div className="ac ay aq al cs dc dp z-30 sab" style={{ background: `linear-gradient(${C.canvas}00, ${C.canvas} 42%)` }}>
     <div className="o bw g db ds" style={{ background: C.ink, boxShadow: "0 16px 40px -16px rgba(20,30,26,.7)" }}>
      {TABS.slice(0, 2).map((t) => <NavBtn key={t.id} t={t} tab={tab} setTab={setTab} />)}
      <button onClick={() => setScan(true)} className="kp dh o bw g p an" style={{ width: 44, height: 44, background: C.citron }}>
       <ScanLine size={19} color={C.ink} />
      </button>
      {TABS.slice(2).map((t) => <NavBtn key={t.id} t={t} tab={tab} setTab={setTab} />)}
     </div>
    </div>

    {shopping && <ShoppingMode S={S} A={A} onClose={() => setShopping(false)} />}

    <ScanSheet open={scan} onClose={() => setScan(false)} S={S} A={A} toast={toast} />

    <Sheet open={who} onClose={() => setWho(false)} title="Who's shopping?">
     <div className="f135 c cn ka">
      Everything stays on the same shared list — this just marks who added what.
     </div>
     <div className="am">
      {PEOPLE.map((p) => {
       const on = p.id === me;
       return (
        <button key={p.id} className="kp az ah" onClick={() => { setMe(p.id); setWho(false); toast(`Now shopping as ${p.name}`); }}>
         <Card className="cf bw g bm" style={{ boxShadow: on ? `inset 0 0 0 1.5px ${C.citron}` : undefined }}>
          <Person id={p.id} size={34} />
          <div className="ax">
           <div className="f15 e">{p.name}</div>
           <div className="f12 ka">
            {p.id === "G" ? "Anyone helping with the shop" : "Household"}
           </div>
          </div>
          {on && <span className="ko o dy" style={{ background: C.citron }}><Check size={12} color={C.ink} strokeWidth={3} /></span>}
         </Card>
        </button>
       );
      })}
     </div>
    </Sheet>
   </div>
  </div>
 );
}

function NavBtn({ t, tab, setTab }) {
 const on = tab === t.id;
 return (
  <button onClick={() => setTab(t.id)} className="kp ax o ds bw ao g av"
   style={{ background: on ? "rgba(191,213,63,.14)" : "transparent" }}>
   <t.icon size={17} color={on ? C.citron : "#94A199"} />
   <span className="f10 e" style={{ color: on ? C.citron : "#94A199" }}>{t.label}</span>
  </button>
 );
}
