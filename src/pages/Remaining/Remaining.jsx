import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "@/api/api";
import useGet from "@/hooks/useGet";
import { useStudentData } from "@/context/StudentData";
import Icon from "@/components/portal/Icon";
import { Kpi, Modal, Page, PageHead } from "@/components/portal/ui";

/* Remaining H.W (MathPortal design): pick a course → its chapters and lessons, each lesson with its quizzes
   (To do / In progress / Done) and a Solve button. Extra homework from teachers has its own tab. */

const MAX_PDF_SIZE_MB = 10;
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error("Could not read the file"));
  reader.readAsDataURL(file);
});
const dueLabel = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const dueTime = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

/** Downloads through a blob (keeps the file name); falls back to opening the link. */
const download = async (url, title) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const blobUrl = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${title || "homework"}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

function SubmitModal({ item, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const pick = (f) => {
    if (!f) return;
    if (f.type !== "application/pdf") { setFile(null); setError("Choose a PDF file."); return; }
    if (f.size > MAX_PDF_SIZE_MB * 1024 * 1024) { setFile(null); setError(`The file is larger than ${MAX_PDF_SIZE_MB} MB. Compress it and try again.`); return; }
    setError("");
    setFile(f);
  };
  const submit = async () => {
    if (!file) { setError("Attach your solution PDF before submitting."); return; }
    setSending(true);
    try {
      const pdf = await fileToBase64(file);
      await api.post(`/api/user/extra-homework/${item.homeworkId}/submit`, { pdf, studentNotes: notes.trim() });
      onDone();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not submit the homework.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      title="Submit homework"
      onClose={onClose}
      actions={<>
        <button className="pl-btn" onClick={onClose}>Cancel</button>
        <button className="pl-btn primary" onClick={submit} disabled={sending}>{sending ? "Submitting…" : "Submit"}</button>
      </>}
    >
      <p className="mb-3">Submit <b>{item.title}</b>? Your teacher will grade it.</p>
      <label className="text-xs font-bold">Your answers (PDF, up to {MAX_PDF_SIZE_MB} MB)</label>
      <input type="file" accept="application/pdf,.pdf" className="input mt-1" onChange={(e) => pick(e.target.files?.[0])} />
      <label className="text-xs font-bold mt-3 block">Notes for your teacher (optional)</label>
      <textarea rows={2} className="input mt-1" value={notes} onChange={(e) => setNotes(e.target.value)}></textarea>
      {error && <p className="text-sm font-semibold text-red-600 mt-2">{error}</p>}
    </Modal>
  );
}

export default function Remaining() {
  const navigate = useNavigate();
  const { showToast, reloadCounts } = useStudentData();
  const [params, setParams] = useSearchParams();
  const lessonId = params.get("lessonId"); // from a lesson page: open its course and highlight it
  const [filter, setFilter] = useState("todo"); // todo | done | all
  const [tab, setTab] = useState(null); // course id | "extra"
  const [q, setQ] = useState("");
  const [submitting, setSubmitting] = useState(null);
  const [starting, setStarting] = useState(null);

  // GET /api/user/quizzes/remaining-homework → { summary, quizzes (still to do), courses: [course → chapters → lessons → quizzes] }
  const { data: quizData, loading: quizLoading } = useGet("/api/user/quizzes/remaining-homework");
  const { data: extraData, loading: extraLoading, refetch: refetchExtra } = useGet("/api/user/extra-homework");

  const courses = useMemo(() => quizData?.data?.courses || [], [quizData]);
  const extra = useMemo(() => {
    const payload = extraData?.data?.data || extraData?.data || {};
    return Array.isArray(payload.homework) ? payload.homework : [];
  }, [extraData]);

  const now = new Date();
  const extraRows = useMemo(() => extra.map((h) => {
    const done = h.status !== "assigned";
    const due = h.dueDate ? new Date(h.dueDate) : null;
    return { h, done, late: !done && due && due < now };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [extra]);

  // course of the lesson in the link, else the first course with work left, else the first course
  const lessonCourse = lessonId ? courses.find((c) => c.chapters.some((ch) => ch.lessons.some((l) => l.id === lessonId))) : null;
  const defaultTab = lessonCourse?.id || courses.find((c) => c.total > c.done)?.id || courses[0]?.id || (extraRows.length ? "extra" : null);
  const active = tab || defaultTab;
  const course = courses.find((c) => c.id === active) || null;

  useEffect(() => {
    if (!lessonId || !courses.length) return;
    const el = document.getElementById(`hw-lesson-${lessonId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [lessonId, courses.length, active]);

  const summary = quizData?.data?.summary || { total: 0, solved: 0, remaining: 0 };
  const xLeft = extraRows.filter((x) => !x.done).length;
  const late = extraRows.filter((x) => x.late).length;
  const doneCount = extraRows.filter((x) => x.done).length + (summary.solved || 0);
  const leftCount = xLeft + (summary.remaining || 0);

  const keep = (quiz) => filter === "all" || (filter === "done" ? quiz.status === "done" : quiz.status !== "done");
  const term = q.trim().toLowerCase();
  const chapters = useMemo(() => {
    if (!course) return [];
    return course.chapters
      .map((ch) => ({
        ...ch,
        lessons: ch.lessons
          .filter((l) => !term || l.name?.toLowerCase().includes(term) || ch.name?.toLowerCase().includes(term))
          .map((l) => ({ ...l, shown: l.quizzes.filter(keep) }))
          // To do / Done hide lessons with nothing in that state; All shows every lesson
          .filter((l) => filter === "all" || l.shown.length > 0),
      }))
      .filter((ch) => ch.lessons.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, filter, term]);

  const countIn = (c, k) => c.chapters.reduce((n, ch) => n + ch.lessons.reduce((m, l) => m + l.quizzes.filter((x) => (k === "done" ? x.status === "done" : k === "todo" ? x.status !== "done" : true)).length, 0), 0);

  const startQuiz = async (id) => {
    setStarting(id);
    try {
      await api.post(`/api/user/quizzes/${id}/start`, {});
      navigate(`/user/quiz/${id}`);
    } catch (err) {
      showToast(err?.response?.data?.error?.message || "Could not start the quiz");
    } finally {
      setStarting(null);
    }
  };

  const chip = (k, l, n) => (
    <button key={k} onClick={() => setFilter(k)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold border ${filter === k ? "bg-one text-white border-one" : "bg-white text-slate-600 border-slate-200 hover:border-one hover:text-one"}`}>
      {l} <span className={filter === k ? "text-white/70" : "text-slate-400"}>{n}</span>
    </button>
  );

  const quizRow = (quiz) => {
    const mins = (Number(quiz.durationHours) || 0) * 60 + (Number(quiz.durationMinutes) || 0);
    const r = quiz.lastResult;
    const pct = r && quiz.totalScore ? Math.round(((r.score || 0) / quiz.totalScore) * 100) : null;
    return (
      <div key={quiz.id} className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-1.5 py-2">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-800 truncate" title={quiz.title}>{quiz.title}</span>
          <span className="block text-[11px] text-slate-400">
            {[quiz.questionsCount ? `${quiz.questionsCount} questions` : "", mins ? `${mins} min` : "", quiz.totalScore ? `${quiz.totalScore} points` : ""].filter(Boolean).join(" · ")}
          </span>
        </span>
        {quiz.status === "done" ? (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${r?.isPassed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            ✓ Done{pct != null ? ` · ${pct}%` : ""}
          </span>
        ) : quiz.status === "in_progress" ? (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 whitespace-nowrap">In progress</span>
        ) : (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 whitespace-nowrap">To do</span>
        )}
        <span className="flex gap-1.5 shrink-0">
          {r && <button className="btn-mini" onClick={() => navigate(`/user/quiz-result/${r.attemptId}`)}>Result</button>}
          {!(quiz.status === "done" && r?.isPassed) && (
            <button className="btn-mini primary" onClick={() => startQuiz(quiz.id)} disabled={starting === quiz.id}>
              {starting === quiz.id ? "Starting…" : quiz.status === "in_progress" ? "Continue" : quiz.status === "done" ? "Retake" : "Solve"}
            </button>
          )}
        </span>
      </div>
    );
  };

  const extraRow = (x) => {
    const h = x.h;
    return (
      <div key={`x-${h.homeworkId}`} className="flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-2 px-5 py-4 border-t border-slate-100 first:border-0 hover:bg-slate-50">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${x.done ? "bg-green-50 text-green-600" : x.late ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}><Icon name="homework" size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900">{h.title}</p>
          {h.description && <p className="text-xs text-slate-500">{h.description}</p>}
          <div className="flex flex-wrap gap-2 mt-1">
            {h.pdfUrl && <button onClick={() => download(h.pdfUrl, h.title)} className="text-[11px] font-semibold px-2 py-0.5 rounded bg-red-50 text-one hover:underline">📄 Homework PDF</button>}
            {h.link && <a href={h.link} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:underline">🔗 Open link</a>}
            {h.submittedPdf && <a href={h.submittedPdf} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold px-2 py-0.5 rounded bg-green-50 text-green-700 hover:underline">✓ Your submission</a>}
          </div>
          {h.status === "graded" && h.feedback && <p className="text-xs text-slate-600 mt-1">Teacher: “{h.feedback}”</p>}
        </div>
        <div className="text-right shrink-0">
          {h.status === "graded"
            ? <><p className="text-sm font-extrabold text-green-600">{h.score ?? "—"}</p><p className="text-[11px] text-slate-400">Graded</p></>
            : h.status === "submitted"
              ? <><p className="text-sm font-bold text-green-700">Submitted</p><p className="text-[11px] text-slate-400">Waiting for a grade</p></>
              : h.dueDate
                ? <><p className={`text-sm font-bold ${x.late ? "text-red-600" : "text-slate-800"}`}>{x.late ? "Overdue" : `Due ${dueLabel(h.dueDate)}`}</p><p className="text-[11px] text-slate-400">{dueTime(h.dueDate)}</p></>
                : <p className="text-sm font-bold text-slate-800">To do</p>}
        </div>
        {!x.done && <button className="btn-mini primary shrink-0" onClick={() => setSubmitting(h)}>Submit</button>}
      </div>
    );
  };

  const extraShown = extraRows.filter((x) => filter === "all" || (filter === "done" ? x.done : !x.done));
  const loading = quizLoading || extraLoading;

  return (
    <Page wide>
      <PageHead title="Remaining H.W" text="Pick a course to see its chapters and lessons, with every quiz to solve beside its lesson." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Kpi label="Remaining" value={leftCount} sub="quizzes + extra H.W" tone={leftCount ? "red" : "green"} />
        <Kpi label="Quizzes to solve" value={summary.remaining || 0} sub={`of ${summary.total || 0} quizzes`} />
        <Kpi label="Extra H.W" value={xLeft} sub={late ? `${late} overdue` : "to submit"} tone={late ? "red" : ""} />
        <Kpi label="Done" value={doneCount} sub="solved or submitted" tone="green" />
      </div>

      {loading && !quizData ? (
        <div className="skel h-64"></div>
      ) : !courses.length && !extraRows.length ? (
        <section className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <p className="text-lg font-extrabold text-gray-900 mb-1">No homework yet</p>
          <p className="text-sm text-slate-500">Homework from the courses and lessons you own shows up here.</p>
          <button className="text-xs font-bold text-one hover:underline mt-2" onClick={() => navigate("/user/payment")}>Open the store →</button>
        </section>
      ) : (
        <>
          {/* Courses (and extra H.W from teachers) */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
            {courses.map((c) => {
              const on = active === c.id;
              const left = c.total - c.done;
              return (
                <button key={c.id} onClick={() => { setTab(c.id); if (lessonId) setParams({}); }} aria-pressed={on}
                  className={`shrink-0 text-left rounded-xl border px-4 py-2.5 min-w-[150px] ${on ? "bg-one text-white border-one" : "bg-white border-slate-200 hover:border-one"}`}>
                  <span className="block text-sm font-bold truncate max-w-[220px]">{c.name}</span>
                  <span className={`block text-[11px] ${on ? "text-white/80" : "text-slate-500"}`}>
                    {c.total ? `${left} to do · ${c.done}/${c.total} done` : "No quizzes yet"}
                  </span>
                </button>
              );
            })}
            {extraRows.length > 0 && (
              <button onClick={() => setTab("extra")} aria-pressed={active === "extra"}
                className={`shrink-0 text-left rounded-xl border px-4 py-2.5 min-w-[150px] ${active === "extra" ? "bg-one text-white border-one" : "bg-white border-slate-200 hover:border-one"}`}>
                <span className="block text-sm font-bold">Extra H.W</span>
                <span className={`block text-[11px] ${active === "extra" ? "text-white/80" : "text-slate-500"}`}>{xLeft} to submit · from your teachers</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex flex-wrap gap-2">
              {active === "extra"
                ? <>{chip("todo", "To do", extraRows.filter((x) => !x.done).length)}{chip("done", "Done", extraRows.filter((x) => x.done).length)}{chip("all", "All", extraRows.length)}</>
                : course && <>{chip("todo", "To do", countIn(course, "todo"))}{chip("done", "Done", countIn(course, "done"))}{chip("all", "All lessons", countIn(course, "all"))}</>}
            </div>
            {active !== "extra" && (
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chapters or lessons..." className="input sm:w-64" />
            )}
          </div>

          {active === "extra" ? (
            extraShown.length ? (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">{extraShown.map(extraRow)}</div>
            ) : (
              <section className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <p className="text-lg font-extrabold text-gray-900 mb-1">{filter === "todo" ? "All caught up 🎉" : "Nothing here yet"}</p>
                <p className="text-sm text-slate-500">Extra homework from your teachers shows up here.</p>
              </section>
            )
          ) : course ? (
            <>
              {course.total > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 mb-4 flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 whitespace-nowrap">{course.name}</span>
                  <span className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <span className="block h-full rounded-full bg-green-500" style={{ width: `${Math.round((course.done / course.total) * 100)}%` }} />
                  </span>
                  <span className="text-xs font-bold text-slate-700 whitespace-nowrap">{course.done}/{course.total} quizzes done</span>
                </div>
              )}
              {chapters.length === 0 ? (
                <section className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                  <p className="text-lg font-extrabold text-gray-900 mb-1">{term ? "Nothing matches your search" : filter === "todo" ? "All caught up 🎉" : filter === "done" ? "Nothing solved yet" : "No lessons yet"}</p>
                  <p className="text-sm text-slate-500">{filter === "todo" && !term ? "Every quiz in this course is solved." : "Try another filter."}</p>
                </section>
              ) : (
                <div className="space-y-4">
                  {chapters.map((ch) => (
                    <section key={ch.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-one">Chapter</p>
                        <h3 className="font-bold text-slate-900">{ch.name}</h3>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {ch.lessons.map((l) => (
                          <div key={l.id} id={`hw-lesson-${l.id}`}
                            className={`px-5 py-3 grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-5 gap-y-1 ${l.id === lessonId ? "bg-red-50/50" : ""}`}>
                            <div className="min-w-0 pt-2">
                              <button className="text-left text-sm font-bold text-slate-900 hover:text-one" onClick={() => navigate(`/user/lesson/${l.id}`)}>{l.name}</button>
                              <p className="text-[11px] text-slate-400">
                                {l.quizzes.length ? `${l.quizzes.filter((x) => x.status === "done").length}/${l.quizzes.length} quizzes done` : "No quizzes in this lesson"}
                              </p>
                            </div>
                            <div className="min-w-0">
                              {l.shown.length ? l.shown.map(quizRow) : <p className="text-xs text-slate-400 py-2">—</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </>
      )}

      {submitting && (
        <SubmitModal
          item={submitting}
          onClose={() => setSubmitting(null)}
          onDone={() => { setSubmitting(null); refetchExtra?.(); reloadCounts(); showToast("Submitted — your teacher will grade it"); }}
        />
      )}
    </Page>
  );
}
