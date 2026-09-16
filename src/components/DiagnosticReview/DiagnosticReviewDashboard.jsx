import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Check,
  Clock3,
  Download,
  Eye,
  FileText,
  HelpCircle,
  X,
  Zap,
} from "lucide-react";
import api from "@/api/api";

const BRAND = "#8B1A1A";
const KNOWN_CHAPTER_IDS = {
  "Number Theory": "9d8c58ba-0e82-4069-a044-83e70747460a",
};

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const stripHtml = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const formatSeconds = (seconds) => {
  const value = Number(seconds) || 0;
  if (value < 60) return `${Math.round(value)}s`;
  return `${Math.floor(value / 60)}m ${Math.round(value % 60)}s`;
};

const formatMoney = (value) => {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(amount);
};

const getAnswerText = (answer, options = []) => {
  if (answer === undefined || answer === null || answer === "")
    return "Skipped";
  if (typeof answer === "object") {
    const answerId = firstValue(
      answer.selectedOptionId,
      answer.optionId,
      answer.id,
    );
    if (answerId) {
      const option = options.find((item) => item.id === answerId);
      return option?.answer || option?.text || String(answerId);
    }
    return String(firstValue(answer.answer, answer.gridInAnswer, "Skipped"));
  }
  const option = options.find((item) => item.id === answer);
  return option?.answer || option?.text || String(answer);
};

const normalizeQuestion = (question, index) => {
  const recommendation = question.recommendationToRecap || {};
  const studentAnswer =
    question.answerType === "MCQ"
      ? question.studentSubmittedMCQId
      : question.studentSubmittedGridInText;
  const correctAnswers = Array.isArray(question.correctAnswers)
    ? question.correctAnswers
    : [];
  const correctAnswer = correctAnswers
    .map((answer) => answer.answerText)
    .filter(Boolean)
    .join(" / ");
  const timeTaken = Number(
    firstValue(
      question.timeTaken,
      question.timeSpent,
      question.time,
      question.responseTime,
      0,
    ),
  );
  const hasStudentAnswer =
    studentAnswer !== undefined &&
    studentAnswer !== null &&
    studentAnswer !== "";
  const isCorrect = Boolean(question.isCorrect);
  const isSkipped = !isCorrect && !hasStudentAnswer;
  const explanationItems = Array.isArray(question.answers)
    ? question.answers
    : [];

  return {
    ...question,
    number: index + 1,
    id: firstValue(question.questionId, question.id, index + 1),
    questionText: firstValue(
      question.questionText,
      question.question,
      "Question",
    ),
    image: firstValue(
      question.questionImage,
      question.image,
      question.question?.image,
    ),
    studentAnswer:
      question.answerType === "MCQ"
        ? hasStudentAnswer
          ? `Selected option (${studentAnswer})`
          : "Skipped"
        : hasStudentAnswer
          ? String(studentAnswer)
          : "Skipped",
    correctAnswer: correctAnswer || "Not provided",
    chapter: firstValue(
      question.chapterName,
      question.chapter?.name,
      recommendation.chapterName,
      "General",
    ),
    lesson: firstValue(
      question.lessonName,
      question.lesson?.name,
      recommendation.lessonName,
      "Review lesson",
    ),
    chapterId: firstValue(
      question.chapterId,
      recommendation.chapterId,
      question.chapter?.id,
      KNOWN_CHAPTER_IDS[recommendation.chapterName],
    ),
    difficulty: String(firstValue(question.difficulty, "Medium")),
    timeTaken: Number.isFinite(timeTaken) ? Math.max(0, timeTaken) : 0,
    isSkipped,
    isCorrect,
    explanation: explanationItems
      .map((answer) => answer.answerText)
      .filter(Boolean)
      .join(" "),
    explanationItems,
  };
};

const speedMeta = (seconds) => {
  if (seconds < 30)
    return { label: "Fast", className: "bg-emerald-50 text-emerald-700" };
  if (seconds <= 60)
    return { label: "Steady", className: "bg-amber-50 text-amber-700" };
  return { label: "Slow", className: "bg-red-50 text-red-700" };
};

const statusMeta = (question) => {
  if (question.isSkipped)
    return {
      label: "Skipped",
      className: "bg-slate-100 text-slate-600",
      accent: "border-slate-200",
    };
  if (question.isCorrect)
    return {
      label: "Correct",
      className: "bg-emerald-50 text-emerald-700",
      accent: "border-emerald-200",
    };
  return {
    label: "Incorrect",
    className: "bg-red-50 text-red-700",
    accent: "border-red-200",
  };
};

const ExplanationLabel = ({ children, className }) => (
  <p
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${className}`}
  >
    {children}
  </p>
);

const Section = ({ title, eyebrow, action, children, className = "" }) => (
  <section
    className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
  >
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B1A1A]">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const ExamHeader = ({ summary }) => {
  const scoreClass =
    summary.percentage >= 60 ? "text-emerald-700" : "text-[#8B1A1A]";
  return (
    <section>
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-[#8B1A1A]">Exam Results</h1>
        <span className="mt-2 inline-block rounded-full border border-[#8B1A1A] bg-red-50 px-4 py-1.5 font-medium text-[#8B1A1A]">
          {summary.title}
        </span>
        <p className="mt-2 text-sm text-slate-500">
          {summary.institution} · {summary.student} · {summary.date}
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
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
                stroke={summary.percentage >= 60 ? "#16a34a" : "#8B1A1A"}
                strokeWidth="3"
                strokeDasharray={`${summary.percentage}, 100`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${scoreClass}`}>
                {summary.percentage}%
              </span>
              <span className="text-xs text-slate-500">Overall Score</span>
            </div>
          </div>
          <div
            className={`w-full rounded-xl py-3 text-center font-bold ${summary.percentage >= 60 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
          >
            {summary.percentage >= 60 ? "PASSED" : "NOT PASSED"}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
            <FileText size={20} /> Performance Overview
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              [
                "Correct",
                summary.correct,
                "bg-green-50 border-green-100",
                "bg-green-100 text-green-600",
                Check,
              ],
              [
                "Incorrect",
                summary.incorrect,
                "bg-red-50 border-red-100",
                "bg-red-100 text-red-600",
                X,
              ],
              [
                "Time taken",
                formatSeconds(summary.timeTaken),
                "bg-blue-50 border-blue-100",
                "bg-blue-100 text-blue-600",
                Clock3,
              ],
              [
                "Total Questions",
                summary.total,
                "bg-slate-50 border-slate-200",
                "bg-slate-200 text-slate-700",
                HelpCircle,
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
  );
};

/* const TimeAnalytics = ({ questions }) => {
  const average = questions.length
    ? questions.reduce((sum, question) => sum + question.timeTaken, 0) /
      questions.length
    : 0;
  return (
    <Section title="Time-to-answer analytics" eyebrow="Pace and focus">
      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="h-64 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={questions}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="number" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} unit="s" />
              <Tooltip formatter={(value) => [`${value}s`, "Time"]} />
              <Bar dataKey="timeTaken" fill={BRAND} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center rounded-xl bg-red-50 p-5">
          <div>
            <Clock3 className="text-[#8B1A1A]" size={22} />
            <p className="mt-4 text-sm text-slate-600">Average time</p>
            <p className="text-3xl font-black text-[#8B1A1A]">
              {formatSeconds(average)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Across all questions</p>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-150 text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-3">Question ID</th>
              <th className="px-3 py-3">Topic</th>
              <th className="px-3 py-3">Time taken</th>
              <th className="px-3 py-3">Speed rating</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((question) => {
              const speed = speedMeta(question.timeTaken);
              return (
                <tr
                  key={question.id}
                  className={`border-b border-slate-100 ${question.timeTaken < 30 ? "bg-emerald-50/50" : question.timeTaken <= 60 ? "bg-amber-50/50" : "bg-red-50/50"}`}
                >
                  <td className="px-3 py-3 font-semibold text-slate-800">
                    #{question.number}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {question.chapter}
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-800">
                    {formatSeconds(question.timeTaken)}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${speed.className}`}
                    >
                      {speed.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}; */

/* const ChapterAnalysis = ({ questions }) => {
  const chapters = [
    ...questions.reduce((map, question) => {
      const entry = map.get(question.chapter) || { correct: 0, total: 0 };
      map.set(question.chapter, {
        correct: entry.correct + (question.isCorrect ? 1 : 0),
        total: entry.total + 1,
      });
      return map;
    }, new Map()),
  ]
    .map(([name, values]) => ({
      name,
      percentage: values.total
        ? Math.round((values.correct / values.total) * 100)
        : 0,
      ...values,
    }))
    .sort((a, b) => a.percentage - b.percentage);

  return (
    <Section title="Chapter performance" eyebrow="Strengths and weak areas">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {chapters.map((chapter) => (
          <div
            key={chapter.name}
            className="rounded-xl border border-slate-200 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold text-slate-800">{chapter.name}</p>
              <span
                className={`text-lg font-black ${chapter.percentage < 60 ? "text-red-700" : "text-emerald-700"}`}
              >
                {chapter.percentage}%
              </span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${chapter.percentage < 60 ? "bg-red-600" : "bg-emerald-600"}`}
                style={{ width: `${chapter.percentage}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {chapter.correct} of {chapter.total} correct
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
};
 */


const Recommendations = ({
  recommendations,
  cart,
  onAdd,
  onRemove,
  onCheckout,
  loading,
  error,
}) => {
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  const groupedRecommendations = [
    ...recommendations
      .reduce((groups, item) => {
        const groupKey = item.chapterId || item.chapter;
        const group = groups.get(groupKey) || {
          id: groupKey,
          chapter: item.chapter,
          items: [],
        };
        group.items.push(item);
        groups.set(groupKey, group);
        return groups;
      }, new Map())
      .values(),
  ];
  const allSelected =
    recommendations.length > 0 &&
    recommendations.every((item) =>
      cart.some((cartItem) => cartItem.id === item.id),
    );

  const selectAll = () => {
    const selected = recommendations.filter(
      (item) => !cart.some((cartItem) => cartItem.id === item.id),
    );
    selected.forEach(onAdd);
  };

  const selectedItems = cart.map((item) => ({
    id: item.lessonId || item.chapterId || item.id,
    lessonId: item.lessonId,
    chapterId: item.chapterId,
    lessonName: item.name,
    chapterName: item.chapter,
    planId: item.planId,
    planLabel: item.planLabel,
    price: item.price,
  }));

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-[#8B1A1A]">
            <Zap size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Recommended Chapters
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Select chapters to purchase and improve your skills.
            </p>
          </div>
        </div>
        {groupedRecommendations.length > 0 && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={selectAll}
              disabled={allSelected}
              className="rounded-lg bg-[#8B1A1A] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#701515] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => cart.forEach((item) => onRemove(item.id))}
              disabled={!cart.length}
              className="rounded-lg bg-slate-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear All
            </button>
          </div>
        )}
      </div>
      {loading && !recommendations.length ? (
        <p className="rounded-xl bg-slate-50 p-6 text-center text-sm font-medium text-slate-600">
          Loading chapter lessons and prices...
        </p>
      ) : groupedRecommendations.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {groupedRecommendations.map((group) => {
            const groupSelected = group.items.every((item) =>
              cart.some((cartItem) => cartItem.id === item.id),
            );
            const groupTotal = group.items.reduce(
              (sum, item) => sum + item.price,
              0,
            );
            return (
              <div
                key={group.id}
                className={`rounded-2xl border-2 p-5 transition ${groupSelected ? "border-[#8B1A1A] bg-red-50/50 shadow-sm" : "border-transparent bg-slate-50 hover:border-slate-200"}`}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={groupSelected}
                    onChange={() =>
                      group.items.forEach((item) => {
                        const selected = cart.some(
                          (cartItem) => cartItem.id === item.id,
                        );
                        if (groupSelected && selected) onRemove(item.id);
                        if (!groupSelected && !selected) onAdd(item);
                      })
                    }
                    aria-label={`Select all lessons in ${group.chapter}`}
                    className="mt-1 h-5 w-5 cursor-pointer accent-[#8B1A1A]"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold leading-tight text-slate-900">
                      {group.chapter}
                    </h3>
                    <div className="mt-3 space-y-2">
                      {group.items.map((item) => {
                        const selected = cart.some(
                          (cartItem) => cartItem.id === item.id,
                        );
                        return (
                          <label
                            key={item.id}
                            className="flex items-center gap-2 text-sm text-slate-600"
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() =>
                                selected ? onRemove(item.id) : onAdd(item)
                              }
                              aria-label={`Select ${item.name}`}
                              className="h-4 w-4 cursor-pointer accent-[#8B1A1A]"
                            />
                            <span>{item.name}</span>
                            <span className="ml-auto rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-bold text-[#8B1A1A]">
                              {formatMoney(item.price)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      {group.items[0]?.description}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4 border-t border-slate-200/70 pt-4">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-red-100/60 px-3 py-1.5 text-xs font-bold text-red-600">
                    <Clock3 size={14} /> Min: 15 days
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    <span className="font-normal text-slate-500">Total:</span>{" "}
                    {formatMoney(groupTotal)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl bg-emerald-50 p-6 text-center text-sm font-medium text-emerald-800">
          No weak chapters detected. Keep practicing at this level.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {error}
        </p>
      )}
      {cart.length > 0 && (
        <div className="sticky bottom-0 z-20 mt-8 flex flex-col items-start justify-between gap-4 rounded-b-2xl border-t-4 border-[#8B1A1A] bg-white p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-slate-500">Selected Value</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatMoney(total)}
            </p>
            <p className="text-xs text-slate-500">
              {cart.length} {cart.length === 1 ? "chapter" : "chapters"}{" "}
              selected
            </p>
          </div>
          <button
            type="button"
            onClick={() => onCheckout(selectedItems)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B1A1A] px-8 py-3 font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#701515] sm:w-auto"
          >
            Proceed to Checkout <ArrowRight size={20} />
          </button>
        </div>
      )}
    </section>
  );
};

const ReportPreview = ({
  report,
  summary,
  questions,
  recommendations,
  onClose,
  onDownload,
}) => {
  const mistakes = questions.filter((question) => !question.isCorrect);
  const isPdf = report === "pdf";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-6">
      <div className="flex h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-slate-100 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b bg-white px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-50 p-2 text-[#8B1A1A]">
              <FileText size={22} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">
                {isPdf ? "Exam Results Report.pdf" : "Detailed Report.pdf"}
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Preview Mode · A4 Document
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-2 rounded-xl bg-[#8B1A1A] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#701515]"
            >
              <Download size={17} /> Download {isPdf ? "PDF" : "Report"}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close report preview"
              className="rounded-xl p-2.5 text-slate-500 hover:bg-red-50 hover:text-[#8B1A1A]"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-200/70 p-4 sm:p-8">
          <article
            data-report-document={report}
            className={`mx-auto w-full max-w-[210mm] bg-white shadow-xl ${isPdf ? "h-[297mm] overflow-hidden" : "min-h-[297mm]"}`}
          >
            <header className="flex items-end justify-between border-b-4 border-[#8B1A1A] px-8 pb-6 pt-10 sm:px-12">
              <div className="flex items-center gap-2">
                <div className="text-5xl font-bold text-[#8B1A1A]">π</div>
                <div className="text-xl font-black leading-none text-slate-900">
                  MATHS
                  <br />
                  HOUSE
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-xl font-bold text-slate-900 sm:text-3xl">
                  {isPdf ? "Exam Results Report" : "Detailed Diagnostic Report"}
                </h1>
                <p className="text-sm font-medium text-slate-600">
                  {summary.title}
                </p>
              </div>
            </header>
            <div className="px-8 py-8 sm:px-12">
              <div className="mb-8 grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Student
                  </p>
                  <p className="font-bold text-slate-900">{summary.student}</p>
                </div>
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
                  <p className="font-bold text-[#8B1A1A]">
                    {summary.percentage}%
                  </p>
                </div>
              </div>
              {isPdf ? (
                <>
                  <h3 className="mb-6 inline-block rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-xl font-bold text-[#8B1A1A]">
                    Detailed Mistakes Analysis ({mistakes.length} Questions)
                  </h3>
                  <div className="space-y-8">
                    {mistakes.length ? (
                      mistakes.map((question) => (
                        <div
                          key={question.id}
                          className="break-inside-avoid"
                          style={{
                            breakInside: "avoid",
                            pageBreakInside: "avoid",
                          }}
                        >
                          <div className="mb-3 flex items-center justify-between rounded-lg border-l-4 border-[#8B1A1A] bg-slate-50 p-2">
                            <span className="rounded border border-slate-100 bg-white px-3 py-1 text-sm font-bold text-[#8B1A1A]">
                              Question {question.number}
                            </span>
                            <span className="text-sm font-bold text-slate-700">
                              {question.chapter}
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
                              {stripHtml(question.questionText)}
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
              ) : (
                <>
                  <h3 className="mb-6 border-b-2 border-slate-100 pb-4 text-2xl font-bold text-slate-900">
                    Chapter-wise Analysis
                  </h3>
                  <div className="space-y-4">
                    {recommendations.length ? (
                      recommendations.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 p-5"
                        >
                          <div>
                            <h4 className="font-bold text-slate-900">
                              {item.chapter}
                            </h4>
                            <p className="mt-1 text-sm text-slate-600">
                              Recommended lesson: {item.name}
                            </p>
                          </div>
                          <span className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-[#8B1A1A]">
                            {item.lessons} lessons
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="py-12 text-center text-xl font-bold text-emerald-600">
                        Perfect score! No chapters need review.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
            <footer className="mt-12 flex items-end justify-between border-t border-slate-100 px-8 pb-8 pt-4 text-xs text-slate-400 sm:px-12">
              <span>
                Generated on{" "}
                {new Date().toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="text-center">
                <span className="block font-serif text-2xl italic text-[#8B1A1A]">
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

const DiagnosticReviewDashboard = ({ data, attemptId, onCheckout }) => {
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("diagnostic-review-cart") || "[]");
    } catch {
      return [];
    }
  });
  const [exporting, setExporting] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [chapterDetails, setChapterDetails] = useState({});
  const [chapterDetailsLoading, setChapterDetailsLoading] = useState(false);
  const [chapterDetailsError, setChapterDetailsError] = useState(null);
  const questions = useMemo(
    () =>
      (Array.isArray(data?.questions) ? data.questions : []).map(
        normalizeQuestion,
      ),
    [data?.questions],
  );

  const chapterIds = useMemo(
    () => [
      ...new Set(
        questions.map((question) => question.chapterId).filter(Boolean),
      ),
    ],
    [questions],
  );

  useEffect(() => {
    if (!chapterIds.length) return undefined;
    let cancelled = false;
    setChapterDetailsLoading(true);
    setChapterDetailsError(null);

    Promise.all(
      chapterIds.map(async (chapterId) => {
        const response = await api.get(`/api/user/chapters/${chapterId}`);
        return [chapterId, response.data?.data || response.data];
      }),
    )
      .then((entries) => {
        if (!cancelled) setChapterDetails(Object.fromEntries(entries));
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Unable to load recommended chapter details", error);
          setChapterDetailsError("Some lesson prices could not be loaded.");
        }
      })
      .finally(() => {
        if (!cancelled) setChapterDetailsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chapterIds]);
  const summary = useMemo(() => {
    const correct = questions.filter((question) => question.isCorrect).length;
    const skipped = questions.filter((question) => question.isSkipped).length;
    const total = questions.length;
    return {
      title: firstValue(data?.examTitle, data?.title, "Diagnostic Exam"),
      institution: firstValue(
        data?.institutionName,
        data?.institution,
        "Maths House",
      ),
      student: firstValue(
        data?.studentName,
        data?.student?.name,
        "Student report",
      ),
      duration: firstValue(data?.duration, data?.examDuration, "--"),
      total,
      correct,
      skipped,
      incorrect: total - correct - skipped,
      score: correct,
      percentage: total ? Math.round((correct / total) * 100) : 0,
      timeTaken: firstValue(
        data?.timeTaken,
        data?.totalTimeTaken,
        questions.reduce((sum, question) => sum + question.timeTaken, 0),
      ),
      date: firstValue(
        data?.examDate,
        data?.date,
        new Date().toLocaleDateString(),
      ),
    };
  }, [data, questions]);
  const recommendations = useMemo(() => {
    const weakQuestions = questions.filter((question) => !question.isCorrect);
    const weakChapterIds = new Set(
      weakQuestions.map((question) => question.chapterId).filter(Boolean),
    );
    const weakChapterNames = new Set(
      weakQuestions.map((question) => question.chapter),
    );
    const recommendationsFromApi = Object.entries(chapterDetails).flatMap(
      ([chapterId, details]) => {
        const chapter = details?.chapter || {};
        const chapterName = chapter.name || details?.name;
        if (
          !weakChapterIds.has(chapterId) &&
          !weakChapterNames.has(chapterName)
        )
          return [];
        return (details?.lessons || []).map((lesson) => {
          const plan =
            lesson.pricePlans?.find((item) => item.isDefault) ||
            lesson.pricePlans?.[0];
          return {
            id: lesson.id,
            lessonId: lesson.id,
            chapterId,
            name: lesson.name,
            chapter: chapterName || "Recommended chapter",
            lessons: 1,
            price: Number(plan?.totalPriceEgp || plan?.priceEgp || 0),
            planId: plan?.id,
            planLabel: plan?.durationLabel || "",
            description:
              lesson.description || `Targeted practice for ${lesson.name}.`,
          };
        });
      },
    );
    if (recommendationsFromApi.length) return recommendationsFromApi;
    return [
      ...new Set(
        weakQuestions.map(
          (question) => `${question.chapter}|${question.lesson}`,
        ),
      ),
    ].map((value, index) => {
      const [chapter, lesson] = value.split("|");
      return {
        id: `fallback-${index}`,
        name: lesson || `${chapter} foundations`,
        chapter,
        lessons: 1,
        price: 0,
        description: `Recommended review for ${chapter}.`,
      };
    });
  }, [chapterDetails, questions]);
  const updateCart = (nextCart) => {
    setCart(nextCart);
    try {
      localStorage.setItem("diagnostic-review-cart", JSON.stringify(nextCart));
    } catch {
      /* Storage can be unavailable in private browsing. */
    }
  };
  const handleExport = async () => {
    const element = document.getElementById("diagnostic-report");
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
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let remaining = height;
      let position = 0;
      const image = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(image, "JPEG", 0, position, width, height);
      remaining -= pageHeight;
      while (remaining > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(image, "JPEG", 0, position, width, height);
        remaining -= pageHeight;
      }
      pdf.save(`diagnostic-report-${attemptId || "review"}.pdf`);
    } catch (error) {
      console.error("Unable to export diagnostic report", error);
      window.alert("The report could not be generated. Please try again.");
    } finally {
      setExporting(false);
    }
  };
  const addToCart = (item) => {
    setCart((currentCart) => {
      if (currentCart.some((cartItem) => cartItem.id === item.id)) {
        return currentCart;
      }
      const nextCart = [...currentCart, item];
      try {
        localStorage.setItem(
          "diagnostic-review-cart",
          JSON.stringify(nextCart),
        );
      } catch {
        /* Storage can be unavailable in private browsing. */
      }
      return nextCart;
    });
  };
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
        `${report === "pdf" ? "exam-results" : "detailed-diagnostic"}-report-${attemptId || "review"}.pdf`,
      );
    } catch (error) {
      console.error("Unable to download report", error);
      window.alert("The report could not be downloaded. Please try again.");
    } finally {
      setExporting(false);
    }
  };
  return (
    <main className="min-h-screen bg-[#f8f6f4] px-4 py-6 sm:px-6 lg:px-8">
      <div id="diagnostic-report" className="mx-auto max-w-7xl space-y-6">
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-500">
            Student performance center
          </p>
          <p className="text-xs text-slate-400">
            A practical readout of this attempt
          </p>
        </div>
        <ExamHeader summary={summary} />
        <section className="mt-6 flex flex-col items-center gap-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:flex-row">
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
              className="inline-flex items-center gap-2 rounded-xl bg-[#8B1A1A] px-5 py-3 font-bold text-white shadow-md hover:bg-[#701515]"
            >
              <Eye size={19} /> View &amp; Download PDF
            </button>
            <button
              type="button"
              onClick={() => setActiveReport("report")}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-[#8B1A1A] bg-white px-5 py-3 font-bold text-[#8B1A1A] hover:bg-red-50"
            >
              <Eye size={19} /> View &amp; Download Report
            </button>
          </div>
        </section>
       {/*  <ChapterAnalysis questions={questions} /> */}
        {/* <TimeAnalytics questions={questions} /> */}
       {/*  <QuestionGrid questions={questions} onSelect={setSelectedQuestion} /> */}
        <Recommendations
          recommendations={recommendations}
          cart={cart}
          onAdd={addToCart}
          onRemove={(id) => updateCart(cart.filter((item) => item.id !== id))}
          loading={chapterDetailsLoading}
          error={chapterDetailsError}
          onCheckout={(selectedItems) =>
            onCheckout?.({
              type: "lessonIds",
              selectedItems,
              ids: selectedItems.map((item) => item.id),
              price: selectedItems.reduce((sum, item) => sum + item.price, 0),
              name:
                selectedItems.length === 1
                  ? selectedItems[0].lessonName
                  : `${selectedItems.length} Lessons`,
            })
          }
        />
      </div>
     {/*  <QuestionDetail
        question={selectedQuestion}
        onClose={() => setSelectedQuestion(null)}
      /> */}
      {activeReport && (
        <ReportPreview
          report={activeReport}
          summary={summary}
          questions={questions}
          recommendations={recommendations}
          onClose={() => setActiveReport(null)}
          onDownload={downloadActiveReport}
        />
      )}
    </main>
  );
};

export default DiagnosticReviewDashboard;
