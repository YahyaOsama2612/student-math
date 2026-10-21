import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Clock3, RefreshCw, X } from "lucide-react";
import api from "../../../api/api";
import { formatPlanTime } from "./AvailabilityPlanCard";

const SLOTS_URL = "/api/user/availability-plans/slots";

// Week starts on Saturday.
const DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

// API may return "03:00" or "03:00:00" – normalise to "HH:mm".
const toHM = (value) => {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "";
};

// Identifies a slot by what it is (not by id), so a student's previously saved
// plan slots can be matched against the admin's current slots.
const slotKey = (slot) =>
  `${slot.dayOfWeek}|${toHM(slot.timeFrom)}|${toHM(slot.timeTo)}`;

// Accepts: [] | { data: [] } | { data: { items: [] } } | { data: { slots: [] } }
const extractSlots = (payload) => {
  const d = payload?.data ?? payload;
  const list = Array.isArray(d) ? d : (d?.items ?? d?.slots ?? []);
  return Array.isArray(list) ? list : [];
};

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  "Could not load the available times.";

// Shape sent to the plan API. Kept identical to the previous free-form version
// (dayOfWeek / timeFrom / timeTo). If your backend expects slot ids instead,
// change it here only, e.g. return { slotId: slot.id }.
const buildSlotPayload = (slot) => ({
  dayOfWeek: slot.dayOfWeek,
  timeFrom: `${toHM(slot.timeFrom)}:00`,
  timeTo: `${toHM(slot.timeTo)}:00`,
});

const AvailabilityPlanForm = ({ plan, saving, onClose, onSubmit }) => {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [validationError, setValidationError] = useState("");

  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState("");

  /* ---------------- Load admin-defined slots ---------------- */

  const loadSlots = useCallback(async (signal) => {
    setSlotsLoading(true);
    setSlotsError("");
    try {
      const response = await api.get(SLOTS_URL, { signal });
      const slots = extractSlots(response.data)
        .filter((slot) => slot.isActive !== false)
        .map((slot) => ({
          id: slot.id,
          dayOfWeek: slot.dayOfWeek,
          timeFrom: toHM(slot.timeFrom),
          timeTo: toHM(slot.timeTo),
        }))
        .sort((a, b) => a.timeFrom.localeCompare(b.timeFrom));
      setAvailableSlots(slots);
    } catch (error) {
      if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") return;
      setSlotsError(getErrorMessage(error));
    } finally {
      if (!signal?.aborted) setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadSlots(controller.signal);
    return () => controller.abort();
  }, [loadSlots]);

  /* ---------------- Initialise from the plan being edited ---------------- */

  useEffect(() => {
    setTitle(plan?.title || "");
    setNotes(plan?.notes || "");
    setSelectedKeys((plan?.slots || []).map(slotKey));
    setValidationError("");
  }, [plan]);

  /* ---------------- Derived data ---------------- */

  const slotsByDay = useMemo(() => {
    const map = Object.fromEntries(DAYS.map((day) => [day, []]));
    availableSlots.forEach((slot) => {
      (map[slot.dayOfWeek] ||= []).push(slot);
    });
    return map;
  }, [availableSlots]);

  const availableKeys = useMemo(
    () => new Set(availableSlots.map(slotKey)),
    [availableSlots],
  );

  // Times saved in the plan that the admin no longer offers.
  const staleCount = slotsLoading || slotsError
    ? 0
    : selectedKeys.filter((key) => !availableKeys.has(key)).length;

  const validSelectedCount = selectedKeys.filter((key) =>
    availableKeys.has(key),
  ).length;

  /* ---------------- Actions ---------------- */

  const toggleSlot = (slot) => {
    const key = slotKey(slot);
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
    setValidationError("");
  };

  const toggleDay = (day) => {
    const keys = (slotsByDay[day] || []).map(slotKey);
    if (!keys.length) return;
    setSelectedKeys((current) => {
      const allSelected = keys.every((key) => current.includes(key));
      return allSelected
        ? current.filter((key) => !keys.includes(key))
        : [...new Set([...current, ...keys])];
    });
    setValidationError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!title.trim()) {
      setValidationError("Enter a title for your availability plan.");
      return;
    }
    // Only submit times the admin still offers.
    const chosen = availableSlots.filter((slot) =>
      selectedKeys.includes(slotKey(slot)),
    );
    if (!chosen.length) {
      setValidationError("Choose at least one available time.");
      return;
    }

    onSubmit({
      title: title.trim(),
      notes: notes.trim(),
      slots: chosen.map(buildSlotPayload),
    });
  };

  const noSlotsOffered =
    !slotsLoading && !slotsError && availableSlots.length === 0;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="availability-form-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-one">
              Availability plan
            </p>
            <h2
              id="availability-form-title"
              className="mt-1 text-2xl font-bold text-slate-900"
            >
              {plan ? "Edit your plan" : "Create a new plan"}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close form"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Plan title
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={160}
              placeholder="e.g. My availability for next week"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-one focus:ring-2 focus:ring-one/10"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Notes <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Share any preferences with the team"
              className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-one focus:ring-2 focus:ring-one/10"
            />
          </label>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-800">Available times</h3>
                <p className="text-sm text-slate-500">
                  Choose the times that work for you.
                  {validSelectedCount > 0 && (
                    <span className="ms-1 font-semibold text-one">
                      {validSelectedCount} selected
                    </span>
                  )}
                </p>
              </div>
            </div>

            {slotsLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500">
                Loading available times...
              </div>
            ) : slotsError ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center">
                <p className="text-sm font-medium text-red-700">{slotsError}</p>
                <button
                  type="button"
                  onClick={() => loadSlots()}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-one px-4 py-2 text-sm font-semibold text-white"
                >
                  <RefreshCw size={15} />
                  Try again
                </button>
              </div>
            ) : noSlotsOffered ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center text-sm text-slate-500">
                No times are available right now. Please check back later.
              </div>
            ) : (
              <div className="space-y-4">
                {DAYS.filter((day) => slotsByDay[day]?.length).map((day) => {
                  const daySlots = slotsByDay[day];
                  const allSelected = daySlots.every((slot) =>
                    selectedKeys.includes(slotKey(slot)),
                  );
                  return (
                    <div
                      key={day}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between px-1">
                        <span className="text-sm font-bold text-slate-700">
                          {day}
                        </span>
                        {daySlots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => toggleDay(day)}
                            disabled={saving}
                            className="text-xs font-semibold text-one hover:underline disabled:opacity-50"
                          >
                            {allSelected ? "Clear day" : "Select all"}
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {daySlots.map((slot) => {
                          const selected = selectedKeys.includes(slotKey(slot));
                          return (
                            <button
                              key={slot.id ?? slotKey(slot)}
                              type="button"
                              role="checkbox"
                              aria-checked={selected}
                              disabled={saving}
                              onClick={() => toggleSlot(slot)}
                              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-start text-sm font-semibold transition disabled:opacity-60 ${selected
                                  ? "border-one bg-one/10 text-one"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-one/40"
                                }`}
                            >
                              <span className="inline-flex items-center gap-2">
                                <Clock3 size={15} />
                                {formatPlanTime(slot.timeFrom)} –{" "}
                                {formatPlanTime(slot.timeTo)}
                              </span>
                              <span
                                className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected
                                    ? "border-one bg-one text-white"
                                    : "border-slate-300"
                                  }`}
                              >
                                {selected && <Check size={13} />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {staleCount > 0 && (
              <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {staleCount === 1
                  ? "1 time saved in this plan is no longer offered and will be removed when you save."
                  : `${staleCount} times saved in this plan are no longer offered and will be removed when you save.`}
              </p>
            )}
          </div>

          {validationError && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {validationError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl px-5 py-3 font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || slotsLoading || Boolean(slotsError) || noSlotsOffered}
              className="rounded-xl bg-one px-6 py-3 font-semibold text-white shadow-lg shadow-one/15 transition hover:bg-one/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : plan ? "Save changes" : "Submit plan"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default AvailabilityPlanForm;