import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "@/api/api";
import useGet from "@/hooks/useGet";
import { useStudentData } from "@/context/StudentData";
import Icon from "@/components/portal/Icon";
import { Kpi, Modal, Page, PageHead } from "@/components/portal/ui";

/* Remaining H.W — extra homework from teachers + quizzes still to solve, in one list (MathPortal design). */

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
  const lessonId = params.get("lessonId");
  const [filter, setFilter] = useState("todo");
  const [source, setSource] = useState("all");
  const [submitting, setSubmitting] = useState(null);
  const [starting, setStarting] = useState(null);

  const { data: lessonsData } = useGet("/api/user/lessons/purchased");
  const { data: quizData, loading: quizLoading } = useGet(lessonId ? `/api/user/quizzes/remaining-homework?lessonId=${lessonId}` : "/api/user/quizzes/remaining-homework");
  const { data: extraData, loading: extraLoading, refetch: refetchExtra } = useGet("/api/user/extra-homework");

  const lessons = lessonsData?.data?.lessons || [];
  const selectedLesson = lessonId ? lessons.find((l) => l.id === lessonId) || null : null;
  const pickLesson = (id) => setParams(id ? { lessonId: id } : {});
  const quizSummary = quizData?.data?.summary || { total: 0, solved: 0, remaining: 0 };
  const extra = useMemo(() => {
    const payload = extraData?.data?.data || extraData?.data || {};
    return Array.isArray(payload.homework) ? payload.homework : [];
  }, [extraData]);

  const now = new Date();
  const rows = useMemo(() => {
    const ex = extra.map((h) => {
      const done = h.status !== "assigned";
      const due = h.dueDate ? new Date(h.dueDate) : null;
      return { kind: "extra", h, done, late: !done && due && due < now, sort: `${done ? "2" : "0"}${h.dueDate || "9999"}` };
    });
    const qz = (quizData?.data?.quizzes || []).map((q) => {
      const due = q.dueDate ? new Date(q.dueDate) : null;
      return { kind: "quiz", q, done: false, late: due && due < now, sort: `1${q.dueDate || "9999"}` };
    });
    return ex.concat(qz).sort((a, b) => a.sort.localeCompare(b.sort));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extra, quizData]);

  // A picked lesson shows that lesson's quizzes only (extra H.W isn't tied to one lesson).
  const mine = rows.filter((x) => (lessonId ? x.kind === "quiz" : source === "all" || x.kind === source));
  const todo = mine.filter((x) => !x.done);
  const done = mine.filter((x) => x.done);
  const list = filter === "todo" ? todo : filter === "done" ? done : mine;
  const left = rows.filter((x) => !x.done);
  const xLeft = left.filter((x) => x.kind === "extra").length;
  const late = left.filter((x) => x.late).length;
  const doneCount = rows.filter((x) => x.done).length + (quizSummary.solved || 0);

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
  const seg = (k, l, n) => (
    <button key={k} onClick={() => setSource(k)} className={`px-3.5 py-1.5 rounded-lg text-xs font-bold ${source === k ? "bg-white text-one shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
      {l} <span className="text-slate-400">· {n}</span>
    </button>
  );

  const row = (x) => {
    if (x.kind === "extra") {
      const h = x.h;
      return (
        <div key={`x-${h.homeworkId}`} className="flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-2 px-5 py-4 border-t border-slate-100 first:border-0 hover:bg-slate-50">
          <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${x.done ? "bg-green-50 text-green-600" : x.late ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}><Icon name="homework" size={18} /></span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900"><span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 align-middle mr-1">EXTRA H.W</span>{h.title}</p>
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
    }
    const q = x.q;
    return (
      <div key={`q-${q.id}`} className="flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-2 px-5 py-4 border-t border-slate-100 first:border-0 hover:bg-slate-50">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${x.late ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}><Icon name="exam" size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900 truncate"><span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 align-middle mr-1">QUIZ</span>{q.title || q.name}</p>
          <p className="text-xs text-slate-500 truncate">{[q.description, q.durationMinutes ? `${q.durationMinutes} min` : "", q.totalScore ? `${q.totalScore} points` : ""].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="text-right shrink-0">
          {q.dueDate
            ? <><p className={`text-sm font-bold ${x.late ? "text-red-600" : "text-slate-800"}`}>{x.late ? "Overdue" : `Due ${dueLabel(q.dueDate)}`}</p><p className="text-[11px] text-slate-400">{dueTime(q.dueDate)}</p></>
            : <p className="text-sm font-bold text-slate-800">To do</p>}
        </div>
        <button className="btn-mini primary shrink-0" onClick={() => startQuiz(q.id)} disabled={starting === q.id}>{starting === q.id ? "Starting…" : "Solve"}</button>
      </div>
    );
  };

  return (
    <Page wide>
      <PageHead title="Remaining H.W" text="Everything you still have to do — extra H.W from your teachers and quizzes from your lessons." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Kpi label="Remaining" value={left.length} sub="to do" tone={left.length ? "red" : "green"} />
        <Kpi label="Extra H.W" value={xLeft} sub="to submit" />
        <Kpi label="Overdue" value={late} sub="past the due date" tone={late ? "red" : ""} />
        <Kpi label="Done" value={doneCount} sub="submitted or solved" tone="green" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Purchased lessons — pick one to see only its homework */}
        <aside className="bg-white border border-slate-200 rounded-2xl overflow-hidden lg:sticky lg:top-20">
          <div className="px-5 py-4 bg-one text-white flex items-center gap-2">
            <Icon name="book" size={18} />
            <h2 className="font-bold">Purchased Lessons ({lessons.length})</h2>
          </div>
          {lessons.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              <p>No purchased lessons yet</p>
              <button className="text-xs font-bold text-one hover:underline mt-2" onClick={() => navigate("/user/payment")}>Open the store →</button>
            </div>
          ) : (
            <div className="max-h-64 lg:max-h-[600px] overflow-y-auto divide-y divide-slate-100">
              <button onClick={() => pickLesson(null)} className={`w-full px-5 py-3 text-left flex items-center gap-3 hover:bg-slate-50 ${!lessonId ? "bg-red-50/60 border-l-4 border-l-one" : ""}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${!lessonId ? "bg-one" : "bg-slate-300"}`}></span>
                <span className="min-w-0"><span className="block text-sm font-semibold text-slate-900">All lessons</span><span className="block text-xs text-slate-500">All remaining homework</span></span>
              </button>
              {lessons.map((l) => {
                const on = lessonId === l.id;
                return (
                  <button key={l.id} onClick={() => pickLesson(l.id)} aria-pressed={on}
                    className={`w-full px-5 py-3 text-left flex items-start justify-between gap-2 hover:bg-slate-50 ${on ? "bg-red-50/60 border-l-4 border-l-one" : ""}`}>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">{l.name}</span>
                      {l.courseName && <span className="block text-xs text-slate-500 mt-0.5">{l.courseName}</span>}
                      {l.chapterName && <span className="block text-xs text-slate-400">{l.chapterName}</span>}
                      {l.status === "expired" && <span className="inline-block mt-1.5 px-2 py-0.5 text-[11px] font-semibold rounded bg-red-50 text-red-600">⏰ Expired</span>}
                    </span>
                    {on && <Icon name="check" size={18} className="text-one mt-0.5" />}
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <div className="lg:col-span-2 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-base font-bold text-slate-900 min-w-0">{selectedLesson ? <>Homework for “{selectedLesson.name}”</> : "All remaining homework"}</h3>
            {selectedLesson && <button className="pl-btn" onClick={() => pickLesson(null)}>Clear filter</button>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex flex-wrap gap-2">{chip("todo", "Remaining", todo.length)}{chip("done", "Done", done.length)}{chip("all", "All", mine.length)}</div>
            {!lessonId && (
              <div className="flex flex-wrap gap-1 bg-slate-100 rounded-xl p-1">
                {seg("all", "All", rows.length)}{seg("extra", "Extra H.W", rows.filter((x) => x.kind === "extra").length)}{seg("quiz", "Quizzes", rows.filter((x) => x.kind === "quiz").length)}
              </div>
            )}
          </div>
          {quizLoading || extraLoading ? <div className="skel h-48"></div> : list.length ? (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">{list.map(row)}</div>
          ) : (
            <section className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
              <p className="text-lg font-extrabold text-gray-900 mb-1">{filter === "todo" ? "All caught up 🎉" : "Nothing here yet"}</p>
              <p className="text-sm text-slate-500">
                {selectedLesson ? "This lesson has no quizzes left to solve." : filter === "todo" ? "You have no homework left to do." : "Your homework shows up here."}
              </p>
            </section>
          )}
        </div>
      </div>
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
