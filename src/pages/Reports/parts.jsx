// Shared pieces of the Reports pages (Subjects | EXAM | Diagnose), in the MathPortal design.
import { useEffect, useState } from "react";
import Icon from "@/components/portal/Icon";
import SecurePdfViewer, { SecureEmbed } from "../Attent/SecurePdfViewer";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const cleanHtmlText = (text) =>
  String(text || "")
    .replace(/<\/?[^>]+(>|$)/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const isUrl = (value) => typeof value === "string" && /^https?:\/\//i.test(value);

export const validDate = (value) => Boolean(value) && !Number.isNaN(new Date(value).getTime());

// "Oct 26"
export const fmtShort = (value) =>
  validDate(value) ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

// "Mon, Oct 26, 2026 · 11:21 AM"
export const fmtLong = (value) => {
  if (!validDate(value)) return "—";
  const d = new Date(value);
  return `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
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

/** Download rows (first row = header) as a CSV file. */
export const downloadCsv = (filename, rows) => {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* ------------------------------------------------------------------ */
/* Small UI pieces                                                     */
/* ------------------------------------------------------------------ */

/** Filter chip (design: .tab-btn with a light border). */
export const TabChip = ({ active, children, ...props }) => (
  <button type="button" className={`tab-btn ${active ? "active" : ""}`} style={{ border: "1px solid #e2e8f0" }} {...props}>
    {children}
  </button>
);

export const SearchBox = ({ value, onChange, placeholder, className = "" }) => (
  <div className={`relative ${className}`}>
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="input pr-9" />
    {value && (
      <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
        <Icon name="x" size={14} />
      </button>
    )}
  </div>
);

export const AttendedTag = ({ attended }) =>
  attended ? <span className="att yes">✓ Lesson attended</span> : <span className="att text-slate-400">Lesson not attended</span>;

/** Answer chip: red = your answer, green = the right one. Grows for longer answers. */
export const AnsChip = ({ value, ok, title }) => {
  const text = String(value ?? "—");
  return (
    <span className={`ans ${ok ? "ok" : "no"}`} title={title} style={text.length > 2 ? { width: "auto", minWidth: 26, padding: "0 7px", maxWidth: 220 } : undefined}>
      <span className="truncate">{text}</span>
    </span>
  );
};

/** "Review these lessons" card (design: recommendationCards → .rec-card). */
export const RecCard = ({ badge, count, title, sub, extra, onStudy }) => (
  <div className="rec-card">
    <div className="flex items-start justify-between gap-2">
      <span className="pl-course truncate">{badge}</span>
      {count > 0 && <span className="rec-count">{plural(count, "mistake")}</span>}
    </div>
    <div className="mt-2 mb-3">
      <p className="font-bold text-slate-900 leading-snug">{title}</p>
      {sub && <p className="text-xs text-slate-500 line-clamp-1">{sub}</p>}
      {extra && <p className="mt-1">{extra}</p>}
    </div>
    {onStudy && (
      <button type="button" className="pl-btn primary w-full justify-center" onClick={onStudy}>
        <Icon name="book" size={15} /> Study this lesson
      </button>
    )}
  </div>
);

export const RecSection = ({ title, sub, children }) => (
  <section className="rp-card mb-5">
    <div className="mb-3">
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500">{sub}</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">{children}</div>
  </section>
);

export const ReportSkeleton = () => (
  <>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">{[1, 2, 3, 4].map((i) => <div key={i} className="skel h-24"></div>)}</div>
    <div className="rp-card"><div className="skel h-40"></div></div>
  </>
);

export const ErrorCard = ({ error, onRetry }) => (
  <section className="rp-card text-center py-10">
    <p className="font-bold text-slate-900 mb-1">Could not load this report</p>
    <p className="text-sm text-slate-500 mb-4">{String(error || "Something went wrong.")}</p>
    {onRetry && <button type="button" className="pl-btn" onClick={onRetry}>Try again</button>}
  </section>
);

export const Legend = ({ children }) => <p className="text-xs text-slate-400 mt-3">{children}</p>;

/* ------------------------------------------------------------------ */
/* Mistakes                                                            */
/* ------------------------------------------------------------------ */

/** Your answer / correct answer of one mistake, as shown on the chips. */
export const mistakeAnswers = (mistake) => {
  const isGrid = Boolean(mistake.answerType) && !/mcq/i.test(mistake.answerType);
  const options = Array.isArray(mistake.options) ? mistake.options : [];
  const studentOpt = options.find((o) => o.id && o.id === mistake.studentSelectedOptionId);
  // isCorrect is not sent — match the correct answer by its text.
  const correctOpt = !isGrid && mistake.correctOption ? options.find((o) => o.answer && o.answer === mistake.correctOption) : null;
  const yours = isGrid
    ? mistake.studentGridInAnswer || "—"
    : (studentOpt && optionLetter(studentOpt.order)) || cleanHtmlText(mistake.studentOption) || "—";
  const correct = isGrid
    ? mistake.correctOption || "?"
    : (correctOpt && optionLetter(correctOpt.order)) || cleanHtmlText(mistake.correctOption) || "?";
  return { isGrid, options, correctOpt, yours, correct };
};

const solutionsOf = (mistake) =>
  (Array.isArray(mistake.answers) ? mistake.answers : []).filter(
    (a) => a.answerText || a.answerImage || a.answerPdf || isUrl(a.answerVideo),
  );

/** Question text, image and the options (picked one red, right one green). */
export const MistakeQuestion = ({ mistake, index }) => {
  const { isGrid, options, correctOpt } = mistakeAnswers(mistake);
  const questionText = cleanHtmlText(mistake.questionText);
  const showOptions = !isGrid && options.some((o) => cleanHtmlText(o.answer));
  return (
    <>
      {questionText && <p className="text-sm text-slate-800 mb-1">{questionText}</p>}
      {mistake.questionImage && (
        <img
          src={mistake.questionImage}
          alt={`Question ${index}`}
          onContextMenu={(e) => e.preventDefault()}
          className="my-2 max-h-64 w-full rounded-lg border border-slate-200 bg-white object-contain p-1"
        />
      )}
      {showOptions && (
        <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {options.map((opt, i) => {
            const picked = opt.id === mistake.studentSelectedOptionId;
            const right = correctOpt && opt.id === correctOpt.id;
            return (
              <div
                key={opt.id || i}
                className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                  right ? "border-green-200 bg-green-50 font-semibold text-green-800" : picked ? "border-red-200 bg-red-50 font-semibold text-red-800" : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {optionLetter(opt.order) && <b className="me-1">{optionLetter(opt.order)}.</b>}
                {cleanHtmlText(opt.answer)}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

/** "Show solution" toggle: written solution, image, and the video / PDF buttons. */
export const MistakeSolution = ({ mistake, index, onOpenPdf, onOpenVideo }) => {
  const [open, setOpen] = useState(false);
  const answers = solutionsOf(mistake);
  if (!answers.length) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen((v) => !v)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-one hover:underline">
        {open ? "Hide solution" : "Show solution"}
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-lg bg-slate-50 border border-slate-100 p-3">
          {answers.map((ans, i) => (
            <div key={ans.id || i} className="space-y-2">
              {ans.answerText && <p className="whitespace-pre-wrap text-xs text-slate-700">{cleanHtmlText(ans.answerText)}</p>}
              {ans.answerImage && (
                <img
                  src={ans.answerImage}
                  alt={`Question ${index} solution`}
                  onContextMenu={(e) => e.preventDefault()}
                  className="max-h-72 rounded-lg border border-slate-200 bg-white object-contain"
                />
              )}
              {(isUrl(ans.answerVideo) || ans.answerPdf) && (
                <div className="flex flex-wrap gap-2">
                  {isUrl(ans.answerVideo) && (
                    <button type="button" className="pl-btn" onClick={() => onOpenVideo(ans.answerVideo, `Question ${index} — video solution`)}>
                      <Icon name="video" size={14} /> Video
                    </button>
                  )}
                  {ans.answerPdf && (
                    <button type="button" className="pl-btn" onClick={() => onOpenPdf(ans.answerPdf, `Question ${index} — PDF solution`)}>
                      <Icon name="pdf" size={14} /> PDF
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

/** One mistake as a card (design: Sheet.quizInfo mistake list). */
export const MistakeItem = ({ mistake, index, onOpenPdf, onOpenVideo }) => {
  const { isGrid, yours, correct } = mistakeAnswers(mistake);
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-2 text-xs font-bold mb-1">
        <span className="flex items-center gap-2">
          <span className="text-one">Question {index}</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{isGrid ? "Grid-in" : "MCQ"}</span>
        </span>
        <span className="flex items-center gap-1.5 min-w-0">
          <AnsChip value={yours} title="Your answer" /> →
          <AnsChip value={correct} ok title={correct === "?" ? "See the solution" : "Correct answer"} />
        </span>
      </div>
      <MistakeQuestion mistake={mistake} index={index} />
      {(mistake.lesson?.name || mistake.attendedLesson !== undefined) && (
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {mistake.lesson?.name && <span>Topic: {mistake.lesson.name}</span>}
          {mistake.lesson && <AttendedTag attended={mistake.attendedLesson} />}
        </p>
      )}
      <MistakeSolution mistake={mistake} index={index} onOpenPdf={onOpenPdf} onOpenVideo={onOpenVideo} />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* PDF (view only) and video viewers (design: .pv-bg)                  */
/* ------------------------------------------------------------------ */

const useEscape = (active, onClose) => {
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, onClose]);
};

const ViewerBar = ({ kind, title, onClose }) => (
  <div className="pv-bar">
    <span className="pv-kind">{kind}</span>
    <p className="text-sm font-semibold text-white truncate flex-1">{title}</p>
    <button type="button" className="pv-tool" onClick={onClose} aria-label="Close preview">✕</button>
  </div>
);

export const PdfModal = ({ modal, onClose }) => {
  useEscape(Boolean(modal), onClose);
  if (!modal) return null;
  return (
    <div className="pv-bg" onClick={(e) => e.target === e.currentTarget && onClose()} onContextMenu={(e) => e.preventDefault()}>
      <ViewerBar kind="PDF" title={modal.title} onClose={onClose} />
      <div className="relative flex-1 min-h-0">
        {modal.url.includes("drive.google.com") ? (
          <SecureEmbed src={modal.url} title={modal.title} />
        ) : (
          <SecurePdfViewer key={modal.url} url={modal.url} title={modal.title} />
        )}
      </div>
    </div>
  );
};

export const VideoModal = ({ modal, onClose }) => {
  useEscape(Boolean(modal), onClose);
  if (!modal) return null;
  return (
    <div className="pv-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <ViewerBar kind="Video" title={modal.title} onClose={onClose} />
      <div className="flex-1 min-h-0 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <video
          controls
          autoPlay
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
          className="max-h-full w-full max-w-5xl rounded-lg bg-black"
          src={modal.url}
        />
      </div>
    </div>
  );
};
