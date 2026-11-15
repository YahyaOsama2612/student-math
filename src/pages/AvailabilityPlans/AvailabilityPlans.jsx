import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "@/api/api";
import { useStudentData } from "@/context/StudentData";
import { EmptyCard, Page, PageHead } from "@/components/portal/ui";
import AvailabilityPlanCard, {
  PlanStepper,
  SlotsGrid,
  StatusPill,
  canEditPlan,
  formatShortDate,
} from "./components/AvailabilityPlanCard";
import AvailabilityPlanForm from "./components/AvailabilityPlanForm";

const PLANS_URL = "/api/user/availability-plans";

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

// Header pill (design: AV_STATUS) based on the latest plan.
const SLOTS_PILL = {
  none: ["NOT SENT YET", "bg-slate-100 text-slate-600"],
  pending_admin_review: ["WAITING FOR ADMIN APPROVAL", "bg-amber-100 text-amber-700"],
  pending_student_response: ["APPROVED BY ADMIN", "bg-green-100 text-green-700"],
  accepted: ["APPROVED BY ADMIN", "bg-green-100 text-green-700"],
  rejected: ["CHANGES REQUESTED", "bg-red-100 text-red-600"],
  cancelled: ["CANCELLED", "bg-slate-100 text-slate-600"],
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
const ORDER = ["awaiting", "changes", "active", "waiting"];

// A plan shows in the "Plan" tab once the admin has proposed something.
const hasProposal = (plan) =>
  ["pending_student_response", "accepted", "rejected"].includes(plan.status) ||
  Number(plan.proposedSessionsCount) > 0 ||
  plan.proposedSessions?.length > 0 ||
  Boolean(plan.proposedAt);

const newestFirst = (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0);

/* ---------- Small pieces ---------- */

const LoadingBlocks = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="skel h-28"></div>
    ))}
  </div>
);

const ErrorCard = ({ message, onRetry }) => (
  <div className="rp-card text-center">
    <p className="text-sm font-semibold text-red-600">{message}</p>
    <button type="button" onClick={onRetry} className="pl-btn mt-3">
      Try again
    </button>
  </div>
);

const PrimaryAction = ({ children, onClick }) => (
  <button type="button" onClick={onClick} className="btn-primary" style={{ width: "auto", margin: "0 auto" }}>
    {children}
  </button>
);

/* ================================================================== */

const AvailabilityPlans = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { reloadCounts, reloadSessions } = useStudentData();
  const [plans, setPlans] = useState([]);
  const [plan, setPlan] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
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
      const response = await api.get(PLANS_URL, { params: { page, limit: pagination.limit } });
      const result = response.data?.data;
      setPlans(result?.items || []);
      setPagination((current) => ({ ...current, ...(result?.pagination || {}) }));
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
  const viewUpcoming = () => navigate("/user/upcoming");

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

  // Returns true on success so the card can reset its "ask for changes" form.
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
      // Keep the sidebar badge and Upcoming list in step with the answer.
      reloadCounts?.();
      if (action === "accept") reloadSessions?.();
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
  const proposals = useMemo(() => sortedPlans.filter(hasProposal), [sortedPlans]);
  const awaitingCount = proposals.filter((p) => filterKeyOf(p) === "awaiting").length;
  const activeTab = tab || (awaitingCount ? "plan" : "slots");

  const countFor = (key) =>
    key === "all" ? proposals.length : proposals.filter((p) => filterKeyOf(p) === key).length;

  const shownProposals = proposals
    .filter((p) => filter === "all" || filterKeyOf(p) === filter)
    // Awaiting first, then changes, then active.
    .sort((a, b) => ORDER.indexOf(filterKeyOf(a)) - ORDER.indexOf(filterKeyOf(b)));

  const [pillText, pillClass] = SLOTS_PILL[latestPlan?.status || "none"] || SLOTS_PILL.none;

  const formModal = formPlan && (
    <AvailabilityPlanForm
      plan={id ? formPlan : formPlan.id ? formPlan : null}
      saving={saving}
      onClose={() => setFormPlan(null)}
      onSubmit={savePlan}
    />
  );

  /* ================================================================ */
  /* Detail view                                                      */
  /* ================================================================ */

  if (id) {
    return (
      <Page>
        <button
          type="button"
          onClick={() => navigate("/user/availability-plans")}
          className="mb-4 text-sm font-semibold text-slate-500 hover:text-one"
        >
          ← My schedule & study plan
        </button>

        {detailLoading ? (
          <LoadingBlocks />
        ) : loadError ? (
          <ErrorCard message={loadError} onRetry={fetchPlan} />
        ) : plan ? (
          <>
            <PageHead
              title={<span className="break-words">{plan.title}</span>}
              text={[
                plan.createdAt && `Sent ${formatShortDate(plan.createdAt)}`,
                plan.proposedAt && `Proposed ${formatShortDate(plan.proposedAt)}`,
                plan.respondedAt && `Answered ${formatShortDate(plan.respondedAt)}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            >
              <StatusPill status={plan.status} />
            </PageHead>

            <PlanStepper plan={plan} />

            {hasProposal(plan) ? (
              <AvailabilityPlanCard
                plan={plan}
                variant="plan"
                heading="Proposed study plan"
                sessionsLimit={0}
                onRespond={respondToPlan}
                onViewUpcoming={viewUpcoming}
                responding={responding}
              />
            ) : (
              <div className="mb-5">
                <EmptyCard
                  title="Waiting for the admin"
                  text={`Your time slots were sent${
                    plan.createdAt ? ` on ${formatShortDate(plan.createdAt)}` : ""
                  }. Your study plan appears here once the admin reviews them.`}
                />
              </div>
            )}

            <section className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">My free times (availability)</h3>
                  <p className="text-xs text-gray-400">
                    {plan.slots?.length || 0} {plan.slots?.length === 1 ? "slot" : "slots"} sent to the admin
                  </p>
                </div>
                {canEditPlan(plan) && (
                  <button
                    type="button"
                    onClick={() => setFormPlan(plan)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors bg-gray-900 hover:bg-black text-white"
                  >
                    Edit my times
                  </button>
                )}
              </div>
              {plan.notes && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 mb-4 text-sm text-slate-600">
                  <b className="text-slate-800 mr-1">Your note:</b>
                  {plan.notes}
                </div>
              )}
              <SlotsGrid slots={plan.slots || []} />
            </section>
          </>
        ) : (
          <EmptyCard title="Plan not found" text="This availability plan could not be found." />
        )}

        {formModal}
      </Page>
    );
  }

  /* ================================================================ */
  /* List view: stepper + "Time slots | Plan" tabs                    */
  /* ================================================================ */

  const tabBtn = (value, label, badge) => (
    <button
      type="button"
      onClick={() => setTab(value)}
      className={`av-tab ${activeTab === value ? "active" : ""}`}
    >
      {label}
      {badge > 0 && <span className="av-badge">{badge}</span>}
    </button>
  );

  return (
    <Page>
      <PageHead
        title="My Schedule & Study Plan"
        text="Share your free times with the admin, then review and approve the plan built from them."
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className={`pill ${pillClass}`}>TIME SLOTS: {pillText}</span>
          <button type="button" onClick={fetchPlans} disabled={loading} className="btn-mini disabled:opacity-60">
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </PageHead>

      <PlanStepper plan={latestPlan} />

      <div className="flex gap-2 mb-5 border-b border-slate-200 overflow-x-auto">
        {tabBtn("slots", "Time slots")}
        {tabBtn("plan", "Plan", awaitingCount)}
      </div>

      {loading ? (
        <LoadingBlocks />
      ) : loadError ? (
        <ErrorCard message={loadError} onRetry={fetchPlans} />
      ) : activeTab === "slots" ? (
        /* ---------------- Time slots tab ---------------- */
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold text-gray-900">My free times (availability)</h3>
              <p className="text-xs text-gray-400">Each set of times you send gets its own study plan from the admin.</p>
            </div>
            <button
              type="button"
              onClick={() => setFormPlan({})}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors bg-gray-900 hover:bg-black text-white"
            >
              + Add my free times
            </button>
          </div>

          {sortedPlans.length ? (
            sortedPlans.map((item) => (
              <AvailabilityPlanCard key={item.id} plan={item} variant="slots" onOpen={openPlan} onEdit={setFormPlan} />
            ))
          ) : (
            <EmptyCard
              title="No time slots yet"
              text="Pick your free times and send them to the admin. Your study plan is built from these slots."
              action={<PrimaryAction onClick={() => setFormPlan({})}>Fill my time slots</PrimaryAction>}
            />
          )}
        </>
      ) : (
        /* ---------------- Plan tab ---------------- */
        <>
          {!sortedPlans.length ? (
            <EmptyCard
              title="No plan yet"
              text="Send your time slots to the admin first. Your plan is built from them once they are reviewed."
              action={<PrimaryAction onClick={() => setTab("slots")}>Fill my time slots</PrimaryAction>}
            />
          ) : !proposals.length ? (
            <EmptyCard
              title="Waiting for the admin"
              text={`Your time slots were sent${
                latestPlan?.createdAt ? ` on ${formatShortDate(latestPlan.createdAt)}` : ""
              }. Your plan appears here once the admin reviews them.`}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="font-bold text-gray-900">Study plans</h3>
                  <p className="text-xs text-gray-400">Approve each plan, or ask for changes with a reason.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {FILTERS.map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFilter(key)}
                      className={`tab-btn ${filter === key ? "active" : ""}`}
                      style={{ border: "1px solid #e2e8f0" }}
                    >
                      {label} <span className="opacity-70">{countFor(key)}</span>
                    </button>
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
                    onViewUpcoming={viewUpcoming}
                    responding={responding}
                  />
                ))
              ) : (
                <p className="text-sm text-slate-400 text-center py-10">No plans with this status.</p>
              )}
            </>
          )}
        </>
      )}

      {/* Pagination */}
      {!loading && !loadError && (pagination.totalPages || 1) > 1 && (
        <div className="rp-card mt-2 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ padding: ".75rem 1.25rem" }}>
          <p className="text-sm text-slate-500">
            Page {pagination.page || page} of {pagination.totalPages || 1} · {pagination.total || plans.length} plans
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
              className="pl-btn disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              type="button"
              disabled={page >= (pagination.totalPages || 1) || loading}
              onClick={() => setPage((current) => current + 1)}
              className="pl-btn disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {formModal}
    </Page>
  );
};

export default AvailabilityPlans;
