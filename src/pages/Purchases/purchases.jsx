import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useGet from "@/hooks/useGet";
import { Kpi, Page, PageHead } from "@/components/portal/ui";
import OrdersPanel from "./parts/OrdersPanel";
import { ErrorCard, KIND_LABEL, fmtDate, kindClass } from "./parts/shop";

/* My purchases — "What you own" (courses / chapters / lessons with access status) and "Orders" (payment history). */

const isEnded = (item) => {
  if (String(item.status || "").includes("expired")) return true;
  if (!item.expiresAt) return false; // no end date = open access
  return new Date(item.expiresAt) < new Date();
};

const Purchases = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "orders" ? "orders" : "owned";

  const { data: coursesData, loading: coursesLoading, error: coursesError, refetch: refetchCourses } = useGet("/api/user/courses/purchased");
  const { data: chaptersData, loading: chaptersLoading, error: chaptersError, refetch: refetchChapters } = useGet("/api/user/chapters/purchased");
  const { data: lessonsData, loading: lessonsLoading, error: lessonsError, refetch: refetchLessons } = useGet("/api/user/lessons/purchased");

  const courses = useMemo(() => coursesData?.data?.courses || [], [coursesData]);
  const rawChapters = useMemo(() => chaptersData?.data?.chapters || [], [chaptersData]);
  const rawLessons = useMemo(() => lessonsData?.data?.lessons || [], [lessonsData]);

  // Chapters / lessons bought on their own (not part of a course the student owns)
  const purchasedCourseIds = courses.map((c) => c.id);
  const chapters = rawChapters.filter((ch) => !purchasedCourseIds.includes(ch.courseId || ch.course?.id));
  const lessons = rawLessons.filter((ls) => !purchasedCourseIds.includes(ls.courseId || ls.course?.id));

  // id -> name, so the order history can show what each order was for
  const names = useMemo(() => {
    const m = {};
    [...courses, ...rawChapters, ...rawLessons].forEach((x) => { if (x?.id) m[x.id] = x.name; });
    return m;
  }, [courses, rawChapters, rawLessons]);

  const loading = coursesLoading || chaptersLoading || lessonsLoading;
  const error = coursesError || chaptersError || lessonsError;
  const ended = [...courses, ...chapters, ...lessons].filter(isEnded).length;

  const openContent = (item, contentType) => {
    // pass the chapters and lessons that belong to this course into the content page
    const courseChapters = rawChapters.filter((ch) => (ch.courseId || ch.course?.id) === item.id);
    const courseLessons = rawLessons.filter((ls) => (ls.courseId || ls.course?.id) === item.id);
    navigate(`/user/contentdetails/${item.id}`, {
      state: { contentType, passedChapters: courseChapters, passedLessons: courseLessons },
    });
  };

  const setTab = (k) => setParams(k === "orders" ? { tab: "orders" } : {}, { replace: true });

  const row = (item, kind, contentType) => {
    const over = isEnded(item);
    const parent = [item.courseName, item.chapterName].filter(Boolean).join(" · ");
    return (
      <div key={item.id || item.enrollmentId} className="flex items-center gap-3 border border-slate-100 rounded-xl p-3">
        <span className={kindClass(kind)}>{KIND_LABEL[kind]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
          {parent && <p className="text-[11px] text-slate-500 truncate">{parent}</p>}
          <p className="text-[11px] text-slate-400">
            {item.expiresAt
              ? <><b className={over ? "text-red-600" : "text-green-700"}>{over ? "Ended" : "Open until"} {fmtDate(item.expiresAt)}</b> · </>
              : over ? <><b className="text-red-600">Ended</b> · </> : <><b className="text-green-700">Open access</b> · </>}
            Bought {fmtDate(item.purchasedAt)}
          </p>
        </div>
        {over
          ? <button className="btn-mini primary shrink-0" onClick={() => navigate("/user/payment")}>Renew</button>
          : <button className="btn-mini shrink-0" onClick={() => openContent(item, contentType)}>View content</button>}
      </div>
    );
  };

  const group = (title, list, kind, contentType) => (
    <section className="bg-white border border-slate-200 rounded-2xl p-5">
      <h3 className="font-extrabold text-gray-900 mb-3">{title} <span className="text-slate-400 font-semibold text-sm">({list.length})</span></h3>
      {list.length
        ? <div className="flex flex-col gap-2">{list.map((item) => row(item, kind, contentType))}</div>
        : <p className="text-sm text-slate-400">Nothing here yet.</p>}
    </section>
  );

  const owned = () => {
    if (loading && !(coursesData && chaptersData && lessonsData)) {
      return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[0, 1, 2].map((i) => <div key={i} className="skel h-40"></div>)}</div>;
    }
    if (error) return <ErrorCard text={error} onRetry={() => { refetchCourses(); refetchChapters(); refetchLessons(); }} />;
    if (!courses.length && !chapters.length && !lessons.length) {
      return (
        <section className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <p className="text-lg font-extrabold text-gray-900 mb-1">Nothing bought yet</p>
          <p className="text-sm text-slate-500 mb-4">Courses, chapters and lessons you buy show up here.</p>
          <button className="pl-btn primary" onClick={() => navigate("/user/payment")}>Open the Store</button>
        </section>
      );
    }
    return (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <Kpi label="Courses" value={courses.length} sub="Full courses" />
          <Kpi label="Chapters" value={chapters.length} sub="Bought on their own" />
          <Kpi label="Lessons" value={lessons.length} sub="Bought on their own" />
          <Kpi label="Access ended" value={ended} sub={ended ? "Renew in the Store" : "Everything is open"} tone={ended ? "red" : "green"} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {group("Courses", courses, "course", "courses")}
          {group("Chapters", chapters, "chapter", "chapters")}
          {lessons.length > 0 && group("Lessons", lessons, "lesson", "lessons")}
        </div>
      </>
    );
  };

  return (
    <Page>
      <PageHead title="My Purchases" text="What you own, and every order you placed — when, for how much and its status.">
        <button className="pl-btn primary" onClick={() => navigate("/user/payment")}>Open the Store</button>
      </PageHead>
      <div className="flex flex-wrap gap-1 bg-slate-100 rounded-xl p-1 mb-5 w-fit max-w-full">
        <button className={`rp-seg ${tab === "owned" ? "active" : ""}`} onClick={() => setTab("owned")}>What you own</button>
        <button className={`rp-seg ${tab === "orders" ? "active" : ""}`} onClick={() => setTab("orders")}>Orders</button>
      </div>
      {tab === "owned" ? owned() : <OrdersPanel names={names} />}
    </Page>
  );
};

export default Purchases;
