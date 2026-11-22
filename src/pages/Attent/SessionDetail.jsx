import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "@/api/api";
import { useStudentData } from "@/context/StudentData";
import { fmtDay, fmtTime, typeOf } from "@/lib/portal";
import Icon from "@/components/portal/Icon";
import HlsPlayer from "@/components/portal/HlsPlayer";
import { Page, StarRow, TeacherAvatar, TypeDot } from "@/components/portal/ui";
import SecurePdfViewer, { SecureEmbed } from "./SecurePdfViewer";
import SessionRatingModal from "./SessionRatingModal";
import { toStars } from "./History";

const Row = ({ icon, tone, title, meta, children }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white">
    <span className={`nt-icon ${tone}`}><Icon name={icon} size={16} /></span>
    <div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-900 truncate">{title}</p><p className="text-xs text-slate-400">{meta}</p></div>
    {children}
  </div>
);
const Box = ({ title, extra, children }) => (
  <section className="rp-card">
    <div className="flex items-center justify-between mb-3"><h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{title}</h3>{extra}</div>
    <div className="flex flex-col gap-2">{children}</div>
  </section>
);
const isDrive = (url) => /drive\.google\.com|docs\.google\.com/.test(url || "");
const drivePreview = (url) => (url || "").replace(/\/view(\?.*)?$/, "/preview").replace(/\/edit(\?.*)?$/, "/preview");

/** Full-screen viewer for a PDF or a video. */
function Viewer({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  let body;
  if (item.kind === "pdf") body = isDrive(item.url) ? <SecureEmbed src={drivePreview(item.url)} title={item.title} /> : <div className="pv-scroll"><SecurePdfViewer url={item.url} title={item.title} /></div>;
  else if (item.video?.type === "bunny") body = <div className="flex-1 flex items-center justify-center p-4"><div className="w-full max-w-5xl aspect-video"><HlsPlayer src={item.video.streamUrl} title={item.title} /></div></div>;
  else body = <div className="flex-1 p-4"><SecureEmbed src={drivePreview(item.video?.url)} title={item.title} /></div>;
  return (
    <div className="pv-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pv-bar">
        <span className="pv-kind">{item.kind === "pdf" ? "PDF" : "Video"}</span>
        <p className="text-sm font-semibold text-white truncate flex-1">{item.title}</p>
        <button className="pv-tool" onClick={onClose} aria-label="Close preview">✕</button>
      </div>
      {body}
    </div>
  );
}

export default function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { ratingFor, reloadRatings, showToast } = useStudentData();
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");
  const [quizzes, setQuizzes] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [rating, setRating] = useState(false);
  const [starting, setStarting] = useState(null);
  const back = location.state?.from === "materials" ? ["/user/materials", "Class materials"] : ["/user/history", "Attendance history"];

  useEffect(() => {
    let alive = true;
    api.get(`/api/user/sessions/${id}`)
      .then((res) => {
        const s = res?.data?.data?.session;
        if (!alive) return;
        setSession(s);
        const lessonIds = (s?.lessons || []).map((l) => l.id);
        Promise.all(lessonIds.map((lid) => api.get(`/api/user/quizzes/lesson/${lid}`).then((r) => (r?.data?.data?.quizzes || []).map((q) => ({ ...q, lessonId: lid }))).catch(() => [])))
          .then((lists) => alive && setQuizzes(lists.flat().sort((a, b) => (a.quizOrder || 0) - (b.quizOrder || 0))));
      })
      .catch((err) => alive && setError(err?.response?.data?.error?.message || "Could not load this session"));
    return () => { alive = false; };
  }, [id]);

  if (error) return <Page><p className="text-sm text-red-600">{error}</p></Page>;
  if (!session) return <Page><div className="skel h-40 mb-4"></div><div className="skel h-64"></div></Page>;

  const iso = String(session.sessionDate || session.startDate || "").slice(0, 10);
  const attended = session.attendance?.status === "present";
  const absent = session.attendance?.status === "absent";
  const canRate = session.status !== "cancelled" && !absent; // "not marked" can still be rated, as on the history page
  const r = ratingFor(session.id);
  const locked = attended && !r;          // design: rate the session to open its materials
  const lesson = (session.lessons || [])[0];
  const t = typeOf(session.sessionRelationalType);

  const pdfs = [];
  if (session.teacher_explanation_pdf) pdfs.push({ title: "Teacher explanation", meta: "Uploaded by your teacher after the session", url: session.teacher_explanation_pdf });
  if (session.session_pdf) pdfs.push({ title: "Session worksheet", meta: "Your copy", url: session.session_pdf });
  (session.materials || []).forEach((m) => { if (m.session_pdf && m.session_pdf !== session.session_pdf) pdfs.push({ title: m.name, meta: "Lesson material", url: m.session_pdf }); });
  if (session.materialLink) pdfs.push({ title: "Class material", meta: "Shared link", url: session.materialLink });
  const ideas = (session.lessons || []).flatMap((l) => (l.ideas || []).map((i) => ({ ...i, lessonName: l.name })));
  // attended, but the lesson access (content days) ran out
  const accessExpired = (session.lessons || []).some((l) => l.accessExpired);

  const startQuiz = async (q) => {
    setStarting(q.id);
    try {
      await api.post(`/api/user/quizzes/${q.id}/start`, {});
      navigate(`/user/quiz/${q.id}`);
    } catch (err) {
      showToast(err?.response?.data?.error?.message || "Could not start the quiz");
    } finally {
      setStarting(null);
    }
  };

  return (
    <Page>
      <button className="text-sm font-semibold text-slate-500 hover:text-one mb-4" onClick={() => navigate(back[0])}>← {back[1]}</button>
      <section className="rp-card mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {lesson?.course?.name && <span className="pl-course">{lesson.course.name}</span>}
              <span className="text-xs font-semibold text-slate-500"><TypeDot type={session.sessionRelationalType} />{t.label}</span>
              {attended ? <span className="att yes text-xs">✓ Attended</span>
                : absent ? <span className="text-xs font-bold text-red-600">Not attended</span>
                  : <span className="text-xs font-semibold text-slate-400">Attendance not marked</span>}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{session.name}</h2>
            <p className="text-sm text-slate-500">{fmtDay(iso)} · {fmtTime(session.timeFrom)} – {fmtTime(session.timeTo)}{lesson ? ` · ${[lesson.chapter?.name, lesson.name].filter(Boolean).join(" · ")}` : ""}</p>
          </div>
          {session.teacher && (
            <div className="flex items-center gap-3"><TeacherAvatar name={session.teacher.name} big /><div><p className="font-bold text-slate-900">{session.teacher.name}</p><p className="text-xs text-slate-400">Teacher</p></div></div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-slate-100">
          {r ? <><span className="text-sm text-slate-600">Your rating</span><StarRow value={toStars(r)} /><button className="text-xs font-semibold text-slate-400 hover:text-one" onClick={() => setRating(true)}>Edit</button></>
            : canRate ? <>
                <button className="pl-btn primary" onClick={() => setRating(true)}>★ Rate this session</button>
                {!attended && <span className="text-xs text-slate-400">Materials open after your attendance is marked.</span>}
              </>
              : <span className="text-xs text-slate-400">Materials open after you attend this session.</span>}
        </div>
      </section>

      {locked ? (
        <section className="rp-card text-center py-10">
          <span className="w-14 h-14 rounded-2xl bg-red-50 text-one inline-flex items-center justify-center mb-3"><Icon name="lock" size={24} /></span>
          <h3 className="text-lg font-extrabold text-slate-900">Rate this session to open its materials</h3>
          <p className="text-sm text-slate-500 mt-1 mb-5">Answer a few quick questions — then the notes, videos and quizzes open.</p>
          <button className="btn-primary" style={{ width: "auto", margin: "0 auto" }} onClick={() => setRating(true)}>Answer the questions</button>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {attended && session.recordingLink && (
            <section className="lg:col-span-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5 flex flex-wrap items-center gap-4">
              <span className="w-12 h-12 rounded-2xl bg-white text-blue-600 flex items-center justify-center shrink-0"><Icon name="video" size={22} /></span>
              <div className="flex-1 min-w-[12rem]">
                <p className="font-extrabold text-slate-900">Class recording</p>
                <p className="text-sm text-slate-500">Watch your live session again — recorded by your teacher.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="pl-btn primary" onClick={() => setViewing({ kind: "video", title: `${session.name} — recording`, video: { type: "external", url: session.recordingLink } })}>▶ Watch</button>
                <a className="pl-btn" href={session.recordingLink} target="_blank" rel="noopener noreferrer">Open in Drive</a>
              </div>
            </section>
          )}
          <Box title="Uploaded by your teacher">
            {pdfs.length ? pdfs.map((d) => (
              <Row key={d.url} icon="pdf" tone="brand" title={d.title} meta={d.meta}><button className="pl-btn" onClick={() => setViewing({ kind: "pdf", ...d })}>Preview</button></Row>
            )) : <p className="text-sm text-slate-400">{attended ? "Nothing uploaded yet." : "Opens after you attend."}</p>}
          </Box>
          <Box title="Videos">
            {ideas.filter((i) => i.video).length ? ideas.filter((i) => i.video).map((i) => (
              <Row key={i.id} icon="video" tone="blue" title={i.idea} meta={i.lessonName}><button className="pl-btn" onClick={() => setViewing({ kind: "video", title: i.idea, video: i.video })}>▶ Watch</button></Row>
            )) : <p className="text-sm text-slate-400">{accessExpired ? "Your access to this lesson’s videos has ended. Attend a session of this lesson again to open them, or ask the admin." : session.lessons?.some((l) => l.ideasLocked) ? "Videos open after you attend." : "No videos for this session."}</p>}
          </Box>
          <Box title="Lesson ideas">
            {ideas.filter((i) => i.pdf).length ? ideas.filter((i) => i.pdf).map((i) => (
              <Row key={i.id} icon="book" tone="amber" title={i.idea} meta={i.lessonName}><button className="pl-btn" onClick={() => setViewing({ kind: "pdf", title: i.idea, url: i.pdf })}>Preview</button></Row>
            )) : <p className="text-sm text-slate-400">No idea sheets for this session.</p>}
          </Box>
          <Box title="Quizzes">
            {quizzes.length ? quizzes.map((q) => (
              <Row key={q.id} icon="exam" tone="slate" title={q.title} meta={[q.durationMinutes ? `${q.durationMinutes} min` : "", q.totalScore ? `${q.totalScore} points` : ""].filter(Boolean).join(" · ") || "Quiz"}>
                <button className="pl-btn primary" onClick={() => startQuiz(q)} disabled={starting === q.id}>{starting === q.id ? "Starting…" : "Start quiz"}</button>
              </Row>
            )) : <p className="text-sm text-slate-400">No quizzes for this lesson.</p>}
            {lesson && <button className="pl-btn self-start" onClick={() => navigate(`/user/lesson/${lesson.id}`)}>Open the lesson →</button>}
          </Box>
        </div>
      )}

      {viewing && <Viewer item={viewing} onClose={() => setViewing(null)} />}
      {rating && (
        <SessionRatingModal
          sessionId={session.id}
          sessionName={session.name}
          onClose={() => setRating(false)}
          onRatingSuccess={() => { setRating(false); reloadRatings(); showToast("Thanks — your rating was sent"); }}
        />
      )}
    </Page>
  );
}
