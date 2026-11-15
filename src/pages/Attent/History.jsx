import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStudentData } from "@/context/StudentData";
import { fmtDay, fmtTime } from "@/lib/portal";
import Icon from "@/components/portal/Icon";
import { EmptyCard, Kpi, LiveStrip, Page, PageHead, StarRow, TeacherAvatar, TypeDot } from "@/components/portal/ui";
import SessionRatingModal from "./SessionRatingModal";

/** Ratings are stored 1–10; the design shows 5 stars. */
export const toStars = (r) => Math.round((Number(r?.overallRating) || 0) / 2 * 10) / 10;
const qStars = (v) => Math.round((Number(v) || 0) / 2 * 10) / 10;

/** A finished session can be rated unless it was cancelled or the student was marked absent
    (teachers don't always mark attendance, so "not marked" can still be rated — as before). */
const canRate = (s) => !s.cancelled && s.attendance !== "absent";

function Attendance({ s }) {
  if (s.cancelled) return <span className="text-xs font-semibold text-slate-400">Cancelled</span>;
  if (s.attendance === "present") return <span className="att yes">✓ Attended</span>;
  if (s.attendance === "absent") return <span className="att no">✕ Missed</span>;
  return <span className="text-xs font-semibold text-slate-400">Not marked</span>;
}

/** "My ratings" — every rating the student sent, with each question and comment (like the old Ratings view). */
function RatingCard({ r, onEdit }) {
  const stars = toStars(r);
  return (
    <article className="rp-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-slate-900">{r.sessionName || "Session"}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {r.sessionDate ? fmtDay(String(r.sessionDate).slice(0, 10)) : ""}{r.timeFrom ? ` · ${fmtTime(String(r.timeFrom).slice(0, 5))}` : ""}{r.teacherName ? ` · ${r.teacherName}` : ""}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center gap-2 justify-end">
            <span className="text-2xl font-extrabold text-slate-900">{stars.toFixed(1)}</span>
            <StarRow value={stars} />
          </div>
          <button className="text-xs font-semibold text-slate-400 hover:text-one mt-1" onClick={onEdit}>Edit rating</button>
        </div>
      </div>
      {r.generalComment && <p className="mt-3 text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">“{r.generalComment}”</p>}
      {r.questionRatings?.length > 0 && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {r.questionRatings.map((q) => (
            <div key={q.id} className="rounded-xl border border-slate-100 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800 min-w-0">{q.questionTitle}</p>
                <span className="flex items-center gap-1.5 shrink-0"><StarRow value={qStars(q.rating)} size={13} /><span className="text-xs font-bold text-slate-500">{q.rating}/10</span></span>
              </div>
              {q.category && <p className="text-[11px] text-slate-400">{q.category}</p>}
              {q.comment && <p className="text-xs text-slate-600 mt-1">💬 {q.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export default function History() {
  const { history, loading, ratingFor, ratings, reloadRatings, showToast } = useStudentData();
  const navigate = useNavigate();
  const [rating, setRating] = useState(null); // { id, topic }
  const [tab, setTab] = useState("sessions");
  const list = history || [];
  const attended = list.filter((s) => s.attendance === "present");
  const toRate = list.filter((s) => canRate(s) && !ratingFor(s.id)).length;
  const avg = ratings.length ? (ratings.reduce((a, r) => a + toStars(r), 0) / ratings.length).toFixed(1) : "—";
  const myRatings = useMemo(() => [...ratings].sort((a, b) => String(b.sessionDate || b.createdAt).localeCompare(String(a.sessionDate || a.createdAt))), [ratings]);

  return (
    <Page>
      <PageHead title="Attendance history" text="Your finished sessions. Rate each one — your teacher and MathPortal read every rating.">
        <button className="pl-btn" onClick={() => navigate("/user/upcoming")}>Upcoming sessions</button>
      </PageHead>
      <LiveStrip />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Kpi label="Sessions" value={list.length} sub="Finished" />
        <Kpi label="Attended" value={attended.length} sub={`${list.filter((s) => s.attendance === "absent").length} missed`} tone="green" />
        <Kpi label="To rate" value={toRate} sub={toRate ? "Waiting for your rating" : "All rated"} tone={toRate ? "amber" : "green"} />
        <Kpi label="Your average" value={avg} sub={`${ratings.length} rated`} />
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4 w-fit" role="tablist" aria-label="History">
        <button type="button" role="tab" aria-selected={tab === "sessions"} onClick={() => setTab("sessions")} className={`rp-seg ${tab === "sessions" ? "active" : ""}`}>Sessions</button>
        <button type="button" role="tab" aria-selected={tab === "ratings"} onClick={() => setTab("ratings")} className={`rp-seg ${tab === "ratings" ? "active" : ""}`}>My ratings ({ratings.length})</button>
      </div>

      {tab === "ratings" ? (
        myRatings.length
          ? <div className="space-y-3">{myRatings.map((r) => <RatingCard key={r.id} r={r} onEdit={() => setRating({ id: r.sessionId, topic: r.sessionName })} />)}</div>
          : <EmptyCard title="No ratings yet" text="Rate a finished session from the Sessions tab — your ratings and comments show up here." />
      ) : loading ? <div className="skel h-64"></div> : list.length ? (
        <section className="rp-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="rp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th style={{ minWidth: 200 }}>Session</th>
                  <th className="hidden xl:table-cell">Teacher</th>
                  <th>Attendance</th>
                  <th>Materials</th>
                  <th style={{ minWidth: 170 }}>Your rating</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => {
                  const r = ratingFor(s.id);
                  return (
                    <tr key={s.id}>
                      <td className="whitespace-nowrap"><p className="font-semibold text-slate-900">{fmtDay(s.iso)}</p><p className="text-xs text-slate-400">{fmtTime(s.start)}</p></td>
                      <td>
                        <button className="text-left" onClick={() => navigate(`/user/session/${s.id}`)}>
                          <p className="font-semibold text-slate-900 hover:text-one">{s.topic}</p>
                          <p className="text-xs text-slate-500"><TypeDot type={s.type} />{s.type}{s.course ? ` · ${s.course}` : ""}</p>
                        </button>
                      </td>
                      <td className="whitespace-nowrap hidden xl:table-cell"><div className="flex items-center gap-2"><TeacherAvatar name={s.teacher} /><span className="text-sm text-slate-700">{s.teacher}</span></div></td>
                      <td><Attendance s={s} /></td>
                      <td><button className="pl-btn" onClick={() => navigate(`/user/session/${s.id}`)}><Icon name="pdf" size={14} /><span className="hidden sm:inline"> Materials</span></button></td>
                      <td>
                        {r ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <StarRow value={toStars(r)} />
                              <span className="text-xs font-bold text-slate-500">{toStars(r).toFixed(1)}</span>
                              <button className="text-xs font-semibold text-slate-400 hover:text-one" onClick={() => setRating(s)}>Edit</button>
                            </div>
                            {r.generalComment && <p className="text-xs text-slate-500 mt-1 max-w-xs truncate">“{r.generalComment}”</p>}
                          </div>
                        ) : canRate(s)
                          ? <button className="pl-btn primary" onClick={() => setRating(s)}>★<span className="hidden sm:inline"> Rate session</span></button>
                          : <span className="text-xs text-slate-400">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <EmptyCard title="No finished sessions yet" text="Sessions you attend show up here, with their materials and your rating." />
      )}

      {rating && (
        <SessionRatingModal
          sessionId={rating.id}
          sessionName={rating.topic}
          onClose={() => setRating(null)}
          onRatingSuccess={() => { setRating(null); reloadRatings(); showToast("Thanks — your rating was sent"); }}
        />
      )}
    </Page>
  );
}
