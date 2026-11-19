import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/api";
import useGet from "@/hooks/useGet";
import Icon from "@/components/portal/Icon";
import { EmptyCard, Modal, Page, PageHead } from "@/components/portal/ui";
import ActiveExam from "./ActiveExam";

/* Exams | Diagnose (MathPortal design). One page for both kinds; the URL decides which tab is open:
   /user/exams → official papers, /user/diagnostic → diagnostic trials. */

const BLOCKED_KEY = "diagnosticBlockedExams";
const errText = (err) => err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || "";
const scoreTone = (pct) => (pct >= 75 ? "green" : pct >= 50 ? "amber" : "red");

function readBlocked() {
  try { return JSON.parse(localStorage.getItem(BLOCKED_KEY) || "{}"); } catch { return {}; }
}

export default function Exams({ kind = "exam" }) {
  const navigate = useNavigate();
  const isD = kind === "diagnostic";
  const { data: examData, loading: examLoading, error: examError } = useGet(isD ? null : "/api/user/exams");
  const { data: diagData, loading: diagLoading } = useGet(isD ? "/api/user/diagnostic-exams" : null);
  const { data: reportData } = useGet(isD ? "/api/user/reports/diagnostic-exam" : "/api/user/reports/exams");
  const [family, setFamily] = useState("all");
  const [confirm, setConfirm] = useState(null);
  const [notice, setNotice] = useState(null);
  const [starting, setStarting] = useState(false);
  const [activeExam, setActiveExam] = useState(null);
  const [blocked, setBlocked] = useState(readBlocked);

  useEffect(() => { try { localStorage.setItem(BLOCKED_KEY, JSON.stringify(blocked)); } catch { /* private mode */ } }, [blocked]);
  useEffect(() => { setFamily("all"); }, [kind]);

  /** Every paper as { id, name, description, family, minutes, questions, done } */
  const papers = useMemo(() => {
    if (isD) {
      return (diagData?.data?.data || []).flatMap((c) => (c.diagnosticExams || []).map((e) => ({
        id: e.id, name: e.name, description: e.description, family: c.name, minutes: e.duration, questions: e.numberOfQuestions, done: !!e.isCompleted, raw: e,
      })));
    }
    return (examData?.data?.courses || []).flatMap((c) => (c.exams || []).map((e) => ({
      id: e.id, name: e.title, description: e.description, family: e.codeName || c.name || "Exams", minutes: e.duration,
      // the server knows if it was taken (attempt) and if an admin assigned it (free, no balance needed)
      done: !!(e.attempt && e.attempt.status !== "in_progress"), assigned: !!e.assigned, raw: e,
    })));
  }, [isD, examData, diagData]);

  /** Latest result per paper from the reports API. */
  const results = useMemo(() => {
    const list = reportData?.data?.data || reportData?.data || [];
    const map = new Map();
    (Array.isArray(list) ? list : []).forEach((r) => {
      const id = r.examId || r.diagnosticExamId;
      // the reports list every exam; only ones with an attempt and a score were taken
      if (id && r.attemptId && r.score != null && !map.has(id)) map.set(id, r);
    });
    return map;
  }, [reportData]);

  const families = [...new Set(papers.map((p) => p.family))];
  const list = papers.filter((p) => family === "all" || p.family === family);
  const loading = isD ? diagLoading : examLoading;

  const start = async (p) => {
    setStarting(true);
    try {
      const res = await api.post(isD ? `/api/user/diagnostic-exams/${p.id}/start` : `/api/user/exams/${p.id}/start`, {});
      const attemptId = res?.data?.data?.attemptId;
      setConfirm(null);
      if (isD) navigate(`/user/activeexam/${p.id}`, { state: { exam: p.minutes, attemptId } });
      else setActiveExam({ ...p.raw, attemptId });
    } catch (err) {
      const msg = errText(err);
      setConfirm(null);
      if (isD && msg.includes("already been submitted")) {
        setBlocked((b) => ({ ...b, [p.id]: true }));
        setNotice({ title: "Attempt already submitted", text: "This exam attempt has already been submitted. Ask the admin if you’d like it reopened." });
      } else if (/balance/i.test(msg)) {
        setNotice({ title: "No exam balance left", text: msg || "Buy an exam package to take this exam.", store: true });
      } else {
        setNotice({ title: "Could not start the exam", text: msg || "Please try again." });
      }
    } finally {
      setStarting(false);
    }
  };

  if (activeExam) return <ActiveExam exam={activeExam} onExit={() => setActiveExam(null)} />;

  const chip = (k, l) => (
    <button key={k} onClick={() => setFamily(k)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold border ${family === k ? "bg-one text-white border-one" : "bg-white text-slate-600 border-slate-200 hover:border-one hover:text-one"}`}>{l}</button>
  );

  return (
    <Page wide>
      <div className="max-w-6xl mx-auto">
        <PageHead title={isD ? "Diagnose" : "Exams"} text={isD ? "Trial exams that find your level — timed like the real test." : "Past official papers, taken section by section like the real test."}>
          <button className="btn-ghost" onClick={() => navigate(isD ? "/user/reports/diagnostic-exam" : "/user/reports/exams")}>My results</button>
        </PageHead>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5 w-fit">
          {[["exam", "Exams", "/user/exams"], ["diagnostic", "Diagnose", "/user/diagnostic"]].map(([k, l, to]) => (
            <button key={k} onClick={() => navigate(to)} className={`px-4 py-2 rounded-lg text-sm font-bold ${kind === k ? "bg-white text-one shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{l}</button>
          ))}
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 mb-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex gap-3">
            <span className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center font-extrabold shrink-0">✓</span>
            <div><p className="font-bold text-slate-900">One try per {isD ? "trial" : "exam"}</p><p className="text-sm text-slate-500">{isD ? "Each diagnostic exam is taken once. Need another try? Ask the admin." : "Each exam uses one exam from your package balance."}</p></div>
          </div>
          <div className="flex gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-50 text-one flex items-center justify-center shrink-0"><Icon name="lock" size={18} /></span>
            <div className="min-w-0">
              <p className="font-bold text-slate-900">See your mistakes</p>
              <p className="text-sm text-slate-500">After an exam, review the questions you missed with the right answers and the lessons to recap.</p>
              <button className="text-xs font-bold text-one hover:underline mt-1" onClick={() => navigate("/user/payment")}>Get exam packages →</button>
            </div>
          </div>
        </section>

        {families.length > 1 && <div className="flex flex-wrap gap-2 mb-4">{chip("all", isD ? "All trials" : "All exams")}{families.map((f) => chip(f, f))}</div>}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{[1, 2, 3].map((i) => <div key={i} className="skel h-48"></div>)}</div>
        ) : list.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {list.map((p) => {
              const r = results.get(p.id);
              const taken = p.done || !!r || blocked[p.id];
              const pct = r && r.totalScore ? Math.round((r.score / r.totalScore) * 100) : null;
              return (
                <div key={p.id} className="card p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="pl-course">{p.family}</span>
                      {p.assigned && <span className="st-pill" style={{ color: "#7d0a0a", background: "#fef2f2", borderColor: "#fecaca" }} title="Your admin assigned this exam to you. It doesn't use your exam balance.">Assigned to you</span>}
                    </span>
                    {taken
                      ? <span className="st-pill" style={{ color: "#15803d", background: "#f0fdf4", borderColor: "#bbf7d0" }}>Taken</span>
                      : <span className="st-pill" style={{ color: "#64748b", background: "#f8fafc", borderColor: "#e2e8f0" }}>Not taken</span>}
                  </div>
                  <h3 className="font-extrabold text-slate-900 leading-snug">{p.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{[p.questions ? `${p.questions} questions` : "", p.minutes ? `${p.minutes} min` : "", !isD ? p.description : ""].filter(Boolean).join(" · ") || p.description}</p>
                  {r && (
                    <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                      <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Your score</p><p className={`text-2xl font-extrabold score ${scoreTone(pct ?? 0)}`}>{r.score}{r.totalScore ? <span className="text-sm text-slate-400"> / {r.totalScore}</span> : null}</p></div>
                      <div className="text-xs text-slate-500 ml-auto text-right">{r.mistakesCount != null ? `${r.mistakesCount} mistake${r.mistakesCount === 1 ? "" : "s"}` : ""}{r.date ? <><br />{new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</> : null}</div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-auto pt-4">
                    {taken && isD
                      ? <button className="pl-btn flex-1 justify-center" disabled style={{ opacity: 0.6 }} title="Each diagnostic exam is one try — ask the admin for another try">✓ Taken · one try</button>
                      : <button className="pl-btn primary flex-1 justify-center" onClick={() => setConfirm(p)}>{taken ? "Take again" : "Start exam"}</button>}
                    {r && <button className="pl-btn" onClick={() => navigate(isD ? "/user/reports/diagnostic-exam" : "/user/reports/exams")}>Result</button>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : !isD && /balance/i.test(String(examError?.message || examError || "")) ? (
          <EmptyCard
            title="No exam balance left"
            text={String(examError?.message || examError)}
            action={<button className="btn-primary" style={{ width: "auto", margin: "0 auto" }} onClick={() => navigate("/user/payment")}>Buy an exam package</button>}
          />
        ) : (
          <EmptyCard title={isD ? "No diagnostic exams yet" : "No exams yet"} text="Exams for your courses show up here." />
        )}
      </div>

      {confirm && (
        <Modal
          title="Are you ready?"
          onClose={() => setConfirm(null)}
          actions={<>
            <button className="pl-btn" onClick={() => setConfirm(null)}>Not now</button>
            <button className="pl-btn primary" onClick={() => start(confirm)} disabled={starting}>{starting ? "Starting…" : "Start now"}</button>
          </>}
        >
          <p>You are about to start <b className="text-slate-900">{confirm.name}</b>.</p>
          <ul className="mt-2 space-y-1">
            {confirm.minutes ? <li>⏱️ <b>Duration:</b> {confirm.minutes} minutes</li> : null}
            {confirm.questions ? <li>❓ <b>Questions:</b> {confirm.questions}</li> : null}
            {!isD && <li>The timer starts per section once you begin it.</li>}
            {!isD && <li>{confirm.assigned ? "🎁 Assigned to you — this exam doesn't use your exam balance." : "🎟️ This uses 1 exam from your exam balance."}</li>}
          </ul>
        </Modal>
      )}
      {notice && (
        <Modal
          title={notice.title}
          onClose={() => setNotice(null)}
          actions={<>
            {notice.store && <button className="pl-btn" onClick={() => navigate("/user/payment")}>Go to store</button>}
            <button className="pl-btn primary" onClick={() => setNotice(null)}>OK</button>
          </>}
        >
          <p>{notice.text}</p>
        </Modal>
      )}
    </Page>
  );
}
