import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

const DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

const emptySlot = () => ({
  dayOfWeek: "Saturday",
  timeFrom: "",
  timeTo: "",
});

const AvailabilityPlanForm = ({ plan, saving, onClose, onSubmit }) => {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState([emptySlot()]);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    setTitle(plan?.title || "");
    setNotes(plan?.notes || "");
    setSlots(
      plan?.slots?.length
        ? plan.slots.map((slot) => ({
            dayOfWeek: slot.dayOfWeek || "Saturday",
            timeFrom: slot.timeFrom?.slice(0, 5) || "",
            timeTo: slot.timeTo?.slice(0, 5) || "",
          }))
        : [emptySlot()],
    );
    setValidationError("");
  }, [plan]);

  const updateSlot = (index, field, value) => {
    setSlots((currentSlots) =>
      currentSlots.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [field]: value } : slot,
      ),
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const hasInvalidSlot = slots.some(
      (slot) =>
        !slot.dayOfWeek ||
        !slot.timeFrom ||
        !slot.timeTo ||
        slot.timeFrom >= slot.timeTo,
    );

    if (!title.trim()) {
      setValidationError("Enter a title for your availability plan.");
      return;
    }
    if (!slots.length || hasInvalidSlot) {
      setValidationError("Add valid time ranges. The end time must be later than the start time.");
      return;
    }

    onSubmit({
      title: title.trim(),
      notes: notes.trim(),
      slots: slots.map((slot) => ({
        dayOfWeek: slot.dayOfWeek,
        timeFrom: `${slot.timeFrom}:00`,
        timeTo: `${slot.timeTo}:00`,
      })),
    });
  };

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
                  Add the days and time ranges when you are free.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSlots((currentSlots) => [...currentSlots, emptySlot()])}
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-one/20 px-3 py-2 text-sm font-semibold text-one hover:bg-one/5"
              >
                <Plus size={16} />
                Add time
              </button>
            </div>

            <div className="space-y-3">
              {slots.map((slot, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-end"
                >
                  <label>
                    <span className="mb-1.5 block text-xs font-semibold text-slate-500">
                      Day
                    </span>
                    <select
                      value={slot.dayOfWeek}
                      onChange={(event) =>
                        updateSlot(index, "dayOfWeek", event.target.value)
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-one"
                    >
                      {DAYS.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs font-semibold text-slate-500">
                      From
                    </span>
                    <input
                      type="time"
                      value={slot.timeFrom}
                      onChange={(event) =>
                        updateSlot(index, "timeFrom", event.target.value)
                      }
                      required
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-one"
                    />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs font-semibold text-slate-500">
                      To
                    </span>
                    <input
                      type="time"
                      value={slot.timeTo}
                      onChange={(event) =>
                        updateSlot(index, "timeTo", event.target.value)
                      }
                      required
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-one"
                    />
                  </label>
                  <button
                    type="button"
                    aria-label={`Remove time ${index + 1}`}
                    disabled={slots.length === 1}
                    onClick={() =>
                      setSlots((currentSlots) =>
                        currentSlots.filter((_, slotIndex) => slotIndex !== index),
                      )
                    }
                    className="justify-self-end rounded-lg p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 sm:mb-0"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
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
              disabled={saving}
              className="rounded-xl bg-one px-6 py-3 font-semibold text-white shadow-lg shadow-one/15 transition hover:bg-one/90 disabled:cursor-wait disabled:opacity-60"
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
