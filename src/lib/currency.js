// Prices are stored in EGP. The student sees them in the currency of where they are (from the device's
// time zone → country → currency), if admin set that currency up (Settings → Currency); otherwise —
// a currency admin hasn't added, or a place we can't tell — USD. The student can pick another currency;
// that choice is remembered.
// Payments themselves (transfers, wallet, card) are always in EGP — use egp() for amounts to pay.
import zoneData from "./zoneCurrency.json";

const LS_LIST = "currency:list";   // cached admin currencies, so the first paint is already right
const LS_PICK = "currency:pick";   // the student's own choice ("" = automatic)

const read = (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage off */ } };

/** Country (ISO) and currency of the device's time zone, e.g. { zone: "America/New_York", country: "US", currency: "USD" } */
export function detectZone() {
  let zone = "";
  try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { /* old browser */ }
  const country = zoneData.zones[zone] || null;
  return { zone, country, currency: country ? zoneData.currencies[country] || null : null };
}

// ── module state (money() is a plain function used everywhere) ──
let list = read(LS_LIST, []);      // [{ code, symbol, name, rate, isBase }] rate = units per 1 base
let current = "EGP";

const rateOf = (code) => list.find((c) => c.code === code)?.rate;

/** The currency to show: the student's pick, else their zone's if admin has it, else USD/base, else EGP. */
export function chooseCurrency(currencies = list, pick = read(LS_PICK, "")) {
  const has = (c) => c && currencies.some((x) => x.code === c);
  if (has(pick)) return pick;
  const { currency } = detectZone();
  if (has(currency)) return currency;              // e.g. Egypt → EGP, USA → USD, UAE → AED
  // a country whose currency admin hasn't added, or a place we can't tell: USD
  return has("USD") ? "USD" : currencies.find((x) => x.isBase)?.code || "EGP";
}

export function setCurrencyList(next) {
  list = Array.isArray(next) ? next : [];
  write(LS_LIST, list);
}
export function setCurrent(code) { current = code; }
export function getCurrent() { return current; }
export function getList() { return list; }
export function getPick() { return read(LS_PICK, ""); }
export function savePick(code) { write(LS_PICK, code || ""); }

/** EGP → the shown currency (null if rates are missing). */
export function convert(egpAmount, to = current) {
  const n = Number(egpAmount) || 0;
  if (to === "EGP") return n;
  const egpRate = rateOf("EGP"), toRate = rateOf(to);
  if (!egpRate || !toRate) return null;
  return (n / egpRate) * toRate;
}

const fmt = (n, code) => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code, currencyDisplay: "narrowSymbol", maximumFractionDigits: 2, minimumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  } catch {
    return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${code}`;
  }
};

/** Exact EGP — for amounts the student pays or holds (transfers, wallet). 1200 → "1,200 EGP" */
export const egp = (n) => `${(Number(n) || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} EGP`;

/** A price in the student's currency. 1200 EGP → "$22.13" (or "1,200 EGP" for EGP / missing rates). */
export function money(egpAmount) {
  if (current === "EGP") return egp(egpAmount);
  const v = convert(egpAmount);
  return v == null ? egp(egpAmount) : fmt(v, current);
}

/** Price + what is actually paid: "$22.13 (1,200 EGP)" — or just "1,200 EGP" in Egypt. */
export function moneyBoth(egpAmount) {
  return current === "EGP" || convert(egpAmount) == null ? egp(egpAmount) : `${money(egpAmount)} (${egp(egpAmount)})`;
}
