import React, { useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost";
import Loader from "@/components/Loading";
import Errorpage from "@/components/Errorpage";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ParallelQuestions from "./ParallelQuestions";

const Review = () => {
  const { attemptId } = useParams();
  const location = useLocation();
  const [expandedRow, setExpandedRow] = useState(null);

  const examResult =
    location.state?.examMode === "exam" ? location.state?.examResult : null;

  const { data, loading, error } = useGet(
    examResult
      ? null
      : `/api/user/diagnostic-exams/attempts/${attemptId}/review`,
  );

  if (examResult) {
    return (
      <ExamResultReview result={examResult} examId={location.state?.examId} />
    );
  }

  const questions = Array.isArray(data?.data?.data)
    ? data.data.data
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data)
        ? data
        : [];

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  if (!questions.length) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500 font-medium">
        No review data found.
      </div>
    );
  }

  const correctQuestions = [];
  const incorrectQuestions = [];

  questions.forEach((q, index) => {
    if (q.isCorrect) {
      correctQuestions.push(index + 1);
    } else {
      incorrectQuestions.push(index + 1);
    }
  });

  const toggleExplanation = (index) => {
    setExpandedRow(expandedRow === index ? null : index);
  };

  const scrollToQuestion = (num) => {
    const el = document.getElementById(`question-${num}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setExpandedRow(num - 1);
    }
  };

  const downloadQuestionsReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Questions Report", 14, 15);
    autoTable(doc, {
      head: [["#", "Question"]],
      body: questions.map((q, index) => [
        index + 1,
        q.questionText.replace(/<[^>]*>/g, ""),
      ]),
      startY: 25,
    });
    doc.save(`questions-report-${attemptId}.pdf`);
  };

  const downloadIncorrectWithRecap = () => {
    const doc = new jsPDF();
    doc.text("Incorrect Questions & Recommendations", 14, 15);
    autoTable(doc, {
      head: [["#", "Question", "Recap Lesson"]],
      body: questions
        .filter((q) => !q.isCorrect)
        .map((q, index) => [
          index + 1,
          q.questionText.replace(/<[^>]*>/g, ""),
          q.recommendationToRecap?.lessonName || "N/A",
        ]),
      startY: 25,
    });
    doc.save(`incorrect-recap-${attemptId}.pdf`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={downloadQuestionsReport}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Download Questions
        </button>
        <button
          onClick={downloadIncorrectWithRecap}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Export Incorrect & Recap
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="flex-1 border border-green-200 bg-green-50 p-6 rounded-xl shadow-sm">
          <h3 className="text-green-800 font-bold text-lg mb-4">
            ✅ Correct ({correctQuestions.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {correctQuestions.map((num) => (
              <button
                key={num}
                onClick={() => scrollToQuestion(num)}
                className="w-12 h-12 rounded-lg bg-white border border-green-200 text-green-700 font-semibold shadow-sm hover:scale-105 transition"
              >
                {num}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 border border-red-200 bg-red-50 p-6 rounded-xl shadow-sm">
          <h3 className="text-red-800 font-bold text-lg mb-4">
            ❌ Incorrect ({incorrectQuestions.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {incorrectQuestions.map((num) => (
              <button
                key={num}
                onClick={() => scrollToQuestion(num)}
                className="w-12 h-12 rounded-lg bg-white border border-red-200 text-red-700 font-semibold shadow-sm hover:scale-105 transition"
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {questions.map((q, index) => (
          <div
            key={q.questionId}
            id={`question-${index + 1}`}
            className={`p-5 rounded-xl border shadow-sm ${
              q.isCorrect
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg text-slate-800">
                Question {index + 1}
              </h3>
              <span
                className={`px-3 py-1 text-sm rounded-full font-medium ${
                  q.isCorrect
                    ? "bg-green-200 text-green-800"
                    : "bg-red-200 text-red-800"
                }`}
              >
                {q.isCorrect ? "Correct" : "Wrong Answer"}
              </span>
            </div>

            <div
              className="mb-4 text-slate-700"
              dangerouslySetInnerHTML={{ __html: q.questionText }}
            />

            <button
              onClick={() => toggleExplanation(index)}
              className="mt-2 px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-all font-semibold shadow-md"
            >
              {expandedRow === index ? "Hide explanation" : "View explanation"}
            </button>

            {expandedRow === index && (
              <div className="mt-4 p-4 bg-white border rounded-lg shadow-inner">
                <h4 className="font-bold mb-3 text-slate-700 border-b pb-2">
                  💡 Explanation & Recap
                </h4>

                {q.explanation && q.explanation.length > 0
                  ? q.explanation.map((expl, idx) => (
                      <div key={expl.id || idx}>
                        {expl.answerText && (
                          <div className="mb-4">
                            <p className="text-xs font-bold text-gray-400 uppercase">
                              Explanation by Text
                            </p>
                            <div
                              className="text-sm text-gray-700"
                              dangerouslySetInnerHTML={{
                                __html: expl.answerText,
                              }}
                            />
                          </div>
                        )}
                        {expl.answerImage && (
                          <div className="mb-4">
                            <p className="text-xs font-bold text-gray-400 uppercase">
                              Explanation by Image
                            </p>
                            <img
                              src={expl.answerImage}
                              className="w-full max-w-xs rounded border"
                              alt="Explanation"
                            />
                          </div>
                        )}
                        {expl.answerVideo && (
                          <div className="mb-4">
                            <p className="text-xs font-bold text-gray-400 uppercase">
                              Explanation by Video
                            </p>
                            <video controls className="w-full rounded">
                              <source src={expl.answerVideo} type="video/mp4" />
                            </video>
                          </div>
                        )}
                        {expl.answerPdf && (
                          <div className="mb-4">
                            <p className="text-xs font-bold text-gray-400 uppercase">
                              Explanation by PDF
                            </p>
                            <a
                              href={expl.answerPdf}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-blue-600 underline"
                            >
                              View Document
                            </a>
                          </div>
                        )}
                      </div>
                    ))
                  : !q.recommendationToRecap && (
                      <p className="text-gray-400 text-sm">
                        No explanation available.
                      </p>
                    )}

                {q.recommendationToRecap && (
                  <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-100 text-sm">
                    <p className="font-bold text-blue-800">
                      Recommended Recap:
                    </p>
                    <p>Course: {q.recommendationToRecap.courseName}</p>
                    <p>Chapter: {q.recommendationToRecap.chapterName}</p>
                    <p>Lesson: {q.recommendationToRecap.lessonName}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Exam Result Review Component
const ExamResultReview = ({ result, examId }) => {
  const {
    attemptId,
    score = 0,
    totalScore = 0,
    passScore = 0,
    isPassed = false,
    mistakes = [],
    studentBalances,
    examHasAnswers = false,
  } = result || {};

  const { questionBalance, examBalance } = studentBalances || {};

  const [answersUrl, setAnswersUrl] = useState(null);
  const [loadingParallelId, setLoadingParallelId] = useState(null);
  const [parallelData, setParallelData] = useState(null);
  // Tracks which individual questions currently have their answer revealed.
  const [revealedAnswerIds, setRevealedAnswerIds] = useState([]);

  const { postData } = usePost();

  const { data: answersData, loading: answersLoading } = useGet(answersUrl);

  // Reveals (or hides) the answer for a single question instead of a global
  // "Show Answers" button, so we don't render the whole question list twice.
  const handleToggleAnswer = (questionId) => {
    if (!examHasAnswers || !examId || !attemptId) return;

    if (!answersUrl) {
      setAnswersUrl(`/api/user/exams/${examId}/attempts/${attemptId}/answers`);
    }

    setRevealedAnswerIds((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId],
    );
  };

  const handleSolveParallel = async (questionId) => {
    try {
      setLoadingParallelId(questionId);

      const resData = await postData(
        {
          attemptId: attemptId,
          questionIds: [questionId],
        },
        "https://bcknd.mathshouse.net/api/user/exams/parallel/questions",
        "Parallel question requested successfully",
      );

      setParallelData(resData?.data ?? null);

      // Navigate the user down to the parallel-questions panel once it renders.
      requestAnimationFrame(() => {
        document
          .getElementById("parallel-questions-panel")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      console.error("Error solving parallel question:", err);
    } finally {
      setLoadingParallelId(null);
    }
  };

  const answerItems = answersData?.data?.questions || null;
  const stripHtml = (text) => (text || "").toString().replace(/<[^>]*>/g, "");

  // Finds the fetched answer data that matches a given mistake row.
  const getAnswerFor = (questionId) =>
    answerItems?.find(
      (q) => q.questionId === questionId || q.id === questionId,
    ) || null;

  const downloadQuestionsReport = () => {
    const questionsList = answerItems || mistakes;
    if (!questionsList || questionsList.length === 0) {
      alert("No question data available to download.");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Questions Report", 14, 15);
    autoTable(doc, {
      head: [["#", "Question"]],
      body: questionsList.map((q, index) => [
        q.questionOrder ?? index + 1,
        stripHtml(q.questionText || q.question),
      ]),
      startY: 25,
    });
    doc.save(`questions-report-${attemptId}.pdf`);
  };

  const downloadQuestionsAnswersReport = () => {
    if (!answerItems) {
      alert("Please click 'Show Answers' first to load the Q&A data.");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Questions & Answers Report", 14, 15);
    autoTable(doc, {
      head: [["#", "Question", "Student Answer", "Correct Answer", "Result"]],
      body: answerItems.map((q, index) => {
        const isMCQ = q.answerType === "MCQ";
        let studentAnsText = "Unanswered";

        if (isMCQ && q.studentAnswer?.selectedOptionId) {
          const opt = q.options?.find(
            (o) => o.id === q.studentAnswer.selectedOptionId,
          );
          if (opt) studentAnsText = opt.answer;
        } else if (!isMCQ && q.studentAnswer?.gridInAnswer) {
          studentAnsText = q.studentAnswer.gridInAnswer;
        }

        let correctAnsText = q.correctAnswer?.answer || "—";

        return [
          q.questionOrder ?? index + 1,
          stripHtml(q.questionText),
          stripHtml(studentAnsText),
          stripHtml(correctAnsText),
          q.studentAnswer?.isCorrect ? "Correct" : "Wrong",
        ];
      }),
      startY: 25,
      styles: { cellWidth: "wrap", overflow: "linebreak" },
      columnStyles: { 1: { cellWidth: 70 } },
    });
    doc.save(`questions-answers-report-${attemptId}.pdf`);
  };

  const downloadIncorrectWithRecap = () => {
    if (!mistakes || mistakes.length === 0) {
      alert("No mistakes to export.");
      return;
    }
    const doc = new jsPDF();
    doc.text("Incorrect Questions & Recommendations", 14, 15);
    autoTable(doc, {
      head: [["#", "Question", "Recap Lesson"]],
      body: mistakes.map((m, index) => [
        index + 1,
        stripHtml(m.question),
        "N/A",
      ]),
      startY: 25,
    });
    doc.save(`incorrect-recap-${attemptId}.pdf`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={downloadQuestionsReport}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Download Questions
        </button>

        {examHasAnswers && (
          <button
            onClick={downloadQuestionsAnswersReport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Download Q&A Report
          </button>
        )}

        <button
          onClick={downloadIncorrectWithRecap}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Export Incorrect & Recap
        </button>
      </div>

      {parallelData && (
        <div id="parallel-questions-panel" className="mb-8">
          <ParallelQuestions
            data={parallelData}
            onClose={() => setParallelData(null)}
          />
        </div>
      )}

      <div
        className={`mb-8 p-6 rounded-xl border shadow-sm flex flex-wrap items-center justify-between gap-4 ${
          isPassed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
        }`}
      >
        <div>
          <h2 className="text-xl font-bold text-slate-800">Exam Result</h2>
          <p className="text-slate-600 mt-1">
            Score: <span className="font-semibold">{score}</span> / {totalScore}{" "}
            &nbsp;•&nbsp; Passing score: {passScore}
          </p>
        </div>
        <span
          className={`px-4 py-2 rounded-full font-bold text-sm ${
            isPassed ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
          }`}
        >
          {isPassed ? "✅ Passed" : "❌ Not Passed"}
        </span>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">
              Exam Balance
            </p>
            <p className="text-lg font-semibold text-slate-800">
              {examBalance ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">
              Question Balance
            </p>
            <p className="text-lg font-semibold text-slate-800">
              {questionBalance ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Questions to Review (Mistakes) Section */}
      <h3 className="font-bold text-lg text-slate-800 mb-4">
        Questions to Review ({mistakes.length})
      </h3>

      {mistakes.length === 0 ? (
        <p className="text-gray-500">No mistakes — great job!</p>
      ) : (
        <div className="space-y-5">
          {mistakes.map((m, index) => {
            const isMCQ = m.answerType === "MCQ";
            const isRevealed = revealedAnswerIds.includes(m.id);
            const answer = isRevealed ? getAnswerFor(m.id) : null;
            const studentAnswerId = answer?.studentAnswer?.selectedOptionId;
            const correctOptionId = answer?.correctAnswer?.id;

            return (
              <div
                key={m.id}
                className="p-5 rounded-xl border shadow-sm bg-red-50 border-red-200"
              >
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-lg text-slate-800">
                    Question {index + 1}
                  </h4>
                  <span className="px-3 py-1 text-sm rounded-full font-medium bg-red-200 text-red-800">
                    Wrong Answer
                  </span>
                </div>

                <p className="mb-4 text-slate-700">{stripHtml(m.question)}</p>

                {isMCQ && (
                  <div className="space-y-2 mb-4">
                    {m.options?.map((opt) => {
                      let optClass = "border-gray-200 bg-white text-slate-600";

                      if (isRevealed) {
                        const isSelected = opt.id === studentAnswerId;
                        const isOptCorrect = opt.id === correctOptionId;

                        if (isOptCorrect) {
                          optClass =
                            "border-green-500 bg-green-100 text-green-900 font-semibold";
                        } else if (isSelected && !isOptCorrect) {
                          optClass = "border-red-400 bg-red-100 text-red-900";
                        }
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`px-4 py-2 rounded-lg border text-sm ${optClass}`}
                        >
                          {opt.order ? `${opt.order}. ` : ""}
                          {opt.answer}
                        </div>
                      );
                    })}
                  </div>
                )}

                {!isMCQ && isRevealed && (
                  <div className="mb-4 space-y-2 bg-white p-3 rounded border border-gray-200 text-sm">
                    <p className="text-slate-700">
                      <span className="font-bold">Your Answer:</span>{" "}
                      {answer?.studentAnswer?.gridInAnswer ?? "Unanswered"}
                    </p>
                    <p className="text-slate-700">
                      <span className="font-bold">Correct Answer:</span>{" "}
                      {answer?.correctAnswer?.answer ?? "—"}
                    </p>
                  </div>
                )}

                {isRevealed && answer?.explanation?.length > 0 && (
                  <div className="mb-4 p-4 bg-white border rounded-lg shadow-inner">
                    <h4 className="font-bold mb-3 text-slate-700 border-b pb-2">
                      💡 Explanation
                    </h4>
                    {answer.explanation.map((expl, idx) => (
                      <div key={expl.id || idx}>
                        {expl.answerText && (
                          <div className="mb-4">
                            <p className="text-xs font-bold text-gray-400 uppercase">
                              Explanation by Text
                            </p>
                            <div
                              className="text-sm text-gray-700"
                              dangerouslySetInnerHTML={{
                                __html: expl.answerText,
                              }}
                            />
                          </div>
                        )}
                        {expl.answerImage && (
                          <div className="mb-4">
                            <p className="text-xs font-bold text-gray-400 uppercase">
                              Explanation by Image
                            </p>
                            <img
                              src={expl.answerImage}
                              className="w-full max-w-xs rounded border"
                              alt="Explanation"
                            />
                          </div>
                        )}
                        {expl.answerVideo && (
                          <div className="mb-4">
                            <p className="text-xs font-bold text-gray-400 uppercase">
                              Explanation by Video
                            </p>
                            <video controls className="w-full rounded">
                              <source src={expl.answerVideo} type="video/mp4" />
                            </video>
                          </div>
                        )}
                        {expl.answerPdf && (
                          <div className="mb-4">
                            <p className="text-xs font-bold text-gray-400 uppercase">
                              Explanation by PDF
                            </p>
                            <a
                              href={expl.answerPdf}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-blue-600 underline"
                            >
                              View Document
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {examHasAnswers && (
                    <button
                      onClick={() => handleToggleAnswer(m.id)}
                      disabled={answersLoading}
                      className="mt-2 px-4 py-2 bg-slate-800 text-white font-semibold text-sm rounded-lg hover:bg-slate-900 transition disabled:opacity-50"
                    >
                      {answersLoading && !isRevealed
                        ? "Loading..."
                        : isRevealed
                          ? "Hide Answer"
                          : "Show Answer"}
                    </button>
                  )}

                  {m.hasParallel && (
                    <button
                      onClick={() => handleSolveParallel(m.id)}
                      disabled={loadingParallelId === m.id}
                      className="mt-2 px-4 py-2 bg-indigo-600 text-white font-semibold text-sm rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                      {loadingParallelId === m.id
                        ? "Loading..."
                        : "Solve Parallel"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Review;
