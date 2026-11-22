import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import api from "@/api/api";
import { mapSession } from "@/lib/portal";

const StudentDataContext = createContext(null);

const body = (res) => res?.data?.data;

/**
 * Data the shell and the session screens share: profile, upcoming/finished sessions,
 * cancel requests, my session ratings, homework counts, plans waiting for me and notifications.
 * Each list loads on its own so one failing endpoint never blanks the whole page.
 */
export function StudentDataProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [upcoming, setUpcoming] = useState(null);
  const [history, setHistory] = useState(null);
  const [cancelRequests, setCancelRequests] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [homework, setHomework] = useState({ quizzes: 0, extra: 0 });
  const [plansWaiting, setPlansWaiting] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const loadProfile = useCallback(() => api.get("/api/user/profile").then((r) => setProfile(body(r)?.student || null)).catch(() => {}), []);
  const loadSessions = useCallback(() => Promise.all([
    api.get("/api/user/sessions/upcoming").then((r) => setUpcoming((body(r) || []).map(mapSession))).catch(() => setUpcoming([])),
    api.get("/api/user/sessions/history").then((r) => setHistory((body(r) || []).map(mapSession))).catch(() => setHistory([])),
  ]), []);
  const loadCancelRequests = useCallback(() => api.get("/api/user/sessions/cancel-requests").then((r) => setCancelRequests(body(r)?.requests || [])).catch(() => {}), []);
  const loadRatings = useCallback(() => api.get("/api/user/session-ratings").then((r) => setRatings(body(r)?.data?.evaluations || [])).catch(() => {}), []);
  const loadNotifications = useCallback(() => api.get("/api/user/notifications").then((r) => setNotifications(body(r)?.notifications || [])).catch(() => {}), []);
  const loadCounts = useCallback(() => Promise.all([
    api.get("/api/user/quizzes/remaining-homework").then((r) => setHomework((h) => ({ ...h, quizzes: body(r)?.summary?.remaining ?? 0 }))).catch(() => {}),
    api.get("/api/user/extra-homework").then((r) => {
      const d = body(r)?.data || body(r) || {};
      setHomework((h) => ({ ...h, extra: d?.summary?.pendingCount ?? 0 }));
    }).catch(() => {}),
    api.get("/api/user/availability-plans?page=1&limit=50").then((r) => {
      const items = body(r)?.items || [];
      setPlansWaiting(items.filter((p) => p.status === "pending_student_response" || p.status === "plan_proposed").length);
    }).catch(() => {}),
  ]), []);

  const refresh = useCallback(() => Promise.all([
    loadProfile(), loadSessions(), loadCancelRequests(), loadRatings(), loadNotifications(), loadCounts(),
  ]), [loadProfile, loadSessions, loadCancelRequests, loadRatings, loadNotifications, loadCounts]);

  useEffect(() => {
    refresh();
    const poll = setInterval(() => loadNotifications(), 2 * 60 * 1000);
    return () => clearInterval(poll);
  }, [refresh, loadNotifications]);

  const cancelRequestFor = useCallback(
    (sessionId) => cancelRequests.find((c) => c.sessionId === sessionId),
    [cancelRequests],
  );
  const ratingFor = useCallback((sessionId) => ratings.find((r) => r.sessionId === sessionId), [ratings]);

  const requestCancel = useCallback(async (sessionId, reason) => {
    await api.post(`/api/user/sessions/${sessionId}/cancel-request`, { reason });
    await loadCancelRequests();
  }, [loadCancelRequests]);

  const markNotificationsRead = useCallback(async (ids) => {
    setNotifications((list) => list.map((n) => (!ids || ids.includes(n.id) ? { ...n, isRead: true } : n)));
    try { await api.patch("/api/user/notifications/read", ids ? { ids } : {}); } catch { /* keep optimistic */ }
  }, []);

  const value = useMemo(() => {
    const visibleUpcoming = (upcoming || []).filter((s) => cancelRequestFor(s.id)?.status !== "accepted");
    return {
      profile, upcoming: visibleUpcoming, history, cancelRequests, ratings, homework, plansWaiting, notifications,
      loading: upcoming === null || history === null,
      unread: notifications.filter((n) => !n.isRead).length,
      nextSession: visibleUpcoming.find((s) => !s.cancelled) || null,
      cancelRequestFor, ratingFor, requestCancel, markNotificationsRead,
      refresh, reloadSessions: loadSessions, reloadRatings: loadRatings, reloadCounts: loadCounts,
      toast, showToast,
    };
  }, [profile, upcoming, history, cancelRequests, ratings, homework, plansWaiting, notifications, cancelRequestFor, ratingFor,
    requestCancel, markNotificationsRead, refresh, loadSessions, loadRatings, loadCounts, toast, showToast]);

  return <StudentDataContext.Provider value={value}>{children}</StudentDataContext.Provider>;
}

export function useStudentData() {
  const ctx = useContext(StudentDataContext);
  if (!ctx) throw new Error("useStudentData must be used inside StudentDataProvider");
  return ctx;
}
