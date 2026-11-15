import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost";
import { EmptyCard, Modal, Page } from "@/components/portal/ui";

// Cleans question text that comes from the API wrapped in p tags / HTML
const cleanQuestionText = (text) => {
  if (!text) return "";
  return text
    .replace(/^p/, "")
    .replace(/\/p$/, "")
    .replace(/<\/?[^>]+(>|$)/g, "");
};

const LETTERS = "ABCDEFGH";

/** Answer choice (design: choiceBtn). */
const ChoiceBtn = ({ letter, label, on, onClick }) => (
  <button
    type="button"
    role="radio"
    aria-checked={on}
    onClick={onClick}
    className={`flex items-center gap-3 w-full text-left rounded-xl border-2 px-4 py-3 transition-colors ${on ? "border-one bg-red-50/60" : "border-slate-200 hover:border-slate-300 bg-white"}`}
  >
    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0 ${on ? "bg-one text-white" : "bg-slate-100 text-slate-600"}`}>{letter}</span>
    <span className="font-semibold text-slate-800 break-words min-w-0">{label}</span>
  </button>
);

const Quiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const { data, loading, error } = useGet(`/api/user/quizzes/${quizId}/questions`);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  // { [questionId]: { questionId, selectedOptionId, gridInAnswer } }
  const [userAnswers, setUserAnswers] = useState({});
  const [confirming, setConfirming] = useState(false);
  const { postData, loading: submitting } = usePost();

  if (error) {
    return (
      <Page>
        <section className="rp-card">
          <p className="text-sm text-red-600 mb-3">{typeof error === "string" ? error : "Could not load this quiz."}</p>
          <button className="pl-btn" onClick={() => navigate(-1)}>← Go back</button>
        </section>
      </Page>
    );
  }
  if (loading || !data) {
    return (
      <Page>
        <div className="skel h-20 mb-4"></div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_16rem] gap-4"><div className="skel h-80"></div><div className="skel h-56"></div></div>
      </Page>
    );
  }

  const questionsList = data?.data?.data || [];

  if (questionsList.length === 0) {
    return (
      <Page>
        <EmptyCard
          title="No questions found"
          text="This quiz doesn't have any questions yet."
          action={<button className="pl-btn" onClick={() => navigate(-1)}>← Go back</button>}
        />
      </Page>
    );
  }

  const currentQuestion = questionsList[currentQuestionIndex];
  const totalQuestions = questionsList.length;
  const isAnswered = (q) => !!(userAnswers[q.id]?.selectedOptionId || userAnswers[q.id]?.gridInAnswer);
  const answeredCount = questionsList.filter(isAnswered).length;
  const unanswered = totalQuestions - answeredCount;

  const handleOptionSelect = (questionId, optionId) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: { questionId, selectedOptionId: optionId, gridInAnswer: null },
    }));
  };

  const handleGridInChange = (questionId, val) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: { questionId, selectedOptionId: null, gridInAnswer: val },
    }));
  };

  // Builds the exact body the backend expects and submits it
  const submitQuiz = async () => {
    setConfirming(false);
    const formattedAnswers = questionsList.map((q) => {
      const savedAns = userAnswers[q.id];
      return {
        questionId: q.id,
        selectedOptionId: savedAns?.selectedOptionId || null,
        gridInAnswer: savedAns?.gridInAnswer || null,
      };
    });
    const payload = { answers: formattedAnswers };

    try {
      const result = await postData(payload, `/api/user/quizzes/${quizId}/submit`, "Quiz submitted successfully!");
      if (result) navigate(-1);
    } catch (err) {
      // usePost already shows the error toast
      console.error("Submission error:", err);
    }
  };

  const askSubmit = () => setConfirming(true);

  // Options in their stored order, lettered A, B, C…
  const options = [...(currentQuestion.options || [])].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  const meta = [
    currentQuestion.difficulty ? `Difficulty ${currentQuestion.difficulty}` : "",
    currentQuestion.year ? `${currentQuestion.month || ""} ${currentQuestion.year}`.trim() : "",
    currentQuestion.questionType || "",
  ].filter(Boolean).join(" · ");
  const isLast = currentQuestionIndex >= totalQuestions - 1;

  return (
    <Page>
      <button className="text-sm font-semibold text-slate-500 hover:text-one mb-4" onClick={() => navigate(-1)}>← Back</button>

      {/* Quiz bar */}
      <section className="rp-card mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Quiz · {answeredCount} of {totalQuestions} answered</p>
          <p className="font-bold text-slate-900">Answer all questions carefully</p>
        </div>
        <button className="pl-btn primary" onClick={askSubmit} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit quiz"}
        </button>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_16rem] gap-4 items-start">
        {/* Question */}
        <section className="rp-card min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <p className="text-sm font-extrabold text-one">
              Question {currentQuestionIndex + 1} <span className="text-slate-400 font-semibold">of {totalQuestions}</span>
            </p>
            {meta && <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{meta}</p>}
          </div>

          {currentQuestion.image && (
            <img
              src={currentQuestion.image}
              alt={`Question ${currentQuestionIndex + 1}`}
              className="max-w-full max-h-[300px] object-contain rounded-xl border border-slate-200 mb-4"
            />
          )}

          <div className="text-base text-slate-900 leading-relaxed mb-5 break-words">
            {cleanQuestionText(currentQuestion.question)}
          </div>

          {currentQuestion.answerType === "MCQ" ? (
            <div className="grid gap-2" role="radiogroup" aria-label="Answer choices">
              {options.map((option, i) => (
                <ChoiceBtn
                  key={option.id}
                  letter={LETTERS[i] || option.order}
                  label={option.answer}
                  on={userAnswers[currentQuestion.id]?.selectedOptionId === option.id}
                  onClick={() => handleOptionSelect(currentQuestion.id, option.id)}
                />
              ))}
            </div>
          ) : (
            <label className="block max-w-xs">
              <span className="text-xs font-bold text-slate-500">Your answer (grid-in)</span>
              <input
                type="text"
                className="input mt-1 text-lg font-bold"
                autoComplete="off"
                value={userAnswers[currentQuestion.id]?.gridInAnswer || ""}
                onChange={(e) => handleGridInChange(currentQuestion.id, e.target.value)}
                placeholder="Enter value…"
              />
            </label>
          )}

          <div className="flex justify-between items-center gap-2 pt-5 mt-6 border-t border-slate-100">
            <button
              className="pl-btn"
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              style={currentQuestionIndex === 0 ? { opacity: 0.45 } : undefined}
            >
              ← Previous
            </button>
            {!isLast ? (
              <button className="pl-btn primary" onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}>Next →</button>
            ) : (
              <button className="pl-btn primary" onClick={askSubmit} disabled={submitting}>Finish quiz</button>
            )}
          </div>
        </section>

        {/* Navigator */}
        <section className="rp-card">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Questions</h3>
          <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-5 gap-2 max-h-[350px] lg:max-h-none overflow-y-auto">
            {questionsList.map((q, idx) => {
              const current = idx === currentQuestionIndex;
              const done = isAnswered(q);
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  aria-label={`Question ${idx + 1}${done ? ", answered" : ""}`}
                  aria-current={current ? "step" : undefined}
                  className={`h-9 rounded-lg border text-xs font-bold transition-colors ${
                    current
                      ? "bg-one text-white border-one"
                      : done
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-white text-slate-500 border-slate-200 border-dashed hover:border-slate-400"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1.5 text-xs text-slate-500">
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-one"></span>Current question</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-green-50 border border-green-200"></span>Answered</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-white border border-dashed border-slate-300"></span>Not answered</span>
          </div>
        </section>
      </div>

      {confirming && (
        <Modal
          title="Submit the quiz?"
          onClose={() => setConfirming(false)}
          actions={
            <>
              <button className="pl-btn" onClick={() => setConfirming(false)}>Keep working</button>
              <button className="pl-btn primary" onClick={submitQuiz} disabled={submitting}>Submit</button>
            </>
          }
        >
          <p>
            {unanswered > 0
              ? <><b className="text-red-600">{unanswered} {unanswered === 1 ? "question is" : "questions are"} not answered.</b> </>
              : "All questions answered. "}
            Are you sure you want to submit your quiz?
          </p>
        </Modal>
      )}
    </Page>
  );
};

export default Quiz;
