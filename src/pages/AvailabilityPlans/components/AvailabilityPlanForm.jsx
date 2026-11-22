import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/api/api";
import Icon from "@/components/portal/Icon";
import { WEEK as DAYS, formatPlanTime } from "./AvailabilityPlanCard";

const SLOTS_URL = "/api/user/availability-plans/slots";

// API may return "03:00" or "03:00:00" – normalise to "HH:mm".
const toHM = (value) => {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "";
};

// Identifies a slot by what it is (not by id), so a student's previously saved
// plan slots can be matched against the admin's current slots.
const slotKey = (slot) => `${slot.dayOfWeek}|${toHM(slot.timeFrom)}|${toHM(slot.timeTo)}`;

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
// slotId links the choice to the admin's time slot (only those can be picked)
const buildSlotPayload = (slot) => ({
  ...(slot.id ? { slotId: slot.id } : {}),
  dayOfWeek: slot.dayOfWeek,
  timeFrom: `${toHM(slot.timeFrom)}:00`,
  timeTo: `${toHM(slot.timeTo)}:00`,
});

const defaultTitle = () =>
  `My free times — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

/** Design: slotsTabHtml — days × admin-defined slots, toggle a whole day, send to the admin. */
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
    setTitle(plan?.title || defaultTitle());
    setNotes(plan?.notes || "");
    setSelectedKeys((plan?.slots || []).map(slotKey));
    setValidationError("");
  }, [plan]);

  /* ---------------- Close on Escape ---------------- */

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && !saving && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  /* ---------------- Derived data ---------------- */

  const slotsByDay = useMemo(() => {
    const map = Object.fromEntries(DAYS.map((day) => [day, []]));
    availableSlots.forEach((slot) => {
      (map[slot.dayOfWeek] ||= []).push(slot);
    });
    return map;
  }, [availableSlots]);

  const availableKeys = useMemo(() => new Set(availableSlots.map(slotKey)), [availableSlots]);

  // Times saved in the plan that the admin no longer offers.
  const staleCount =
    slotsLoading || slotsError ? 0 : selectedKeys.filter((key) => !availableKeys.has(key)).length;

  const validSelectedCount = selectedKeys.filter((key) => availableKeys.has(key)).length;

  /* ---------------- Actions ---------------- */

  const toggleSlot = (slot) => {
    const key = slotKey(slot);
    setSelectedKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
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
    const chosen = availableSlots.filter((slot) => selectedKeys.includes(slotKey(slot)));
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

  const noSlotsOffered = !slotsLoading && !slotsError && availableSlots.length === 0;
  const canSend = !(saving || slotsLoading || Boolean(slotsError) || noSlotsOffered);

  // Banner (design: slotsTabHtml banner per status).
  const banner =
    plan?.status === "accepted" || plan?.status === "pending_student_response"
      ? [
          "bg-amber-50 border-amber-200 text-amber-800",
          "These times were already reviewed by the admin. Changing them sends the new times for approval again.",
        ]
      : plan?.status === "rejected"
        ? [
            "bg-red-50 border-red-200 text-red-700",
            "Update your times and send them again — the admin will build a new plan.",
          ]
        : plan?.status === "pending_admin_review"
          ? [
              "bg-amber-50 border-amber-200 text-amber-800",
              "These times are waiting for the admin. Saving replaces them with your new picks.",
            ]
          : [
              "bg-slate-50 border-slate-200 text-slate-600",
              "Pick your free times and send them to the admin. Your study plan is built from these slots.",
            ];

  return (
    <div
      className="modal-bg fade-in"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="availability-form-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 md:px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="min-w-0">
            <h3 id="availability-form-title" className="font-bold text-gray-900">
              My free times (availability)
            </h3>
            <p className="text-xs text-gray-400">
              {validSelectedCount} slot{validSelectedCount === 1 ? "" : "s"} selected
              {plan?.id && <span className="text-amber-600 font-bold"> · editing a saved plan</span>}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            disabled={saving}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 md:px-6 py-5">
          <div className={`rounded-xl border px-4 py-3 mb-3 text-sm ${banner[0]}`}>{banner[1]}</div>

          {staleCount > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-3 text-sm text-amber-800">
              {staleCount === 1
                ? "1 of your times is no longer offered and will be removed when you save. Pick a new one."
                : `${staleCount} of your times are no longer offered and will be removed when you save. Pick new ones.`}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2 mb-4">
            <label className="block">
              <span className="text-xs font-bold text-slate-700">Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                maxLength={160}
                placeholder="e.g. My availability for next week"
                className="input mt-1"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-700">
                Notes <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={500}
                placeholder="e.g. I prefer evenings on school days"
                className="input mt-1"
              />
            </label>
          </div>

          <p className="text-xs text-slate-400 mb-4">Times offered by the academy. Pick every slot you can attend.</p>

          {slotsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {DAYS.slice(0, 4).map((day) => (
                <div key={day} className="skel h-36"></div>
              ))}
            </div>
          ) : slotsError ? (
            <div className="rp-card text-center">
              <p className="text-sm font-semibold text-red-600">{slotsError}</p>
              <button type="button" onClick={() => loadSlots()} className="pl-btn mt-3">
                Try again
              </button>
            </div>
          ) : noSlotsOffered ? (
            <div className="border border-dashed border-slate-200 rounded-xl p-8 bg-white text-center text-sm text-slate-500">
              No times are offered right now. Please check back later.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {DAYS.map((day) => {
                const daySlots = slotsByDay[day] || [];

                if (!daySlots.length) {
                  return (
                    <div key={day} className="border border-dashed border-slate-200 rounded-xl p-4 bg-white">
                      <p className="font-bold text-sm text-slate-400 mb-1">{day}</p>
                      <p className="text-xs text-slate-400">No sessions offered on this day.</p>
                    </div>
                  );
                }

                const count = daySlots.filter((slot) => selectedKeys.includes(slotKey(slot))).length;

                return (
                  <div
                    key={day}
                    className={`border ${count ? "border-red-200 bg-red-50/30" : "border-slate-200 bg-slate-50"} rounded-xl p-4`}
                  >
                    <p className="font-bold text-sm text-gray-800 mb-2 pb-2 border-b border-slate-200 flex justify-between items-center">
                      {day}
                      <span className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-semibold">
                          {count ? `${count}/${daySlots.length}` : `${daySlots.length} offered`}
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
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {daySlots.map((slot) => (
                        <label
                          key={slot.id ?? slotKey(slot)}
                          className="flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer py-0.5"
                        >
                          <input
                            type="checkbox"
                            checked={selectedKeys.includes(slotKey(slot))}
                            onChange={() => toggleSlot(slot)}
                            disabled={saving}
                            className="w-4 h-4 rounded accent-[#7d0a0a] cursor-pointer"
                          />
                          {formatPlanTime(slot.timeFrom)} - {formatPlanTime(slot.timeTo)}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {validationError && (
            <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {validationError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-5 md:px-6 py-4 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-400">The admin reviews your times, then sends you a study plan to approve.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="pl-btn disabled:opacity-60">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSend}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                canSend ? "bg-gray-900 hover:bg-black text-white" : "bg-slate-100 text-slate-400 cursor-default"
              }`}
            >
              {saving ? "Sending…" : "Save & send to admin"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AvailabilityPlanForm;
