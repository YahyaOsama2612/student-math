import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loading";
import Errorpage from "@/components/Errorpage";
import { BookOpen, Download, RefreshCw, Search, X } from "lucide-react";
import {
  Kpi,
  MistakeItem,
  PdfModal,
  PlButton,
  TabBtn,
  VideoModal,
  extractList,
  fmtShort,
  validDate,
} from "./ExamReportsView";
import ReportsTabsHeader from "./ReportsTabsHeader";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const percentOf = (quiz) =>
  typeof quiz.score === "number" && quiz.totalScore
    ? Math.round((quiz.score / quiz.totalScore) * 100)
    : null;

const passPercentOf = (quiz) =>
  quiz.totalScore && typeof quiz.passScore === "number"
    ? Math.round((quiz.passScore / quiz.totalScore) * 100)
    : null;

const isDone = (quiz) =>
  quiz.status === "attend" && typeof quiz.score === "number";

const isPassed = (quiz) =>
  isDone(quiz) &&
  (typeof quiz.passScore !== "number" || quiz.score >= quiz.passScore);

const mistakesOf = (quiz) =>
  quiz.mistakesCount ?? (quiz.mistakes || []).length ?? 0;

const NO_LESSON = "__no_lesson__";

/* ------------------------------------------------------------------ */
/* Small UI pieces (match student_home.html report styles)            */
/* ------------------------------------------------------------------ */

// The quiz cell chip: 85% (pass/fail) · To do · Missed
const QuizChip = ({ quiz, onClick }) => {
  const pct = percentOf(quiz);
  let label = "To do";
  let cls = "border-dashed border-slate-200 bg-white text-slate-500";

  if (quiz.status === "absent") {
    label = "Missed";
    cls = "border-slate-200 bg-slate-100 text-slate-500";
  } else if (isDone(quiz)) {
    label = pct !== null ? `${pct}%` : `${quiz.score}`;
    cls = isPassed(quiz)
      ? "border-green-200 bg-green-50 text-green-700"
      : "border-red-200 bg-red-50 text-red-700";
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={onClick}
        title={`${quiz.quizName || "Quiz"} — click for details and mistakes`}
        className={`min-w-[54px] rounded-lg border px-2.5 py-1 text-xs font-bold transition hover:-translate-y-px ${cls}`}
      >
        {label}
      </button>
      {isDone(quiz) && fmtShort(quiz.date) && (
        <span className="mt-0.5 whitespace-nowrap text-[10px] font-semibold text-slate-400">
          {fmtShort(quiz.date)}
        </span>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const FILTERS = [
  ["all", "All quizzes"],
  ["attend", "Attended"],
  ["waiting", "To do"],
  ["absent", "Missed"],
];

const QuizReports = () => {
  const navigate = useNavigate();
  const { data: response, loading, error, refetch } = useGet(
    "/api/user/reports/quizzes",
  );

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [openQuiz, setOpenQuiz] = useState(null);
  const [pdfModal, setPdfModal] = useState(null); // { url, title }
  const [videoModal, setVideoModal] = useState(null); // { url, title }

  // { success, data: { message, data: [] } } | { data: [] } | []
  const quizzes = useMemo(() => extractList(response), [response]);

  /* ---------- Filtered quizzes ---------- */

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quizzes.filter((quiz) => {
      const matchStatus = filter === "all" || quiz.status === filter;
      const matchSearch =
        !q ||
        quiz.quizName?.toLowerCase().includes(q) ||
        quiz.lesson?.name?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [quizzes, filter, search]);

  /* ---------- Rows: one per lesson, its quizzes as columns ---------- */

  const rows = useMemo(() => {
    const map = new Map();
    filtered.forEach((quiz) => {
      const key = quiz.lesson?.id || NO_LESSON;
      if (!map.has(key)) {
        map.set(key, {
          key,
          lesson: quiz.lesson,
          attended: false,
          quizzes: [],
        });
      }
      const row = map.get(key);
      row.attended = row.attended || Boolean(quiz.attendedLesson);
      row.quizzes.push(quiz);
    });

    return [...map.values()]
      .map((row) => ({
        ...row,
        quizzes: row.quizzes.sort(
          (a, b) =>
            (validDate(a.date) ? new Date(a.date) : Infinity) -
            (validDate(b.date) ? new Date(b.date) : Infinity) ||
            String(a.quizName).localeCompare(String(b.quizName), undefined, {
              numeric: true,
            }),
        ),
      }))
      .sort((a, b) =>
        a.key === NO_LESSON
          ? 1
          : b.key === NO_LESSON
            ? -1
            : String(a.lesson?.name).localeCompare(
              String(b.lesson?.name),
              undefined,
              { numeric: true },
            ),
      );
  }, [filtered]);

  const quizColumns = Math.max(1, ...rows.map((row) => row.quizzes.length));

  /* ---------- KPIs (always on all quizzes, like the design) ---------- */

  const stats = useMemo(() => {
    const lessonMap = new Map();
    quizzes.forEach((quiz) => {
      if (!quiz.lesson?.id) return;
      lessonMap.set(
        quiz.lesson.id,
        lessonMap.get(quiz.lesson.id) || Boolean(quiz.attendedLesson),
      );
    });
    const lessons = lessonMap.size;
    const attendedLessons = [...lessonMap.values()].filter(Boolean).length;

    const done = quizzes.filter(isDone);
    const percents = done.map(percentOf).filter((v) => v !== null);
    const avg = percents.length
      ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length)
      : null;
    const below = done.filter((quiz) => !isPassed(quiz)).length;

    return {
      lessons,
      attendedLessons,
      total: quizzes.length,
      done: done.length,
      missed: quizzes.filter((q) => q.status === "absent").length,
      avg,
      below,
    };
  }, [quizzes]);

  /* ---------- "Review these lessons" — failed quizzes ---------- */

  const recommendations = useMemo(() => {
    const map = new Map();
    quizzes
      .filter((quiz) => isDone(quiz) && !isPassed(quiz) && quiz.lesson?.id)
      .sort((a, b) => (percentOf(a) ?? 0) - (percentOf(b) ?? 0))
      .forEach((quiz) => {
        const current = map.get(quiz.lesson.id);
        if (current) {
          current.mistakes += mistakesOf(quiz);
          current.quizzes.push(quiz.quizName);
        } else {
          map.set(quiz.lesson.id, {
            lesson: quiz.lesson,
            mistakes: mistakesOf(quiz),
            quizzes: [quiz.quizName],
            pct: percentOf(quiz),
          });
        }
      });
    return [...map.values()].slice(0, 4);
  }, [quizzes]);

  const countFor = (key) =>
    key === "all" ? quizzes.length : quizzes.filter((q) => q.status === key).length;

  /* ---------- CSV export ---------- */

  const exportCSV = () => {
    const header = [
      "Lesson",
      "Lesson attended",
      "Quiz",
      "Status",
      "Score",
      "Total",
      "Percent",
      "Pass score",
      "Result",
      "Taken on",
      "Mistakes",
    ];
    const lines = filtered.map((quiz) => [
      quiz.lesson?.name || "",
      quiz.attendedLesson ? "Yes" : "No",
      quiz.quizName || "",
      quiz.status || "",
      quiz.score ?? "",
      quiz.totalScore ?? "",
      percentOf(quiz) ?? "",
      quiz.passScore ?? "",
      isDone(quiz) ? (isPassed(quiz) ? "Passed" : "Below pass") : "",
      validDate(quiz.date) ? new Date(quiz.date).toISOString() : "",
      mistakesOf(quiz),
    ]);
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [header, ...lines].map((r) => r.map(esc).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `quiz-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openLesson = (lessonId) =>
    navigate(`/user/lesson/${lessonId}`, { state: { fromPurchases: true } });

  if (loading) return <Loader />;
  if (error) return <Errorpage error={error} />;

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <ReportsTabsHeader activeTab="quizzes" />
        {/* Head */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Quiz reports
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Attendance and every quiz — when it was taken, the score and the
              mistakes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PlButton onClick={refetch}>
              <RefreshCw size={15} /> Refresh
            </PlButton>
            <PlButton primary onClick={exportCSV} disabled={!filtered.length}>
              <Download size={15} /> Export CSV
            </PlButton>
          </div>
        </div>

        {/* KPIs */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            label="Lessons"
            value={stats.lessons}
            sub={`${stats.total} ${stats.total === 1 ? "quiz" : "quizzes"} in total`}
          />
          <Kpi
            label="Attendance"
            value={
              stats.lessons
                ? `${Math.round((stats.attendedLessons / stats.lessons) * 100)}%`
                : "—"
            }
            sub={`${stats.attendedLessons} of ${stats.lessons} lessons attended`}
            tone={
              stats.lessons && stats.attendedLessons / stats.lessons >= 0.7
                ? "green"
                : "amber"
            }
          />
          <Kpi
            label="Quizzes done"
            value={`${stats.done}/${stats.total}`}
            sub={`${stats.total - stats.done} still to do${stats.missed ? ` · ${stats.missed} missed` : ""
              }`}
          />
          <Kpi
            label="Average quiz score"
            value={stats.avg === null ? "—" : `${stats.avg}%`}
            sub={`${stats.below} below the pass mark`}
            tone={stats.avg === null ? "slate" : stats.below ? "red" : "green"}
          />
        </div>

        {/* Review these lessons */}
        {recommendations.length > 0 && (
          <section className="mb-5 rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="mb-3">
              <h3 className="font-bold text-slate-900">Review these lessons</h3>
              <p className="text-xs text-slate-500">
                Quizzes you did not pass yet — review the lesson, then try the
                quiz again.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {recommendations.map((rec) => (
                <div
                  key={rec.lesson.id}
                  className="flex flex-col rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-md border border-[#F5D0D0] bg-[#FDF2F2] px-2 py-0.5 text-[11px] font-extrabold tracking-wide text-[#7d0a0a]">
                      {rec.pct !== null ? `${rec.pct}%` : "BELOW PASS"}
                    </span>
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
                      {rec.mistakes} {rec.mistakes === 1 ? "mistake" : "mistakes"}
                    </span>
                  </div>
                  <p className="mt-2 font-bold leading-snug text-slate-900">
                    {rec.lesson.name}
                  </p>
                  <p className="mb-3 line-clamp-1 text-xs text-slate-500">
                    {rec.quizzes.filter(Boolean).join(" · ")}
                  </p>
                  <PlButton
                    primary
                    className="mt-auto w-full justify-center"
                    onClick={() => openLesson(rec.lesson.id)}
                  >
                    <BookOpen size={15} /> Study this lesson
                  </PlButton>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(([key, label]) => (
              <TabBtn
                key={key}
                active={filter === key}
                onClick={() => setFilter(key)}
              >
                {label} <span className="opacity-70">{countFor(key)}</span>
              </TabBtn>
            ))}
          </div>
          <div className="relative lg:w-72">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search quiz or lesson"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm outline-none focus:border-[#7d0a0a] focus:ring-[3px] focus:ring-[#7d0a0a]/10"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {rows.length ? (
          <>
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13.5px]">
                  <thead>
                    <tr className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      <th className="whitespace-nowrap border-b border-[#eef0f3] px-4 py-2.5 text-left sm:min-w-[260px]">
                        Lesson
                      </th>
                      <th className="whitespace-nowrap border-b border-[#eef0f3] px-4 py-2.5 text-center">
                        <span className="sm:hidden">Att.</span>
                        <span className="hidden sm:inline">Attended</span>
                      </th>
                      {Array.from({ length: quizColumns }, (_, i) => (
                        <th
                          key={i}
                          className="whitespace-nowrap border-b border-[#eef0f3] px-4 py-2.5 text-center"
                        >
                          <span className="sm:hidden">Q{i + 1}</span>
                          <span className="hidden sm:inline">Quiz {i + 1}</span>
                        </th>
                      ))}
                      <th className="whitespace-nowrap border-b border-[#eef0f3] px-4 py-2.5 text-center">
                        Mistakes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const mistakes = row.quizzes.reduce(
                        (sum, q) => sum + mistakesOf(q),
                        0,
                      );
                      return (
                        <tr key={row.key} className="hover:bg-[#fcfcfd]">
                          <td className="border-b border-gray-100 px-4 py-3 align-middle">
                            {row.key === NO_LESSON ? (
                              <p className="font-semibold text-slate-500">
                                Other quizzes
                              </p>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openLesson(row.lesson.id)}
                                  className="text-left font-semibold text-slate-800 hover:text-[#7d0a0a]"
                                >
                                  {row.lesson.name}
                                </button>
                                {row.lesson.description && (
                                  <p className="line-clamp-1 text-[11px] text-slate-400">
                                    {row.lesson.description}
                                  </p>
                                )}
                              </>
                            )}
                          </td>
                          <td className="border-b border-gray-100 px-4 py-3 text-center align-middle">
                            {row.key === NO_LESSON ? (
                              <span className="text-xs font-semibold text-slate-300">
                                —
                              </span>
                            ) : row.attended ? (
                              <span className="text-xs font-semibold text-green-700">
                                ✓<span className="hidden sm:inline"> Attended</span>
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-red-700">
                                ✕<span className="hidden sm:inline"> Absent</span>
                              </span>
                            )}
                          </td>
                          {Array.from({ length: quizColumns }, (_, i) => {
                            const quiz = row.quizzes[i];
                            return (
                              <td
                                key={i}
                                className="border-b border-gray-100 px-3 py-3 text-center align-middle"
                              >
                                {quiz ? (
                                  <QuizChip
                                    quiz={quiz}
                                    onClick={() => setOpenQuiz(quiz)}
                                  />
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="border-b border-gray-100 px-4 py-3 text-center align-middle">
                            <span
                              className={`text-sm font-bold ${mistakes ? "text-red-700" : "text-slate-300"
                                }`}
                            >
                              {mistakes || "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
            <p className="mt-3 text-xs text-slate-400">
              Green = passed · red = below the pass mark · dashed = still to do ·
              click a quiz for its date, score and mistakes.
            </p>
          </>
        ) : (
          <section className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <p className="mb-1 text-lg font-extrabold text-gray-900">
              No quizzes
            </p>
            <p className="text-sm text-slate-500">
              {quizzes.length
                ? "No quizzes match this filter."
                : "You don't have any quiz reports yet."}
            </p>
          </section>
        )}
      </div>

      {/* Quiz detail modal */}
      {openQuiz && (
        <QuizModal
          quiz={openQuiz}
          onClose={() => setOpenQuiz(null)}
          onOpenLesson={openLesson}
          onOpenPdf={(url, title) => setPdfModal({ url, title })}
          onOpenVideo={(url, title) => setVideoModal({ url, title })}
        />
      )}

      <PdfModal modal={pdfModal} onClose={() => setPdfModal(null)} />
      <VideoModal modal={videoModal} onClose={() => setVideoModal(null)} />
    </main>
  );
};

/* ------------------------------------------------------------------ */
/* Quiz detail modal (like Sheet.quizInfo in the design)               */
/* ------------------------------------------------------------------ */

const QuizModal = ({ quiz, onClose, onOpenLesson, onOpenPdf, onOpenVideo }) => {
  const pct = percentOf(quiz);
  const passPct = passPercentOf(quiz);
  const done = isDone(quiz);
  const passed = isPassed(quiz);
  const mistakes = quiz.mistakes || [];

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const statusText =
    quiz.status === "absent"
      ? "Missed"
      : quiz.status === "waiting"
        ? "Not attempted yet"
        : passed
          ? "Passed"
          : "Below pass mark";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">
            {quiz.quizName || "Quiz"}
            {quiz.lesson?.name && (
              <span className="font-normal text-slate-500">
                {" "}
                · {quiz.lesson.name}
              </span>
            )}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {quiz.lesson && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
              <span className="text-slate-500">
                Lesson: <b className="text-slate-700">{quiz.lesson.name}</b>
              </span>
              <span
                className={`font-bold ${quiz.attendedLesson ? "text-green-700" : "text-red-600"
                  }`}
              >
                {quiz.attendedLesson ? "✓ Attended" : "✕ Absent"}
              </span>
            </div>
          )}

          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Kpi
              label="Result"
              value={done ? (pct !== null ? `${pct}%` : quiz.score) : "—"}
              sub={statusText}
              tone={!done ? "slate" : passed ? "green" : "red"}
            />
            <Kpi
              label="Score"
              value={done ? `${quiz.score}/${quiz.totalScore ?? "—"}` : "—"}
              sub={done ? "points" : ""}
            />
            <Kpi
              label="Taken on"
              value={done && validDate(quiz.date) ? fmtShort(quiz.date) : "—"}
              sub={
                done && validDate(quiz.date)
                  ? new Date(quiz.date).toLocaleString("en-US", {
                    weekday: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                  : "Not taken yet"
              }
            />
            <Kpi
              label="Pass mark"
              value={passPct !== null ? `${passPct}%` : (quiz.passScore ?? "—")}
              sub={`${quiz.passScore ?? "—"} of ${quiz.totalScore ?? "—"}`}
            />
            <Kpi
              label="Mistakes"
              value={mistakesOf(quiz)}
              sub={mistakes.length ? "listed below" : ""}
              tone={mistakesOf(quiz) ? "red" : "slate"}
            />
            <Kpi
              label="Status"
              value={
                quiz.status === "attend"
                  ? "Done"
                  : quiz.status === "absent"
                    ? "Missed"
                    : "To do"
              }
              sub={quiz.isActive === false ? "Quiz closed" : "Quiz open"}
            />
          </div>

          {mistakes.length ? (
            <>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                Your mistakes
              </p>
              <div className="mb-2 flex flex-col gap-2">
                {mistakes.map((m, i) => (
                  <MistakeItem
                    key={m.questionId || i}
                    mistake={m}
                    index={i + 1}
                    onOpenPdf={onOpenPdf}
                    onOpenVideo={onOpenVideo}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">
              {!done
                ? quiz.status === "absent"
                  ? "You missed this quiz."
                  : "Not attempted yet."
                : "No mistakes — full marks."}
            </p>
          )}

          {quiz.lesson && done && !passed && (
            <p className="mt-3 text-xs text-slate-500">
              Recommended: review <b>{quiz.lesson.name}</b>, then try the quiz
              again.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
          <PlButton onClick={onClose}>Close</PlButton>
          {quiz.lesson?.id && (
            <PlButton primary onClick={() => onOpenLesson(quiz.lesson.id)}>
              <BookOpen size={15} /> Study the lesson
            </PlButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizReports;