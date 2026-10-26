import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loading";
import Errorpage from "@/components/Errorpage";
import SecurePdfViewer, { SecureEmbed } from "../Attent/SecurePdfViewer";
import {
    BookOpen,
    Download,
    FileText,
    PlayCircle,
    RefreshCw,
    Search,
    Video,
    X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Config per report kind                                              */
/* ------------------------------------------------------------------ */

export const REPORT_KINDS = {
    exam: {
        endpoint: "/api/user/reports/exams",
        title: "Exam reports",
        sub: "Your exam results — the score, the mistakes and the lessons to review.",
        noun: "Exam",
        plural: "exams",
        idKey: "examId",
        nameKey: "examName",
        csv: "exam-reports",
    },
    diagnostic: {
        endpoint: "/api/user/reports/diagnostic-exam",
        title: "Diagnostic reports",
        sub: "Diagnostic exams — used to find your level and the lessons to review.",
        noun: "Diagnostic",
        plural: "diagnostic exams",
        idKey: "diagnosticExamId",
        nameKey: "diagnosticExamName",
        csv: "diagnostic-reports",
    },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const cleanHtmlText = (text) =>
    String(text || "")
        .replace(/<\/?[^>]+(>|$)/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();

export const isUrl = (value) =>
    typeof value === "string" && /^https?:\/\//i.test(value);

export const validDate = (value) =>
    Boolean(value) && !Number.isNaN(new Date(value).getTime());

// "Oct 26"
export const fmtShort = (value) =>
    validDate(value)
        ? new Date(value).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        })
        : "";

// "Mon, Oct 26, 2026 · 11:21 AM"
export const fmtLong = (value) => {
    if (!validDate(value)) return "—";
    const d = new Date(value);
    return `${d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
};

// Option order may be 1 / "1" / "A" → "A"
export const optionLetter = (order) => {
    if (order === undefined || order === null || order === "") return "";
    const n = Number(order);
    return Number.isFinite(n) && n > 0 ? String.fromCharCode(64 + n) : String(order);
};

// { success, data: { message, data: [] } } | { data: [] } | []
export const extractList = (response) => {
    if (Array.isArray(response?.data?.data)) return response.data.data;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response)) return response;
    return [];
};

// Same fields for exams and diagnostics.
const normalize = (item, cfg) => ({
    ...item,
    id: item[cfg.idKey] || item.id,
    name: item[cfg.nameKey] || item.name || `Untitled ${cfg.noun.toLowerCase()}`,
    mistakes: Array.isArray(item.mistakes) ? item.mistakes : [],
    lessonsToRecap: Array.isArray(item.lessonsToRecap) ? item.lessonsToRecap : [],
});

const isDone = (r) => r.status === "attend" && typeof r.score === "number";

const pctOf = (r) =>
    isDone(r) && r.totalScore ? Math.round((r.score / r.totalScore) * 100) : null;

const passPctOf = (r) =>
    r.totalScore && typeof r.passScore === "number"
        ? Math.round((r.passScore / r.totalScore) * 100)
        : null;

const isPassed = (r) =>
    isDone(r) && (typeof r.passScore !== "number" || r.score >= r.passScore);

const mistakesOf = (r) => r.mistakesCount ?? r.mistakes.length ?? 0;

// green = passed, amber = up to 10 points under the pass mark, red = below
const toneOf = (r) => {
    const pct = pctOf(r);
    if (pct === null) return "slate";
    const pass = passPctOf(r) ?? 50;
    if (pct >= pass) return "green";
    return pct >= pass - 10 ? "amber" : "red";
};

const TONE_TEXT = {
    slate: "text-slate-900",
    green: "text-green-700",
    amber: "text-amber-700",
    red: "text-red-700",
};
const TONE_BAR = {
    slate: "bg-slate-300",
    green: "bg-green-600",
    amber: "bg-amber-500",
    red: "bg-red-600",
};

const STATUS = {
    attend: { label: "Done", cls: "border-green-200 bg-green-50 text-green-700" },
    waiting: { label: "Pending", cls: "border-amber-200 bg-amber-50 text-amber-700" },
    absent: { label: "Missed", cls: "border-slate-200 bg-slate-100 text-slate-500" },
};

/* ------------------------------------------------------------------ */
/* Small UI pieces (student_home.html report styles)                   */
/* ------------------------------------------------------------------ */

export const Kpi = ({ label, value, sub, tone = "slate" }) => (
    <div className="min-w-0 rounded-[0.9rem] border border-gray-200 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            {label}
        </p>
        <p
            className={`mt-0.5 truncate text-[1.6rem] font-extrabold leading-tight ${TONE_TEXT[tone]}`}
        >
            {value}
        </p>
        <p className="truncate text-xs text-slate-400">{sub}</p>
    </div>
);

export const PlButton = ({ primary, className = "", ...props }) => (
    <button
        type="button"
        className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3.5 text-[13px] font-semibold transition disabled:opacity-60 ${primary
                ? "border-[#7d0a0a] bg-[#7d0a0a] text-white hover:bg-[#5a0707]"
                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
            } ${className}`}
        {...props}
    />
);

export const TabBtn = ({ active, children, ...props }) => (
    <button
        type="button"
        className={`whitespace-nowrap rounded-xl border px-4 py-2 text-[13px] font-bold transition ${active
                ? "border-[#7d0a0a] bg-[#7d0a0a] text-white shadow-[0_6px_14px_-6px_rgba(125,10,10,0.5)]"
                : "border-slate-200 bg-white text-slate-500 hover:text-[#7d0a0a]"
            }`}
        {...props}
    >
        {children}
    </button>
);

const StatusBadge = ({ status }) => {
    const meta = STATUS[status] || {
        label: status || "—",
        cls: "border-slate-200 bg-white text-slate-500",
    };
    return (
        <span
            className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${meta.cls}`}
        >
            {meta.label}
        </span>
    );
};

export const AttendedTag = ({ attended }) =>
    attended ? (
        <span className="text-[11px] font-semibold text-green-700">
            ✓ Lesson attended
        </span>
    ) : (
        <span className="text-[11px] font-semibold text-slate-400">
            Lesson not attended
        </span>
    );

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const STATUS_FILTERS = [
    ["all", "All statuses"],
    ["attend", "Done"],
    ["waiting", "Pending"],
    ["absent", "Missed"],
];

const ExamReportsView = ({ kind = "exam" }) => {
    const cfg = REPORT_KINDS[kind] || REPORT_KINDS.exam;
    const isDiag = kind === "diagnostic";
    const navigate = useNavigate();
    const { data: response, loading, error, refetch } = useGet(cfg.endpoint);

    const [course, setCourse] = useState("all");
    const [status, setStatus] = useState("all");
    const [search, setSearch] = useState("");
    const [openRecord, setOpenRecord] = useState(null);
    const [pdfModal, setPdfModal] = useState(null); // { url, title }
    const [videoModal, setVideoModal] = useState(null); // { url, title }

    const records = useMemo(
        () =>
            extractList(response)
                .map((item) => normalize(item, cfg))
                // Newest first; not-taken ones (no date) go last.
                .sort(
                    (a, b) =>
                        (validDate(b.date) ? new Date(b.date) : 0) -
                        (validDate(a.date) ? new Date(a.date) : 0),
                ),
        [response, cfg],
    );

    const courses = useMemo(
        () => [...new Set(records.map((r) => r.courseName).filter(Boolean))],
        [records],
    );

    // Course tab first (like the program tabs), KPIs follow it.
    const inCourse = useMemo(
        () => records.filter((r) => course === "all" || r.courseName === course),
        [records, course],
    );

    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        return inCourse.filter(
            (r) =>
                (status === "all" || r.status === status) &&
                (!q || r.name.toLowerCase().includes(q)),
        );
    }, [inCourse, status, search]);

    const showCorrect = shown.some((r) => Number(r.numberOfQuestions) > 0);

    /* ---------- KPIs ---------- */

    const stats = useMemo(() => {
        const done = inCourse.filter(isDone);
        const best = done.reduce(
            (top, r) => (top === null || pctOf(r) > pctOf(top) ? r : top),
            null,
        );
        const latest = done[0] || null; // already sorted newest first
        const pcts = done.map(pctOf).filter((v) => v !== null);
        const avg = pcts.length
            ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
            : null;
        const passMarks = done.map(passPctOf).filter((v) => v !== null);
        const avgPass = passMarks.length
            ? passMarks.reduce((a, b) => a + b, 0) / passMarks.length
            : 50;

        return {
            total: inCourse.length,
            done: done.length,
            missed: inCourse.filter((r) => r.status === "absent").length,
            pending: inCourse.filter((r) => r.status === "waiting").length,
            best,
            latest,
            avg,
            avgTone:
                avg === null ? "slate" : avg >= avgPass ? "green" : avg >= avgPass - 10 ? "amber" : "red",
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
                const cur = map.get(lesson.id) || {
                    ...lesson,
                    mistakes: 0,
                    exams: new Set(),
                    course: r.courseName,
                };
                cur.mistakes += Number(lesson.mistakesCount) || 0;
                cur.exams.add(r.name);
                cur.attendedLesson = cur.attendedLesson || lesson.attendedLesson;
                map.set(lesson.id, cur);
            });
        });
        return [...map.values()].sort((a, b) => b.mistakes - a.mistakes).slice(0, 4);
    }, [inCourse]);

    const countFor = (key) =>
        key === "all" ? inCourse.length : inCourse.filter((r) => r.status === key).length;

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
        const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const csv = [header, ...lines].map((row) => row.map(esc).join(",")).join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `${cfg.csv}-${new Date().toISOString().slice(0, 10)}.csv`;
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
                {/* Head */}
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            {cfg.title}
                        </h1>
                        <p className="mt-0.5 text-sm text-slate-500">{cfg.sub}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <PlButton onClick={refetch}>
                            <RefreshCw size={15} /> Refresh
                        </PlButton>
                        <PlButton primary onClick={exportCSV} disabled={!shown.length}>
                            <Download size={15} /> Export CSV
                        </PlButton>
                    </div>
                </div>

                {/* KPIs */}
                <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Kpi
                        label={`${cfg.noun}s taken`}
                        value={`${stats.done}/${stats.total}`}
                        sub={`${stats.missed} missed · ${stats.pending} pending`}
                    />
                    <Kpi
                        label="Best result"
                        value={stats.best ? `${pctOf(stats.best)}%` : "—"}
                        sub={
                            stats.best
                                ? `${stats.best.score}/${stats.best.totalScore} · ${stats.best.name}`
                                : `No ${cfg.plural} taken yet`
                        }
                        tone={stats.best ? toneOf(stats.best) : "slate"}
                    />
                    <Kpi
                        label="Latest result"
                        value={stats.latest ? `${pctOf(stats.latest)}%` : "—"}
                        sub={
                            stats.latest
                                ? `${stats.latest.name} · ${fmtShort(stats.latest.date)}`
                                : ""
                        }
                        tone={stats.latest ? toneOf(stats.latest) : "slate"}
                    />
                    <Kpi
                        label="Average · mistakes"
                        value={stats.avg === null ? "—" : `${stats.avg}% · ${stats.mistakes}`}
                        sub={`${stats.passed} of ${stats.done} passed · questions missed`}
                        tone={stats.avgTone}
                    />
                </div>

                {/* Review these lessons */}
                {recommendations.length > 0 && (
                    <section className="mb-5 rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                        <div className="mb-3">
                            <h3 className="font-bold text-slate-900">Review these lessons</h3>
                            <p className="text-xs text-slate-500">
                                The lessons behind your mistakes — review them before your next{" "}
                                {cfg.noun.toLowerCase()}.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {recommendations.map((rec) => (
                                <div
                                    key={rec.id}
                                    className="flex flex-col rounded-[0.9rem] border border-gray-200 bg-white p-3.5"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="truncate rounded-md border border-[#F5D0D0] bg-[#FDF2F2] px-2 py-0.5 text-[11px] font-extrabold tracking-wide text-[#7d0a0a]">
                                            {rec.course || cfg.noun.toUpperCase()}
                                        </span>
                                        <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
                                            {rec.mistakes} {rec.mistakes === 1 ? "mistake" : "mistakes"}
                                        </span>
                                    </div>
                                    <p className="mt-2 font-bold leading-snug text-slate-900">
                                        {rec.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        In {rec.exams.size}{" "}
                                        {rec.exams.size === 1 ? cfg.noun.toLowerCase() : cfg.plural}
                                    </p>
                                    <p className="mb-3 mt-1">
                                        <AttendedTag attended={rec.attendedLesson} />
                                    </p>
                                    <PlButton
                                        primary
                                        className="mt-auto w-full justify-center"
                                        onClick={() => openLesson(rec.id)}
                                    >
                                        <BookOpen size={15} /> Study this lesson
                                    </PlButton>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Course tabs + filters */}
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                        <TabBtn active={course === "all"} onClick={() => setCourse("all")}>
                            All courses <span className="opacity-70">{records.length}</span>
                        </TabBtn>
                        {courses.map((name) => (
                            <TabBtn
                                key={name}
                                active={course === name}
                                onClick={() => setCourse(name)}
                            >
                                {name}{" "}
                                <span className="opacity-70">
                                    {records.filter((r) => r.courseName === name).length}
                                </span>
                            </TabBtn>
                        ))}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[#7d0a0a] focus:ring-[3px] focus:ring-[#7d0a0a]/10"
                        >
                            {STATUS_FILTERS.map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label} ({countFor(key)})
                                </option>
                            ))}
                        </select>
                        <div className="relative sm:w-64">
                            <Search
                                size={15}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={`Search ${cfg.plural}`}
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
                </div>

                {/* Table */}
                {shown.length ? (
                    <>
                        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-[13.5px]">
                                    <thead>
                                        <tr className="bg-gray-50 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                            <th className="min-w-[220px] whitespace-nowrap border-b border-[#eef0f3] px-4 py-2.5">
                                                {cfg.noun}
                                            </th>
                                            <th className="whitespace-nowrap border-b border-[#eef0f3] px-4 py-2.5">
                                                Status
                                            </th>
                                            {showCorrect && (
                                                <th className="whitespace-nowrap border-b border-[#eef0f3] px-4 py-2.5">
                                                    <span className="sm:hidden">Right</span>
                                                    <span className="hidden sm:inline">Correct</span>
                                                </th>
                                            )}
                                            <th className="min-w-[170px] whitespace-nowrap border-b border-[#eef0f3] px-4 py-2.5">
                                                Score
                                            </th>
                                            <th className="whitespace-nowrap border-b border-[#eef0f3] px-4 py-2.5">
                                                <span className="sm:hidden">Miss.</span>
                                                <span className="hidden sm:inline">Mistakes</span>
                                            </th>
                                            <th className="whitespace-nowrap border-b border-[#eef0f3] px-4 py-2.5">
                                                <span className="hidden sm:inline">Lessons to review</span>
                                                <span className="sm:hidden">Review</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {shown.map((r) => {
                                            const done = isDone(r);
                                            const pct = pctOf(r);
                                            const tone = toneOf(r);
                                            const wrong = mistakesOf(r);
                                            const qs = Number(r.numberOfQuestions) || 0;
                                            return (
                                                <tr key={r.id} className="hover:bg-[#fcfcfd]">
                                                    <td className="border-b border-gray-100 px-4 py-3 align-middle">
                                                        <button
                                                            type="button"
                                                            onClick={() => setOpenRecord(r)}
                                                            className="text-left font-semibold text-slate-900 hover:text-[#7d0a0a]"
                                                        >
                                                            {r.name}
                                                        </button>
                                                        <p className="text-xs text-slate-400">
                                                            {[
                                                                r.courseName,
                                                                validDate(r.date) ? fmtLong(r.date) : "Not taken",
                                                                r.duration ? `${r.duration} min` : "",
                                                                qs ? `${qs} questions` : "",
                                                            ]
                                                                .filter(Boolean)
                                                                .join(" · ")}
                                                        </p>
                                                    </td>
                                                    <td className="border-b border-gray-100 px-4 py-3 align-middle">
                                                        <StatusBadge status={r.status} />
                                                    </td>
                                                    {showCorrect && (
                                                        <td className="border-b border-gray-100 px-4 py-3 align-middle">
                                                            {done && qs ? (
                                                                <>
                                                                    <b className="text-slate-800">
                                                                        {Math.max(qs - wrong, 0)}
                                                                    </b>
                                                                    <span className="text-slate-400">/{qs}</span>
                                                                </>
                                                            ) : (
                                                                <span className="text-slate-300">—</span>
                                                            )}
                                                        </td>
                                                    )}
                                                    <td className="border-b border-gray-100 px-4 py-3 align-middle">
                                                        {done ? (
                                                            <div className="flex items-center gap-3">
                                                                <span
                                                                    className={`min-w-[44px] text-[1.15rem] font-extrabold ${TONE_TEXT[tone]}`}
                                                                    title={`${r.score} of ${r.totalScore} · pass ${r.passScore}`}
                                                                >
                                                                    {pct}%
                                                                </span>
                                                                <span className="flex flex-1 flex-col gap-1">
                                                                    <span className="h-1.5 min-w-[60px] overflow-hidden rounded-full bg-slate-100">
                                                                        <span
                                                                            className={`block h-full rounded-full ${TONE_BAR[tone]}`}
                                                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                                                        />
                                                                    </span>
                                                                    <span className="whitespace-nowrap text-[10px] font-semibold text-slate-400">
                                                                        {r.score}/{r.totalScore} · pass {r.passScore}
                                                                    </span>
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">
                                                                {r.status === "waiting" ? "Waiting for result" : "—"}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="border-b border-gray-100 px-4 py-3 align-middle">
                                                        {!done ? (
                                                            <span className="text-slate-300">—</span>
                                                        ) : wrong ? (
                                                            <PlButton onClick={() => setOpenRecord(r)}>
                                                                {wrong}
                                                                <span className="hidden sm:inline">
                                                                    {" "}
                                                                    {wrong === 1 ? "mistake" : "mistakes"}
                                                                </span>
                                                            </PlButton>
                                                        ) : (
                                                            <span className="text-xs font-semibold text-green-700">
                                                                Full marks
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="border-b border-gray-100 px-4 py-3 align-middle">
                                                        {r.lessonsToRecap.length ? (
                                                            <span className="flex max-w-[260px] flex-wrap gap-1">
                                                                {r.lessonsToRecap.slice(0, 2).map((l) => (
                                                                    <button
                                                                        key={l.id}
                                                                        type="button"
                                                                        onClick={() => openLesson(l.id)}
                                                                        title={l.name}
                                                                        className="max-w-[240px] truncate rounded-md border border-[#F5D0D0] bg-[#FDF6F6] px-2 py-0.5 text-[11px] font-semibold text-[#7d0a0a] hover:bg-[#FDECEC]"
                                                                    >
                                                                        {l.name}
                                                                    </button>
                                                                ))}
                                                                {r.lessonsToRecap.length > 2 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setOpenRecord(r)}
                                                                        className="text-[11px] font-semibold text-slate-400 hover:text-[#7d0a0a]"
                                                                    >
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
                        <p className="mt-3 text-xs text-slate-400">
                            Green = passed · amber = close to the pass mark · red = below it ·
                            click a {cfg.noun.toLowerCase()} for the mistakes and solutions.
                        </p>
                    </>
                ) : (
                    <section className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
                        <p className="mb-1 text-lg font-extrabold text-gray-900">
                            No {cfg.plural} found
                        </p>
                        <p className="text-sm text-slate-500">
                            {records.length
                                ? "No results match this filter."
                                : `Your ${cfg.plural} results will show here once you take one.`}
                        </p>
                    </section>
                )}
            </div>

            {openRecord && (
                <RecordModal
                    record={openRecord}
                    cfg={cfg}
                    onClose={() => setOpenRecord(null)}
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
/* Exam / diagnostic detail modal                                      */
/* ------------------------------------------------------------------ */

const RecordModal = ({
    record: r,
    cfg,
    onClose,
    onOpenLesson,
    onOpenPdf,
    onOpenVideo,
}) => {
    const done = isDone(r);
    const pct = pctOf(r);
    const passPct = passPctOf(r);
    const tone = toneOf(r);
    const qs = Number(r.numberOfQuestions) || 0;

    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const resultText =
        r.status === "absent"
            ? "Missed"
            : r.status === "waiting"
                ? "Waiting for result"
                : isPassed(r)
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
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div className="min-w-0">
                        <h3 className="font-bold text-slate-900">{r.name}</h3>
                        <p className="text-xs text-slate-500">
                            {[r.courseName, validDate(r.date) ? fmtLong(r.date) : "Not taken"]
                                .filter(Boolean)
                                .join(" · ")}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <Kpi
                            label="Result"
                            value={done ? `${pct}%` : "—"}
                            sub={resultText}
                            tone={done ? tone : "slate"}
                        />
                        <Kpi
                            label="Score"
                            value={done ? `${r.score}/${r.totalScore}` : "—"}
                            sub={done ? "points" : ""}
                        />
                        <Kpi
                            label="Pass mark"
                            value={passPct !== null ? `${passPct}%` : (r.passScore ?? "—")}
                            sub={`${r.passScore ?? "—"} of ${r.totalScore ?? "—"}`}
                        />
                        <Kpi
                            label="Mistakes"
                            value={done ? mistakesOf(r) : "—"}
                            sub={r.mistakes.length ? "listed below" : ""}
                            tone={done && mistakesOf(r) ? "red" : "slate"}
                        />
                        {qs > 0 ? (
                            <Kpi
                                label="Correct"
                                value={done ? `${Math.max(qs - mistakesOf(r), 0)}/${qs}` : "—"}
                                sub={r.duration ? `${r.duration} min allowed` : "questions"}
                            />
                        ) : (
                            <Kpi label="Taken on" value={fmtShort(r.date) || "—"} sub={done ? "" : "Not taken yet"} />
                        )}
                        <Kpi
                            label="Lessons to review"
                            value={r.lessonsToRecap.length}
                            sub={r.lessonsToRecap.length ? "listed below" : "Nothing to review"}
                        />
                    </div>

                    {r.lessonsToRecap.length > 0 && (
                        <>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                                Lessons to review
                            </p>
                            <div className="mb-4 flex flex-col gap-2">
                                {r.lessonsToRecap.map((l) => (
                                    <div
                                        key={l.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-800">{l.name}</p>
                                            <p className="flex flex-wrap items-center gap-2">
                                                <span className="text-[11px] font-bold text-red-700">
                                                    {l.mistakesCount}{" "}
                                                    {Number(l.mistakesCount) === 1 ? "mistake" : "mistakes"}
                                                </span>
                                                <AttendedTag attended={l.attendedLesson} />
                                            </p>
                                        </div>
                                        <PlButton onClick={() => onOpenLesson(l.id)}>
                                            <BookOpen size={14} /> Study
                                        </PlButton>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {r.mistakes.length ? (
                        <>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                                Your mistakes
                            </p>
                            <div className="flex flex-col gap-2">
                                {r.mistakes.map((m, i) => (
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
                                ? r.status === "absent"
                                    ? `You missed this ${cfg.noun.toLowerCase()}.`
                                    : "Your result is not ready yet."
                                : "No mistakes — full marks."}
                        </p>
                    )}
                </div>

                <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-3">
                    <PlButton onClick={onClose}>Close</PlButton>
                </div>
            </div>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/* One mistake: your answer → correct, question image, solutions       */
/* ------------------------------------------------------------------ */

export const MistakeItem = ({ mistake, index, onOpenPdf, onOpenVideo }) => {
    const [open, setOpen] = useState(false);
    const isGrid = mistake.answerType && !/mcq/i.test(mistake.answerType);
    const options = Array.isArray(mistake.options) ? mistake.options : [];
    const answers = (Array.isArray(mistake.answers) ? mistake.answers : []).filter(
        (a) => a.answerText || a.answerImage || a.answerPdf || isUrl(a.answerVideo),
    );

    const studentOpt = options.find(
        (o) => o.id && o.id === mistake.studentSelectedOptionId,
    );
    // isCorrect is not sent — match the correct answer by its text.
    const correctOpt =
        !isGrid && mistake.correctOption
            ? options.find((o) => o.answer && o.answer === mistake.correctOption)
            : null;

    const yours = isGrid
        ? mistake.studentGridInAnswer || "—"
        : (studentOpt && optionLetter(studentOpt.order)) ||
        cleanHtmlText(mistake.studentOption) ||
        "—";
    const correct = isGrid
        ? mistake.correctOption || "?"
        : (correctOpt && optionLetter(correctOpt.order)) ||
        cleanHtmlText(mistake.correctOption) ||
        "?";

    const questionText = cleanHtmlText(mistake.questionText);
    const showOptions = !isGrid && options.some((o) => cleanHtmlText(o.answer));

    return (
        <div className="rounded-xl border border-slate-200 p-3">
            <div className="mb-1 flex items-center justify-between gap-2 text-xs font-bold">
                <span className="flex items-center gap-2">
                    <span className="text-[#7d0a0a]">Question {index}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                        {isGrid ? "Grid-in" : "MCQ"}
                    </span>
                </span>
                <span className="flex items-center gap-1.5">
                    <span
                        title="Your answer"
                        className="inline-flex h-[26px] min-w-[26px] items-center justify-center rounded-md border border-red-200 bg-red-50 px-1.5 text-xs font-extrabold text-red-700"
                    >
                        {yours}
                    </span>
                    →
                    <span
                        title={correct === "?" ? "See the solution" : "Correct answer"}
                        className="inline-flex h-[26px] min-w-[26px] items-center justify-center rounded-md border border-green-200 bg-green-50 px-1.5 text-xs font-extrabold text-green-700"
                    >
                        {correct}
                    </span>
                </span>
            </div>

            {questionText && <p className="mb-1 text-sm text-slate-800">{questionText}</p>}

            {mistake.questionImage && (
                <img
                    src={mistake.questionImage}
                    alt={`Question ${index}`}
                    onContextMenu={(e) => e.preventDefault()}
                    className="my-2 max-h-64 w-full rounded-lg border border-slate-200 bg-white object-contain p-1"
                />
            )}

            {(mistake.lesson?.name || mistake.attendedLesson !== undefined) && (
                <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {mistake.lesson?.name && <span>Topic: {mistake.lesson.name}</span>}
                    {mistake.lesson && <AttendedTag attended={mistake.attendedLesson} />}
                </p>
            )}

            {showOptions && (
                <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {options.map((opt, i) => {
                        const picked = opt.id === mistake.studentSelectedOptionId;
                        const right = correctOpt && opt.id === correctOpt.id;
                        return (
                            <div
                                key={opt.id || i}
                                className={`rounded-lg border px-2.5 py-1.5 text-xs ${right
                                        ? "border-green-200 bg-green-50 font-semibold text-green-800"
                                        : picked
                                            ? "border-red-200 bg-red-50 font-semibold text-red-800"
                                            : "border-slate-200 bg-white text-slate-600"
                                    }`}
                            >
                                {optionLetter(opt.order) && (
                                    <b className="me-1">{optionLetter(opt.order)}.</b>
                                )}
                                {cleanHtmlText(opt.answer)}
                            </div>
                        );
                    })}
                </div>
            )}

            {answers.length > 0 && (
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#7d0a0a] hover:underline"
                >
                    <PlayCircle size={14} />
                    {open ? "Hide solution" : "Show solution"}
                </button>
            )}

            {open && (
                <div className="mt-2 space-y-2 rounded-lg bg-slate-50 p-3">
                    {answers.map((ans, i) => (
                        <div key={ans.id || i} className="space-y-2">
                            {ans.answerText && (
                                <p className="whitespace-pre-wrap text-xs text-slate-700">
                                    {cleanHtmlText(ans.answerText)}
                                </p>
                            )}
                            {ans.answerImage && (
                                <img
                                    src={ans.answerImage}
                                    alt={`Question ${index} solution`}
                                    onContextMenu={(e) => e.preventDefault()}
                                    className="max-h-72 rounded-lg border border-slate-200 bg-white object-contain"
                                />
                            )}
                            <div className="flex flex-wrap gap-2">
                                {isUrl(ans.answerVideo) && (
                                    <PlButton
                                        onClick={() =>
                                            onOpenVideo(ans.answerVideo, `Question ${index} — video solution`)
                                        }
                                    >
                                        <Video size={14} /> Video
                                    </PlButton>
                                )}
                                {ans.answerPdf && (
                                    <PlButton
                                        onClick={() =>
                                            onOpenPdf(ans.answerPdf, `Question ${index} — PDF solution`)
                                        }
                                    >
                                        <FileText size={14} /> PDF
                                    </PlButton>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ------------------------------------------------------------------ */
/* PDF (view only) and video modals                                    */
/* ------------------------------------------------------------------ */

export const PdfModal = ({ modal, onClose }) =>
    modal ? (
        <div
            className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/70 p-3 backdrop-blur-sm sm:p-6"
            onClick={onClose}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <h3 className="flex items-center gap-2 truncate text-sm font-bold text-slate-800">
                        <FileText size={18} className="text-[#7d0a0a]" />
                        {modal.title}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="relative min-h-0 flex-1 bg-slate-900">
                    {modal.url.includes("drive.google.com") ? (
                        <SecureEmbed src={modal.url} title={modal.title} />
                    ) : (
                        <SecurePdfViewer
                            key={modal.url}
                            url={modal.url}
                            title={modal.title}
                        />
                    )}
                </div>
            </div>
        </div>
    ) : null;

export const VideoModal = ({ modal, onClose }) =>
    modal ? (
        <div
            className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/70 p-3 backdrop-blur-sm sm:p-6"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <h3 className="flex items-center gap-2 truncate text-sm font-bold text-slate-800">
                        <Video size={18} className="text-[#7d0a0a]" />
                        {modal.title}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="bg-black p-3">
                    <video
                        controls
                        autoPlay
                        controlsList="nodownload"
                        onContextMenu={(e) => e.preventDefault()}
                        className="max-h-[70vh] w-full rounded-lg"
                        src={modal.url}
                    />
                </div>
            </div>
        </div>
    ) : null;

export default ExamReportsView;