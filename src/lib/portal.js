// Helpers for the student portal: dates, times, session types and mapping backend sessions.

export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WD_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const pad = (n) => String(n).padStart(2, "0");
export const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const dateOf = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const todayISO = () => isoOf(new Date());
export const tomorrowISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return isoOf(d);
};

/** "17:00:00" → "05:00 PM" */
export const fmtTime = (t) => {
  if (!t) return "";
  let [h, m] = String(t).split(":").map(Number);
  const ap = h >= 12 && h < 24 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${pad(h)}:${pad(m || 0)} ${ap}`;
};
export const fmtDay = (iso) => {
  const d = dateOf(iso);
  return `${WD[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`;
};
export const fmtLongDay = (iso) => {
  const d = dateOf(iso);
  return `${WD_LONG[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`;
};
/** Today / Tomorrow / "Fri, Nov 13" */
export const relDay = (iso) => (iso === todayISO() ? "Today" : iso === tomorrowISO() ? "Tomorrow" : fmtDay(iso));
export const fmtStamp = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};
export const timeAgo = (v) => {
  const diff = (Date.now() - new Date(v).getTime()) / 1000;
  if (Number.isNaN(diff)) return "";
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 172800) return "Yesterday";
  return fmtStamp(v);
};
export const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
export const initials = (name = "") =>
  name.replace(/^(mr|mrs|ms|dr)\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "?";

/** Backend sessionRelationalType → label + [color, background] from the design. */
export const SESSION_TYPES = {
  Explanation: { label: "Explanation", color: "#3b82f6", bg: "#EFF6FF" },
  Mistakes: { label: "Mistakes", color: "#7d0a0a", bg: "#FDECEC" },
  Exam: { label: "Exams", color: "#8b5cf6", bg: "#F3EFFF" },
  "Re-Explanation": { label: "Re-explain", color: "#f97316", bg: "#FFF3E8" },
};
export const typeOf = (t) => SESSION_TYPES[t] || SESSION_TYPES.Explanation;

/** Cancel requests close this long before a session starts (matches the backend). */
export const CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Backend session (upcoming/history) → the shape the screens use. */
export function mapSession(raw) {
  const lesson = (raw.lessons || [])[0];
  const iso = String(raw.sessionDate || "").slice(0, 10);
  const start = String(raw.timeFrom || "00:00").slice(0, 5);
  return {
    id: raw.id,
    raw,
    iso,
    start,
    end: String(raw.timeTo || "").slice(0, 5),
    time: `${fmtTime(raw.timeFrom)} - ${fmtTime(raw.timeTo)}`,
    type: raw.sessionRelationalType || "Explanation",
    topic: raw.name,
    sub: [lesson?.chapter?.name, lesson?.name].filter(Boolean).join(" · ") || "Live session",
    course: lesson?.course?.name || "",
    teacher: raw.teacherName || "Your teacher",
    link: raw.sessionLink || "",
    cancelled: raw.status === "cancelled",
    cancelReason: raw.cancelReason || "",
    attendance: raw.attendanceStatus || "not_marked",
    lessons: raw.lessons || [],
  };
}

/** Start of a session as a local Date (sessions are scheduled in Cairo time). */
export const startsAt = (s) => new Date(`${s.iso}T${s.start}:00`);
