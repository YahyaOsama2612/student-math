import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/api";
import { useStudentData } from "@/context/StudentData";
import { CANCEL_WINDOW_MS, MON, WD_LONG, dateOf, fmtDay, startsAt, typeOf } from "@/lib/portal";
import { EmptyCard, LiveStrip, Modal, Page, PageHead } from "@/components/portal/ui";

const fmtLeft = (ms) => {
  const h = Math.floor(ms / 3600000);
  const d = Math.floor(h / 24);
  return d >= 1 ? `${d} day${d === 1 ? "" : "s"} ${h % 24} h` : `${h} h ${Math.floor((ms % 3600000) / 60000)} min`;
};

function CancelModal({ s, onClose }) {
  const { requestCancel, showToast } = useStudentData();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const left = startsAt(s) - Date.now() - CANCEL_WINDOW_MS;

  const send = async () => {
    if (reason.trim().length < 5) { setError("Write a short reason (at least 5 characters)"); return; }
    setSending(true);
    try {
      await requestCancel(s.id, reason.trim());
      showToast("Request sent — the admin will reply");
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not send the request");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      wide
      title="Ask to cancel this session"
      onClose={onClose}
      actions={<>
        <button className="pl-btn" onClick={onClose}>Keep the session</button>
        <button className="pl-btn primary" onClick={send} disabled={sending}>{sending ? "Sending…" : "Send request"}</button>
      </>}
    >
      <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 mb-3">
        <p className="font-bold text-slate-900">{s.topic}</p>
        <p className="text-xs text-slate-500">{fmtDay(s.iso)} · {s.time} · {s.teacher}</p>
      </div>
      <p className="text-xs text-slate-500 mb-3">You can ask until <b>24 hours before</b> it starts — <b>{fmtLeft(Math.max(0, left))}</b> left. The admin approves or declines it.</p>
      <label className="text-xs font-bold" htmlFor="cx-reason">Reason <span className="text-red-500">*</span></label>
      <textarea id="cx-reason" rows={3} autoFocus className="input mt-1" placeholder="e.g. School exam that day" value={reason} onChange={(e) => { setReason(e.target.value); setError(""); }}></textarea>
      {error && <p className="text-sm font-semibold text-red-600 mt-2">{error}</p>}
    </Modal>
  );
}

function CancelButton({ s, onAsk }) {
  const { cancelRequestFor } = useStudentData();
  const c = cancelRequestFor(s.id);
  if (c?.status === "pending") return <span className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap text-center" title="Waiting for the admin">Cancel requested</span>;
  const left = startsAt(s) - Date.now();
  if (left < CANCEL_WINDOW_MS) return <button className="btn-mini" disabled style={{ opacity: 0.45 }} title="Cancelling closes 24 hours before the session">Cancel closed</button>;
  return <button className="btn-mini" onClick={onAsk} title={`You can ask to cancel until 24 hours before — ${fmtLeft(left - CANCEL_WINDOW_MS)} left`}>Request cancel</button>;
}

export default function Upcoming() {
  const { upcoming, loading, cancelRequestFor, showToast } = useStudentData();
  const navigate = useNavigate();
  const [cancelling, setCancelling] = useState(null);
  const [joining, setJoining] = useState(null);

  const join = async (s) => {
    setJoining(s.id);
    try {
      const res = await api.post(`/api/user/sessions/${s.id}/join`, {});
      const link = res?.data?.data?.sessionLink || s.link;
      if (link) window.open(link, "_blank", "noopener");
    } catch (err) {
      showToast(err?.response?.data?.error?.message || "Could not join the session");
    } finally {
      setJoining(null);
    }
  };

  const groups = [];
  upcoming.forEach((s) => {
    const g = groups[groups.length - 1];
    if (g && g.iso === s.iso) g.items.push(s);
    else groups.push({ iso: s.iso, items: [s] });
  });

  return (
    <Page>
      <PageHead title="Upcoming sessions" text="Your booked sessions. Meeting links appear once your teacher adds them. You can ask to cancel up to 24 hours before a session.">
        <button className="btn-ghost" onClick={() => navigate("/user/availability-plans")}>My study plans</button>
      </PageHead>
      <LiveStrip />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skel h-20"></div>)}</div>
      ) : groups.length ? groups.map((g) => {
        const d = dateOf(g.iso);
        return (
          <div key={g.iso} className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-extrabold text-gray-900">{WD_LONG[d.getDay()]}, {MON[d.getMonth()]} {d.getDate()}</span>
              <span className="flex-grow h-px bg-slate-200"></span>
              <span className="text-xs font-semibold text-slate-400">{g.items.length} session{g.items.length > 1 ? "s" : ""}</span>
            </div>
            <div className="flex flex-col gap-3">
              {g.items.map((s) => {
                const t = typeOf(s.type);
                const c = cancelRequestFor(s.id);
                return (
                  <div key={s.id} className={`bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 relative overflow-hidden ${s.cancelled ? "opacity-70" : ""}`}>
                    <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: s.cancelled ? "#cbd5e1" : t.color }}></div>
                    <div className="pl-2 md:w-44 shrink-0">
                      <p className="text-xs font-bold text-gray-500">{s.time}</p>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ color: t.color, background: t.bg }}>{t.label}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-bold ${s.cancelled ? "text-gray-400 line-through" : "text-gray-900"}`}>{s.topic}</h4>
                      <p className="text-xs text-gray-500">{s.sub}{s.course && <> · <span className="text-one font-semibold">{s.course}</span></>}</p>
                      {s.cancelled && <p className="text-xs font-semibold text-red-600 mt-1">Cancelled{s.cancelReason ? `: ${s.cancelReason}` : ""}</p>}
                      {c?.status === "rejected" && <p className="text-[11px] text-red-600 font-semibold mt-1">Cancel declined{c.adminReply ? `: ${c.adminReply}` : ""}</p>}
                    </div>
                    <div className="md:text-right md:w-36">
                      <p className="text-sm font-bold text-gray-900">{s.teacher}</p>
                      <p className="text-[10px] text-gray-400">Teacher</p>
                    </div>
                    <div className="flex flex-wrap md:flex-col gap-1.5 md:w-36 shrink-0">
                      {s.cancelled ? <span className="text-xs font-bold text-slate-400">No action needed</span> : (
                        <>
                          {s.link
                            ? <button className="btn-mini primary" onClick={() => join(s)} disabled={joining === s.id}>{joining === s.id ? "Joining…" : "Join session"}</button>
                            : <button className="btn-mini" disabled style={{ opacity: 0.55 }} title="The teacher adds the meeting link before the session">Join (link soon)</button>}
                          <CancelButton s={s} onAsk={() => setCancelling(s)} />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }) : (
        <EmptyCard
          title="No upcoming sessions yet"
          text="Approve your study plan and its sessions show up here."
          action={<button onClick={() => navigate("/user/availability-plans")} className="btn-primary" style={{ width: "auto", margin: "0 auto" }}>Go to my plan</button>}
        />
      )}
      {cancelling && <CancelModal s={cancelling} onClose={() => setCancelling(null)} />}
    </Page>
  );
}
