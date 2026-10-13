import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/api";
import AvailabilityPlanCard, {
  formatPlanStatus,
  formatPlanTime,
} from "./components/AvailabilityPlanCard";
import AvailabilityPlanForm from "./components/AvailabilityPlanForm";

const PLANS_URL = "/api/user/availability-plans";

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

const formatSessionDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

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
  const [feedback, setFeedback] = useState("");
  const [loadError, setLoadError] = useState("");

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
        toast.success("Availability plan updated.");
      } else {
        await api.post(PLANS_URL, body);
        toast.success("Availability plan submitted.");
      }
      setFormPlan(null);
      if (id) await fetchPlan();
      else await fetchPlans();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const respondToPlan = async (action) => {
    setResponding(true);
    try {
      await api.post(`${PLANS_URL}/${id}/respond`, { action, feedback: feedback.trim() });
      toast.success(action === "accept" ? "Plan accepted." : "Plan rejected.");
      setFeedback("");
      await fetchPlan();
      await fetchPlans();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setResponding(false);
    }
  };

  const canRespond =
    plan &&
    !/accepted|rejected/i.test(plan.status || "") &&
    (plan.proposedAt ||
      plan.proposedSessions?.length > 0 ||
      /student.*response|response.*student|proposed/i.test(plan.status || ""));

  if (id) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-[#F8FAFC] px-4 py-6 text-slate-900 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={() => navigate("/user/availability-plans")}
            className="mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:text-one"
          >
            <ArrowLeft size={17} />
            All plans
          </button>

          {detailLoading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">
              Loading your plan...
            </div>
          ) : loadError ? (
            <div className="rounded-3xl border border-red-100 bg-white p-8 text-center">
              <p className="font-medium text-red-700">{loadError}</p>
              <button
                type="button"
                onClick={fetchPlan}
                className="mt-4 rounded-xl bg-one px-4 py-2 font-semibold text-white"
              >
                Try again
              </button>
            </div>
          ) : plan ? (
            <div className="space-y-5">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                      {formatPlanStatus(plan.status)}
                    </span>
                    <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
                      {plan.title}
                    </h1>
                    {plan.notes && (
                      <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">
                        {plan.notes}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormPlan(plan)}
                    className="inline-flex items-center gap-2 rounded-xl border border-one/20 px-4 py-2.5 font-semibold text-one hover:bg-one/5"
                  >
                    <CalendarClock size={17} />
                    Edit plan
                  </button>
                </div>
                <div className="mt-6 flex flex-wrap gap-5 border-t border-slate-100 pt-5 text-sm text-slate-500">
                  <span>Created {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : "—"}</span>
                  {plan.proposedAt && (
                    <span>
                      Proposed {new Date(plan.proposedAt).toLocaleDateString()}
                    </span>
                  )}
                  {plan.respondedAt && (
                    <span>
                      Responded {new Date(plan.respondedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-lg font-bold">Your available times</h2>
                {plan.slots?.length ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {plan.slots.map((slot) => (
                      <div
                        key={slot.id || `${slot.dayOfWeek}-${slot.timeFrom}`}
                        className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4"
                      >
                        <span className="rounded-xl bg-one/10 p-2.5 text-one">
                          <Clock3 size={19} />
                        </span>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {slot.dayOfWeek}
                          </p>
                          <p className="text-sm text-slate-500">
                            {formatPlanTime(slot.timeFrom)} –{" "}
                            {formatPlanTime(slot.timeTo)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">No times added.</p>
                )}
              </section>

              {plan.adminNotes && (
                <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
                  <h2 className="font-bold text-amber-900">Admin notes</h2>
                  <p className="mt-2 whitespace-pre-wrap leading-6 text-amber-800">
                    {plan.adminNotes}
                  </p>
                </section>
              )}

              {plan.studentFeedback && (
                <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
                  <h2 className="font-bold text-blue-900">Your feedback</h2>
                  <p className="mt-2 whitespace-pre-wrap leading-6 text-blue-800">
                    {plan.studentFeedback}
                  </p>
                </section>
              )}

              {plan.proposedSessions?.length > 0 && (
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <h2 className="text-lg font-bold">Proposed sessions</h2>
                  <div className="mt-4 space-y-3">
                    {plan.proposedSessions.map((session, index) => (
                      <div
                        key={
                          session.planSessionId ||
                          session.sessionId ||
                          session.id ||
                          index
                        }
                        className="rounded-2xl bg-slate-50 p-4"
                      >
                        <p className="font-semibold text-slate-800">
                          {session.sessionName ||
                            session.title ||
                            session.subject?.name ||
                            session.course?.title ||
                            `Session ${index + 1}`}
                        </p>
                        <div className="mt-2 space-y-1 text-sm text-slate-500">
                          {(session.sessionDate ||
                            session.startDate ||
                            session.endDate) && (
                              <p>
                                {session.sessionDate
                                  ? formatSessionDate(session.sessionDate)
                                  : [
                                    formatSessionDate(session.startDate),
                                    formatSessionDate(session.endDate),
                                  ]
                                    .filter(Boolean)
                                    .join(" – ")}
                              </p>
                            )}
                          {(session.timeFrom || session.timeTo) && (
                            <p>
                              {[
                                session.timeFrom && formatPlanTime(session.timeFrom),
                                session.timeTo && formatPlanTime(session.timeTo),
                              ]
                                .filter(Boolean)
                                .join(" – ")}
                            </p>
                          )}
                          {session.scheduleType && (
                            <p>
                              Schedule:{" "}
                              {session.scheduleType === "once"
                                ? "One-time"
                                : formatPlanStatus(session.scheduleType)}
                            </p>
                          )}
                          {session.sessionRelationalType && (
                            <p>Type: {session.sessionRelationalType}</p>
                          )}
                          {session.teacherName && (
                            <p>Teacher: {session.teacherName}</p>
                          )}
                          {session.planSessionNotes && (
                            <p className="whitespace-pre-wrap">
                              Notes: {session.planSessionNotes}
                            </p>
                          )}
                          {session.sessionLink && (
                            <a
                              href={session.sessionLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block font-medium text-one hover:underline"
                            >
                              Open session link
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {canRespond && (
                <section className="rounded-3xl border border-one/15 bg-white p-6 shadow-sm sm:p-8">
                  <h2 className="text-lg font-bold">Respond to this plan</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Accept or reject the proposed schedule. You can include an optional note.
                  </p>
                  <textarea
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    rows={3}
                    placeholder="Add feedback (optional)"
                    className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-one focus:ring-2 focus:ring-one/10"
                  />
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      disabled={responding}
                      onClick={() => respondToPlan("accept")}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <ThumbsUp size={17} />
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={responding}
                      onClick={() => respondToPlan("reject")}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-5 py-3 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      <ThumbsDown size={17} />
                      Reject
                    </button>
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">
              This availability plan could not be found.
            </div>
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

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#F8FAFC] px-4 py-6 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-one">
              <CalendarClock size={18} />
              Student schedule
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Availability <span className="text-one">plans</span>
            </h1>
            <p className="mt-2 max-w-xl text-slate-500">
              Tell us when you are available, then track responses and proposed sessions.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={fetchPlans}
              disabled={loading}
              aria-label="Refresh availability plans"
              className="rounded-xl border border-slate-200 bg-white p-3 text-slate-600 shadow-sm hover:text-one disabled:opacity-60"
            >
              <RefreshCw size={19} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={() => setFormPlan({})}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-one px-5 py-3 font-semibold text-white shadow-lg shadow-one/15 transition hover:bg-one/90"
            >
              <Plus size={19} />
              Create plan
            </button>
          </div>
        </header>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            Loading your availability plans...
          </div>
        ) : loadError ? (
          <div className="rounded-3xl border border-red-100 bg-white p-8 text-center">
            <p className="font-medium text-red-700">{loadError}</p>
            <button
              type="button"
              onClick={fetchPlans}
              className="mt-4 rounded-xl bg-one px-4 py-2 font-semibold text-white"
            >
              Try again
            </button>
          </div>
        ) : plans.length ? (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              {plans.map((item) => (
                <AvailabilityPlanCard
                  key={item.id}
                  plan={item}
                  onOpen={openPlan}
                  onEdit={setFormPlan}
                />
              ))}
            </div>
            <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:flex-row">
              <p className="text-sm text-slate-500">
                Page {pagination.page || page} of {pagination.totalPages || 1}
                {" · "}
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
          </>
        ) : (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-one/10 text-one">
              <CalendarClock size={27} />
            </div>
            <h2 className="mt-4 text-xl font-bold">No availability plans yet</h2>
            <p className="mx-auto mt-2 max-w-md text-slate-500">
              Create a plan with the days and hours that work for you.
            </p>
            <button
              type="button"
              onClick={() => setFormPlan({})}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-one px-5 py-3 font-semibold text-white hover:bg-one/90"
            >
              <Plus size={18} />
              Create your first plan
            </button>
          </section>
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
