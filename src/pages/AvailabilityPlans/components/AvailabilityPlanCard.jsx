import { CalendarDays, ChevronRight, Clock3, Pencil, Users } from "lucide-react";

const statusStyles = {
  pending_admin_review: "bg-amber-50 text-amber-700 ring-amber-200",
  pending_student_response: "bg-blue-50 text-blue-700 ring-blue-200",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
};

export const formatPlanStatus = (status = "") =>
  status
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Unknown";

export const formatPlanTime = (time) => {
  if (!time) return "";
  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  if (Number.isNaN(hour)) return time;
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minuteText || "00"} ${suffix}`;
};

const AvailabilityPlanCard = ({ plan, onOpen, onEdit }) => {
  const slots = plan.slots || [];
  const statusClass =
    statusStyles[plan.status] || "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusClass}`}
          >
            {formatPlanStatus(plan.status)}
          </span>
          <h2 className="mt-3 break-words text-xl font-bold text-slate-900">
            {plan.title}
          </h2>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => onEdit(plan)}
            title="Edit plan"
            className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:border-one/30 hover:bg-one/5 hover:text-one"
          >
            <Pencil size={17} />
          </button>
          <button
            type="button"
            onClick={() => onOpen(plan.id)}
            title="View plan"
            className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:border-one/30 hover:bg-one/5 hover:text-one"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {plan.notes && (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
          {plan.notes}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-sm text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={16} className="text-one" />
          {slots.length} {slots.length === 1 ? "time" : "times"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 size={16} className="text-one" />
          {slots.slice(0, 2).map((slot) => (
            <span key={slot.id || `${slot.dayOfWeek}-${slot.timeFrom}`}>
              {slot.dayOfWeek} {formatPlanTime(slot.timeFrom)}
              {slot.timeTo ? `–${formatPlanTime(slot.timeTo)}` : ""}
              {slots.indexOf(slot) < Math.min(slots.length, 2) - 1 ? ", " : ""}
            </span>
          ))}
          {slots.length > 2 && <span>+{slots.length - 2} more</span>}
        </span>
        {Number.isFinite(plan.proposedSessionsCount) && (
          <span className="inline-flex items-center gap-1.5">
            <Users size={16} className="text-one" />
            {plan.proposedSessionsCount} proposed sessions
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => onOpen(plan.id)}
        className="mt-4 text-sm font-semibold text-one hover:underline"
      >
        View plan details
      </button>
    </article>
  );
};

export default AvailabilityPlanCard;
