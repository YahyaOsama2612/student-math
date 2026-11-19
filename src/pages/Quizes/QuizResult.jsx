import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useGet from "@/hooks/useGet";
import Icon from "@/components/portal/Icon";
import { EmptyCard, Page } from "@/components/portal/ui";
import { InlineVideo, MistakesLocked, PdfModal, cleanHtmlText, optionLetter } from "@/pages/Reports/parts";
import { useStartQuiz } from "@/pages/Lesson/parts/LessonParts";

/* Quiz result — opened right after submitting a quiz (and from "View result" / "See my answers").
   GET /api/user/quizzes/attempts/:attemptId/result
   → { attempt, quiz, mistakesUnlocked, questions: [{ number, isCorrect, answered }], mistakes: [...] }
   Mistakes (question, your answer, right answer, solution photo + video) show only when the student bought mistakes.
   Any mistake opens full screen: the question large, then its solution, with previous / next. */

const isGrid = (m) => Boolean(m.answerType) && !/mcq/i.test(m.answerType);
const sortedOptions = (m) => [...(m.options || [])].sort((a, b) => String(a.order).localeCompare(String(b.order)));
const letterOf = (m, id) => {
  const o = (m.options || []).find((x) => x.id === id);
  return o ? optionLetter(o.order) || cleanHtmlText(o.answer) : "";
};
const yourAnswer = (m) => (isGrid(m) ? m.gridInAnswer || "" : letterOf(m, m.selectedOptionId));
const rightAnswer = (m) => {
  if (isGrid(m)) return (m.correctAnswers || []).filter(Boolean).join(" or ") || "";
  const o = (m.options || []).find((x) => x.isCorrect);
  return o ? optionLetter(o.order) || cleanHtmlText(o.answer) : "";
};
const hasSolution = (m) => (m.solutions || []).some((s) => s.text || s.image || s.pdf || s.video);

/* ---------- small pieces ---------- */

const ScoreRing = ({ pct, passed }) => {
  const r = 52;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <div className="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={passed ? "#16a34a" : "#b91c1c"} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * p) / 100} style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-slate-900 tabular-nums">{pct ?? "—"}<span className="text-base text-slate-400">%</span></span>
        <span className={`text-[11px] font-bold uppercase tracking-wider ${passed ? "text-green-700" : "text-red-700"}`}>{passed ? "Passed" : "Not passed"}</span>
      </div>
    </div>
  );
};

const Stat = ({ label, value, tone }) => (
  <div className="rounded-xl bg-white/70 border border-slate-100 px-3 py-2.5 text-center">
    <p className={`text-xl font-extrabold tabular-nums ${tone || "text-slate-900"}`}>{value}</p>
    <p className="text-[11px] font-semibold text-slate-500">{label}</p>
  </div>
);

const AnsPill = ({ label, value, ok }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${ok ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
    <span className="font-semibold opacity-70">{label}</span> {value || "—"}
  </span>
);

/* ---------- full-screen viewer ---------- */

function MistakeViewer({ list, index, onIndex, onClose, onOpenPdf }) {
  const m = list[index];
  const [tab, setTab] = useState("question"); // question | solution
  const [shown, setShown] = useState(false);
  useEffect(() => { setTab("question"); setShown(false); const t = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(t); }, [index]);

  const go = useCallback((d) => { const n = index + d; if (n >= 0 && n < list.length) onIndex(n); }, [index, list.length, onIndex]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("overflow-hidden");
    return () => { document.removeEventListener("keydown", onKey); document.body.classList.remove("overflow-hidden"); };
  }, [go, onClose]);

  if (!m) return null;
  const text = cleanHtmlText(m.question);
  const solutions = (m.solutions || []).filter((s) => s.text || s.image || s.pdf || s.video);

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-slate-950/95 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Question ${m.number}`}>
      {/* top bar */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 border-b border-white/10 text-white">
        <span className="text-sm sm:text-base font-extrabold whitespace-nowrap">Question {m.number}</span>
        <span className="text-xs text-white/50 whitespace-nowrap">{index + 1} of {list.length} mistakes</span>
        <div className="ml-auto flex items-center gap-1 rounded-xl bg-white/10 p-1">
          {[["question", "Question"], ["solution", "Solution"]].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} disabled={k === "solution" && !solutions.length}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors disabled:opacity-40 ${tab === k ? "bg-white text-slate-900" : "text-white/80 hover:text-white"}`}>
              {l}
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-lg leading-none">✕</button>
      </div>

      {/* content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className={`mx-auto w-full max-w-5xl px-3 sm:px-6 py-4 sm:py-6 transition-all duration-300 ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <AnsPill label="Your answer" value={yourAnswer(m) || (m.answered ? "—" : "Not answered")} />
            <AnsPill label="Correct" value={rightAnswer(m) || "See the solution"} ok />
            <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white/80">{isGrid(m) ? "Grid-in" : "MCQ"}</span>
          </div>

          {tab === "question" ? (
            <div className="rounded-2xl bg-white p-3 sm:p-5">
              {text && <p className="text-base sm:text-lg text-slate-800 mb-3 leading-relaxed">{text}</p>}
              {m.image && (
                <img src={m.image} alt={`Question ${m.number}`} onContextMenu={(e) => e.preventDefault()}
                  className="block mx-auto h-auto w-auto max-w-full max-h-[62vh] object-contain" />
              )}
              {!isGrid(m) && sortedOptions(m).some((o) => cleanHtmlText(o.answer) || optionLetter(o.order)) && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sortedOptions(m).map((o) => {
                    const right = o.isCorrect;
                    const picked = o.id === m.selectedOptionId;
                    return (
                      <div key={o.id} className={`rounded-xl border px-3 py-2.5 text-sm flex items-center gap-2 ${right ? "border-green-300 bg-green-50 text-green-900 font-semibold" : picked ? "border-red-300 bg-red-50 text-red-900 font-semibold" : "border-slate-200 text-slate-600"}`}>
                        <b className="w-6 h-6 rounded-full bg-white border border-current/20 flex items-center justify-center text-xs shrink-0">{optionLetter(o.order) || "•"}</b>
                        <span className="min-w-0">{cleanHtmlText(o.answer)}</span>
                        {right && <span className="ml-auto text-[11px] font-bold">Correct</span>}
                        {picked && !right && <span className="ml-auto text-[11px] font-bold">Your answer</span>}
                      </div>
                    );
                  })}
                </div>
              )}
              {solutions.length > 0 && (
                <button type="button" onClick={() => setTab("solution")} className="mt-4 w-full sm:w-auto pl-btn primary justify-center">
                  <Icon name="video" size={15} /> Show the solution
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {solutions.map((s, i) => (
                <div key={s.id || i} className="rounded-2xl bg-white p-3 sm:p-5 space-y-4">
                  {s.video && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Video solution</p>
                      <div className="flex justify-center"><InlineVideo value={s.video} title={`Question ${m.number} — video solution`} /></div>
                    </div>
                  )}
                  {s.image && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Solution</p>
                      <img src={s.image} alt={`Question ${m.number} solution`} onContextMenu={(e) => e.preventDefault()}
                        className="block mx-auto h-auto w-auto max-w-full max-h-[70vh] object-contain" />
                    </div>
                  )}
                  {s.text && <p className="whitespace-pre-wrap text-sm sm:text-base text-slate-700">{cleanHtmlText(s.text)}</p>}
                  {s.pdf && (
                    <button type="button" className="pl-btn" onClick={() => onOpenPdf(s.pdf, `Question ${m.number} — PDF solution`)}>
                      <Icon name="pdf" size={14} /> Open PDF solution
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* bottom bar */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2.5 border-t border-white/10">
        <button type="button" onClick={() => go(-1)} disabled={index === 0} className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-bold disabled:opacity-30 hover:bg-white/20">← Previous</button>
        <div className="hidden sm:flex flex-wrap justify-center gap-1.5">
          {list.map((x, i) => (
            <button key={x.questionId} type="button" onClick={() => onIndex(i)} aria-label={`Question ${x.number}`}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${i === index ? "bg-white text-slate-900" : "bg-white/10 text-white/80 hover:bg-white/20"}`}>
              {x.number}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => go(1)} disabled={index === list.length - 1} className="px-4 py-2 rounded-xl bg-white text-slate-900 text-sm font-bold disabled:opacity-30">Next →</button>
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export default function QuizResult() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { data, error } = useGet(`/api/user/quizzes/attempts/${attemptId}/result`);
  const { start, startingId } = useStartQuiz();
  const [viewer, setViewer] = useState(null); // index into the mistakes list
  const [pdfModal, setPdfModal] = useState(null);

  const d = data?.data;
  if (!d && !error) {
    return (
      <Page wide>
        <div className="max-w-5xl mx-auto">
          <div className="skel h-44 mb-4 rounded-2xl"></div>
          <div className="skel h-20 mb-4 rounded-2xl"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[1, 2, 3, 4].map((i) => <div key={i} className="skel h-40 rounded-2xl"></div>)}</div>
        </div>
      </Page>
    );
  }
  if (error || !d) {
    return (
      <Page>
        <EmptyCard title="Couldn't load this result" text={String(error?.message || error || "Please try again.")}
          action={<button className="pl-btn" onClick={() => navigate(-1)}>Back</button>} />
      </Page>
    );
  }

  const { attempt: a, quiz, questions = [], mistakes = [], mistakesUnlocked } = d;
  const pct = a.totalScore ? Math.round((a.score / a.totalScore) * 100) : null;
  const wrongCount = a.wrong + a.unanswered;
  const openQuestion = (q) => {
    if (!mistakesUnlocked || q.isCorrect) return;
    const i = mistakes.findIndex((m) => m.questionId === q.questionId);
    if (i >= 0) setViewer(i);
  };

  return (
    <Page wide>
      <div className="max-w-5xl mx-auto">
        {/* top links */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-sm font-semibold">
          {quiz.lessonId && <button className="text-slate-500 hover:text-one" onClick={() => navigate(`/user/lesson/${quiz.lessonId}`)}>← Back to lesson</button>}
          <button className="text-slate-500 hover:text-one" onClick={() => navigate("/user/reports/quizzes")}>All my quiz results</button>
        </div>

        {/* hero */}
        <section className={`rounded-3xl border p-4 sm:p-6 mb-4 ${a.isPassed ? "bg-gradient-to-br from-green-50 to-white border-green-100" : "bg-gradient-to-br from-red-50 to-white border-red-100"}`}>
          <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-7">
            <ScoreRing pct={pct} passed={a.isPassed} />
            <div className="flex-1 min-w-0 w-full text-center sm:text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {a.status === "timed_out" ? "Submitted after the time limit" : "Quiz result"}
              </p>
              <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 leading-snug break-words">{quiz.title || "Quiz"}</h1>
              {quiz.lessonName && <p className="text-sm text-slate-500 truncate">{quiz.lessonName}</p>}
              <p className="mt-1 text-sm text-slate-600">
                <b className="text-slate-900">{a.score}</b> of {a.totalScore ?? "—"} points
                {a.passScore != null && <> · pass mark {a.passScore}</>}
              </p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                <Stat label="Questions" value={a.total} />
                <Stat label="Correct" value={a.correct} tone="text-green-700" />
                <Stat label="Wrong" value={a.wrong} tone={a.wrong ? "text-red-700" : ""} />
                <Stat label="Skipped" value={a.unanswered} tone={a.unanswered ? "text-amber-700" : ""} />
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            {!a.isPassed && (
              <button className="pl-btn justify-center" disabled={startingId === quiz.id} onClick={() => start({ id: quiz.id })}>
                {startingId === quiz.id ? "Starting…" : "Retake quiz"}
              </button>
            )}
            {mistakesUnlocked && mistakes.length > 0 && (
              <button className="pl-btn primary justify-center" onClick={() => setViewer(0)}>Review my mistakes full screen</button>
            )}
          </div>
        </section>

        {/* question map */}
        {questions.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question by question</p>
              <p className="text-[11px] text-slate-400"><span className="text-green-700 font-bold">■</span> correct · <span className="text-red-700 font-bold">■</span> wrong · <span className="text-slate-400 font-bold">■</span> skipped</p>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-2">
              {questions.map((q) => {
                const can = mistakesUnlocked && !q.isCorrect;
                return (
                  <button key={q.questionId} type="button" onClick={() => openQuestion(q)} disabled={!can}
                    title={q.isCorrect ? "Correct" : q.answered ? "Wrong — open" : "Not answered — open"}
                    className={`aspect-square rounded-xl text-sm font-bold border transition-transform ${can ? "hover:-translate-y-0.5 hover:shadow cursor-pointer" : "cursor-default"} ${
                      q.isCorrect ? "bg-green-50 text-green-700 border-green-200" : q.answered ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-50 text-slate-400 border-slate-200"
                    }`}>
                    {q.number}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* mistakes */}
        {wrongCount === 0 ? (
          <EmptyCard title="No mistakes — full marks!" text="Great work. Move on to the next lesson." />
        ) : !mistakesUnlocked ? (
          <MistakesLocked count={wrongCount} />
        ) : (
          <section>
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your mistakes ({mistakes.length})</p>
              <p className="text-[11px] text-slate-400 hidden sm:block">Tap a question to open it full screen</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mistakes.map((m, i) => (
                <button key={m.questionId} type="button" onClick={() => setViewer(i)}
                  className="group text-left rounded-2xl border border-slate-200 bg-white overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-one/40">
                  <div className="flex items-center justify-between gap-2 px-4 pt-3">
                    <span className="text-sm font-extrabold text-one">Question {m.number}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">{isGrid(m) ? "Grid-in" : "MCQ"}</span>
                  </div>
                  <div className="px-4 py-3">
                    {m.image ? (
                      <div className="h-36 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                        <img src={m.image} alt={`Question ${m.number}`} onContextMenu={(e) => e.preventDefault()} className="max-h-full max-w-full h-auto w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]" />
                      </div>
                    ) : (
                      <p className="text-sm text-slate-700 line-clamp-4 min-h-[4.5rem]">{cleanHtmlText(m.question) || "—"}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
                    <AnsPill label="You" value={yourAnswer(m) || (m.answered ? "—" : "Skipped")} />
                    <AnsPill label="Correct" value={rightAnswer(m) || "?"} ok />
                    <span className="ml-auto text-xs font-bold text-one opacity-80 group-hover:opacity-100">
                      {hasSolution(m) ? "Open + solution →" : "Open →"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {viewer !== null && (
        <MistakeViewer list={mistakes} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} onOpenPdf={(url, title) => setPdfModal({ url, title })} />
      )}
      <PdfModal modal={pdfModal} onClose={() => setPdfModal(null)} />
    </Page>
  );
}
