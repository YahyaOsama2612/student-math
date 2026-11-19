import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import { Kpi, Page, PageHead } from "@/components/portal/ui";
import ReportsTabsHeader from "./ReportsTabsHeader";
import {
  AnsChip,
  AttendedTag,
  ErrorCard,
  Legend,
  MistakeQuestion,
  MistakeSolution,
  MistakesLocked,
  PdfModal,
  RecCard,
  RecSection,
  ReportSkeleton,
  SearchBox,
  TabChip,
  VideoModal,
  cleanHtmlText,
  downloadCsv,
  extractList,
  fmtLong,
  fmtShort,
  mistakeAnswers,
  plural,
  validDate,
} from "./parts";

/* ------------------------------------------------------------------ */
/* Config per report kind                                              */
/* ------------------------------------------------------------------ */

export const REPORT_KINDS = {
  exam: {
    endpoint: "/api/user/reports/exams",
    title: "EXAM",
    sub: "Your exam results — the score, the mistakes and the lessons to review.",
    noun: "Exam",
    plural: "exams",
    idKey: "examId",
    nameKey: "examName",
    csv: "exam-reports",
    back: "Back to EXAM",
  },
  diagnostic: {
    endpoint: "/api/user/reports/diagnostic-exam",
    title: "Diagnose",
    sub: "Diagnostic (trial) exams — used to find your level and the lessons to review.",
    noun: "Diagnostic",
    plural: "diagnostic exams",
    idKey: "diagnosticExamId",
    nameKey: "diagnosticExamName",
    csv: "diagnostic-reports",
    back: "Back to Diagnose",
  },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

// Same fields for exams and diagnostics.
const normalize = (item, cfg) => ({
  ...item,
  id: item[cfg.idKey] || item.id,
  name: item[cfg.nameKey] || item.name || `Untitled ${cfg.noun.toLowerCase()}`,
  mistakes: Array.isArray(item.mistakes) ? item.mistakes : [],
  lessonsToRecap: Array.isArray(item.lessonsToRecap) ? item.lessonsToRecap : [],
});

const isDone = (r) => r.status === "attend" && typeof r.score === "number";

const pctOf = (r) => (isDone(r) && r.totalScore ? Math.round((r.score / r.totalScore) * 100) : null);

const passPctOf = (r) => (r.totalScore && typeof r.passScore === "number" ? Math.round((r.passScore / r.totalScore) * 100) : null);

const isPassed = (r) => isDone(r) && (typeof r.passScore !== "number" || r.score >= r.passScore);

const mistakesOf = (r) => r.mistakesCount ?? r.mistakes.length ?? 0;

// green = passed, amber = up to 10 points under the pass mark, red = below
const toneOf = (r) => {
  const pct = pctOf(r);
  if (pct === null) return "";
  const pass = passPctOf(r) ?? 50;
  if (pct >= pass) return "green";
  return pct >= pass - 10 ? "amber" : "red";
};

const TONE_TEXT = { green: "text-green-700", amber: "text-amber-700", red: "text-red-700" };

const STATUS = {
  attend: { label: "Done", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  waiting: { label: "In progress", color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  absent: { label: "Not taken", color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" },
};

const StatusPill = ({ status }) => {
  const s = STATUS[status] || { label: status || "—", color: "#64748b", bg: "#fff", border: "#e2e8f0" };
  return (
    <span className="st-pill whitespace-nowrap" style={{ color: s.color, background: s.bg, borderColor: s.border }}>
      {s.label}
    </span>
  );
};

/** Score cell (design: .score + .sc-bar in a thin track). */
const ScoreCell = ({ r }) => {
  const pct = pctOf(r);
  const tone = toneOf(r);
  return (
    <div className="flex items-center gap-3">
      <span className={`score ${tone}`} title={`${r.score} of ${r.totalScore} · pass ${r.passScore}`}>
        {pct}%
      </span>
      <span className="flex flex-1 flex-col gap-1">
        <span className="h-1.5 min-w-[60px] overflow-hidden rounded-full bg-slate-100">
          <span className={`block h-full rounded-full sc-bar ${tone || "bg-slate-300"}`} style={{ width: `${Math.min(pct ?? 0, 100)}%` }} />
        </span>
        <span className="whitespace-nowrap text-[10px] font-semibold text-slate-400">
          {r.score}/{r.totalScore} · pass {r.passScore}
        </span>
      </span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const STATUS_FILTERS = [
  ["all", "All statuses"],
  ["attend", "Done"],
  ["waiting", "In progress"],
  ["absent", "Not taken"],
];

const ExamReportsView = ({ kind = "exam" }) => {
  const cfg = REPORT_KINDS[kind] || REPORT_KINDS.exam;
  const isDiag = kind === "diagnostic";
  const navigate = useNavigate();
  const { data: response, loading, error, refetch } = useGet(cfg.endpoint);
  // false → the student hasn't bought mistakes (a package with answers); the count and lessons to review still show
  const mistakesUnlocked = response?.data?.mistakesUnlocked !== false;

  const [course, setCourse] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);
  const [pdfModal, setPdfModal] = useState(null); // { url, title }
  const [videoModal, setVideoModal] = useState(null); // { url, title }

  const records = useMemo(
    () =>
      extractList(response)
        .map((item) => normalize(item, cfg))
        // Newest first; not-taken ones (no date) go last.
        .sort((a, b) => (validDate(b.date) ? new Date(b.date) : 0) - (validDate(a.date) ? new Date(a.date) : 0)),
    [response, cfg],
  );

  const courses = useMemo(() => [...new Set(records.map((r) => r.courseName).filter(Boolean))], [records]);

  // Course tab first (like the program tabs), KPIs follow it.
  const inCourse = useMemo(() => records.filter((r) => course === "all" || r.courseName === course), [records, course]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inCourse.filter((r) => (status === "all" || r.status === status) && (!q || r.name.toLowerCase().includes(q)));
  }, [inCourse, status, search]);

  const showCorrect = shown.some((r) => Number(r.numberOfQuestions) > 0);

  /* ---------- KPIs ---------- */

  const stats = useMemo(() => {
    const done = inCourse.filter(isDone);
    const best = done.reduce((top, r) => (top === null || pctOf(r) > pctOf(top) ? r : top), null);
    const latest = done[0] || null; // already sorted newest first
    const pcts = done.map(pctOf).filter((v) => v !== null);
    const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
    const passMarks = done.map(passPctOf).filter((v) => v !== null);
    const avgPass = passMarks.length ? passMarks.reduce((a, b) => a + b, 0) / passMarks.length : 50;

    return {
      total: inCourse.length,
      done: done.length,
      missed: inCourse.filter((r) => r.status === "absent").length,
      pending: inCourse.filter((r) => r.status === "waiting").length,
      best,
      latest,
      avg,
      avgTone: avg === null ? "" : avg >= avgPass ? "green" : avg >= avgPass - 10 ? "amber" : "red",
      mistakes: done.reduce((sum, r) => sum + mistakesOf(r), 0),
      passed: done.filter(isPassed).length,
    };
  }, [inCourse]);

  /* ---------- Lessons to review (from lessonsToRecap) ---------- */

  const recommendations = useMemo(() => {
    const map = new Map();
    inCourse.filter(isDone).forEach((r) => {
      r.lessonsToRecap.forEach((lesson) => {
        if (!lesson?.id) return;
        const cur = map.get(lesson.id) || { ...lesson, mistakes: 0, exams: new Set(), course: r.courseName };
        cur.mistakes += Number(lesson.mistakesCount) || 0;
        cur.exams.add(r.name);
        cur.attendedLesson = cur.attendedLesson || lesson.attendedLesson;
        map.set(lesson.id, cur);
      });
    });
    return [...map.values()].sort((a, b) => b.mistakes - a.mistakes).slice(0, 4);
  }, [inCourse]);

  const countFor = (key) => (key === "all" ? inCourse.length : inCourse.filter((r) => r.status === key).length);

  /* ---------- CSV ---------- */

  const exportCSV = () => {
    const header = [
      "Course",
      cfg.noun,
      "Status",
      "Date",
      "Score",
      "Total",
      "Percent",
      "Pass score",
      "Result",
      "Mistakes",
      ...(isDiag ? ["Questions", "Duration (min)"] : []),
      "Lessons to review",
    ];
    const lines = shown.map((r) => [
      r.courseName || "",
      r.name,
      STATUS[r.status]?.label || r.status || "",
      validDate(r.date) ? new Date(r.date).toISOString() : "",
      r.score ?? "",
      r.totalScore ?? "",
      pctOf(r) ?? "",
      r.passScore ?? "",
      isDone(r) ? (isPassed(r) ? "Passed" : "Below pass") : "",
      isDone(r) ? mistakesOf(r) : "",
      ...(isDiag ? [r.numberOfQuestions ?? "", r.duration ?? ""] : []),
      r.lessonsToRecap.map((l) => l.name).join(" | "),
    ]);
    downloadCsv(`${cfg.csv}-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...lines]);
  };

  const openLesson = (lessonId) => navigate(`/user/lesson/${lessonId}`, { state: { fromPurchases: true } });

  const openRecord = records.find((r) => r.id === openId) || null;
  useEffect(() => {
    if (openId) window.scrollTo(0, 0);
  }, [openId]);

  const viewers = (
    <>
      <PdfModal modal={pdfModal} onClose={() => setPdfModal(null)} />
      <VideoModal modal={videoModal} onClose={() => setVideoModal(null)} />
    </>
  );

  /* ---------- Drill-down: one exam's mistakes (design: renderMistakes) ---------- */

  if (openRecord) {
    return (
      <Page wide>
        <ReportsTabsHeader activeTab={isDiag ? "diagnostic" : "exams"} />
        <RecordDetail
          r={openRecord}
          cfg={cfg}
          mistakesUnlocked={mistakesUnlocked}
          onTake={() => navigate(isDiag ? "/user/diagnostic" : "/user/exams")}
          onBack={() => setOpenId(null)}
          onOpenLesson={openLesson}
          onOpenPdf={(url, title) => setPdfModal({ url, title })}
          onOpenVideo={(url, title) => setVideoModal({ url, title })}
        />
        {viewers}
      </Page>
    );
  }

  /* ---------- List ---------- */

  let body;
  if (!response && error) body = <ErrorCard error={error} onRetry={refetch} />;
  else if (!response) body = <ReportSkeleton />;
  else
    body = (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <Kpi label={isDiag ? "Trials taken" : "Exams taken"} value={`${stats.done}/${stats.total}`} sub={`${stats.missed} not taken · ${stats.pending} in progress`} />
          <Kpi
            label="Best result"
            value={stats.best ? `${pctOf(stats.best)}%` : "—"}
            sub={stats.best ? `${stats.best.score}/${stats.best.totalScore} · ${stats.best.name}` : `No ${cfg.plural} taken yet`}
            tone={stats.best ? toneOf(stats.best) : ""}
          />
          <Kpi
            label="Latest result"
            value={stats.latest ? `${pctOf(stats.latest)}%` : "—"}
            sub={stats.latest ? `${stats.latest.name} · ${fmtShort(stats.latest.date)}` : ""}
            tone={stats.latest ? toneOf(stats.latest) : ""}
          />
          <Kpi
            label="Average · mistakes"
            value={stats.avg === null ? "—" : `${stats.avg}% · ${stats.mistakes}`}
            sub={`${stats.passed} of ${stats.done} passed · questions missed`}
            tone={stats.avgTone}
          />
        </div>

        {recommendations.length > 0 && (
          <RecSection title="Review these lessons" sub={`The lessons behind your mistakes — review them before your next ${cfg.noun.toLowerCase()}.`}>
            {recommendations.map((rec) => (
              <RecCard
                key={rec.id}
                badge={rec.course || cfg.noun.toUpperCase()}
                count={rec.mistakes}
                title={rec.name}
                sub={`In ${rec.exams.size} ${rec.exams.size === 1 ? cfg.noun.toLowerCase() : cfg.plural}`}
                extra={<AttendedTag attended={rec.attendedLesson} />}
                onStudy={() => openLesson(rec.id)}
              />
            ))}
          </RecSection>
        )}

        <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <TabChip active={course === "all"} onClick={() => setCourse("all")}>
              All courses <span className="opacity-70">{records.length}</span>
            </TabChip>
            {courses.map((name) => (
              <TabChip key={name} active={course === name} onClick={() => setCourse(name)}>
                {name} <span className="opacity-70">{records.filter((r) => r.courseName === name).length}</span>
              </TabChip>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className="input sm:w-auto font-semibold text-slate-700">
              {STATUS_FILTERS.map(([key, label]) => (
                <option key={key} value={key}>
                  {label} ({countFor(key)})
                </option>
              ))}
            </select>
            <SearchBox value={search} onChange={setSearch} placeholder={`Search ${cfg.plural}`} className="sm:w-64" />
          </div>
        </div>

        {shown.length ? (
          <>
            <section className={`rp-card p-0 overflow-hidden transition-opacity ${loading ? "opacity-60" : ""}`}>
              <div className="overflow-x-auto">
                <table className="rp-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 220 }}>{isDiag ? "Trial" : "Exam"}</th>
                      <th>Status</th>
                      {showCorrect && (
                        <th>
                          <span className="sm:hidden">Right</span>
                          <span className="hidden sm:inline">Correct</span>
                        </th>
                      )}
                      <th style={{ minWidth: 170 }}>Score</th>
                      <th>
                        <span className="sm:hidden">Miss.</span>
                        <span className="hidden sm:inline">Mistakes</span>
                      </th>
                      <th>
                        <span className="sm:hidden">Review</span>
                        <span className="hidden sm:inline">Lessons to review</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => {
                      const done = isDone(r);
                      const wrong = mistakesOf(r);
                      const qs = Number(r.numberOfQuestions) || 0;
                      return (
                        <tr key={r.id}>
                          <td>
                            <button type="button" onClick={() => setOpenId(r.id)} className="text-left font-semibold text-slate-900 hover:text-one">
                              {r.name}
                            </button>
                            {r.assigned && <span className="ms-2 text-[10px] font-bold text-one bg-red-50 border border-red-100 rounded px-1.5 py-0.5">Assigned to you</span>}
                            <p className="text-xs text-slate-400">
                              {[r.courseName, validDate(r.date) ? fmtLong(r.date) : "Not taken", r.duration ? `${r.duration} min` : "", qs ? `${qs} questions` : ""]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </td>
                          <td>
                            <StatusPill status={r.status} />
                          </td>
                          {showCorrect && (
                            <td>
                              {done && qs ? (
                                <>
                                  <b className="text-slate-800">{Math.max(qs - wrong, 0)}</b>
                                  <span className="text-slate-400">/{qs}</span>
                                </>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          )}
                          <td>
                            {done ? (
                              <ScoreCell r={r} />
                            ) : (
                              <span className="text-xs text-slate-400">{r.status === "waiting" ? "Not submitted yet" : "—"}</span>
                            )}
                          </td>
                          <td>
                            {!done ? (
                              <span className="text-slate-300">—</span>
                            ) : wrong ? (
                              <button type="button" className="pl-btn" onClick={() => setOpenId(r.id)}>
                                {wrong}
                                <span className="hidden sm:inline"> {wrong === 1 ? "mistake" : "mistakes"}</span>
                              </button>
                            ) : (
                              <span className="text-xs font-semibold text-green-700">Full marks</span>
                            )}
                          </td>
                          <td>
                            {r.lessonsToRecap.length ? (
                              <span className="flex max-w-[260px] flex-wrap gap-1">
                                {r.lessonsToRecap.slice(0, 2).map((l) => (
                                  <button
                                    key={l.id}
                                    type="button"
                                    onClick={() => openLesson(l.id)}
                                    title={l.name}
                                    className="pl-course max-w-[240px] truncate hover:bg-[#FDECEC]"
                                  >
                                    {l.name}
                                  </button>
                                ))}
                                {r.lessonsToRecap.length > 2 && (
                                  <button type="button" onClick={() => setOpenId(r.id)} className="text-[11px] font-semibold text-slate-400 hover:text-one">
                                    +{r.lessonsToRecap.length - 2} more
                                  </button>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
            <Legend>
              Green = passed · amber = close to the pass mark · red = below it · click a {cfg.noun.toLowerCase()} for the mistakes and solutions.
            </Legend>
          </>
        ) : (
          <section className="rp-card text-center py-10">
            <p className="text-lg font-extrabold text-gray-900 mb-1">No {cfg.plural} found</p>
            <p className="text-sm text-slate-500">
              {records.length ? "No results match this filter." : `Your ${cfg.plural} results will show here once you take one.`}
            </p>
          </section>
        )}
      </>
    );

  return (
    <Page wide>
      <ReportsTabsHeader activeTab={isDiag ? "diagnostic" : "exams"} />
      <PageHead title={cfg.title} text={cfg.sub}>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="pl-btn" onClick={refetch} disabled={loading}>
            Refresh
          </button>
          <button type="button" className="pl-btn primary disabled:opacity-50" onClick={exportCSV} disabled={!shown.length}>
            Export CSV
          </button>
        </div>
      </PageHead>
      {body}
      {viewers}
    </Page>
  );
};

/* ------------------------------------------------------------------ */
/* One exam / diagnostic: result, where the points went, every mistake */
/* ------------------------------------------------------------------ */

const RecordDetail = ({ r, cfg, mistakesUnlocked, onTake, onBack, onOpenLesson, onOpenPdf, onOpenVideo }) => {
  const done = isDone(r);
  const pct = pctOf(r);
  const passPct = passPctOf(r);
  const tone = toneOf(r);
  const qs = Number(r.numberOfQuestions) || 0;
  const wrong = mistakesOf(r);

  const resultText =
    r.status === "absent" ? "Not taken yet" : r.status === "waiting" ? "In progress" : isPassed(r) ? "Passed" : "Below pass mark";

  // "Where you lost points": mistakes per lesson.
  const byLesson = useMemo(() => {
    const map = new Map();
    r.mistakes.forEach((m) => {
      const k = m.lesson?.name || "Other questions";
      map.set(k, (map.get(k) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [r]);
  const maxLost = Math.max(1, ...byLesson.map(([, n]) => n));

  const exportMistakes = () => {
    downloadCsv(`mistakes-${String(r.name).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`, [
      [cfg.noun, "Question", "Topic", "Your answer", "Correct", "Question text"],
      ...r.mistakes.map((m, i) => {
        const { yours, correct } = mistakeAnswers(m);
        return [r.name, i + 1, m.lesson?.name || "", yours, correct, cleanHtmlText(m.questionText)];
      }),
    ]);
  };

  return (
    <>
      <button type="button" onClick={onBack} className="text-sm font-semibold text-slate-500 hover:text-one mb-4">
        ← {cfg.back}
      </button>

      <section className="rp-card mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="pl-course">{r.courseName || cfg.noun}</span>
              <StatusPill status={r.status} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{r.name}</h2>
            <p className="text-sm text-slate-500">
              {done ? (
                <>
                  score <b className={TONE_TEXT[tone] || "text-slate-800"}>{pct}%</b> · {r.score}/{r.totalScore} points
                  {qs ? ` · ${Math.max(qs - wrong, 0)}/${qs} correct` : ""} ·{" "}
                  <b className={wrong ? "text-red-600" : "text-green-700"}>{plural(wrong, "mistake")}</b>
                </>
              ) : (
                resultText
              )}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {[validDate(r.date) ? `Taken ${fmtLong(r.date)}` : "Not taken", r.duration ? `${r.duration} min allowed` : ""].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!done && r.isActive !== false && (
              <button type="button" className="pl-btn primary" onClick={onTake}>
                {r.status === "waiting" ? "Continue" : `Take this ${cfg.noun.toLowerCase()}`}
              </button>
            )}
            {r.mistakes.length > 0 && (
              <button type="button" className="pl-btn" onClick={exportMistakes}>
                Export CSV
              </button>
            )}
          </div>
        </div>

        {byLesson.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Where you lost points</p>
            {byLesson.map(([k, n]) => (
              <div key={k} className="flex items-center gap-3 mb-1.5">
                <span className="text-xs text-slate-600 w-40 sm:w-72 truncate" title={k}>{k}</span>
                <span className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <span className="block h-full rounded-full bg-one" style={{ width: `${(n / maxLost) * 100}%` }} />
                </span>
                <span className="text-xs font-bold text-slate-700 w-6 text-right">{n}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Kpi label="Result" value={done ? `${pct}%` : "—"} sub={resultText} tone={done ? tone : ""} />
        <Kpi label="Score" value={done ? `${r.score}/${r.totalScore}` : "—"} sub={done ? "points" : ""} />
        <Kpi label="Pass mark" value={passPct !== null ? `${passPct}%` : (r.passScore ?? "—")} sub={`${r.passScore ?? "—"} of ${r.totalScore ?? "—"}`} />
        {qs > 0 ? (
          <Kpi label="Correct" value={done ? `${Math.max(qs - wrong, 0)}/${qs}` : "—"} sub={r.duration ? `${r.duration} min allowed` : "questions"} />
        ) : (
          <Kpi label="Taken on" value={fmtShort(r.date) || "—"} sub={done ? "" : "Not taken yet"} />
        )}
      </div>

      {r.lessonsToRecap.length > 0 && (
        <RecSection title="Lessons to review" sub={`The lessons behind the mistakes in this ${cfg.noun.toLowerCase()}.`}>
          {r.lessonsToRecap.map((l) => (
            <RecCard
              key={l.id}
              badge={r.courseName || cfg.noun.toUpperCase()}
              count={Number(l.mistakesCount) || 0}
              title={l.name}
              extra={<AttendedTag attended={l.attendedLesson} />}
              onStudy={() => onOpenLesson(l.id)}
            />
          ))}
        </RecSection>
      )}

      {done && !mistakesUnlocked && wrong > 0 ? (
        <MistakesLocked count={wrong} />
      ) : (
      <section className="rp-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="rp-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Topic</th>
                <th>Your answer</th>
                <th>Correct</th>
                <th style={{ minWidth: 260 }}>Question &amp; solution</th>
              </tr>
            </thead>
            <tbody>
              {r.mistakes.length ? (
                r.mistakes.map((m, i) => {
                  const { isGrid, yours, correct } = mistakeAnswers(m);
                  return (
                    <tr key={m.questionId || i}>
                      <td className="whitespace-nowrap align-top">
                        <b>Q{i + 1}</b>
                        <br />
                        <span className="text-slate-400 text-xs">{isGrid ? "Grid-in" : "MCQ"}</span>
                      </td>
                      <td className="align-top">
                        <p className="font-semibold text-slate-800">{m.lesson?.name || "—"}</p>
                        {m.lesson && <AttendedTag attended={m.attendedLesson} />}
                      </td>
                      <td className="align-top">
                        <AnsChip value={yours} title="Your answer" />
                      </td>
                      <td className="align-top">
                        <AnsChip value={correct} ok title={correct === "?" ? "See the solution" : "Correct answer"} />
                      </td>
                      <td className="text-xs text-slate-600 max-w-md align-top">
                        <MistakeQuestion mistake={m} index={i + 1} />
                        <MistakeSolution mistake={m} index={i + 1} onOpenPdf={onOpenPdf} onOpenVideo={onOpenVideo} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400 py-10">
                    {!done
                      ? r.status === "absent"
                        ? `You haven't taken this ${cfg.noun.toLowerCase()} yet.`
                        : "You started this but haven't submitted it yet."
                      : `No mistakes in this ${cfg.noun.toLowerCase()} — full marks.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}
    </>
  );
};

export default ExamReportsView;
