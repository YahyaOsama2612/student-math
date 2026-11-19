import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import Icon from "@/components/portal/Icon";
import { Kpi, Modal, Page, PageHead } from "@/components/portal/ui";
import ReportsTabsHeader from "./ReportsTabsHeader";
import { useStartQuiz } from "@/pages/Lesson/parts/LessonParts";
import {
  ErrorCard,
  Legend,
  MistakeItem,
  PdfModal,
  RecCard,
  RecSection,
  ReportSkeleton,
  SearchBox,
  TabChip,
  VideoModal,
  MistakesLocked,
  downloadCsv,
  extractList,
  fmtShort,
  plural,
  validDate,
} from "./parts";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const percentOf = (quiz) =>
  typeof quiz.score === "number" && quiz.totalScore ? Math.round((quiz.score / quiz.totalScore) * 100) : null;

const passPercentOf = (quiz) =>
  quiz.totalScore && typeof quiz.passScore === "number" ? Math.round((quiz.passScore / quiz.totalScore) * 100) : null;

const isDone = (quiz) => quiz.status === "attend" && typeof quiz.score === "number";

const isPassed = (quiz) => isDone(quiz) && (typeof quiz.passScore !== "number" || quiz.score >= quiz.passScore);

const mistakesOf = (quiz) => quiz.mistakesCount ?? (quiz.mistakes || []).length ?? 0;

const NO_LESSON = "__no_lesson__";

/* ------------------------------------------------------------------ */
/* Quiz cell (design: .q-chip pass / fail / todo + .q-when)            */
/* ------------------------------------------------------------------ */

const QuizChip = ({ quiz, onClick }) => {
  const pct = percentOf(quiz);
  let label = "To do";
  let cls = "todo";
  if (quiz.status === "absent") {
    label = "Missed";
    cls = "todo text-slate-400 bg-slate-50";
  } else if (isDone(quiz)) {
    label = pct !== null ? `${pct}%` : `${quiz.score}`;
    cls = isPassed(quiz) ? "pass" : "fail";
  }
  return (
    <>
      <button type="button" onClick={onClick} className={`q-chip ${cls}`} title={`${quiz.quizName || "Quiz"} — click for details and mistakes`}>
        {label}
      </button>
      {isDone(quiz) && fmtShort(quiz.date) && <span className="q-when">{fmtShort(quiz.date)}</span>}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const QuizReports = () => {
  const navigate = useNavigate();
  const [courseId, setCourseId] = useState("");
  const requestUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (courseId) params.set("courseId", courseId);
    const query = params.toString();
    return `/api/user/reports/quizzes${query ? `?${query}` : ""}`;
  }, [courseId]);
  const { data: response, loading, error, refetch } = useGet(requestUrl);

  const [search, setSearch] = useState("");
  const [openQuiz, setOpenQuiz] = useState(null);
  const [pdfModal, setPdfModal] = useState(null); // { url, title }
  const [videoModal, setVideoModal] = useState(null); // { url, title }

  // { success, data: { message, data: [] } } | { data: [] } | []
  const quizzes = useMemo(() => extractList(response), [response]);
  const courses = useMemo(() => (Array.isArray(response?.data?.courses) ? response.data.courses : []), [response]);
  // false → the student hasn't bought mistakes (a package with answers)
  const mistakesUnlocked = response?.data?.mistakesUnlocked !== false;
  const courseName = courses.find((c) => c.id === courseId)?.name;

  /* ---------- Filtered quizzes ---------- */

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quizzes.filter((quiz) => !q || quiz.quizName?.toLowerCase().includes(q) || quiz.lesson?.name?.toLowerCase().includes(q));
  }, [quizzes, search]);

  /* ---------- Rows: one per lesson, its quizzes as columns ---------- */

  const rows = useMemo(() => {
    const map = new Map();
    filtered.forEach((quiz) => {
      const key = quiz.lesson?.id || NO_LESSON;
      if (!map.has(key)) map.set(key, { key, lesson: quiz.lesson, attended: false, quizzes: [] });
      const row = map.get(key);
      row.attended = row.attended || Boolean(quiz.attendedLesson);
      row.quizzes.push(quiz);
    });

    return [...map.values()]
      .map((row) => ({
        ...row,
        quizzes: row.quizzes.sort(
          (a, b) =>
            (validDate(a.date) ? new Date(a.date) : Infinity) - (validDate(b.date) ? new Date(b.date) : Infinity) ||
            String(a.quizName).localeCompare(String(b.quizName), undefined, { numeric: true }),
        ),
      }))
      .sort((a, b) =>
        a.key === NO_LESSON
          ? 1
          : b.key === NO_LESSON
            ? -1
            : String(a.lesson?.name).localeCompare(String(b.lesson?.name), undefined, { numeric: true }),
      );
  }, [filtered]);

  const lessonRows = rows.filter((r) => r.key !== NO_LESSON);
  const otherRow = rows.find((r) => r.key === NO_LESSON);
  const quizColumns = Math.max(1, ...rows.map((row) => row.quizzes.length));

  /* ---------- KPIs (always on all quizzes, like the design) ---------- */

  const stats = useMemo(() => {
    const lessonMap = new Map();
    quizzes.forEach((quiz) => {
      if (!quiz.lesson?.id) return;
      lessonMap.set(quiz.lesson.id, lessonMap.get(quiz.lesson.id) || Boolean(quiz.attendedLesson));
    });
    const lessons = lessonMap.size;
    const attendedLessons = [...lessonMap.values()].filter(Boolean).length;

    const done = quizzes.filter(isDone);
    const percents = done.map(percentOf).filter((v) => v !== null);
    const avg = percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : null;
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
          map.set(quiz.lesson.id, { lesson: quiz.lesson, mistakes: mistakesOf(quiz), quizzes: [quiz.quizName], pct: percentOf(quiz) });
        }
      });
    return [...map.values()].slice(0, 4);
  }, [quizzes]);

  /* ---------- CSV export ---------- */

  const exportCSV = () => {
    const header = ["Lesson", "Lesson attended", "Quiz", "Status", "Score", "Total", "Percent", "Pass score", "Result", "Taken on", "Mistakes"];
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
    downloadCsv(`quiz-reports-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...lines]);
  };

  const openLesson = (lessonId) => navigate(`/user/lesson/${lessonId}`, { state: { fromPurchases: true } });

  /* ---------- Render ---------- */

  const attPct = stats.lessons ? Math.round((stats.attendedLessons / stats.lessons) * 100) : null;
  const colSpan = quizColumns + 3;

  const lessonRow = (row) => {
    const mistakes = row.quizzes.reduce((sum, q) => sum + mistakesOf(q), 0);
    const other = row.key === NO_LESSON;
    return (
      <tr key={row.key}>
        <td>
          {other ? (
            <p className="font-semibold text-slate-500">Quizzes without a lesson</p>
          ) : (
            <>
              <button type="button" onClick={() => openLesson(row.lesson.id)} className="text-left font-semibold text-slate-800 hover:text-one">
                {row.lesson.name}
              </button>
              {row.lesson.description && <p className="line-clamp-1 text-[11px] text-slate-400">{row.lesson.description}</p>}
            </>
          )}
        </td>
        <td className="text-center">
          {other ? (
            <span className="att">—</span>
          ) : row.attended ? (
            <span className="att yes">✓<span className="hidden sm:inline"> Attended</span></span>
          ) : (
            <span className="att no">✕<span className="hidden sm:inline"> Absent</span></span>
          )}
        </td>
        {Array.from({ length: quizColumns }, (_, i) => {
          const quiz = row.quizzes[i];
          return (
            <td key={i} className="text-center">
              {quiz ? <QuizChip quiz={quiz} onClick={() => setOpenQuiz(quiz)} /> : <span className="text-slate-300">—</span>}
            </td>
          );
        })}
        <td className="text-center">
          <span className={`text-sm font-bold ${mistakes ? "text-red-700" : "text-slate-300"}`}>{mistakes || "—"}</span>
        </td>
      </tr>
    );
  };

  let body;
  if (!response && error) body = <ErrorCard error={error} onRetry={refetch} />;
  else if (!response) body = <ReportSkeleton />;
  else
    body = (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <Kpi label="Lessons" value={stats.lessons} sub={`${plural(stats.total, "quiz", "quizzes")} in total`} />
          <Kpi
            label="Attendance"
            value={attPct === null ? "—" : `${attPct}%`}
            sub={`${stats.attendedLessons} of ${stats.lessons} lessons attended`}
            tone={stats.lessons && stats.attendedLessons / stats.lessons >= 0.7 ? "green" : "amber"}
          />
          <Kpi
            label="Quizzes done"
            value={`${stats.done}/${stats.total}`}
            sub={`${stats.total - stats.done} still to do${stats.missed ? ` · ${stats.missed} missed` : ""}`}
          />
          <Kpi
            label="Average quiz score"
            value={stats.avg === null ? "—" : `${stats.avg}%`}
            sub={`${stats.below} below the pass mark`}
            tone={stats.avg === null ? "" : stats.below ? "red" : "green"}
          />
        </div>

        {recommendations.length > 0 && (
          <RecSection title="Review these lessons" sub="Quizzes you did not pass yet — review the lesson, then try the quiz again.">
            {recommendations.map((rec) => (
              <RecCard
                key={rec.lesson.id}
                badge={rec.pct !== null ? `${rec.pct}%` : "BELOW PASS"}
                count={rec.mistakes}
                title={rec.lesson.name}
                sub={rec.quizzes.filter(Boolean).join(" · ")}
                onStudy={() => openLesson(rec.lesson.id)}
              />
            ))}
          </RecSection>
        )}

        <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <TabChip active={!courseId} onClick={() => setCourseId("")}>All subjects</TabChip>
            {courses.map((course) => (
              <TabChip key={course.id} active={courseId === course.id} onClick={() => setCourseId(course.id)}>
                {course.name}
              </TabChip>
            ))}
          </div>
          <SearchBox value={search} onChange={setSearch} placeholder="Search quiz or lesson" className="lg:w-72" />
        </div>

        {rows.length ? (
          <>
            <section className={`rp-card p-0 overflow-hidden transition-opacity ${loading ? "opacity-60" : ""}`}>
              <div className="overflow-x-auto">
                <table className="rp-table">
                  <thead>
                    <tr>
                      <th className="sm:min-w-[260px]">Lesson</th>
                      <th className="text-center">
                        <span className="sm:hidden">Att.</span>
                        <span className="hidden sm:inline">Attended</span>
                      </th>
                      {Array.from({ length: quizColumns }, (_, i) => (
                        <th key={i} className="text-center">
                          <span className="sm:hidden">Q{i + 1}</span>
                          <span className="hidden sm:inline">Quiz {i + 1}</span>
                        </th>
                      ))}
                      <th className="text-center">
                        <span className="sm:hidden">Miss.</span>
                        <span className="hidden sm:inline">Mistakes</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessonRows.length > 0 && (
                      <tr className="grp">
                        <td colSpan={colSpan}>{courseName || "All subjects"} · {plural(lessonRows.length, "lesson")}</td>
                      </tr>
                    )}
                    {lessonRows.map(lessonRow)}
                    {otherRow && (
                      <>
                        <tr className="grp">
                          <td colSpan={colSpan}>Other quizzes</td>
                        </tr>
                        {lessonRow(otherRow)}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            <Legend>Green = passed · red = below the pass mark · dashed = still to do · click a quiz for its date, score and mistakes.</Legend>
          </>
        ) : (
          <section className="rp-card text-center py-10">
            <p className="text-lg font-extrabold text-gray-900 mb-1">No quizzes</p>
            <p className="text-sm text-slate-500">
              {quizzes.length ? "No quizzes match this subject or search." : "You don't have any quiz reports yet."}
            </p>
          </section>
        )}
      </>
    );

  return (
    <Page wide>
      <ReportsTabsHeader activeTab="quizzes" />
      <PageHead title="Subjects" text="Attendance and every quiz — when it was taken, the score and the mistakes.">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="pl-btn" onClick={refetch} disabled={loading}>
            Refresh
          </button>
          <button type="button" className="pl-btn primary disabled:opacity-50" onClick={exportCSV} disabled={!filtered.length}>
            Export CSV
          </button>
        </div>
      </PageHead>

      {body}

      {openQuiz && (
        <QuizModal
          quiz={openQuiz}
          mistakesUnlocked={mistakesUnlocked}
          onClose={() => setOpenQuiz(null)}
          onOpenLesson={openLesson}
          onOpenPdf={(url, title) => setPdfModal({ url, title })}
          onOpenVideo={(url, title) => setVideoModal({ url, title })}
        />
      )}

      <PdfModal modal={pdfModal} onClose={() => setPdfModal(null)} />
      <VideoModal modal={videoModal} onClose={() => setVideoModal(null)} />
    </Page>
  );
};

/* ------------------------------------------------------------------ */
/* Quiz detail (design: Sheet.quizInfo → wide modal)                   */
/* ------------------------------------------------------------------ */

const QuizModal = ({ quiz, mistakesUnlocked, onClose, onOpenLesson, onOpenPdf, onOpenVideo }) => {
  const { start, startingId } = useStartQuiz();
  const navigate = useNavigate();
  const pct = percentOf(quiz);
  const passPct = passPercentOf(quiz);
  const done = isDone(quiz);
  const passed = isPassed(quiz);
  const mistakes = quiz.mistakes || [];

  const statusText =
    quiz.status === "absent" ? "Missed" : quiz.status === "waiting" ? "Not attempted yet" : passed ? "Passed" : "Below pass mark";

  return (
    <Modal
      wide
      title={
        <>
          {quiz.quizName || "Quiz"}
          {quiz.lesson?.name && <span className="font-semibold text-slate-400"> · {quiz.lesson.name}</span>}
        </>
      }
      onClose={onClose}
      actions={
        <>
          <button type="button" className="pl-btn" onClick={onClose}>Close</button>
          {quiz.attemptId && done && (
            <button type="button" className="pl-btn" onClick={() => navigate(`/user/quiz-result/${quiz.attemptId}`)}>Full result</button>
          )}
          {quiz.isActive !== false && !passed && (
            <button type="button" className="pl-btn primary" disabled={startingId === quiz.quizId} onClick={() => start({ id: quiz.quizId })}>
              {startingId === quiz.quizId ? "Starting…" : done ? "Retake quiz" : "Take quiz"}
            </button>
          )}
          {quiz.lesson?.id && (
            <button type="button" className="pl-btn primary" onClick={() => onOpenLesson(quiz.lesson.id)}>
              <Icon name="book" size={15} /> Study the lesson
            </button>
          )}
        </>
      }
    >
      {quiz.lesson && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 mb-3 text-xs">
          <span className="text-slate-500">
            Lesson: <b className="text-slate-700">{quiz.lesson.name}</b>
          </span>
          <span className={`font-bold ${quiz.attendedLesson ? "text-green-700" : "text-red-600"}`}>
            {quiz.attendedLesson ? "✓ Attended" : "✕ Absent"}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        <Kpi label="Result" value={done ? (pct !== null ? `${pct}%` : quiz.score) : "—"} sub={statusText} tone={!done ? "" : passed ? "green" : "red"} />
        <Kpi label="Score" value={done ? `${quiz.score}/${quiz.totalScore ?? "—"}` : "—"} sub={done ? "points" : ""} />
        <Kpi
          label="Taken on"
          value={done && validDate(quiz.date) ? fmtShort(quiz.date) : "—"}
          sub={
            done && validDate(quiz.date)
              ? new Date(quiz.date).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })
              : "Not taken yet"
          }
        />
        <Kpi label="Pass mark" value={passPct !== null ? `${passPct}%` : (quiz.passScore ?? "—")} sub={`${quiz.passScore ?? "—"} of ${quiz.totalScore ?? "—"}`} />
        <Kpi label="Mistakes" value={mistakesOf(quiz)} sub={mistakes.length ? "listed below" : ""} tone={mistakesOf(quiz) ? "red" : ""} />
        <Kpi
          label="Status"
          value={quiz.status === "attend" ? "Done" : quiz.status === "absent" ? "Missed" : "To do"}
          sub={quiz.isActive === false ? "Quiz closed" : "Quiz open"}
        />
      </div>

      {done && !mistakesUnlocked && mistakesOf(quiz) > 0 ? (
        <MistakesLocked count={mistakesOf(quiz)} />
      ) : mistakes.length ? (
        <>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Your mistakes</p>
          <div className="flex flex-col gap-2 mb-2">
            {mistakes.map((m, i) => (
              <MistakeItem key={m.questionId || i} mistake={m} index={i + 1} onOpenPdf={onOpenPdf} onOpenVideo={onOpenVideo} />
            ))}
          </div>
        </>
      ) : (
        <p>{!done ? (quiz.status === "absent" ? "You missed this quiz." : "Not attempted yet.") : "No mistakes — full marks."}</p>
      )}

      {quiz.lesson && done && !passed && (
        <p className="text-xs text-slate-500 mt-3">
          Recommended: review <b>{quiz.lesson.name}</b>, then try the quiz again.
        </p>
      )}
    </Modal>
  );
};

export default QuizReports;
