// Small building blocks of the MathPortal student design.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStudentData } from "@/context/StudentData";
import { initials, typeOf } from "@/lib/portal";

export const Kpi = ({ label, value, sub, tone = "" }) => (
  <div className="rp-kpi">
    <p className="rp-kpi-label">{label}</p>
    <p className={`rp-kpi-value ${tone}`}>{value}</p>
    <p className="rp-kpi-sub">{sub}</p>
  </div>
);

export const PageHead = ({ title, text, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
    <div>
      <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">{title}</h2>
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
    {children}
  </div>
);

export const Page = ({ children, wide = false }) => (
  <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
    <div className={wide ? "" : "max-w-5xl mx-auto"}>{children}</div>
  </div>
);

export const EmptyCard = ({ title, text, action }) => (
  <section className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
    <p className="text-lg font-extrabold text-gray-900 mb-1">{title}</p>
    <p className="text-sm text-slate-500 mb-4">{text}</p>
    {action}
  </section>
);

/** Five stars, filled up to `value` (0–5). */
export const StarRow = ({ value = 0, size = 16 }) => (
  <span className="inline-flex gap-0.5" aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(value) ? "#f59e0b" : "#e5e7eb"} aria-hidden="true">
        <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z" />
      </svg>
    ))}
  </span>
);

export const TypeTag = ({ type }) => {
  const t = typeOf(type);
  return <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ color: t.color, background: t.bg }}>{t.label}</span>;
};
export const TypeDot = ({ type }) => <span className="type-dot" style={{ background: typeOf(type).color }}></span>;
export const TeacherAvatar = ({ name, big = false }) => (
  <span className="pl-avatar" style={big ? { width: 40, height: 40, fontSize: 12 } : undefined}>{initials(name)}</span>
);

/** Live sessions left in the student's packages (from the profile). */
export function LiveStrip({ compact = false }) {
  const { profile } = useStudentData();
  const navigate = useNavigate();
  const left = Number(profile?.livebalance ?? 0);
  const tone = left <= 1 ? "#dc2626" : left <= 3 ? "#f59e0b" : "#16a34a";
  if (!profile) return null;
  if (left <= 0) {
    return (
      <div className={`pack-strip empty ${compact ? "" : "mb-5"}`}>
        <span className="text-xs text-slate-500">No live sessions left in your packages.</span>
        <button onClick={(e) => { e.stopPropagation(); navigate("/user/payment"); }} className="text-xs font-bold text-one hover:underline">Buy sessions</button>
      </div>
    );
  }
  return (
    <div className={`pack-strip ${compact ? "" : "mb-5"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-700">Live sessions</span>
        <span className="text-xs font-extrabold" style={{ color: tone }}>{left} left</span>
      </div>
      {!compact && left <= 3 && (
        <p className="text-[11px] text-slate-400 mt-1.5"><b className="text-red-600">Renew soon</b> — <button className="font-bold text-one hover:underline" onClick={() => navigate("/user/payment")}>buy more</button></p>
      )}
    </div>
  );
}

/** Centered dialog (design: .modal-bg). Escape and backdrop click close it. */
export function Modal({ title, wide = false, onClose, children, actions }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-bg fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-2xl" : "max-w-md"} p-6 max-h-[88vh] overflow-y-auto`} role="dialog" aria-modal="true">
        <h3 className="text-lg font-extrabold mb-2">{title}</h3>
        <div className="text-sm text-slate-600 mb-5">{children}</div>
        {actions && <div className="flex flex-wrap gap-2 justify-end">{actions}</div>}
      </div>
    </div>
  );
}
