// Shared bits of the account screens (purchases, orders, wallet) in the MathPortal design.

/** Prices in the student's currency (lib/currency.js); egp() for amounts actually paid. */
export { money, egp } from "@/lib/currency";

/** Date -> "Mar 4, 2026" (en-US); "—" when missing or invalid. */
export const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/** Payment status pill (completed / rejected / anything else = awaiting approval). */
export const OrderPill = ({ status }) => {
  if (status === "completed") return <span className="pill bg-green-100 text-green-700">PAID</span>;
  if (status === "rejected") return <span className="pill bg-red-100 text-red-600">REJECTED</span>;
  return <span className="pill bg-amber-100 text-amber-700">AWAITING APPROVAL</span>;
};

export const KIND_LABEL = { course: "Course", semester: "Semester", chapter: "Chapter", lesson: "Lesson" };
/** kind-pill colour class for a content kind (semesters use the course colour). */
export const kindClass = (kind) => `kind-pill kind-${kind === "semester" ? "course" : kind || "course"}`;

/** Short error box used instead of the old full-screen error page. */
export const ErrorCard = ({ text, onRetry }) => (
  <section className="rp-card text-sm">
    <p className="font-bold text-red-600">Could not load this page</p>
    <p className="text-slate-500 mt-1">{text || "Something went wrong. Try again."}</p>
    {onRetry && <button className="pl-btn mt-3" onClick={onRetry}>Try again</button>}
  </section>
);
