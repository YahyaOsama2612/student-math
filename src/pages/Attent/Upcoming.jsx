import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/api";
import { useStudentData } from "@/context/StudentData";
import { CANCEL_WINDOW_MS, MON, WD, WD_LONG, dateOf, fmtDay, fmtTime, initials, isoOf, relDay, startsAt, todayISO, typeOf } from "@/lib/portal";
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

/** Joining opens this long before the start (same rule as the backend's join window). */
const JOIN_OPEN_BEFORE_MS = 15 * 60 * 1000;
const endsAt = (s) => (s.end ? new Date(`${s.iso}T${s.end}:00`) : new Date(startsAt(s).getTime() + 60 * 60 * 1000));

/** Re-render every `ms` so countdowns and the Join button stay current. */
function useNow(ms = 30000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const countdown = (ms) => {
  if (ms <= 0) return "now";
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d >= 1) return `${d} day${d === 1 ? "" : "s"}${h ? ` ${h} h` : ""}`;
  if (h >= 1) return `${h} h ${m % 60} min`;
  return `${m} min`;
};

const TeacherBadge = ({ name }) => (
  <span className="flex items-center gap-2 min-w-0">
    <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 text-xs font-extrabold flex items-center justify-center shrink-0">{initials(name)}</span>
    <span className="min-w-0">
      <span className="block text-sm font-bold text-slate-800 truncate">{name}</span>
      <span className="block text-[10px] text-slate-400">Teacher</span>
    </span>
  </span>
);

function JoinButton({ s, now, joining, onJoin, big = false }) {
  const opensAt = startsAt(s).getTime() - JOIN_OPEN_BEFORE_MS;
  const over = now > endsAt(s).getTime();
  const cls = big ? "pl-btn primary justify-center px-5 py-2.5 text-sm" : "btn-mini primary";
  if (!s.link) return <button className={big ? "pl-btn justify-center" : "btn-mini"} disabled style={{ opacity: 0.55 }} title="Your teacher adds the meeting link before the session">Link coming soon</button>;
  if (over) return <button className={big ? "pl-btn justify-center" : "btn-mini"} disabled style={{ opacity: 0.55 }}>Session ended</button>;
  if (now < opensAt) {
    return (
      <button className={big ? "pl-btn justify-center" : "btn-mini"} disabled style={{ opacity: 0.7 }} title="You can join 15 minutes before the start">
        Join opens {fmtTime(new Date(opensAt).toTimeString().slice(0, 5))}
      </button>
    );
  }
  return <button className={cls} onClick={() => onJoin(s)} disabled={joining === s.id}>{joining === s.id ? "Joining…" : "Join now"}</button>;
}

export default function Upcoming() {
  const { upcoming, loading, cancelRequestFor, showToast } = useStudentData();
  const navigate = useNavigate();
  const now = useNow();
  const [cancelling, setCancelling] = useState(null);
  const [joining, setJoining] = useState(null);
  const [range, setRange] = useState("all"); // all | week | today
  const [type, setType] = useState("all");

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

  const all = upcoming || [];
  const live = all.filter((s) => !s.cancelled);
  const next = live.find((s) => endsAt(s).getTime() >= now) || null;
  const weekEnd = isoOf(new Date(now + 6 * 86400000));
  const today = todayISO();
  const types = [...new Set(all.map((s) => s.type))];

  const shown = all.filter((s) =>
    (range === "all" || (range === "today" ? s.iso === today : s.iso <= weekEnd)) && (type === "all" || s.type === type));
  const groups = [];
  shown.forEach((s) => {
    const g = groups[groups.length - 1];
    if (g && g.iso === s.iso) g.items.push(s);
    else groups.push({ iso: s.iso, items: [s] });
  });

  const pendingCancels = all.filter((s) => cancelRequestFor(s.id)?.status === "pending").length;
  const thisWeek = live.filter((s) => s.iso <= weekEnd).length;

  const chip = (on, label, onClick, n) => (
    <button key={label} onClick={onClick} className={`px-3.5 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap ${on ? "bg-one text-white border-one" : "bg-white text-slate-600 border-slate-200 hover:border-one hover:text-one"}`}>
      {label}{n != null && <span className={on ? "text-white/70" : "text-slate-400"}> {n}</span>}
    </button>
  );

  return (
    <Page>
      <PageHead title="Upcoming sessions" text="Your booked live sessions. Join from here when it starts — you can ask to cancel up to 24 hours before.">
        <button className="btn-ghost" onClick={() => navigate("/user/availability-plans")}>My study plans</button>
      </PageHead>
      <LiveStrip />

      {loading ? (
        <div className="space-y-3"><div className="skel h-40 rounded-2xl"></div>{[1, 2, 3].map((i) => <div key={i} className="skel h-24 rounded-2xl"></div>)}</div>
      ) : !all.length ? (
        <EmptyCard
          title="No upcoming sessions yet"
          text="Approve your study plan and its sessions show up here."
          action={<button onClick={() => navigate("/user/availability-plans")} className="btn-primary" style={{ width: "auto", margin: "0 auto" }}>Go to my plan</button>}
        />
      ) : (
        <>
          {/* Next session */}
          {next && (() => {
            const t = typeOf(next.type);
            const startMs = startsAt(next).getTime();
            const isLive = now >= startMs && now <= endsAt(next).getTime();
            return (
              <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 sm:p-6 mb-5">
                <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: t.color }}></div>
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 pl-2">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl text-white flex flex-col items-center justify-center shrink-0 shadow-sm" style={{ background: t.color }}>
                      <span className="text-[10px] sm:text-xs font-bold uppercase opacity-90">{WD[dateOf(next.iso).getDay()]}</span>
                      <span className="text-2xl sm:text-3xl font-extrabold leading-none">{dateOf(next.iso).getDate()}</span>
                      <span className="text-[10px] sm:text-xs font-bold uppercase opacity-90">{MON[dateOf(next.iso).getMonth()]}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: t.color }}>
                        {isLive ? "● Live now" : `Next session · in ${countdown(startMs - now)}`}
                      </p>
                      <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug break-words">{next.topic}</h2>
                      <p className="text-sm text-slate-500 truncate">{next.sub}{next.course && <> · <span className="text-one font-semibold">{next.course}</span></>}</p>
                      <p className="text-sm font-bold text-slate-700 mt-0.5">{relDay(next.iso)} · {next.time}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2 sm:items-center lg:items-stretch lg:w-52 shrink-0">
                    <TeacherBadge name={next.teacher} />
                    <JoinButton s={next} now={now} joining={joining} onJoin={join} big />
                  </div>
                </div>
              </section>
            );
          })()}

          {/* quick numbers */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
            {[["Upcoming", live.length, ""], ["Next 7 days", thisWeek, ""], ["Cancel requests", pendingCancels, pendingCancels ? "text-amber-700" : ""]].map(([l, v, tone]) => (
              <div key={l} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center">
                <p className={`text-xl sm:text-2xl font-extrabold tabular-nums ${tone || "text-slate-900"}`}>{v}</p>
                <p className="text-[11px] font-semibold text-slate-500">{l}</p>
              </div>
            ))}
          </div>

          {/* filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {chip(range === "all", "All", () => setRange("all"), all.length)}
            {chip(range === "week", "Next 7 days", () => setRange("week"))}
            {chip(range === "today", "Today", () => setRange("today"))}
            {types.length > 1 && <span className="w-px h-5 bg-slate-200 mx-1 hidden sm:block"></span>}
            {types.length > 1 && chip(type === "all", "All types", () => setType("all"))}
            {types.length > 1 && types.map((k) => chip(type === k, typeOf(k).label, () => setType(k)))}
          </div>

          {groups.length === 0 ? (
            <section className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
              <p className="font-extrabold text-slate-900">Nothing in this filter</p>
              <p className="text-sm text-slate-500">Try “All”.</p>
            </section>
          ) : groups.map((g) => {
            const d = dateOf(g.iso);
            return (
              <div key={g.iso} className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-extrabold text-slate-900">{relDay(g.iso) === fmtDay(g.iso) ? `${WD_LONG[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}` : `${relDay(g.iso)} · ${WD_LONG[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`}</span>
                  <span className="flex-grow h-px bg-slate-200"></span>
                  <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">{g.items.length} session{g.items.length > 1 ? "s" : ""}</span>
                </div>
                <div className="flex flex-col gap-3">
                  {g.items.map((s) => {
                    const t = typeOf(s.type);
                    const c = cancelRequestFor(s.id);
                    return (
                      <article key={s.id} className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-md ${s.cancelled ? "opacity-70" : ""}`}>
                        <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: s.cancelled ? "#cbd5e1" : t.color }}></div>
                        <div className="grid grid-cols-1 md:grid-cols-[9.5rem_minmax(0,1fr)_11rem_10rem] gap-3 md:gap-4 md:items-center p-4 pl-5">
                          {/* time */}
                          <div className="flex md:flex-col items-center md:items-start gap-2 md:gap-1">
                            <span className="text-sm font-extrabold text-slate-900 whitespace-nowrap">{fmtTime(s.start)}</span>
                            <span className="text-xs text-slate-400 whitespace-nowrap">to {fmtTime(s.end)}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md ml-auto md:ml-0" style={{ color: t.color, background: t.bg }}>{t.label}</span>
                          </div>
                          {/* what */}
                          <div className="min-w-0">
                            <h3 className={`font-bold leading-snug ${s.cancelled ? "text-slate-400 line-through" : "text-slate-900"}`}>{s.topic}</h3>
                            <p className="text-xs text-slate-500 truncate">{s.sub}{s.course && <> · <span className="text-one font-semibold">{s.course}</span></>}</p>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {s.cancelled && <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-700">Cancelled{s.cancelReason ? `: ${s.cancelReason}` : ""}</span>}
                              {!s.cancelled && s.link && <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-green-50 text-green-700">Link ready</span>}
                              {c?.status === "pending" && <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">Cancel requested</span>}
                              {c?.status === "rejected" && <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-700">Cancel declined{c.adminReply ? `: ${c.adminReply}` : ""}</span>}
                            </div>
                          </div>
                          {/* who */}
                          <TeacherBadge name={s.teacher} />
                          {/* actions */}
                          <div className="flex flex-row md:flex-col gap-1.5 [&>*]:flex-1 md:[&>*]:flex-none">
                            {s.cancelled ? <span className="text-xs font-bold text-slate-400 md:text-right">No action needed</span> : (
                              <>
                                <JoinButton s={s} now={now} joining={joining} onJoin={join} />
                                <CancelButton s={s} onAsk={() => setCancelling(s)} />
                              </>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}
      {cancelling && <CancelModal s={cancelling} onClose={() => setCancelling(null)} />}
    </Page>
  );
}
