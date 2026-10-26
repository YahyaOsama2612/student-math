import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/api";
import AvailabilityPlanCard, {
  PlanStepper,
  SlotsGrid,
  StatusPill,
  formatShortDate,
} from "./components/AvailabilityPlanCard";
import AvailabilityPlanForm from "./components/AvailabilityPlanForm";

const PLANS_URL = "/api/user/availability-plans";

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

// Header pill: "TIME SLOTS: …" based on the latest plan.
const SLOTS_PILL = {
  none: ["NOT SENT YET", "bg-slate-100 text-slate-600"],
  pending_admin_review: ["WAITING FOR ADMIN APPROVAL", "bg-amber-100 text-amber-700"],
  pending_student_response: ["APPROVED BY ADMIN", "bg-green-100 text-green-700"],
  accepted: ["APPROVED BY ADMIN", "bg-green-100 text-green-700"],
  rejected: ["CHANGES REQUESTED", "bg-red-100 text-red-600"],
};

// Plan tab filter key for each status.
const filterKeyOf = (plan) =>
  ({
    pending_student_response: "awaiting",
    rejected: "changes",
    accepted: "active",
  })[plan.status] || "waiting";

const FILTERS = [
  ["all", "All"],
  ["awaiting", "Awaiting"],
  ["changes", "Changes requested"],
  ["active", "Active"],
];

// A plan shows in the "Plan" tab once the admin has proposed something.
const hasProposal = (plan) =>
  ["pending_student_response", "accepted", "rejected"].includes(plan.status) ||
  Number(plan.proposedSessionsCount) > 0 ||
  plan.proposedSessions?.length > 0 ||
  Boolean(plan.proposedAt);

const newestFirst = (a, b) =>
  new Date(b.createdAt || 0) - new Date(a.createdAt || 0);

/* ---------- Small shared pieces ---------- */

const EmptyBox = ({ title, text, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
    <p className="mb-1 text-lg font-extrabold text-gray-900">{title}</p>
    <p className="mx-auto mb-4 max-w-md text-sm text-slate-500">{text}</p>
    {children}
  </section>
);

const PrimaryButton = ({ className = "", ...props }) => (
  <button
    type="button"
    className={`inline-flex items-center justify-center gap-2 rounded-xl bg-one px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-one/15 transition hover:brightness-110 disabled:opacity-60 ${className}`}
    {...props}
  />
);

const Chip = ({ active, label, count, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`whitespace-nowrap rounded-xl border px-4 py-2 text-[13px] font-bold transition ${active
        ? "border-one bg-one text-white shadow-[0_6px_14px_-6px_rgba(125,10,10,0.5)]"
        : "border-slate-200 bg-white text-slate-500 hover:text-one"
      }`}
  >
    {label} <span className="opacity-70">{count}</span>
  </button>
);

const LoadingBox = ({ text }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
    <RefreshCw size={22} className="mx-auto mb-3 animate-spin text-slate-300" />
    {text}
  </div>
);

const ErrorBox = ({ message, onRetry }) => (
  <div className="rounded-2xl border border-red-100 bg-white p-8 text-center">
    <p className="font-medium text-red-700">{message}</p>
    <PrimaryButton onClick={onRetry} className="mx-auto mt-4">
      Try again
    </PrimaryButton>
  </div>
);

/* ================================================================== */

const AvailabilityPlans = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [plan, setPlan] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [responding, setResponding] = useState(false);
  const [formPlan, setFormPlan] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState(null); // "slots" | "plan"
  const [filter, setFilter] = useState("all");

  /* ---------------- Data ---------------- */

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await api.get(PLANS_URL, {
        params: { page, limit: pagination.limit },
      });
      const result = response.data?.data;
      setPlans(result?.items || []);
      setPagination((current) => ({
        ...current,
        ...(result?.pagination || {}),
      }));
    } catch (error) {
      const message = getErrorMessage(error);
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, pagination.limit]);

  const fetchPlan = useCallback(async () => {
    if (!id) {
      setPlan(null);
      return;
    }
    setDetailLoading(true);
    setLoadError("");
    try {
      const response = await api.get(`${PLANS_URL}/${id}`);
      setPlan(response.data?.data?.plan || null);
    } catch (error) {
      const message = getErrorMessage(error);
      setLoadError(message);
      toast.error(message);
    } finally {
      setDetailLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchPlan();
    else fetchPlans();
  }, [fetchPlan, fetchPlans, id]);

  const openPlan = (planId) => navigate(`/user/availability-plans/${planId}`);

  const savePlan = async (body) => {
    setSaving(true);
    try {
      if (formPlan?.id) {
        await api.put(`${PLANS_URL}/${formPlan.id}`, body);
        toast.success("Time slots updated and sent to the admin.");
      } else {
        await api.post(PLANS_URL, body);
        toast.success("Time slots sent to the admin for approval.");
      }
      setFormPlan(null);
      setTab("slots");
      if (id) await fetchPlan();
      else await fetchPlans();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // Returns true on success so the card can reset its "request changes" form.
  const respondToPlan = async (planId, action, feedbackText = "") => {
    setResponding(true);
    try {
      await api.post(`${PLANS_URL}/${planId}/respond`, {
        action,
        feedback: feedbackText.trim(),
      });
      toast.success(
        action === "accept"
          ? "Plan approved — your sessions move to Upcoming."
          : "Sent back to the admin with your reason.",
      );
      if (id) await fetchPlan();
      await fetchPlans();
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    } finally {
      setResponding(false);
    }
  };

  /* ---------------- Derived (list view) ---------------- */

  const sortedPlans = useMemo(() => [...plans].sort(newestFirst), [plans]);
  const latestPlan = sortedPlans[0] || null;
  const proposals = useMemo(
    () => sortedPlans.filter(hasProposal),
    [sortedPlans],
  );
  const awaitingCount = proposals.filter(
    (p) => filterKeyOf(p) === "awaiting",
  ).length;
  const activeTab = tab || (awaitingCount ? "plan" : "slots");

  const countFor = (key) =>
    key === "all"
      ? proposals.length
      : proposals.filter((p) => filterKeyOf(p) === key).length;

  const shownProposals = proposals
    .filter((p) => filter === "all" || filterKeyOf(p) === filter)
    // Awaiting first, then changes, then active.
    .sort(
      (a, b) =>
        ["awaiting", "changes", "active", "waiting"].indexOf(filterKeyOf(a)) -
        ["awaiting", "changes", "active", "waiting"].indexOf(filterKeyOf(b)),
    );

  const [pillText, pillClass] =
    SLOTS_PILL[latestPlan?.status || "none"] || SLOTS_PILL.none;

  /* ================================================================ */
  /* Detail view                                                      */
  /* ================================================================ */

  if (id) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-[#F8FAFC] px-4 py-6 text-slate-900 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => navigate("/user/availability-plans")}
            className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:text-one"
          >
            <ArrowLeft size={17} />
            My schedule & study plan
          </button>

          {detailLoading ? (
            <LoadingBox text="Loading your plan..." />
          ) : loadError ? (
            <ErrorBox message={loadError} onRetry={fetchPlan} />
          ) : plan ? (
            <>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="break-words text-2xl font-extrabold tracking-tight text-gray-900">
                    {plan.title}
                  </h1>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {[
                      plan.createdAt && `Sent ${formatShortDate(plan.createdAt)}`,
                      plan.proposedAt &&
                      `Proposed ${formatShortDate(plan.proposedAt)}`,
                      plan.respondedAt &&
                      `Answered ${formatShortDate(plan.respondedAt)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <StatusPill status={plan.status} />
              </div>

              <PlanStepper plan={plan} />

              {hasProposal(plan) ? (
                <AvailabilityPlanCard
                  plan={plan}
                  variant="plan"
                  heading="Proposed study plan"
                  sessionsLimit={0}
                  onRespond={respondToPlan}
                  responding={responding}
                />
              ) : (
                <EmptyBox
                  title="Waiting for the admin"
                  text={`Your time slots were sent${plan.createdAt ? ` on ${formatShortDate(plan.createdAt)}` : ""
                    }. Your study plan appears here once the admin reviews them.`}
                />
              )}

              <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900">
                      My free times (availability)
                    </h3>
                    <p className="text-xs text-gray-400">
                      {plan.slots?.length || 0}{" "}
                      {plan.slots?.length === 1 ? "slot" : "slots"} sent to the
                      admin
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormPlan(plan)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-black"
                  >
                    <CalendarClock size={16} />
                    Edit my times
                  </button>
                </div>
                {plan.notes && (
                  <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <b className="me-1 text-slate-800">Your note:</b>
                    {plan.notes}
                  </div>
                )}
                <SlotsGrid slots={plan.slots || []} />
              </section>
            </>
          ) : (
            <EmptyBox
              title="Plan not found"
              text="This availability plan could not be found."
            />
          )}
        </div>

        {formPlan && (
          <AvailabilityPlanForm
            plan={formPlan}
            saving={saving}
            onClose={() => setFormPlan(null)}
            onSubmit={savePlan}
          />
        )}
      </main>
    );
  }

  /* ================================================================ */
  /* List view: stepper + "Time slots | Plan" tabs                    */
  /* ================================================================ */

  const TabButton = ({ value, label, badge }) => (
    <button
      type="button"
      onClick={() => setTab(value)}
      className={`-mb-px inline-flex items-center gap-2 border-b-[3px] px-4 py-3 text-sm font-extrabold transition-colors ${activeTab === value
          ? "border-one text-one"
          : "border-transparent text-slate-500 hover:text-one"
        }`}
    >
      {label}
      {badge > 0 && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-500 px-1.5 text-[11px] text-white">
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#F8FAFC] px-4 py-6 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
              My Schedule & Study Plan
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Share your free times with the admin, then review and approve the
              plan built from them.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold tracking-wide ${pillClass}`}
            >
              TIME SLOTS: {pillText}
            </span>
            <button
              type="button"
              onClick={fetchPlans}
              disabled={loading}
              aria-label="Refresh"
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm hover:text-one disabled:opacity-60"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <PlanStepper plan={latestPlan} />

        {/* Tabs */}
        <div className="mb-5 flex gap-2 border-b border-slate-200">
          <TabButton value="slots" label="Time slots" />
          <TabButton value="plan" label="Plan" badge={awaitingCount} />
        </div>

        {loading ? (
          <LoadingBox text="Loading your schedule..." />
        ) : loadError ? (
          <ErrorBox message={loadError} onRetry={fetchPlans} />
        ) : activeTab === "slots" ? (
          /* ---------------- Time slots tab ---------------- */
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-gray-900">
                  My free times (availability)
                </h3>
                <p className="text-xs text-gray-400">
                  Each set of times you send gets its own study plan from the
                  admin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormPlan({})}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-black"
              >
                <Plus size={17} />
                Add my free times
              </button>
            </div>

            {sortedPlans.length ? (
              sortedPlans.map((item) => (
                <AvailabilityPlanCard
                  key={item.id}
                  plan={item}
                  variant="slots"
                  onOpen={openPlan}
                  onEdit={setFormPlan}
                />
              ))
            ) : (
              <EmptyBox
                title="No time slots yet"
                text="Pick your free times and send them to the admin. Your study plan is built from these slots."
              >
                <PrimaryButton onClick={() => setFormPlan({})} className="mx-auto">
                  <Plus size={17} />
                  Fill my time slots
                </PrimaryButton>
              </EmptyBox>
            )}
          </>
        ) : (
          /* ---------------- Plan tab ---------------- */
          <>
            {!sortedPlans.length ? (
              <EmptyBox
                title="No plan yet"
                text="Send your time slots to the admin first. Your plan is built from them once they are reviewed."
              >
                <PrimaryButton onClick={() => setTab("slots")} className="mx-auto">
                  Fill my time slots
                </PrimaryButton>
              </EmptyBox>
            ) : !proposals.length ? (
              <EmptyBox
                title="Waiting for the admin"
                text={`Your time slots were sent${latestPlan?.createdAt
                    ? ` on ${formatShortDate(latestPlan.createdAt)}`
                    : ""
                  }. Your plan appears here once the admin reviews them.`}
              />
            ) : (
              <>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900">Study plans</h3>
                    <p className="text-xs text-gray-400">
                      Approve each plan, or request changes with a reason.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {FILTERS.map(([key, label]) => (
                      <Chip
                        key={key}
                        active={filter === key}
                        label={label}
                        count={countFor(key)}
                        onClick={() => setFilter(key)}
                      />
                    ))}
                  </div>
                </div>

                {shownProposals.length ? (
                  shownProposals.map((item) => (
                    <AvailabilityPlanCard
                      key={item.id}
                      plan={item}
                      variant="plan"
                      onOpen={openPlan}
                      onRespond={respondToPlan}
                      responding={responding}
                    />
                  ))
                ) : (
                  <p className="py-10 text-center text-sm text-slate-400">
                    No plans with this status.
                  </p>
                )}
              </>
            )}
          </>
        )}

        {/* Pagination */}
        {!loading && !loadError && (pagination.totalPages || 1) > 1 && (
          <div className="mt-2 flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 sm:flex-row">
            <p className="text-sm text-slate-500">
              Page {pagination.page || page} of {pagination.totalPages || 1} ·{" "}
              {pagination.total || plans.length} plans
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => current - 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={17} />
                Previous
              </button>
              <button
                type="button"
                disabled={page >= (pagination.totalPages || 1) || loading}
                onClick={() => setPage((current) => current + 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        )}
      </div>

      {formPlan && (
        <AvailabilityPlanForm
          plan={formPlan.id ? formPlan : null}
          saving={saving}
          onClose={() => setFormPlan(null)}
          onSubmit={savePlan}
        />
      )}
    </main>
  );
};

export default AvailabilityPlans;