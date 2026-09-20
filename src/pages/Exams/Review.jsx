import React, { useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost";
import Loader from "@/components/Loading";
import Errorpage from "@/components/Errorpage";
import ParallelQuestions from "./ParallelQuestions";
import DiagnosticReviewDashboard from "@/components/DiagnosticReview/DiagnosticReviewDashboard";
import { ShoppingCart, BarChart3, Lightbulb } from "lucide-react";
import {
  ArrowRight,
  Check,
  Clock3,
  Download,
  Eye,
  FileText,
  HelpCircle,
  Repeat2,
  X,
  Zap,
} from "lucide-react";

const BRAND = "#8B1A1A";
const BRAND_DARK = "#701515";

const Review = () => {
  const { attemptId, examId: examIdParam } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedRow, setExpandedRow] = useState(null);
  const [loadingParallelId, setLoadingParallelId] = useState(null);
  const [parallelData, setParallelData] = useState(null);
  const [showReports, setShowReports] = useState(false);
  const [showQuestionsReport, setShowQuestionsReport] = useState(false);
  const [showRecapReport, setShowRecapReport] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  // Submit endpoint replies { success, data: { sectionResult, examResult } }.
  // Accept the full response, its `data`, or `examResult` itself.
  const rawExamResult =
    location.state?.examMode === "exam" ? location.state?.examResult : null;
  const examResult =
    rawExamResult?.data?.examResult ??
    rawExamResult?.examResult ??
    rawExamResult ??
    null;
  // examId is not part of the submit response; it comes from the route or state.
  const examId = examIdParam || location.state?.examId || null;

  const { data, loading, error } = useGet(
    examResult
      ? null
      : `/api/user/diagnostic-exams/attempts/${attemptId}/review`,
  );

  const { postData } = usePost();

  if (examResult) {
    return (
      <ExamResultReview
        result={{ ...examResult, attemptId: examResult.attemptId || attemptId }}
        examId={examId}
      />
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

  return (
    <DiagnosticReviewDashboard
      data={{
        ...data?.data,
        questions,
        examTitle: data?.data?.examTitle || data?.data?.title,
      }}
      attemptId={attemptId}
      onCheckout={(checkoutState) =>
        navigate("/user/enrollment", {
          state: {
            ...checkoutState,
            source: "diagnostic-review-cart",
            attemptId,
          },
        })
      }
    />
  );

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

  const handleSolveParallel = async (questionId) => {
    try {
      setLoadingParallelId(questionId);

      const resData = await postData(
        {
          attemptId: attemptId,
          questionIds: [questionId],
        },
        "https://bcknd.mathshouse.net/api/user/diagnostic-exams/parallel/questions",
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

  const handleNavigateToBuy = (questionId, topic) => {
    navigate("/user/payment", {
      state: {
        source: "diagnostic-review",
        questionId,
        topic,
        attemptId,
      },
    });
  };

  const recommendationRows = questions
    .filter((q) => q?.recommendationToRecap)
    .map((q, idx) => ({
      questionNo: idx + 1,
      questionId: q.questionId,
      questionText: q.questionText,
      lessonName: q.recommendationToRecap?.lessonName,
      chapterName: q.recommendationToRecap?.chapterName,
      courseName: q.recommendationToRecap?.courseName,
    }));

  const exportReportsToPDF = async () => {
    const element = document.getElementById("reports-section");
    if (!element) {
      alert("Reports not found. Please open reports first.");
      return;
    }

    setExportingPDF(true);

    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        proxy: "",
        ignoreElements: (el) => el?.id === "parallel-questions-panel",
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const filename = `diagnostic-exam-reports-${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename, { returnPromise: false });
    } catch (err) {
      console.error("PDF export error:", err);
      alert(
        "Failed to export PDF. Please try again or open the reports section.",
      );
    } finally {
      setExportingPDF(false);
    }
  };

  const studentBalances = data?.data?.studentBalances;
  const { packageBalance } = studentBalances || {};

  return (
    <div className="p-6 max-w-6xl mx-auto">
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

      {packageBalance !== undefined && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">
                Remaining Packages
              </p>
              <p className="text-lg font-semibold text-slate-800">
                {packageBalance ?? "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostic Reports Section */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={() => setShowReports(!showReports)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition shadow-md"
          >
            <BarChart3 size={20} />
            {showReports ? "Hide Reports" : "View Reports"}
          </button>

          {showReports && (
            <>
              <button
                onClick={() => {
                  setShowQuestionsReport(true);
                  setShowRecapReport(false);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-800 transition shadow-md"
              >
                <BarChart3 size={20} />
                Questions Report
              </button>

              <button
                onClick={() => {
                  setShowQuestionsReport(false);
                  setShowRecapReport(true);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition shadow-md"
              >
                <Lightbulb size={20} />
                Recommendation Recap
              </button>

              <button
                onClick={exportReportsToPDF}
                disabled={exportingPDF}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportingPDF ? (
                  <>
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Export PDF
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {showReports && (
          <div
            id="reports-section"
            className="mt-6 space-y-6 p-6 bg-white rounded-xl"
          >
            {showQuestionsReport && (
              <div
                id="questions-report-section"
                className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-indigo-200 rounded-xl shadow-sm"
              >
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="text-indigo-600" size={24} />
                  <h3 className="text-lg font-bold text-indigo-900">
                    Questions Report
                  </h3>
                </div>

                <div className="overflow-x-auto rounded-xl border border-indigo-100 bg-white">
                  <table className="min-w-full text-sm">
                    <thead className="bg-indigo-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-indigo-900">
                          Question No
                        </th>
                        <th className="px-4 py-3 text-left font-bold text-indigo-900">
                          Question
                        </th>
                        <th className="px-4 py-3 text-left font-bold text-indigo-900">
                          Lesson
                        </th>
                        <th className="px-4 py-3 text-left font-bold text-indigo-900">
                          Chapter
                        </th>
                        <th className="px-4 py-3 text-left font-bold text-indigo-900">
                          Course
                        </th>
                        <th className="px-4 py-3 text-left font-bold text-indigo-900">
                          Result
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {questions.map((q, idx) => (
                        <tr
                          key={q.questionId}
                          className="border-t border-indigo-100"
                        >
                          <td className="px-4 py-3 font-semibold text-slate-700">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <span
                              className="line-clamp-2"
                              dangerouslySetInnerHTML={{
                                __html: q.questionText || "—",
                              }}
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {q.recommendationToRecap?.lessonName || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {q.recommendationToRecap?.chapterName || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {q.recommendationToRecap?.courseName || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                q.isCorrect
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {q.isCorrect ? "Correct" : "Wrong Answer"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {showRecapReport && (
              <div
                id="recommendation-report-section"
                className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl shadow-sm"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="text-amber-600" size={24} />
                  <h3 className="text-lg font-bold text-amber-900">
                    Recommendation Recap
                  </h3>
                </div>

                <div className="overflow-x-auto rounded-xl border border-amber-100 bg-white">
                  <table className="min-w-full text-sm">
                    <thead className="bg-amber-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-amber-900">
                          Question No
                        </th>
                        <th className="px-4 py-3 text-left font-bold text-amber-900">
                          Question
                        </th>
                        <th className="px-4 py-3 text-left font-bold text-amber-900">
                          Lesson
                        </th>
                        <th className="px-4 py-3 text-left font-bold text-amber-900">
                          Chapter
                        </th>
                        <th className="px-4 py-3 text-left font-bold text-amber-900">
                          Course
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recommendationRows.length > 0 ? (
                        recommendationRows.map((row) => (
                          <tr
                            key={row.questionId}
                            className="border-t border-amber-100"
                          >
                            <td className="px-4 py-3 font-semibold text-slate-700">
                              {row.questionNo}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              <span
                                className="line-clamp-2"
                                dangerouslySetInnerHTML={{
                                  __html: row.questionText || "—",
                                }}
                              />
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {row.lessonName || "—"}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {row.chapterName || "—"}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {row.courseName || "—"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="6"
                            className="px-4 py-3 text-sm text-green-700"
                          >
                            ✨ Excellent performance! You've answered all
                            questions correctly. Keep practicing to maintain
                            your level!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
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

            {q.recommendationToRecap && (
              <div className="mt-4 p-4 rounded-xl border border-amber-100 bg-amber-50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-amber-700 uppercase">
                      Recommendation Recap
                    </p>
                    <p className="text-sm text-slate-700 mt-2">
                      <span className="font-semibold">Lesson:</span>{" "}
                      {q.recommendationToRecap.lessonName || "—"}
                    </p>
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">Chapter:</span>{" "}
                      {q.recommendationToRecap.chapterName || "—"}
                    </p>
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">Course:</span>{" "}
                      {q.recommendationToRecap.courseName || "—"}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleNavigateToBuy(
                        q.questionId,
                        q.recommendationToRecap?.lessonName ||
                          q.recommendationToRecap?.chapterName ||
                          "Diagnostic review",
                      )
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm rounded-lg hover:from-amber-600 hover:to-orange-600 transition shadow-sm"
                  >
                    <ShoppingCart size={16} />
                    Buy
                  </button>
                </div>
              </div>
            )}

            {q.hasParallel && (
              <button
                onClick={() => handleSolveParallel(q.questionId)}
                disabled={loadingParallelId === q.questionId}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white font-semibold text-sm rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {loadingParallelId === q.questionId
                  ? "Loading..."
                  : "Solve Parallel"}
              </button>
            )}
          </div>
        ))}
      </div>

      {parallelData && (
        <div id="parallel-questions-panel" className="mt-8">
          <ParallelQuestions data={parallelData} />
        </div>
      )}
    </div>
  );
};

// Exam Result Review Component
const formatReportDate = (value) =>
  new Date(value || Date.now()).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

// Recommendation recap — mirrors DiagnosticReviewDashboard's Recommendations
// section (selectable cards, select all / clear all, sticky checkout bar),
// adapted to the lesson-only shape the exam answers endpoint returns.
const ExamRecapRecommendations = ({
  lessons,
  loading,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
  onCheckout,
}) => {
  const allSelected =
    lessons.length > 0 &&
    lessons.every((lesson) => selectedIds.includes(lesson.lessonId));

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div
            className="rounded-2xl border border-red-100 bg-red-50 p-3"
            style={{ color: BRAND }}
          >
            <Zap size={26} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Recommendation Recap
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Lessons worth reviewing based on this attempt.
            </p>
          </div>
        </div>
        {lessons.length > 0 && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onSelectAll}
              disabled={allSelected}
              className="rounded-lg px-4 py-2 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: BRAND }}
            >
              Select All
            </button>
            <button
              type="button"
              onClick={onClearAll}
              disabled={!selectedIds.length}
              className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {loading && !lessons.length ? (
        <p className="rounded-xl bg-slate-50 p-6 text-center text-sm font-medium text-slate-600">
          Loading recommendations...
        </p>
      ) : lessons.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson, idx) => {
            const selected = selectedIds.includes(lesson.lessonId);
            return (
              <label
                key={lesson.lessonId || idx}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${
                  selected
                    ? "border-[#8B1A1A] bg-red-50/50 shadow-sm"
                    : "border-transparent bg-slate-50 hover:border-slate-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggle(lesson)}
                  className="mt-1 h-5 w-5 cursor-pointer accent-[#8B1A1A]"
                  aria-label={`Select ${lesson.lessonName}`}
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Lesson {idx + 1}
                  </p>
                  <p className="mt-0.5 font-bold leading-tight text-slate-900">
                    {lesson.lessonName || "—"}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl bg-emerald-50 p-6 text-center text-sm font-medium text-emerald-800">
          ✨ No specific lessons recommended — solid performance across the
          board!
        </p>
      )}

      {selectedIds.length > 0 && (
        <div
          className="sticky bottom-0 z-20 mt-8 flex flex-col items-start justify-between gap-4 rounded-b-2xl border-t-4 bg-white p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] sm:flex-row sm:items-center"
          style={{ borderTopColor: BRAND }}
        >
          <div>
            <p className="text-sm font-medium text-slate-500">Selected</p>
            <p className="text-2xl font-bold text-slate-900">
              {selectedIds.length}{" "}
              {selectedIds.length === 1 ? "lesson" : "lessons"}
            </p>
          </div>
          <button
            type="button"
            onClick={onCheckout}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-8 py-3 font-bold text-white shadow-lg transition hover:-translate-y-0.5 sm:w-auto"
            style={{ backgroundColor: BRAND }}
          >
            Proceed to Enrollment <ArrowRight size={20} />
          </button>
        </div>
      )}
    </section>
  );
};

// A4-styled report preview + download modal — mirrors
// DiagnosticReviewDashboard's ReportPreview, driven by this exam attempt's
// own data (mistakes with lesson names, recommended lessons).
const REPORT_META = {
  pdf: { file: "Exam Results Report.pdf", heading: "Exam Results Report" },
  qa: {
    file: "Questions & Answers Report.pdf",
    heading: "Questions & Answers Report",
  },
  report: {
    file: "Detailed Exam Report.pdf",
    heading: "Detailed Exam Report",
  },
};

const REPORT_FILENAME_BASE = {
  pdf: "exam-results",
  qa: "questions-answers",
  report: "detailed-exam",
};

const ExamReportPreview = ({
  report,
  summary,
  mistakeItems,
  qaItems,
  recommendedLessons,
  onClose,
  onDownload,
  downloading,
}) => {
  const isPdf = report === "pdf";
  const isQA = report === "qa";
  const meta = REPORT_META[report] || REPORT_META.pdf;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-6">
      <div className="flex h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-slate-100 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b bg-white px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-50 p-2" style={{ color: BRAND }}>
              <FileText size={22} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">{meta.file}</h2>
              <p className="text-xs font-medium text-slate-500">
                Preview Mode · A4 Document
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: BRAND }}
            >
              <Download size={17} />
              {downloading
                ? "Preparing..."
                : `Download ${isPdf ? "PDF" : "Report"}`}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close report preview"
              className="rounded-xl p-2.5 text-slate-500 hover:bg-red-50"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-200/70 p-4 sm:p-8">
          <article
            data-report-document={report}
            className={`mx-auto w-full max-w-[210mm] bg-white shadow-xl ${
              isPdf ? "h-[297mm] overflow-hidden" : "min-h-[297mm]"
            }`}
          >
            <header
              className="flex items-end justify-between border-b-4 px-8 pb-6 pt-10 sm:px-12"
              style={{ borderColor: BRAND }}
            >
              <div className="flex items-center gap-2">
                <div className="text-5xl font-bold" style={{ color: BRAND }}>
                  π
                </div>
                <div className="text-xl font-black leading-none text-slate-900">
                  MATHS
                  <br />
                  HOUSE
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-xl font-bold text-slate-900 sm:text-3xl">
                  {meta.heading}
                </h1>
                <p className="text-sm font-medium text-slate-600">
                  {summary.title}
                </p>
              </div>
            </header>
            <div className="px-8 py-8 sm:px-12">
              <div className="mb-8 grid grid-cols-3 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Date
                  </p>
                  <p className="font-bold text-slate-900">{summary.date}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Questions
                  </p>
                  <p className="font-bold text-slate-900">{summary.total}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Score
                  </p>
                  <p className="font-bold" style={{ color: BRAND }}>
                    {summary.percentage}%
                  </p>
                </div>
              </div>
              {isPdf ? (
                <>
                  <h3
                    className="mb-6 inline-block rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-xl font-bold"
                    style={{ color: BRAND }}
                  >
                    Detailed Mistakes Analysis ({mistakeItems.length} Questions)
                  </h3>
                  <div className="space-y-8">
                    {mistakeItems.length ? (
                      mistakeItems.map((question) => (
                        <div
                          key={question.id}
                          className="break-inside-avoid"
                          style={{
                            breakInside: "avoid",
                            pageBreakInside: "avoid",
                          }}
                        >
                          <div
                            className="mb-3 flex items-center justify-between rounded-lg border-l-4 bg-slate-50 p-2"
                            style={{ borderColor: BRAND }}
                          >
                            <span
                              className="rounded border border-slate-100 bg-white px-3 py-1 text-sm font-bold"
                              style={{ color: BRAND }}
                            >
                              Question {question.number}
                            </span>
                            <span className="text-sm font-bold text-slate-700">
                              {question.lessonName || "—"}
                            </span>
                          </div>
                          {question.image ? (
                            <img
                              src={question.image}
                              alt={`Question ${question.number}`}
                              className="h-28 w-full rounded-xl border border-slate-200 object-contain p-2"
                            />
                          ) : (
                            <p className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                              {question.questionText}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="rounded-xl bg-emerald-50 p-8 text-center font-bold text-emerald-700">
                        Perfect score! No mistakes found.
                      </p>
                    )}
                  </div>
                </>
              ) : isQA ? (
                <>
                  <h3
                    className="mb-6 inline-block rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-xl font-bold"
                    style={{ color: BRAND }}
                  >
                    Questions &amp; Answers ({qaItems.length} Questions)
                  </h3>
                  <div className="space-y-6">
                    {qaItems.length ? (
                      qaItems.map((question) => (
                        <div
                          key={question.id}
                          className="rounded-xl border border-slate-200 p-4"
                          style={{
                            breakInside: "avoid",
                            pageBreakInside: "avoid",
                          }}
                        >
                          <div
                            className="mb-3 flex items-center justify-between rounded-lg border-l-4 bg-slate-50 p-2"
                            style={{ borderColor: BRAND }}
                          >
                            <span
                              className="rounded border border-slate-100 bg-white px-3 py-1 text-sm font-bold"
                              style={{ color: BRAND }}
                            >
                              Question {question.number}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                question.isCorrect
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {question.isCorrect ? "Correct" : "Wrong"}
                            </span>
                          </div>
                          {question.image ? (
                            <img
                              src={question.image}
                              alt={`Question ${question.number}`}
                              className="mb-3 h-28 w-full rounded-xl border border-slate-200 object-contain p-2"
                            />
                          ) : (
                            question.questionText && (
                              <p className="mb-3 rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                                {question.questionText}
                              </p>
                            )
                          )}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div
                              className={`rounded-lg p-3 ${
                                question.isCorrect
                                  ? "bg-emerald-50"
                                  : "bg-red-50"
                              }`}
                            >
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Student Answer
                              </p>
                              <p className="font-semibold text-slate-800">
                                {question.studentAnswer}
                              </p>
                            </div>
                            <div className="rounded-lg bg-emerald-50 p-3">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Correct Answer
                              </p>
                              <p className="font-semibold text-emerald-800">
                                {question.correctAnswer}
                              </p>
                            </div>
                          </div>
                          {question.lessonName && (
                            <p className="mt-3 text-xs font-semibold text-slate-500">
                              Lesson: {question.lessonName}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="rounded-xl bg-slate-50 p-8 text-center font-bold text-slate-600">
                        No answer data available.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="mb-6 border-b-2 border-slate-100 pb-4 text-2xl font-bold text-slate-900">
                    Lesson Recap
                  </h3>
                  <div className="space-y-4">
                    {recommendedLessons.length ? (
                      recommendedLessons.map((lesson, idx) => (
                        <div
                          key={lesson.lessonId || idx}
                          className="flex items-center justify-between rounded-xl border border-slate-200 p-5"
                        >
                          <div>
                            <h4 className="font-bold text-slate-900">
                              {lesson.lessonName || "—"}
                            </h4>
                            <p className="mt-1 text-sm text-slate-600">
                              Recommended for review
                            </p>
                          </div>
                          <span
                            className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold"
                            style={{ color: BRAND }}
                          >
                            #{idx + 1}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="py-12 text-center text-xl font-bold text-emerald-600">
                        Perfect score! No lessons need review.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
            <footer className="mt-12 flex items-end justify-between border-t border-slate-100 px-8 pb-8 pt-4 text-xs text-slate-400 sm:px-12">
              <span>Generated on {formatReportDate()}</span>
              <span className="text-center">
                <span
                  className="block font-serif text-2xl italic"
                  style={{ color: BRAND }}
                >
                  Maths House
                </span>
                <span className="block border-t border-slate-300 pt-1 font-bold uppercase tracking-widest">
                  Signature by Maths House
                </span>
              </span>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
};

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

  const navigate = useNavigate();

  const [loadingParallelId, setLoadingParallelId] = useState(null);
  const [parallelData, setParallelData] = useState(null);
  // Tracks which individual questions currently have their answer revealed.
  const [revealedAnswerIds, setRevealedAnswerIds] = useState([]);
  // Which report preview ("pdf" | "report") is open, if any.
  const [activeReport, setActiveReport] = useState(null);
  const [exporting, setExporting] = useState(false);
  // Selected lesson ids in the recommendation recap.
  const [selectedLessonIds, setSelectedLessonIds] = useState([]);

  const { postData } = usePost();

  // The full answers endpoint carries the real per-question results and the
  // lesson recommendations, so it's fetched up front (rather than lazily on
  // "Show Answer") to power the performance overview and recap section.
  const answersEndpoint =
    examHasAnswers && examId && attemptId
      ? `/api/user/exams/${examId}/attempts/${attemptId}/answers`
      : null;

  const { data: answersData, loading: answersLoading } =
    useGet(answersEndpoint);

  // Reveals (or hides) the answer for a single question instead of a global
  // "Show Answers" button, so we don't render the whole question list twice.
  const handleToggleAnswer = (questionId) => {
    if (!examHasAnswers || !examId || !attemptId) return;

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
  const recommendedLessons = answersData?.data?.recommendedLessonsToStudy || [];

  // Prefer real counts from the answers endpoint (one row per question).
  // Fall back to the submit-response shape (mistakes + a points-based total)
  // only while that data hasn't loaded yet.
  const totalQuestions = answerItems
    ? answerItems.length
    : mistakes.length || totalScore;
  const correctCount = answerItems
    ? answerItems.filter((q) => q.studentAnswer?.isCorrect).length
    : Math.max(totalQuestions - mistakes.length, 0);
  const wrongCount = answerItems
    ? totalQuestions - correctCount
    : mistakes.length;

  const stripHtml = (text) => (text || "").toString().replace(/<[^>]*>/g, "");
  const isUrl = (v) => typeof v === "string" && /^https?:\/\//i.test(v);
  const getCorrectOption = (m) => m.options?.find((o) => o.isCorrect) || null;

  // Finds the fetched answer data that matches a given mistake row.
  const getAnswerFor = (questionId) =>
    answerItems?.find(
      (q) => q.questionId === questionId || q.id === questionId,
    ) || null;

  // Normalized mistake list for the report preview: prefer the full answers
  // endpoint (has lessonName per question) and fall back to the lighter
  // `mistakes` array from the submit response.
  const mistakeItems = useMemo(() => {
    if (answerItems) {
      return answerItems
        .filter((q) => !q.studentAnswer?.isCorrect)
        .map((q, idx) => ({
          id: q.questionId,
          number: idx + 1,
          image: q.questionImage,
          questionText: stripHtml(q.questionText) || null,
          lessonName: q.lessonName,
        }));
    }
    return mistakes.map((m, idx) => ({
      id: m.id,
      number: idx + 1,
      image: m.image,
      questionText: stripHtml(m.question) || null,
      lessonName: null,
    }));
  }, [answerItems, mistakes]);

  // Full Questions & Answers list (every question, not just mistakes) for
  // the Q&A report — only available once the answers endpoint has loaded.
  const qaItems = useMemo(() => {
    if (!answerItems) return [];
    return answerItems.map((q, idx) => {
      const isMCQ = q.answerType === "MCQ";
      let studentAnswerText = "Unanswered";

      if (isMCQ && q.studentAnswer?.selectedOptionId) {
        const opt = q.options?.find(
          (o) => o.id === q.studentAnswer.selectedOptionId,
        );
        studentAnswerText = opt?.answer || "—";
      } else if (!isMCQ && q.studentAnswer?.gridInAnswer) {
        studentAnswerText = q.studentAnswer.gridInAnswer;
      }

      return {
        id: q.questionId,
        number: idx + 1,
        image: q.questionImage,
        questionText: stripHtml(q.questionText) || null,
        lessonName: q.lessonName,
        studentAnswer: stripHtml(studentAnswerText),
        correctAnswer: stripHtml(q.correctAnswer?.answer || "—"),
        isCorrect: Boolean(q.studentAnswer?.isCorrect),
      };
    });
  }, [answerItems]);

  const toggleRecapLesson = (lesson) => {
    setSelectedLessonIds((prev) =>
      prev.includes(lesson.lessonId)
        ? prev.filter((id) => id !== lesson.lessonId)
        : [...prev, lesson.lessonId],
    );
  };

  const selectAllRecapLessons = () => {
    setSelectedLessonIds(recommendedLessons.map((lesson) => lesson.lessonId));
  };

  const clearRecapLessons = () => setSelectedLessonIds([]);

  const checkoutRecapLessons = () => {
    const selectedLessons = recommendedLessons.filter((lesson) =>
      selectedLessonIds.includes(lesson.lessonId),
    );
    navigate("/user/enrollment", {
      state: {
        type: "lessonIds",
        selectedItems: selectedLessons.map((lesson) => ({
          id: lesson.lessonId,
          lessonId: lesson.lessonId,
          lessonName: lesson.lessonName,
        })),
        ids: selectedLessons.map((lesson) => lesson.lessonId),
        name:
          selectedLessons.length === 1
            ? selectedLessons[0].lessonName
            : `${selectedLessons.length} Lessons`,
        source: "exam-review-recap",
        attemptId,
      },
    });
  };

  // Snapshots the open preview article to a PDF — same technique as
  // DiagnosticReviewDashboard's downloadActiveReport.
  const downloadActiveReport = async () => {
    const report = activeReport;
    const element = document.querySelector(
      `[data-report-document="${report}"]`,
    );
    if (!element) return;

    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      if (report === "pdf") {
        const image = canvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(image, "JPEG", 0, 0, pageWidth, pageHeight);
      } else {
        const pagePixelHeight = Math.floor(
          (canvas.width * pageHeight) / pageWidth,
        );

        for (
          let offsetY = 0, pageIndex = 0;
          offsetY < canvas.height;
          offsetY += pagePixelHeight, pageIndex += 1
        ) {
          const sliceHeight = Math.min(
            pagePixelHeight,
            canvas.height - offsetY,
          );
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeight;
          const pageContext = pageCanvas.getContext("2d");
          pageContext.fillStyle = "#ffffff";
          pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          pageContext.drawImage(
            canvas,
            0,
            offsetY,
            canvas.width,
            sliceHeight,
            0,
            0,
            pageCanvas.width,
            sliceHeight,
          );

          if (pageIndex > 0) pdf.addPage();
          const sliceImage = pageCanvas.toDataURL("image/jpeg", 0.95);
          const sliceHeightMm = (sliceHeight * pageWidth) / canvas.width;
          pdf.addImage(sliceImage, "JPEG", 0, 0, pageWidth, sliceHeightMm);
        }
      }
      pdf.save(
        `${REPORT_FILENAME_BASE[report] || "exam"}-report-${attemptId || "review"}.pdf`,
      );
    } catch (error) {
      console.error("Unable to download report", error);
      window.alert("The report could not be downloaded. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const percentage = totalScore ? Math.round((score / totalScore) * 100) : 0;

  return (
    <main className="min-h-screen bg-[#f8f6f4] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <section>
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold" style={{ color: BRAND }}>
              Exam Result
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Score {score} of {totalScore} &nbsp;•&nbsp; Passing score{" "}
              {passScore}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Score wheel */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
              <div className="relative mb-4 h-32 w-32">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#f3f4f6"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={isPassed ? "#16a34a" : BRAND}
                    strokeWidth="3"
                    strokeDasharray={`${percentage}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className={`text-2xl font-bold ${isPassed ? "text-emerald-700" : ""}`}
                    style={!isPassed ? { color: BRAND } : undefined}
                  >
                    {percentage}%
                  </span>
                  <span className="text-xs text-slate-500">Overall Score</span>
                </div>
              </div>
              <div
                className={`w-full rounded-xl py-3 text-center font-bold ${
                  isPassed
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {isPassed ? "✅ PASSED" : "❌ NOT PASSED"}
              </div>
            </div>

            {/* Performance overview */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                <FileText size={20} /> Performance Overview
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  [
                    "Correct",
                    correctCount,
                    "bg-green-50 border-green-100",
                    "bg-green-100 text-green-600",
                    Check,
                  ],
                  [
                    "Wrong Answers",
                    wrongCount,
                    "bg-red-50 border-red-100",
                    "bg-red-100 text-red-600",
                    X,
                  ],
                  [
                    "Total Questions",
                    totalQuestions,
                    "bg-slate-50 border-slate-200",
                    "bg-slate-200 text-slate-700",
                    HelpCircle,
                  ],
                  [
                    "Passing Score",
                    passScore,
                    "bg-blue-50 border-blue-100",
                    "bg-blue-100 text-blue-600",
                    Clock3,
                  ],
                ].map(([label, value, cardClass, iconClass, Icon]) => (
                  <div
                    key={label}
                    className={`rounded-xl border p-4 text-center ${cardClass}`}
                  >
                    <div
                      className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full ${iconClass}`}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="text-xl font-bold">{value}</div>
                    <div className="text-xs text-slate-600">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Balances */}
        {studentBalances !== undefined && (
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap gap-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Exam Balance
                </p>
                <p className="text-lg font-semibold text-slate-800">
                  {examBalance ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Question Balance
                </p>
                <p className="text-lg font-semibold text-slate-800">
                  {questionBalance ?? "—"}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Reports / downloads */}
        <section className="flex flex-col items-center gap-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:flex-row">
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-lg font-bold text-slate-800">
              Detailed Feedback
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Preview your performance reports and download them for your
              records.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setActiveReport("pdf")}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-bold text-white shadow-md transition hover:opacity-90"
              style={{ backgroundColor: BRAND }}
            >
              <Eye size={19} /> View &amp; Download PDF
            </button>
            <button
              type="button"
              onClick={() => setActiveReport("report")}
              className="inline-flex items-center gap-2 rounded-xl border-2 px-5 py-3 font-bold hover:bg-red-50"
              style={{ borderColor: BRAND, color: BRAND }}
            >
              <Eye size={19} /> View &amp; Download Report
            </button>

            {examHasAnswers && (
              <button
                type="button"
                onClick={() => setActiveReport("qa")}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
              >
                <Eye size={19} /> View &amp; Download Q&amp;A
              </button>
            )}
          </div>
        </section>

        {/* Recommendation recap */}
        {examHasAnswers && (
          <ExamRecapRecommendations
            lessons={recommendedLessons}
            loading={answersLoading && !answersData}
            selectedIds={selectedLessonIds}
            onToggle={toggleRecapLesson}
            onSelectAll={selectAllRecapLessons}
            onClearAll={clearRecapLessons}
            onCheckout={checkoutRecapLessons}
          />
        )}

        {/* Parallel questions */}
        {parallelData && (
          <div id="parallel-questions-panel">
            <ParallelQuestions
              data={parallelData}
              onClose={() => setParallelData(null)}
            />
          </div>
        )}

        {/* Mistakes to review */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p
                className="text-xs font-bold uppercase tracking-[0.16em]"
                style={{ color: BRAND }}
              >
                Needs review
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Questions to Review ({mistakes.length})
              </h2>
            </div>
          </div>

          {mistakes.length === 0 ? (
            <p className="rounded-xl bg-emerald-50 p-6 text-center text-sm font-medium text-emerald-800">
              ✨ Perfect score — no mistakes found. Great job!
            </p>
          ) : (
            <div className="space-y-5">
              {mistakes.map((m, index) => {
                const isMCQ = m.answerType === "MCQ";
                const isRevealed = revealedAnswerIds.includes(m.id);
                const answer = isRevealed ? getAnswerFor(m.id) : null;
                const studentAnswerId = answer?.studentAnswer?.selectedOptionId;
                const correctOption = getCorrectOption(m);
                const correctOptionId =
                  correctOption?.id ?? answer?.correctAnswer?.id;
                // Explanation ships inside each mistake (`answers`); the
                // /answers endpoint's `explanation` wins when it has been
                // fetched.
                const explanations = answer?.explanation?.length
                  ? answer.explanation
                  : m.answers || [];
                const hasExplanation = explanations.some(
                  (e) =>
                    e.answerText ||
                    e.answerImage ||
                    e.answerPdf ||
                    isUrl(e.answerVideo),
                );

                return (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-red-100 bg-red-50/40 p-5 shadow-sm"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span
                        className="rounded-lg border border-red-100 bg-white px-3 py-1 text-sm font-bold"
                        style={{ color: BRAND }}
                      >
                        Question {index + 1}
                      </span>
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                        Wrong Answer
                      </span>
                    </div>

                    {m.image && (
                      <img
                        src={m.image}
                        alt={`Question ${index + 1}`}
                        className="mb-4 w-full max-w-2xl rounded-xl border border-slate-200 bg-white"
                      />
                    )}
                    {stripHtml(m.question) && (
                      <p className="mb-4 text-slate-700">
                        {stripHtml(m.question)}
                      </p>
                    )}

                    {isMCQ && (
                      <div className="mb-4 space-y-2">
                        {m.options?.map((opt) => {
                          let optClass =
                            "border-slate-200 bg-white text-slate-600";

                          if (isRevealed) {
                            const isSelected = opt.id === studentAnswerId;
                            const isOptCorrect =
                              opt.id === correctOptionId ||
                              opt.isCorrect === true;

                            if (isOptCorrect) {
                              optClass =
                                "border-emerald-400 bg-emerald-50 text-emerald-800 font-semibold";
                            } else if (isSelected && !isOptCorrect) {
                              optClass =
                                "border-red-400 bg-red-100 text-red-900";
                            }
                          }

                          return (
                            <div
                              key={opt.id}
                              className={`rounded-lg border px-4 py-2 text-sm ${optClass}`}
                            >
                              {opt.order && opt.order !== opt.answer
                                ? `${opt.order}. `
                                : ""}
                              {opt.answer}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {!isMCQ && isRevealed && (
                      <div className="mb-4 space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                        <p className="text-slate-700">
                          <span className="font-bold">Your Answer:</span>{" "}
                          {answersLoading && !answerItems
                            ? "Loading..."
                            : (answer?.studentAnswer?.gridInAnswer ??
                              "Unanswered")}
                        </p>
                        <p className="text-slate-700">
                          <span className="font-bold">Correct Answer:</span>{" "}
                          {correctOption?.answer ??
                            answer?.correctAnswer?.answer ??
                            "—"}
                        </p>
                      </div>
                    )}

                    {isRevealed && examHasAnswers && hasExplanation && (
                      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-inner">
                        <h4 className="mb-3 border-b border-slate-100 pb-2 font-bold text-slate-700">
                          💡 Explanation
                        </h4>
                        {explanations.map((expl, idx) => (
                          <div key={expl.id || idx}>
                            {expl.answerText && (
                              <div className="mb-4">
                                <p className="text-xs font-bold uppercase text-gray-400">
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
                                <p className="text-xs font-bold uppercase text-gray-400">
                                  Explanation by Image
                                </p>
                                <img
                                  src={expl.answerImage}
                                  className="w-full max-w-xs rounded border"
                                  alt="Explanation"
                                />
                              </div>
                            )}
                            {isUrl(expl.answerVideo) && (
                              <div className="mb-4">
                                <p className="text-xs font-bold uppercase text-gray-400">
                                  Explanation by Video
                                </p>
                                <video controls className="w-full rounded">
                                  <source
                                    src={expl.answerVideo}
                                    type="video/mp4"
                                  />
                                </video>
                              </div>
                            )}
                            {expl.answerPdf && (
                              <div className="mb-4">
                                <p className="text-xs font-bold uppercase text-gray-400">
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
                          className="mt-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
                          style={{ backgroundColor: BRAND }}
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
                          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                        >
                          <Repeat2 size={16} />
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
        </section>
      </div>

      {activeReport && (
        <ExamReportPreview
          report={activeReport}
          summary={{
            title: "Exam Result",
            date: formatReportDate(),
            total: totalQuestions,
            percentage,
          }}
          mistakeItems={mistakeItems}
          qaItems={qaItems}
          recommendedLessons={recommendedLessons}
          onClose={() => setActiveReport(null)}
          onDownload={downloadActiveReport}
          downloading={exporting}
        />
      )}
    </main>
  );
};

export default Review;
