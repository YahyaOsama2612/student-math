import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, X } from "lucide-react";
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

// Shape sent to the plan API (dayOfWeek / timeFrom / timeTo).
// If your backend expects slot ids instead, change it here only.
const buildSlotPayload = (slot) => ({
  dayOfWeek: slot.dayOfWeek,
  timeFrom: `${toHM(slot.timeFrom)}:00`,
  timeTo: `${toHM(slot.timeTo)}:00`,
});

const defaultTitle = () =>
  `My free times — ${new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;

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
      if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError")
        return;
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
    setTitle(plan?.title || defaultTitle());
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
  const staleCount =
    slotsLoading || slotsError
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
      setValidationError("Enter a title for your time slots.");
      return;
    }
    // Only submit times the admin still offers.
    const chosen = availableSlots.filter((slot) =>
      selectedKeys.includes(slotKey(slot)),
    );
    if (!chosen.length) {
      setValidationError("Pick at least one free time first.");
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

  // Banner like the design: explains what happens when they save.
  const banner =
    plan?.status === "accepted" || plan?.status === "pending_student_response"
      ? {
        className: "border-amber-200 bg-amber-50 text-amber-800",
        text: "These times were already reviewed by the admin. Changing them sends the new times for approval again.",
      }
      : plan?.status === "rejected"
        ? {
          className: "border-red-200 bg-red-50 text-red-700",
          text: "Update your times and send them again — the admin will build a new plan.",
        }
        : {
          className: "border-slate-200 bg-slate-50 text-slate-600",
          text: "Pick your free times and send them to the admin. Your study plan is built from these slots.",
        };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-3 sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="availability-form-title"
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 md:px-6">
          <div>
            <h2
              id="availability-form-title"
              className="font-bold text-gray-900"
            >
              My free times (availability)
            </h2>
            <p className="text-xs text-gray-400">
              {validSelectedCount}{" "}
              {validSelectedCount === 1 ? "slot" : "slots"} selected
              {plan?.id && (
                <span className="font-bold text-amber-600">
                  {" "}
                  · editing a saved plan
                </span>
              )}
            </p>
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

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 md:px-6">
          <div className={`rounded-xl border px-4 py-3 text-sm ${banner.className}`}>
            {banner.text}
          </div>

          {staleCount > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {staleCount === 1
                ? "1 of your times is no longer offered and will be removed when you save. Pick a new one."
                : `${staleCount} of your times are no longer offered and will be removed when you save. Pick new ones.`}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">
                Title
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                maxLength={160}
                placeholder="e.g. My availability for next week"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-one focus:ring-2 focus:ring-one/10"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">
                Notes <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={500}
                placeholder="e.g. I prefer evenings on school days"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-one focus:ring-2 focus:ring-one/10"
              />
            </label>
          </div>

          <p className="text-xs text-slate-400">
            Times offered by the academy. Pick every slot you can attend.
          </p>

          {slotsLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {DAYS.slice(0, 4).map((day) => (
                <div
                  key={day}
                  className="h-36 animate-pulse rounded-xl border border-slate-200 bg-slate-50"
                />
              ))}
            </div>
          ) : slotsError ? (
            <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-center">
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
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center text-sm text-slate-500">
              No times are offered right now. Please check back later.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {DAYS.map((day) => {
                const daySlots = slotsByDay[day] || [];

                if (!daySlots.length) {
                  return (
                    <div
                      key={day}
                      className="rounded-xl border border-dashed border-slate-200 bg-white p-4"
                    >
                      <p className="mb-1 text-sm font-bold text-slate-400">
                        {day}
                      </p>
                      <p className="text-xs text-slate-400">
                        No sessions offered on this day.
                      </p>
                    </div>
                  );
                }

                const count = daySlots.filter((slot) =>
                  selectedKeys.includes(slotKey(slot)),
                ).length;

                return (
                  <div
                    key={day}
                    className={`rounded-xl border p-4 transition ${count
                        ? "border-red-200 bg-red-50/30"
                        : "border-slate-200 bg-slate-50"
                      }`}
                  >
                    <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-2">
                      <p className="text-sm font-bold text-gray-800">{day}</p>
                      <span className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-400">
                          {count
                            ? `${count}/${daySlots.length}`
                            : `${daySlots.length} offered`}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleDay(day)}
                          disabled={saving}
                          className="text-[11px] font-bold text-one hover:underline disabled:opacity-50"
                        >
                          {count === daySlots.length ? "None" : "All"}
                        </button>
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {daySlots.map((slot) => (
                        <label
                          key={slot.id ?? slotKey(slot)}
                          className="flex cursor-pointer items-center gap-2 py-0.5 text-[13px] text-gray-700"
                        >
                          <input
                            type="checkbox"
                            checked={selectedKeys.includes(slotKey(slot))}
                            onChange={() => toggleSlot(slot)}
                            disabled={saving}
                            className="h-4 w-4 cursor-pointer rounded accent-one"
                          />
                          {formatPlanTime(slot.timeFrom)} –{" "}
                          {formatPlanTime(slot.timeTo)}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {validationError && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {validationError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <p className="text-xs text-slate-400">
            The admin reviews your times, then sends you a study plan to approve.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200/60 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                saving || slotsLoading || Boolean(slotsError) || noSlotsOffered
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              {saving ? "Sending..." : "Save & send to admin"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AvailabilityPlanForm;