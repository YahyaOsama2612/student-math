import { Fragment, useCallback, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import useGet from "@/hooks/useGet";
import Icon from "@/components/portal/Icon";
import { Page, TeacherAvatar } from "@/components/portal/ui";
import MaterialViewer from "./parts/MaterialViewer";
import { Box, LoadingPage, MatRow, QuizRow, ideaVideo, money, useStartQuiz } from "./parts/LessonParts";

const Crumbs = ({ parts }) => (
  <nav className="flex flex-wrap items-center gap-1.5 text-sm">
    {parts.map(([label, go], i) =>
      i < parts.length - 1 ? (
        <Fragment key={i}>
          <button onClick={go} className="font-semibold text-slate-500 hover:text-one py-1.5">{label}</button>
          <span className="text-slate-300">›</span>
        </Fragment>
      ) : (
        <span key={i} className="font-extrabold text-gray-900">{label}</span>
      ),
    )}
  </nav>
);

const Lesson = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { start, startingId } = useStartQuiz();

  const [activeTab, setActiveTab] = useState("ideas");
  const [viewing, setViewing] = useState(null);
  const closeViewer = useCallback(() => setViewing(null), []);

  const { data, loading, error } = useGet(`/api/user/lessons/${id}`);
  const { data: quizzesData } = useGet(`/api/user/quizzes/lesson/${id}`);

  const responseData = data?.data;
  const lessonInfo = responseData?.lesson;
  const chapterInfo = responseData?.chapter;
  const courseInfo = responseData?.course;
  const teacherInfo = responseData?.teacher;
  const ideas = responseData?.ideas || [];
  const prices = responseData?.prices || [];
  const isLocked = location.state?.fromPurchases ? false : responseData?.isLocked;

  const rawQuizzes = quizzesData?.data?.quizzes || quizzesData?.quizzes || [];
  const quizzesList = rawQuizzes.length > 0 ? [...rawQuizzes].sort((a, b) => (a.quizOrder || 0) - (b.quizOrder || 0)) : [];

  // Default price plan of the lesson
  const defaultPricePlan = prices.find((p) => p.isDefault) || prices[0];
  const lessonPrice = defaultPricePlan ? parseFloat(defaultPricePlan.totalPriceEgp) : 0;

  const handleEnroll = () => {
    if (!defaultPricePlan) return;
    navigate("/user/enrollment", {
      state: {
        type: "lessonIds",
        selectedItems: [
          {
            id: lessonInfo.id,
            name: lessonInfo.name,
            planId: defaultPricePlan.id,
            planLabel: defaultPricePlan.durationLabel,
            price: lessonPrice,
          },
        ],
        ids: [lessonInfo.id],
        price: lessonPrice,
        name: lessonInfo.name,
      },
    });
  };

  if (error && !lessonInfo) {
    return (
      <Page>
        <section className="rp-card">
          <p className="text-sm text-red-600 mb-3">{typeof error === "string" ? error : "Could not load this lesson."}</p>
          <button className="pl-btn" onClick={() => navigate(-1)}>← Go back</button>
        </section>
      </Page>
    );
  }
  if (loading || !data) return <Page><LoadingPage /></Page>;
  if (!lessonInfo) {
    return (
      <Page>
        <section className="rp-card">
          <p className="text-sm text-red-600 mb-3">This lesson could not be found.</p>
          <button className="pl-btn" onClick={() => navigate(-1)}>← Go back</button>
        </section>
      </Page>
    );
  }

  const withMaterial = ideas.filter((i) => i.pdf || ideaVideo(i));
  const stats = [
    ideas.length ? `${ideas.length} ${ideas.length === 1 ? "idea" : "ideas"}` : "",
    withMaterial.length ? `${withMaterial.length} with PDFs / videos` : "",
    quizzesList.length ? `${quizzesList.length} ${quizzesList.length === 1 ? "quiz" : "quizzes"}` : "",
  ].filter(Boolean).join(" · ");

  const crumbs = [];
  if (courseInfo?.name) crumbs.push([courseInfo.name, () => navigate(`/user/chapters/${courseInfo.id}`)]);
  if (chapterInfo?.name) crumbs.push([chapterInfo.name, () => navigate(`/user/chapter/${chapterInfo.id}`)]);
  crumbs.push([`Lesson ${lessonInfo.order ?? ""}`.trim(), null]);

  const tabs = [
    { key: "ideas", label: "Ideas & material", count: ideas.length },
    { key: "quizzes", label: "Homework & exams", count: quizzesList.length },
  ];

  return (
    <Page>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mb-4">
        <button className="text-sm font-semibold text-slate-500 hover:text-one" onClick={() => navigate(-1)}>← Back</button>
        <Crumbs parts={crumbs} />
      </div>

      {/* Header */}
      <section className="rp-card mb-5 flex flex-col md:flex-row md:items-center gap-5">
        <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 ${isLocked ? "bg-[#FDECEC] text-one" : "bg-green-50 text-green-600"}`} title={isLocked ? "Locked" : "Unlocked"}>
          <Icon name={isLocked ? "lock" : "unlock"} size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-extrabold text-one uppercase tracking-wider">
            {[courseInfo?.name, chapterInfo?.name, `Lesson ${lessonInfo.order ?? ""}`.trim()].filter(Boolean).join(" · ")}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 break-words">{lessonInfo.name}</h2>
            {isLocked ? <span className="pill bg-slate-100 text-slate-500">LOCKED</span> : <span className="pill bg-green-100 text-green-700">UNLOCKED</span>}
          </div>
          {stats && <p className="text-xs text-slate-400 mt-1">{stats}</p>}
        </div>
        {teacherInfo?.name && (
          <div className="flex items-center gap-3">
            <TeacherAvatar name={teacherInfo.name} big />
            <div><p className="font-bold text-slate-900">{teacherInfo.name}</p><p className="text-xs text-slate-400">Teacher</p></div>
          </div>
        )}
      </section>

      {/* Paywall → enrollment */}
      {isLocked && (
        <div className="rounded-2xl border border-red-100 bg-red-50/60 p-5 mb-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <p className="font-extrabold text-gray-900 mb-1"><Icon name="lock" size={16} className="inline -mt-1 mr-1 text-one" />Unlock this lesson</p>
            <p className="text-sm text-slate-500">
              Get full access to the videos, PDFs and quizzes of this lesson.
              {defaultPricePlan?.durationLabel ? ` Access period: ${defaultPricePlan.durationLabel}.` : ""}
            </p>
          </div>
          <div className="md:w-64 flex flex-col gap-2">
            {defaultPricePlan ? (
              <p className="text-2xl font-extrabold text-gray-900 md:text-right">{money(lessonPrice)}</p>
            ) : (
              <p className="text-xs text-slate-500 md:text-right">No price is set for this lesson yet.</p>
            )}
            <button className="btn-mini primary w-full" onClick={handleEnroll} disabled={!defaultPricePlan} style={defaultPricePlan ? undefined : { opacity: 0.55 }}>
              <Icon name="wallet" size={16} /> Enroll now
            </button>
          </div>
        </div>
      )}

      {/* About */}
      {lessonInfo.description && (
        <Box title="About this lesson" className="mb-4">
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{lessonInfo.description}</p>
        </Box>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <Box title="Pre-requisites">
          <p className="text-sm text-slate-600">{lessonInfo.preRequisition || "No pre-requisites required."}</p>
        </Box>
        <Box title="What you'll learn">
          <p className="text-sm text-slate-600">{lessonInfo.whatYouGain || "Core foundations and practical problem solving."}</p>
        </Box>
      </div>

      {/* Material tabs */}
      {!isLocked && (
        <>
          <div className="flex flex-wrap gap-2 mb-4" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={activeTab === t.key}
                className={`tab-btn ${activeTab === t.key ? "active" : ""}`}
                style={{ border: "1px solid #e2e8f0" }}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
                {t.count > 0 && <span className="ml-1.5 text-[11px] opacity-70">{t.count}</span>}
              </button>
            ))}
          </div>

          {activeTab === "ideas" && (
            <Box title="Lesson ideas">
              {ideas.length ? ideas.map((idea) => {
                const video = ideaVideo(idea);
                const kinds = [idea.pdf ? "PDF" : "", video ? "Video" : ""].filter(Boolean).join(" · ");
                return (
                  <MatRow
                    key={idea.id}
                    lead={<span className="nt-icon amber font-extrabold">{idea.ideaOrder}</span>}
                    title={idea.idea}
                    meta={kinds || "No material yet"}
                  >
                    {idea.pdf && (
                      <button className="pl-btn" onClick={() => setViewing({ kind: "pdf", title: `PDF: ${idea.idea}`, url: idea.pdf })}>
                        <Icon name="pdf" size={15} /> Preview PDF
                      </button>
                    )}
                    {video && (
                      <button className="pl-btn" onClick={() => setViewing({ kind: "video", title: `Video: ${idea.idea}`, ...video })}>
                        ▶ Watch
                      </button>
                    )}
                  </MatRow>
                );
              }) : <p className="text-sm text-slate-400">No ideas uploaded for this lesson yet.</p>}
            </Box>
          )}

          {activeTab === "quizzes" && (
            <Box title="Homework & exams">
              {quizzesList.length
                ? quizzesList.map((quiz) => <QuizRow key={quiz.id} quiz={quiz} startingId={startingId} onStart={start} />)
                : <p className="text-sm text-slate-400">No quizzes or homework available yet.</p>}
            </Box>
          )}
        </>
      )}

      {/* Locked: idea names only */}
      {isLocked && ideas.length > 0 && (
        <Box title="Lesson key ideas">
          {ideas.map((idea, index) => (
            <MatRow
              key={idea.id || index}
              icon="book"
              tone="amber"
              title={idea.idea || "No specific sub-topic text uploaded."}
              meta={idea.pdf || ideaVideo(idea) ? "Material available after enrollment" : ""}
            >
              <span className="text-slate-300" title="Locked"><Icon name="lock" size={16} /></span>
            </MatRow>
          ))}
        </Box>
      )}

      {viewing && <MaterialViewer item={viewing} onClose={closeViewer} />}
    </Page>
  );
};

export default Lesson;
