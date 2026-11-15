import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import api from "@/api/api";
import Icon from "@/components/portal/Icon";
import { TeacherAvatar, TypeDot } from "@/components/portal/ui";
import { typeOf } from "@/lib/portal";

const PLANS_URL = "/api/user/availability-plans";

/* ------------------------------------------------------------------ */
/* Formatters                                                          */
/* ------------------------------------------------------------------ */

export const formatPlanStatus = (status = "") =>
  status
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Unknown";

/** "17:00:00" → "05:00 PM" */
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
    ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
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
/* Status (design: ST_PILL → st-pill)                                  */
/* ------------------------------------------------------------------ */

// [label, text colour, background, border]
export const PLAN_STATUS = {
  pending_admin_review: ["Waiting for admin", "#1d4ed8", "#eff6ff", "#bfdbfe"],
  pending_student_response: ["Awaiting your approval", "#b45309", "#fffbeb", "#fde68a"],
  accepted: ["Active", "#15803d", "#f0fdf4", "#bbf7d0"],
  rejected: ["Changes requested", "#b91c1c", "#fef2f2", "#fecaca"],
  cancelled: ["Cancelled", "#475569", "#f1f5f9", "#e2e8f0"],
};

export const StatusPill = ({ status }) => {
  const [label, fg, bg, bd] = PLAN_STATUS[status] || [
    formatPlanStatus(status),
    "#475569",
    "#f1f5f9",
    "#e2e8f0",
  ];
  return (
    <span className="st-pill" style={{ color: fg, background: bg, borderColor: bd }}>
      <span className="st-dot" style={{ background: fg }}></span>
      {label}
    </span>
  );
};

// The student can answer once the admin has proposed sessions.
export const canRespondTo = (plan) =>
  Boolean(plan) &&
  !/accepted|rejected|cancelled/i.test(plan.status || "") &&
  Boolean(
    plan.proposedAt ||
      plan.proposedSessions?.length > 0 ||
      /student.*response|response.*student|proposed/i.test(plan.status || ""),
  );

// The backend refuses edits to accepted or cancelled plans.
export const canEditPlan = (plan) =>
  Boolean(plan) && !["accepted", "cancelled"].includes(plan.status);

/* ------------------------------------------------------------------ */
/* Stepper (design: stepperHtml)                                       */
/* ------------------------------------------------------------------ */

export const PlanStepper = ({ plan }) => {
  const s = plan?.status || "";
  const proposed = ["pending_student_response", "accepted", "rejected"].includes(s);

  const steps = [
    {
      title: "Save time slots",
      sub: plan ? `Sent ${formatShortDate(plan.createdAt) || ""}`.trim() : "Your turn",
      state: plan ? "done" : "now",
    },
    {
      title: "Admin reviews",
      sub: s === "pending_admin_review" ? "Waiting for admin" : proposed ? "Plan proposed" : "—",
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

  const ring = {
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {steps.map((step, index) => (
        <div
          key={step.title}
          className={`bg-white border ${ring[step.state]} rounded-2xl p-4 flex items-center gap-3 min-w-0`}
        >
          <span
            className={`w-8 h-8 rounded-full ${dot[step.state]} font-extrabold text-sm flex items-center justify-center shrink-0`}
          >
            {step.state === "done" ? (
              <Icon name="check" size={16} />
            ) : step.state === "warn" ? (
              <Icon name="x" size={16} />
            ) : (
              index + 1
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold text-gray-900">{step.title}</span>
            <span className="block text-[11px] text-slate-400 truncate">{step.sub}</span>
          </span>
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Slots grouped by day (read-only; week starts Saturday)              */
/* ------------------------------------------------------------------ */

export const WEEK = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export const SlotsGrid = ({ slots = [] }) => {
  const byDay = WEEK.map((day) => ({
    day,
    items: slots
      .filter((slot) => slot.dayOfWeek === day)
      .sort((a, b) => String(a.timeFrom).localeCompare(String(b.timeFrom))),
  })).filter((group) => group.items.length);

  if (!byDay.length) return <p className="text-sm text-slate-400">No times added.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {byDay.map(({ day, items }) => (
        <div key={day} className="border border-red-200 bg-red-50/30 rounded-xl p-4">
          <p className="font-bold text-sm text-gray-800 mb-2 pb-2 border-b border-slate-200 flex justify-between items-center">
            {day}
            <span className="text-[11px] text-slate-400 font-semibold">
              {items.length} {items.length === 1 ? "slot" : "slots"}
            </span>
          </p>
          <div className="flex flex-col gap-1.5">
            {items.map((slot) => (
              <span
                key={slot.id || `${slot.dayOfWeek}-${slot.timeFrom}`}
                className="flex items-center gap-2 text-[13px] text-gray-700"
              >
                <Icon name="clock" size={14} className="text-one" />
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
/* Proposed sessions (design: pl-table / pl-row, read-only)            */
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
    : [formatDay(session.startDate), formatDay(session.endDate)].filter(Boolean).join(" – ");

const sessionTimeText = (session) =>
  [session.timeFrom && formatPlanTime(session.timeFrom), session.timeTo && formatPlanTime(session.timeTo)]
    .filter(Boolean)
    .join(" – ");

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

// Per-session answer saved by the backend (studentResponse), else the plan's.
const sessionState = (session, status) => {
  if (session.studentResponse === "rejected") return "skipped";
  if (session.studentResponse === "accepted" || status === "accepted") return "scheduled";
  if (status === "rejected") return "declined";
  return "pending";
};

const StateCell = ({ state }) => {
  if (state === "scheduled")
    return (
      <span className="flex items-center justify-end">
        <span className="rv-state ok"><Icon name="check" size={13} /> Scheduled</span>
      </span>
    );
  if (state === "skipped" || state === "declined")
    return (
      <span className="flex items-center justify-end">
        <span className="rv-state no">
          <Icon name="x" size={13} /> {state === "skipped" ? "Skipped" : "Declined"}
        </span>
      </span>
    );
  return <span className="text-xs text-slate-400 text-right">Pending</span>;
};

export const SessionsTable = ({ sessions = [], status, limit = 4 }) => {
  const [open, setOpen] = useState(false);
  const shown = open || !limit ? sessions : sessions.slice(0, limit);

  return (
    <>
      <div className="pl-table">
        <div className="pl-row pl-th">
          <span>Date</span>
          <span>Time</span>
          <span>Session</span>
          <span>Teacher</span>
          <span className="text-right">Status</span>
        </div>
        {shown.map((session, index) => {
          const state = sessionState(session, status);
          const meta = [
            session.sessionRelationalType && typeOf(session.sessionRelationalType).label,
            session.scheduleType &&
              (session.scheduleType === "once" ? "One-time" : formatPlanStatus(session.scheduleType)),
            session.planSessionNotes,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <div
              key={session.planSessionId || session.sessionId || session.id || index}
              className={`pl-row${state === "skipped" ? " is-denied" : ""}`}
            >
              <span className="font-semibold text-slate-900 whitespace-nowrap">
                {sessionDateText(session) || "—"}
              </span>
              <span className="text-slate-500 whitespace-nowrap">{sessionTimeText(session) || "—"}</span>
              <span className="min-w-0">
                <span className="block font-semibold text-slate-900 truncate">
                  {sessionTitle(session, index)}
                </span>
                {meta && (
                  <span className="block text-xs text-slate-500 truncate">
                    <TypeDot type={session.sessionRelationalType} />
                    {meta}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2 min-w-0">
                {session.teacherName ? (
                  <>
                    <TeacherAvatar name={session.teacherName} />
                    <span className="block text-sm font-medium text-slate-800 truncate">
                      {session.teacherName}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-slate-400">Teacher TBA</span>
                )}
              </span>
              <StateCell state={state} />
            </div>
          );
        })}
      </div>

      {limit > 0 && sessions.length > limit && (
        <button type="button" onClick={() => setOpen((value) => !value)} className="pl-more">
          {open ? "Show fewer sessions" : `Show all ${sessions.length} sessions`}
          <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Plan card (design: planCardHtml)                                    */
/*   variant="slots" → the free times the student sent                 */
/*   variant="plan"  → the admin's proposal + approve / ask for changes */
/* ------------------------------------------------------------------ */

const AvailabilityPlanCard = ({
  plan,
  variant = "plan",
  heading,
  sessionsLimit = 4,
  onOpen,
  onEdit,
  onRespond,
  onViewUpcoming,
  responding = false,
}) => {
  const [denying, setDenying] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  // List items carry only a session count; the sessions are loaded on demand
  // from GET /availability-plans/:id when the student opens them here.
  const [loadedSessions, setLoadedSessions] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadSessionsError, setLoadSessionsError] = useState("");

  const slots = plan.slots || [];
  const sessions = plan.proposedSessions?.length ? plan.proposedSessions : loadedSessions || [];
  const sessionsCount = sessions.length || Number(plan.proposedSessionsCount) || 0;
  const teachers = new Set(sessions.map((s) => s.teacherName).filter(Boolean)).size;
  const range = sessionsRange(sessions);
  const respondable = canRespondTo(plan);
  // Approve inline only once the sessions are visible, so the student
  // always sees what they approve.
  const canAnswerHere = variant === "plan" && respondable && onRespond && sessions.length > 0;

  const loadSessions = async () => {
    setLoadingSessions(true);
    setLoadSessionsError("");
    try {
      const response = await api.get(`${PLANS_URL}/${plan.id}`);
      setLoadedSessions(response.data?.data?.plan?.proposedSessions || []);
    } catch (error) {
      setLoadSessionsError(
        error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Could not load the sessions.",
      );
    } finally {
      setLoadingSessions(false);
    }
  };

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

  const cancelDeny = () => {
    setDenying(false);
    setReason("");
    setReasonError("");
  };

  const subtitle =
    variant === "slots"
      ? `${slots.length} ${slots.length === 1 ? "time slot" : "time slots"}${
          plan.createdAt ? ` · sent ${formatShortDate(plan.createdAt)}` : ""
        }`
      : sessionsCount
        ? [
            `${sessionsCount} ${sessionsCount === 1 ? "session" : "sessions"}`,
            range,
            teachers ? `${teachers} ${teachers === 1 ? "teacher" : "teachers"}` : "",
            plan.status === "accepted" && plan.respondedAt
              ? `approved ${formatShortDate(plan.respondedAt)}`
              : "",
          ]
            .filter(Boolean)
            .join(" · ")
        : "The admin is building your plan from these times.";

  // Accepted plans: how many proposed sessions were booked vs skipped.
  const answered = sessions.filter((s) => ["accepted", "rejected"].includes(s.studentResponse));
  const bookedCount = answered.filter((s) => s.studentResponse === "accepted").length;
  const skippedCount = answered.length - bookedCount;
  const showProgress = variant === "plan" && plan.status === "accepted" && answered.length > 0;

  const showAlerts =
    plan.adminNotes ||
    plan.status === "rejected" ||
    plan.status === "cancelled" ||
    (variant === "slots" && plan.status === "pending_admin_review");

  return (
    <section className="pl-card">
      <div className="pl-head">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="pl-course">{variant === "slots" ? "TIME SLOTS" : "STUDY PLAN"}</span>
            <StatusPill status={plan.status} />
          </div>
          <h3 className="text-[17px] font-bold text-slate-900 tracking-tight break-words">
            {heading || plan.title}
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {canAnswerHere && !denying && (
            <>
              <button type="button" className="btn-approve disabled:opacity-60" disabled={responding} onClick={approve}>
                <Icon name="check" size={16} />
                {responding ? "Saving…" : "Approve plan"}
              </button>
              <button type="button" className="btn-deny disabled:opacity-60" disabled={responding} onClick={() => setDenying(true)}>
                Ask for changes
              </button>
            </>
          )}
          {!canAnswerHere && respondable && variant === "plan" && onOpen && (
            <button type="button" className="pl-btn primary" onClick={() => onOpen(plan.id)}>
              Review & approve <ChevronRight size={14} />
            </button>
          )}
          {variant === "plan" && plan.status === "accepted" && onViewUpcoming && (
            <button type="button" className="pl-btn" onClick={onViewUpcoming}>
              View upcoming sessions <ChevronRight size={14} />
            </button>
          )}
          {onEdit && canEditPlan(plan) && (
            <button type="button" className="pl-btn" onClick={() => onEdit(plan)} title="Edit time slots">
              Edit times
            </button>
          )}
          {onOpen && !(respondable && variant === "plan" && !canAnswerHere) && (
            <button type="button" className="pl-btn" onClick={() => onOpen(plan.id)}>
              Details <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>

      {showProgress && (
        <div className="pl-progress">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5 gap-3">
            <span>
              <b className="text-slate-700">
                {bookedCount} of {sessions.length}
              </b>{" "}
              sessions booked in your Upcoming
            </span>
            {skippedCount > 0 && <span className="text-red-600">{skippedCount} skipped</span>}
          </div>
          <div className="pl-bar">
            <span style={{ width: `${(bookedCount / sessions.length) * 100}%`, background: "#16a34a" }}></span>
            <span style={{ width: `${(skippedCount / sessions.length) * 100}%`, background: "#dc2626" }}></span>
          </div>
        </div>
      )}

      {denying && (
        <div className="px-5 md:px-6 pb-4">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch">
            <input
              autoFocus
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setReasonError("");
              }}
              onKeyDown={(event) => event.key === "Enter" && !responding && sendChanges()}
              placeholder="What should the admin change? e.g. no Saturday mornings"
              className="input flex-1"
            />
            <div className="flex gap-2">
              <button type="button" className="pl-btn danger disabled:opacity-60" disabled={responding} onClick={sendChanges}>
                {responding ? "Sending…" : "Send to admin"}
              </button>
              <button type="button" className="pl-btn disabled:opacity-60" disabled={responding} onClick={cancelDeny}>
                Cancel
              </button>
            </div>
          </div>
          {reasonError && <p className="mt-2 text-sm font-semibold text-red-600">{reasonError}</p>}
        </div>
      )}

      {showAlerts && (
        <div className="px-5 md:px-6 pb-4 space-y-2">
          {variant === "slots" && plan.status === "pending_admin_review" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Sent to the admin
              {plan.createdAt ? ` on ${formatShortDate(plan.createdAt)}` : ""}. You will get your study plan
              as soon as they review these times.
            </div>
          )}
          {plan.adminNotes && (
            <div className="pl-alert info">
              <b>Admin note:</b> “{plan.adminNotes}”
            </div>
          )}
          {plan.status === "rejected" && (
            <div className="pl-alert danger">
              <b>Sent back to the admin.</b>
              {plan.studentFeedback
                ? `Your request: “${plan.studentFeedback}”`
                : "The admin is preparing a new plan."}
            </div>
          )}
          {plan.status === "cancelled" && (
            <div className="pl-alert danger">
              <b>Cancelled.</b> This plan is no longer active.
            </div>
          )}
        </div>
      )}

      {variant === "slots" ? (
        <div className="border-t border-slate-100 px-5 md:px-6 py-4">
          <SlotsGrid slots={slots} />
        </div>
      ) : sessions.length ? (
        <SessionsTable sessions={sessions} status={plan.status} limit={sessionsLimit} />
      ) : sessionsCount ? (
        <>
          <button type="button" onClick={loadSessions} disabled={loadingSessions} className="pl-more">
            {loadingSessions ? "Loading sessions…" : `Show the ${sessionsCount} proposed sessions`}
            {!loadingSessions && <ChevronDown size={14} />}
          </button>
          {loadSessionsError && (
            <p className="px-5 md:px-6 pb-3 text-sm font-semibold text-red-600 text-center">{loadSessionsError}</p>
          )}
        </>
      ) : null}
    </section>
  );
};

export default AvailabilityPlanCard;
