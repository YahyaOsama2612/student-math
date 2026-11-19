import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useGet from "@/hooks/useGet";
import { EmptyCard, Kpi, Page, PageHead } from "@/components/portal/ui";
import { MistakeItem, MistakesLocked, PdfModal, VideoModal } from "@/pages/Reports/parts";
import { useStartQuiz } from "@/pages/Lesson/parts/LessonParts";

/* Quiz result — opened right after submitting a quiz (and from "View result" / "Full result").
   GET /api/user/quizzes/attempts/:attemptId/result
   → { attempt, quiz, mistakesUnlocked, questions: [{ number, isCorrect, answered }], mistakes: [...] }
   Mistakes (question, your answer, right answer, solution photo + video) show only when the student bought mistakes. */

/** The result API's mistake → the shape the shared MistakeItem card reads. */
const toCard = (m) => ({
  questionId: m.questionId,
  questionText: m.question,
  questionImage: m.image,
  answerType: m.answerType,
  options: m.options,
  studentSelectedOptionId: m.selectedOptionId,
  studentGridInAnswer: m.gridInAnswer,
  studentOption: m.options?.find((o) => o.id === m.selectedOptionId)?.answer ?? null,
  correctOption: m.correctAnswers?.[0] ?? null,
  answers: (m.solutions || []).map((s) => ({ id: s.id, answerText: s.text, answerImage: s.image, answerPdf: s.pdf, video: s.video })),
});

export default function QuizResult() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { data, error } = useGet(`/api/user/quizzes/attempts/${attemptId}/result`);
  const { start, startingId } = useStartQuiz();
  const [pdfModal, setPdfModal] = useState(null);
  const [videoModal, setVideoModal] = useState(null);

  const d = data?.data;
  if (!d && !error) {
    return (
      <Page>
        <div className="skel h-8 w-64 mb-4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">{[1, 2, 3, 4].map((i) => <div key={i} className="skel h-20"></div>)}</div>
        <div className="skel h-48"></div>
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
  const passPct = a.totalScore && a.passScore != null ? Math.round((a.passScore / a.totalScore) * 100) : null;
  const wrongCount = a.wrong + a.unanswered;

  return (
    <Page wide>
      <div className="max-w-5xl mx-auto">
        <PageHead title={quiz.title || "Quiz result"} text={quiz.lessonName ? `Lesson: ${quiz.lessonName}` : "Your quiz result"}>
          {quiz.lessonId && <button className="btn-ghost" onClick={() => navigate(`/user/lesson/${quiz.lessonId}`)}>Back to lesson</button>}
          <button className="btn-ghost" onClick={() => navigate("/user/reports/quizzes")}>All results</button>
        </PageHead>

        <section className={`rounded-2xl border p-5 mb-4 flex flex-wrap items-center gap-4 ${a.isPassed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <span className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-extrabold text-white ${a.isPassed ? "bg-green-600" : "bg-one"}`}>
            {a.isPassed ? "✓" : "✕"}
          </span>
          <div className="flex-1 min-w-[12rem]">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{a.status === "timed_out" ? "Submitted after the time limit" : "Submitted"}</p>
            <p className="text-2xl font-extrabold text-slate-900">
              {a.score} <span className="text-base text-slate-400">/ {a.totalScore ?? "—"}</span>
              {pct != null && <span className="text-base text-slate-500"> · {pct}%</span>}
            </p>
            <p className={`text-sm font-bold ${a.isPassed ? "text-green-700" : "text-red-700"}`}>
              {a.isPassed ? "Passed" : "Not passed"}{passPct != null ? ` — pass mark ${a.passScore} (${passPct}%)` : ""}
            </p>
          </div>
          {!a.isPassed && (
            <button className="pl-btn primary" disabled={startingId === quiz.id} onClick={() => start({ id: quiz.id })}>
              {startingId === quiz.id ? "Starting…" : "Retake quiz"}
            </button>
          )}
        </section>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Kpi label="Questions" value={a.total} />
          <Kpi label="Correct" value={a.correct} tone={a.correct ? "green" : ""} />
          <Kpi label="Wrong" value={a.wrong} tone={a.wrong ? "red" : ""} />
          <Kpi label="Not answered" value={a.unanswered} />
        </div>

        {questions.length > 0 && (
          <section className="card p-4 sm:p-5 mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Question by question</p>
            <div className="flex flex-wrap gap-2">
              {questions.map((q) => (
                <span key={q.questionId} title={q.isCorrect ? "Correct" : q.answered ? "Wrong" : "Not answered"}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold border ${
                    q.isCorrect ? "bg-green-50 text-green-700 border-green-200" : q.answered ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-50 text-slate-400 border-slate-200"
                  }`}>
                  {q.number}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">Green = correct · red = wrong · grey = not answered.</p>
          </section>
        )}

        {wrongCount === 0 ? (
          <EmptyCard title="No mistakes — full marks!" text="Great work. Move on to the next lesson." />
        ) : !mistakesUnlocked ? (
          <MistakesLocked count={wrongCount} />
        ) : (
          <section>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Your mistakes, with the solutions</p>
            <div className="flex flex-col gap-2">
              {mistakes.map((m) => (
                <MistakeItem key={m.questionId} mistake={toCard(m)} index={m.number}
                  onOpenPdf={(url, title) => setPdfModal({ url, title })}
                  onOpenVideo={(url, title) => setVideoModal({ url, title })} />
              ))}
            </div>
          </section>
        )}
      </div>

      <PdfModal modal={pdfModal} onClose={() => setPdfModal(null)} />
      <VideoModal modal={videoModal} onClose={() => setVideoModal(null)} />
    </Page>
  );
}
