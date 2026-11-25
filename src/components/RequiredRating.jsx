import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/api";
import { useStudentData } from "../context/StudentData";
import SessionRatingModal from "../pages/Attent/SessionRatingModal";

/* Rating after every session is required: when the student was marked present in a session
   (last 14 days) and has not rated it, a rating window opens over every page and can't be closed
   until it is rated with a comment. Several waiting → one after the other, oldest first.
   GET /api/user/session-ratings/pending */

const fmt = (p) => {
  const d = p.sessionDate ? new Date(`${p.sessionDate}T12:00:00`) : null;
  const day = d ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "";
  const time = p.timeFrom ? new Date(`2000-01-01T${p.timeFrom}:00`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
  return [day && time ? `${day}, ${time}` : day, p.teacherName && `with ${p.teacherName}`].filter(Boolean).join(" · ");
};

export default function RequiredRating() {
  const { reloadRatings } = useStudentData();
  const { pathname } = useLocation();
  const [pending, setPending] = useState([]);
  const [skipped, setSkipped] = useState(() => new Set()); // sessions whose form can't be used right now

  const load = useCallback(() => api.get("/api/user/session-ratings/pending")
    .then((r) => setPending(r.data?.data?.data?.pending || []))
    .catch(() => {}), []); // never block the student because this check failed

  // check on every page change (attendance may have just been taken) and every 2 minutes
  useEffect(() => { load(); }, [load, pathname]);
  useEffect(() => {
    const t = setInterval(load, 2 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  const current = pending.find((p) => !skipped.has(p.sessionId));
  const skip = useCallback(() => {
    if (current) setSkipped((s) => new Set(s).add(current.sessionId));
  }, [current]);
  if (!current) return null;
  const left = pending.filter((p) => !skipped.has(p.sessionId)).length;
  return (
    <SessionRatingModal
      key={current.sessionId}
      required
      sessionId={current.sessionId}
      sessionName={current.sessionName}
      subtitle={`${fmt(current)}${left > 1 ? ` · ${left - 1} more to rate after this` : ""}`}
      onClose={() => {}}
      onUnavailable={skip}
      onRatingSuccess={() => { reloadRatings?.(); load(); }}
    />
  );
}
