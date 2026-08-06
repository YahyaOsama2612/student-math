import React, { useState } from "react";
import usePost from "@/hooks/usePost";

/**
 * Renders the "parallelQuestions" payload returned by:
 *   POST /api/user/exams/parallel/questions
 *
 * Pass in the `data` object exactly as it comes back from the API, e.g.
 *
 *   {
 *     message: "Parallel questions fetched successfully",
 *     parallelAttemptId: "c8601003-...",
 *     balanceDeducted: 1,
 *     remainingQuestionBalance: 1,
 *     parallelQuestions: [ { id, question, answerType, difficulty, options } ]
 *   }
 *
 * Usage inside Review.jsx's ExamResultReview component:
 *
 *   const [parallelData, setParallelData] = useState(null);
 *
 *   const handleSolveParallel = async (questionId) => {
 *     setLoadingParallelId(questionId);
 *     const resData = await postData(
 *       { attemptId, questionIds: [questionId] },
 *       "https://bcknd.mathshouse.net/api/user/exams/parallel/questions",
 *       "Parallel question requested successfully"
 *     );
 *     setParallelData(resData?.data ?? null);
 *     setLoadingParallelId(null);
 *   };
 *
 *   {parallelData && (
 *     <ParallelQuestions data={parallelData} onClose={() => setParallelData(null)} />
 *   )}
 *
 * On "Submit Answers", the component itself calls:
 *   POST /api/user/exams/parallel/{parallelAttemptId}/submit
 * with body { answers: [{ questionId, originalQuestionId, selectedOptionId, gridInAnswer }] }
 */
const DIFFICULTY_LABEL = { E: "Easy", M: "Medium", H: "Hard" };
const DIFFICULTY_CLASS = {
  E: "bg-green-100 text-green-700",
  M: "bg-yellow-100 text-yellow-700",
  H: "bg-red-100 text-red-700",
};

const ParallelQuestions = ({ data, onClose, onSubmitted }) => {
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [gridAnswers, setGridAnswers] = useState({});
  const [result, setResult] = useState(null);

  const { postData, loading: submitting } = usePost();

  if (!data) return null;

  const {
    message,
    parallelAttemptId,
    remainingQuestionBalance,
    parallelQuestions = [],
  } = data;

  if (!parallelQuestions.length) {
    return (
      <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm text-gray-500">
        No parallel questions found.
      </div>
    );
  }

  const selectOption = (questionId, optionId) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const setGridAnswer = (questionId, value) => {
    setGridAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!parallelAttemptId) return;

    const answers = parallelQuestions.map((q) => ({
      questionId: q.id,
      originalQuestionId: q.originalQuestionId,
      selectedOptionId: selectedAnswers[q.id] ?? null,
      gridInAnswer: gridAnswers[q.id] ?? null,
    }));

    try {
      const resData = await postData(
        { answers },
        `/api/user/exams/parallel/${parallelAttemptId}/submit`,
        "Parallel answers submitted successfully",
      );

      setResult(resData?.data ?? resData ?? null);
      onSubmitted?.(resData);
    } catch (err) {
      // usePost already shows an error toast; nothing else to do here.
      console.error("Error submitting parallel answers:", err);
    }
  };

  const allAnswered = parallelQuestions.every((q) =>
    q.answerType === "MCQ"
      ? Boolean(selectedAnswers[q.id])
      : Boolean(gridAnswers[q.id]),
  );

  return (
    <div className="p-5 rounded-xl border border-indigo-200 bg-indigo-50 shadow-sm">
      <div className="flex justify-between items-start mb-4 gap-3">
        <div>
          <h4 className="font-bold text-lg text-slate-800">
            🧩 Parallel Questions
          </h4>
          {message && <p className="text-sm text-slate-500 mt-1">{message}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-white border border-indigo-200 text-indigo-700 whitespace-nowrap">
            Balance left: {remainingQuestionBalance ?? "—"}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 font-bold text-lg leading-none"
              aria-label="Close parallel questions"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {parallelQuestions.map((q, index) => {
          const isMCQ = q.answerType === "MCQ";
          const selectedOptionId = selectedAnswers[q.id];

          return (
            <div
              key={q.id}
              className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              <div className="flex justify-between items-center mb-3 gap-3">
                <h5 className="font-semibold text-slate-800">
                  Parallel Question {index + 1}
                </h5>
                {q.difficulty && (
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                      DIFFICULTY_CLASS[q.difficulty] ||
                      "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {DIFFICULTY_LABEL[q.difficulty] || q.difficulty}
                  </span>
                )}
              </div>

              <div
                className="mb-4 text-slate-700"
                dangerouslySetInnerHTML={{ __html: q.question }}
              />

              {isMCQ ? (
                <div className="space-y-2">
                  {q.options?.map((opt) => {
                    const isSelected = opt.id === selectedOptionId;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => selectOption(q.id, opt.id)}
                        className={`w-full text-left px-4 py-2 rounded-lg border transition ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-100 text-indigo-900 font-semibold"
                            : "border-gray-200 bg-white text-slate-600 hover:bg-gray-50"
                        }`}
                      >
                        {opt.order ? `${opt.order}. ` : ""}
                        {opt.answer}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  type="text"
                  value={gridAnswers[q.id] || ""}
                  onChange={(e) => setGridAnswer(q.id, e.target.value)}
                  placeholder="Your answer"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              )}
            </div>
          );
        })}
      </div>

      {result && (
        <div className="mt-4 p-4 rounded-lg border border-green-200 bg-green-50 text-sm text-green-800">
          <p className="font-semibold">
            {result.message || "Answers submitted."}
          </p>
          {(result.score !== undefined || result.totalScore !== undefined) && (
            <p className="mt-1">
              Score: {result.score ?? "—"}
              {result.totalScore !== undefined ? ` / ${result.totalScore}` : ""}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        {parallelAttemptId && (
          <p className="text-xs text-gray-400">
            Attempt ID: {parallelAttemptId}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allAnswered || submitting || Boolean(result)}
          className={`px-5 py-2 rounded-lg font-semibold shadow-md transition-all ${
            allAnswered && !submitting && !result
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {submitting
            ? "Submitting..."
            : result
              ? "Submitted"
              : "Submit Answers"}
        </button>
      </div>
    </div>
  );
};

export default ParallelQuestions;
