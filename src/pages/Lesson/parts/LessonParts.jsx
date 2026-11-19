import { useState } from "react";
import { useNavigate } from "react-router-dom";
import usePost from "@/hooks/usePost";
import Icon from "@/components/portal/Icon";

export const money = (n) => `${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} EGP`;

/** Material row (same look as the session page rows). `lead` replaces the icon tile. */
export const MatRow = ({ icon, tone = "slate", lead, title, meta, children }) => (
  <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white">
    {lead ?? <span className={`nt-icon ${tone}`}><Icon name={icon} size={16} /></span>}
    <div className="flex-[1_1_10rem] min-w-0">
      <p className="text-sm font-bold text-slate-900 break-words">{title}</p>
      {meta && <p className="text-xs text-slate-400">{meta}</p>}
    </div>
    {children && <div className="flex flex-wrap gap-2 ml-auto">{children}</div>}
  </div>
);

export const Box = ({ title, extra, children, className = "" }) => (
  <section className={`rp-card ${className}`}>
    <div className="flex items-center justify-between gap-2 mb-3">
      <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{title}</h3>
      {extra}
    </div>
    <div className="flex flex-col gap-2">{children}</div>
  </section>
);

/**
 * Video of a lesson idea → viewer fields.
 * API: { type: "bunny", streamUrl } | { type: "external", url }; older shape: video URL string / bunnyGuid.
 */
export const ideaVideo = (idea) => {
  const v = idea?.video;
  if (v && typeof v === "object") {
    if (v.streamUrl) return { streamUrl: v.streamUrl };
    if (v.url) return { url: v.url };
    return null;
  }
  if (typeof v === "string" && v) return { url: v };
  if (idea?.bunnyGuid) return { bunnyGuid: idea.bunnyGuid };
  return null;
};

export const quizMeta = (q) => {
  // hours and minutes together (1 h 30 min used to show as "30 min")
  const mins = (Number(q.durationHours) || 0) * 60 + (Number(q.durationMinutes) || 0);
  const a = q.lastAttempt;
  return [
    mins ? `${mins} min` : "",
    q.totalScore != null ? `Score ${q.totalScore}` : "",
    a ? `Last result ${a.score ?? 0}/${q.totalScore ?? "—"} ${a.isPassed ? "✓ passed" : "✕ not passed"}` : "",
  ].filter(Boolean).join(" · ") || "Quiz";
};

/** POST /start then open the quiz player (same calls as before). */
export function useStartQuiz() {
  const navigate = useNavigate();
  const { postData } = usePost();
  const [startingId, setStartingId] = useState(null);
  const start = async (quiz) => {
    setStartingId(quiz.id);
    try {
      const res = await postData({}, `/api/user/quizzes/${quiz.id}/start`, "Quiz started successfully!");
      if (res) navigate(`/user/quiz/${quiz.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setStartingId(null);
    }
  };
  return { start, startingId };
}

export const QuizRow = ({ quiz, open = true, startingId, onStart }) => {
  const navigate = useNavigate();
  const a = quiz.lastAttempt;
  return (
  <MatRow icon="exam" tone="purple" title={quiz.title} meta={quizMeta(quiz)}>
    {open ? (
      <span className="flex flex-wrap gap-2">
        {a && (
          <button className="pl-btn" onClick={() => navigate(`/user/quiz-result/${a.id}`)}>View result</button>
        )}
        {!a?.isPassed && (
          <button className="pl-btn primary" disabled={startingId === quiz.id} onClick={() => onStart(quiz)}>
            {startingId === quiz.id ? "Starting…" : a ? "Retake" : "Start quiz"}
          </button>
        )}
      </span>
    ) : (
      <span className="text-slate-300" title="Locked"><Icon name="lock" size={16} /></span>
    )}
  </MatRow>
  );
};

export const LoadingPage = () => (
  <>
    <div className="skel h-5 w-48 mb-5"></div>
    <div className="skel h-32 mb-5"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5"><div className="skel h-24"></div><div className="skel h-24"></div></div>
    <div className="skel h-64"></div>
  </>
);
