import { useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Pencil,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Formatters                                                          */
/* ------------------------------------------------------------------ */

export const formatPlanStatus = (status = "") =>
  status
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Unknown";

export const formatPlanTime = (time) => {
  if (!time) return "";
  const [hourText, minuteText] = String(time).split(":");
  const hour = Number(hourText);
  if (Number.isNaN(hour)) return time;
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${String(hour % 12 || 12).padStart(2, "0")}:${(minuteText || "00").slice(0, 2)} ${suffix}`;
};

const isValidDate = (value) =>
  Boolean(value) && !Number.isNaN(new Date(value).getTime());

// "Oct 28"
export const formatShortDate = (value) =>
  isValidDate(value)
    ? new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
    : "";

// "Wed, Oct 28" (UTC so the day never shifts)
export const formatDay = (value) =>
  isValidDate(value)
    ? new Date(value).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })
    : value || "";

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

export const PLAN_STATUS = {
  pending_admin_review: {
    label: "Waiting for admin",
    fg: "#1d4ed8",
    bg: "#eff6ff",
    bd: "#bfdbfe",
  },
  pending_student_response: {
    label: "Awaiting your approval",
    fg: "#b45309",
    bg: "#fffbeb",
    bd: "#fde68a",
  },
  accepted: { label: "Active", fg: "#15803d", bg: "#f0fdf4", bd: "#bbf7d0" },
  rejected: {
    label: "Changes requested",
    fg: "#b91c1c",
    bg: "#fef2f2",
    bd: "#fecaca",
  },
};

export const StatusPill = ({ status }) => {
  const meta = PLAN_STATUS[status] || {
    label: formatPlanStatus(status),
    fg: "#475569",
    bg: "#f1f5f9",
    bd: "#e2e8f0",
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
      style={{ color: meta.fg, backgroundColor: meta.bg, borderColor: meta.bd }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: meta.fg }}
      />
      {meta.label}
    </span>
  );
};

// The student can answer once the admin has proposed sessions.
export const canRespondTo = (plan) =>
  Boolean(plan) &&
  !/accepted|rejected/i.test(plan.status || "") &&
  Boolean(
    plan.proposedAt ||
    plan.proposedSessions?.length > 0 ||
    /student.*response|response.*student|proposed/i.test(plan.status || ""),
  );

/* ------------------------------------------------------------------ */
/* Stepper: Save time slots → Admin reviews → Approve → Upcoming       */
/* ------------------------------------------------------------------ */

export const PlanStepper = ({ plan }) => {
  const s = plan?.status || "";
  const proposed = ["pending_student_response", "accepted", "rejected"].includes(s);

  const steps = [
    {
      title: "Save time slots",
      sub: plan
        ? `Sent ${formatShortDate(plan.createdAt) || ""}`.trim()
        : "Your turn",
      state: plan ? "done" : "now",
    },
    {
      title: "Admin reviews",
      sub:
        s === "pending_admin_review"
          ? "Waiting for admin"
          : proposed
            ? "Plan proposed"
            : "—",
      state: s === "pending_admin_review" ? "now" : proposed ? "done" : "idle",
    },
    {
      title: "Approve your plan",
      sub:
        s === "pending_student_response"
          ? "Your turn"
          : s === "accepted"
            ? "Approved"
            : s === "rejected"
              ? "Changes requested"
              : "—",
      state:
        s === "pending_student_response"
          ? "now"
          : s === "accepted"
            ? "done"
            : s === "rejected"
              ? "warn"
              : "idle",
    },
    {
      title: "Sessions in Upcoming",
      sub: s === "accepted" ? "Admin notified" : "—",
      state: s === "accepted" ? "done" : "idle",
    },
  ];

  const box = {
    now: "border-amber-300 ring-2 ring-amber-100",
    warn: "border-red-200 ring-2 ring-red-50",
    done: "border-slate-200",
    idle: "border-slate-200",
  };
  const dot = {
    now: "bg-amber-500 text-white",
    warn: "bg-red-500 text-white",
    done: "bg-green-500 text-white",
    idle: "bg-slate-200 text-slate-500",
  };

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {steps.map((step, index) => (
        <div
          key={step.title}
          className={`flex items-center gap-3 rounded-2xl border bg-white p-4 ${box[step.state]}`}
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${dot[step.state]}`}
          >
            {step.state === "done" ? (
              <Check size={16} strokeWidth={3} />
            ) : step.state === "warn" ? (
              <X size={16} strokeWidth={3} />
            ) : (
              index + 1
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold text-gray-900">
              {step.title}
            </span>
            <span className="block truncate text-[11px] text-slate-400">
              {step.sub}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Slots grouped by day                                                */
/* ------------------------------------------------------------------ */

const WEEK = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

export const SlotsGrid = ({ slots = [] }) => {
  const byDay = WEEK.map((day) => ({
    day,
    items: slots
      .filter((slot) => slot.dayOfWeek === day)
      .sort((a, b) => String(a.timeFrom).localeCompare(String(b.timeFrom))),
  })).filter((group) => group.items.length);

  if (!byDay.length) {
    return <p className="text-sm text-slate-400">No times added.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {byDay.map(({ day, items }) => (
        <div
          key={day}
          className="rounded-xl border border-red-200 bg-red-50/30 p-4"
        >
          <p className="mb-2 flex items-center justify-between border-b border-slate-200 pb-2 text-sm font-bold text-gray-800">
            {day}
            <span className="text-[11px] font-semibold text-slate-400">
              {items.length} {items.length === 1 ? "slot" : "slots"}
            </span>
          </p>
          <div className="flex flex-col gap-1.5">
            {items.map((slot) => (
              <span
                key={slot.id || `${slot.dayOfWeek}-${slot.timeFrom}`}
                className="inline-flex items-center gap-2 text-[13px] text-gray-700"
              >
                <Clock3 size={14} className="text-one" />
                {formatPlanTime(slot.timeFrom)} – {formatPlanTime(slot.timeTo)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Proposed sessions table                                             */
/* ------------------------------------------------------------------ */

const sessionTitle = (session, index) =>
  session.sessionName ||
  session.title ||
  session.subject?.name ||
  session.course?.title ||
  `Session ${index + 1}`;

const sessionDateText = (session) =>
  session.sessionDate
    ? formatDay(session.sessionDate)
    : [formatDay(session.startDate), formatDay(session.endDate)]
      .filter(Boolean)
      .join(" – ");

const sessionTimeText = (session) =>
  [session.timeFrom && formatPlanTime(session.timeFrom), session.timeTo && formatPlanTime(session.timeTo)]
    .filter(Boolean)
    .join(" – ");

const initials = (name = "") => {
  const words = String(name)
    .replace(/^(Mr|Ms|Mrs|Dr)\.?\s*/i, "")
    .split(/\s+/)
    .filter(Boolean);
  return (
    words.length > 1 ? words[0][0] + words[1][0] : (words[0] || "?").slice(0, 2)
  ).toUpperCase();
};

export const sessionsRange = (sessions = []) => {
  const dates = sessions
    .map((s) => s.sessionDate || s.startDate)
    .filter(isValidDate)
    .sort((a, b) => new Date(a) - new Date(b));
  if (!dates.length) return "";
  const first = formatShortDate(dates[0]);
  const last = formatShortDate(dates[dates.length - 1]);
  return first === last ? first : `${first} – ${last}`;
};

const ROW_GRID =
  "md:grid-cols-[120px_150px_minmax(0,1fr)_170px_110px] md:items-center md:gap-4";

export const SessionsTable = ({ sessions = [], status, limit = 4 }) => {
  const [open, setOpen] = useState(false);
  const shown = open || !limit ? sessions : sessions.slice(0, limit);

  const stateCell = () => {
    if (status === "accepted")
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">
          <Check size={13} /> Scheduled
        </span>
      );
    if (status === "rejected")
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
          <X size={13} /> Declined
        </span>
      );
    return <span className="text-xs text-slate-400">Pending</span>;
  };

  return (
    <div className="border-t border-slate-100">
      <div
        className={`hidden bg-gray-50 px-6 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 md:grid ${ROW_GRID}`}
      >
        <span>Date</span>
        <span>Time</span>
        <span>Session</span>
        <span>Teacher</span>
        <span className="text-right">Status</span>
      </div>

      {shown.map((session, index) => {
        const meta = [
          session.sessionRelationalType,
          session.scheduleType &&
          (session.scheduleType === "once"
            ? "One-time"
            : formatPlanStatus(session.scheduleType)),
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <div
            key={
              session.planSessionId || session.sessionId || session.id || index
            }
            className={`grid grid-cols-1 gap-1 border-t border-slate-100 px-5 py-3 text-sm first:border-t-0 hover:bg-gray-50/70 md:px-6 ${ROW_GRID}`}
          >
            <span className="whitespace-nowrap font-semibold text-slate-900">
              {sessionDateText(session) || "—"}
            </span>
            <span className="whitespace-nowrap text-slate-500">
              {sessionTimeText(session) || "—"}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold text-slate-900">
                {sessionTitle(session, index)}
              </span>
              {(meta || session.planSessionNotes) && (
                <span className="block truncate text-xs text-slate-500">
                  <span className="me-1.5 inline-block h-2 w-2 rounded-full bg-one align-middle" />
                  {[meta, session.planSessionNotes].filter(Boolean).join(" · ")}
                </span>
              )}
            </span>
            <span className="flex min-w-0 items-center gap-2">
              {session.teacherName ? (
                <>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                    {initials(session.teacherName)}
                  </span>
                  <span className="truncate text-sm font-medium text-slate-800">
                    {session.teacherName}
                  </span>
                </>
              ) : (
                <span className="text-xs text-slate-400">Teacher TBA</span>
              )}
            </span>
            <span className="md:text-right">{stateCell()}</span>
          </div>
        );
      })}

      {limit > 0 && sessions.length > limit && (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 bg-white p-3 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 hover:text-one"
        >
          {open ? "Show fewer sessions" : `Show all ${sessions.length} sessions`}
          <ChevronDown
            size={15}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Small UI bits                                                       */
/* ------------------------------------------------------------------ */

export const PlanButton = ({ tone = "default", className = "", ...props }) => {
  const tones = {
    default:
      "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50",
    primary: "border-one bg-one text-white hover:brightness-110",
    danger: "border-red-600 bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button
      type="button"
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3.5 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]} ${className}`}
      {...props}
    />
  );
};

const Alert = ({ tone, title, children }) => (
  <div
    className={`rounded-lg border px-3.5 py-2.5 text-[13px] text-slate-600 ${tone === "danger"
        ? "border-red-200 bg-red-50"
        : tone === "warn"
          ? "border-amber-200 bg-amber-50"
          : "border-blue-200 bg-blue-50"
      }`}
  >
    <b
      className={`me-1 font-bold ${tone === "danger"
          ? "text-red-700"
          : tone === "warn"
            ? "text-amber-800"
            : "text-blue-800"
        }`}
    >
      {title}
    </b>
    {children}
  </div>
);

/* ------------------------------------------------------------------ */
/* Plan card                                                           */
/*   variant="slots" → the free times the student sent                 */
/*   variant="plan"  → the admin's proposal + approve / request changes */
/* ------------------------------------------------------------------ */

const AvailabilityPlanCard = ({
  plan,
  variant = "plan",
  heading,
  sessionsLimit = 4,
  onOpen,
  onEdit,
  onRespond,
  responding = false,
}) => {
  const [denying, setDenying] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  const slots = plan.slots || [];
  const sessions = plan.proposedSessions || [];
  const sessionsCount =
    sessions.length || Number(plan.proposedSessionsCount) || 0;
  const teachers = new Set(
    sessions.map((s) => s.teacherName).filter(Boolean),
  ).size;
  const range = sessionsRange(sessions);
  const respondable = canRespondTo(plan);
  // Inline approval only when the sessions are loaded, so the student
  // always sees what they approve.
  const canAnswerHere =
    variant === "plan" && respondable && onRespond && sessions.length > 0;

  const approve = () => onRespond(plan.id, "accept", "");

  const sendChanges = async () => {
    if (!reason.trim()) {
      setReasonError("Write a reason first.");
      return;
    }
    const ok = await onRespond(plan.id, "reject", reason);
    if (ok) {
      setDenying(false);
      setReason("");
    }
  };

  const subtitle =
    variant === "slots"
      ? `${slots.length} ${slots.length === 1 ? "time slot" : "time slots"}${plan.createdAt ? ` · sent ${formatShortDate(plan.createdAt)}` : ""
      }`
      : sessionsCount
        ? [
          `${sessionsCount} ${sessionsCount === 1 ? "session" : "sessions"}`,
          range,
          teachers
            ? `${teachers} ${teachers === 1 ? "teacher" : "teachers"}`
            : "",
          plan.status === "accepted" && plan.respondedAt
            ? `approved ${formatShortDate(plan.respondedAt)}`
            : "",
        ]
          .filter(Boolean)
          .join(" · ")
        : "The admin is building your plan from these times.";

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      {/* Head */}
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pb-4 pt-5 md:px-6">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-[#F5D0D0] bg-[#FDF2F2] px-2 py-0.5 text-[11px] font-extrabold tracking-wide text-one">
              {variant === "slots" ? "TIME SLOTS" : "STUDY PLAN"}
            </span>
            <StatusPill status={plan.status} />
          </div>
          <h3 className="break-words text-[17px] font-bold tracking-tight text-slate-900">
            {heading || plan.title}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {canAnswerHere && !denying && (
            <>
              <PlanButton tone="primary" disabled={responding} onClick={approve}>
                <Check size={16} />
                {responding ? "Saving..." : "Approve plan"}
              </PlanButton>
              <PlanButton disabled={responding} onClick={() => setDenying(true)}>
                Request changes
              </PlanButton>
            </>
          )}
          {!canAnswerHere && respondable && variant === "plan" && onOpen && (
            <PlanButton tone="primary" onClick={() => onOpen(plan.id)}>
              Review & approve <ChevronRight size={15} />
            </PlanButton>
          )}
          {onEdit && (
            <PlanButton onClick={() => onEdit(plan)} title="Edit time slots">
              <Pencil size={14} />
              Edit times
            </PlanButton>
          )}
          {onOpen && !(respondable && variant === "plan" && !canAnswerHere) && (
            <PlanButton onClick={() => onOpen(plan.id)}>
              Details <ChevronRight size={15} />
            </PlanButton>
          )}
        </div>
      </div>

      {/* Request changes form */}
      {denying && (
        <div className="px-5 pb-4 md:px-6">
          <div className="flex flex-col items-stretch gap-2 sm:flex-row">
            <input
              autoFocus
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setReasonError("");
              }}
              placeholder="What should the admin change? e.g. no Saturday mornings"
              className="flex-1 rounded-lg border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-one focus:ring-2 focus:ring-one/10"
            />
            <div className="flex gap-2">
              <PlanButton tone="danger" disabled={responding} onClick={sendChanges}>
                {responding ? "Sending..." : "Send to admin"}
              </PlanButton>
              <PlanButton
                disabled={responding}
                onClick={() => {
                  setDenying(false);
                  setReason("");
                  setReasonError("");
                }}
              >
                Cancel
              </PlanButton>
            </div>
          </div>
          {reasonError && (
            <p className="mt-2 text-sm font-semibold text-red-600">
              {reasonError}
            </p>
          )}
        </div>
      )}

      {/* Alerts */}
      {(plan.adminNotes ||
        plan.status === "rejected" ||
        (variant === "slots" && plan.status === "pending_admin_review")) && (
          <div className="space-y-2 px-5 pb-4 md:px-6">
            {variant === "slots" && plan.status === "pending_admin_review" && (
              <Alert tone="warn" title="Sent to the admin.">
                You will get your study plan as soon as they review these times.
              </Alert>
            )}
            {plan.adminNotes && (
              <Alert tone="info" title="Admin note:">
                “{plan.adminNotes}”
              </Alert>
            )}
            {plan.status === "rejected" && (
              <Alert tone="danger" title="Sent back to the admin.">
                {plan.studentFeedback
                  ? `Your request: “${plan.studentFeedback}”`
                  : "The admin is preparing a new plan."}
              </Alert>
            )}
          </div>
        )}

      {/* Body */}
      {variant === "slots" ? (
        <div className="border-t border-slate-100 px-5 py-4 md:px-6">
          <SlotsGrid slots={slots} />
        </div>
      ) : sessions.length ? (
        <SessionsTable
          sessions={sessions}
          status={plan.status}
          limit={sessionsLimit}
        />
      ) : sessionsCount && onOpen ? (
        <button
          type="button"
          onClick={() => onOpen(plan.id)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 p-3 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 hover:text-one"
        >
          <CalendarClock size={15} />
          Open the plan to see its {sessionsCount} sessions
        </button>
      ) : null}
    </section>
  );
};

export default AvailabilityPlanCard;