import { useCallback, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import useGet from "@/hooks/useGet";
import Icon from "@/components/portal/Icon";
import { Page, TeacherAvatar } from "@/components/portal/ui";
import MaterialViewer from "@/pages/Lesson/parts/MaterialViewer";
import { Box, LoadingPage, MatRow, QuizRow, ideaVideo, useStartQuiz } from "@/pages/Lesson/parts/LessonParts";

const KIND = { courses: ["course", "Course"], chapters: ["chapter", "Chapter"], lessons: ["lesson", "Lesson"] };

const ContentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { start, startingId } = useStartQuiz();
  const [viewing, setViewing] = useState(null);
  const closeViewer = useCallback(() => setViewing(null), []);

  const currentState = location.state?.contentType;
  const contentType =
    currentState === "lessons" || currentState === "lesson" || location.pathname.includes("/lesson")
      ? "lessons"
      : location.pathname.includes("/chapters/") || currentState === "chapters"
        ? "chapters"
        : "courses";

  const isCourseType = contentType === "courses";
  const isChapterType = contentType === "chapters";
  const isLessonType = contentType === "lessons";

  const endpoints = {
    courses: `/api/user/courses/${id}`,
    chapters: `/api/user/chapters/${id}`,
    lessons: `/api/user/lessons/${id}`,
  };

  const { data, loading, error } = useGet(endpoints[contentType]);
  const { data: quizzesData } = useGet(isLessonType ? `/api/user/quizzes/lesson/${id}` : null);

  if (error && !data) {
    return (
      <Page>
        <section className="rp-card">
          <p className="text-sm text-red-600 mb-3">{typeof error === "string" ? error : "Could not load this content."}</p>
          <button className="pl-btn" onClick={() => navigate(-1)}>← Go back</button>
        </section>
      </Page>
    );
  }
  if (loading || !data) return <Page><LoadingPage /></Page>;

  const rawData = data?.data || {};

  let content = rawData;
  if (isChapterType) content = rawData.chapter || {};
  if (isLessonType) content = rawData.lesson || {};

  // Data passed from the purchases page
  const passedChapters = location.state?.passedChapters || [];
  const passedLessons = location.state?.passedLessons || [];

  // 1. Course → chapters passed in the state
  const chaptersList = isCourseType ? passedChapters : [];

  // 2. Chapter → its lessons (from the API, else the passed lessons of this chapter)
  const lessonsList = isChapterType
    ? rawData.lessons || passedLessons.filter((ls) => (ls.chapterId || ls.chapter?.id) === id)
    : [];

  const ideasList = rawData.ideas || [];

  const teachersList =
    (isChapterType || isLessonType) && rawData.teacher
      ? [{ name: rawData.teacher.name, role: "Instructor" }]
      : content.teachers || rawData.teachers || [];

  const rawQuizzes = quizzesData?.data?.quizzes || quizzesData?.quizzes || [];
  const quizzesList =
    isLessonType && rawQuizzes.length > 0 ? [...rawQuizzes].sort((a, b) => (a.quizOrder || 0) - (b.quizOrder || 0)) : [];

  const locked = !!(rawData.isLocked || content.isLocked);
  const [kindKey, kindLabel] = KIND[contentType];
  const hasSemester = (content.isHaveSemester && content.semesters?.length > 0) || rawData.semester;
  const showPrereq = content.preRequisition && content.preRequisition !== "None";

  return (
    <Page>
      <button className="text-sm font-semibold text-slate-500 hover:text-one mb-4" onClick={() => navigate(-1)}>← Back</button>

      {/* Header */}
      <section className="rp-card mb-5">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 ${locked ? "bg-[#FDECEC] text-one" : "bg-green-50 text-green-600"}`} title={locked ? "Locked" : "Unlocked"}>
            <Icon name={locked ? "lock" : "unlock"} size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`kind-pill kind-${kindKey}`}>{kindLabel}</span>
              {rawData.course && <span className="pl-course">{rawData.course.name}</span>}
              {rawData.chapter && isLessonType && <span className="text-xs font-semibold text-slate-500">{rawData.chapter.name}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 break-words">{content.name || "Untitled content"}</h2>
              {locked ? <span className="pill bg-slate-100 text-slate-500">LOCKED</span> : <span className="pill bg-green-100 text-green-700">UNLOCKED</span>}
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mt-4 whitespace-pre-line">{content.description || "No description provided for this item."}</p>
        {(showPrereq || content.whatYouGain) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
            {showPrereq && (
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Prerequisite</p>
                <p className="text-sm font-semibold text-slate-700 mt-0.5">{content.preRequisition}</p>
              </div>
            )}
            {content.whatYouGain && (
              <div className="rounded-xl bg-green-50/60 p-3">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-green-700">What you will gain</p>
                <p className="text-sm font-semibold text-slate-700 mt-0.5">{content.whatYouGain}</p>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 flex flex-col gap-4 min-w-0">
          {/* 1. Chapters of the course */}
          {isCourseType && chaptersList.length > 0 && (
            <Box title={`Chapters in this course (${chaptersList.length})`}>
              {chaptersList.map((chapter, index) => (
                <MatRow key={chapter.id} lead={<span className="nt-icon brand font-extrabold">{index + 1}</span>} title={chapter.name}>
                  <button
                    className="pl-btn"
                    onClick={() => navigate(`/user/contentdetails/${chapter.id}`, { state: { contentType: "chapters", passedLessons } })}
                  >
                    View chapter →
                  </button>
                </MatRow>
              ))}
            </Box>
          )}

          {/* 2. Lessons of the chapter */}
          {isChapterType && lessonsList.length > 0 && (
            <Box title={`Lessons in this chapter (${lessonsList.length})`}>
              {lessonsList.map((lesson) => (
                <MatRow key={lesson.id} lead={<span className="nt-icon blue font-extrabold">{lesson.order || 1}</span>} title={lesson.name}>
                  <button
                    className="pl-btn"
                    onClick={() => navigate(`/user/contentdetails/${lesson.id}`, { state: { contentType: "lessons" } })}
                  >
                    View lesson →
                  </button>
                </MatRow>
              ))}
            </Box>
          )}

          {/* 3. Ideas of the lesson (videos + PDFs) */}
          {isLessonType && ideasList.length > 0 && (
            <Box title={`Covered ideas (${ideasList.length})`}>
              {ideasList.map((idea) => {
                const video = ideaVideo(idea);
                const kinds = [idea.pdf ? "PDF" : "", video ? "Video" : ""].filter(Boolean).join(" · ");
                return (
                  <MatRow key={idea.id} lead={<span className="nt-icon amber font-extrabold">{idea.ideaOrder}</span>} title={idea.idea} meta={kinds}>
                    {video && (
                      <button className="pl-btn" onClick={() => setViewing({ kind: "video", title: `Video: ${idea.idea}`, ...video })}>▶ Watch</button>
                    )}
                    {idea.pdf && (
                      <button className="pl-btn" onClick={() => setViewing({ kind: "pdf", title: `PDF: ${idea.idea}`, url: idea.pdf })}>
                        <Icon name="pdf" size={15} /> Preview PDF
                      </button>
                    )}
                  </MatRow>
                );
              })}
            </Box>
          )}

          {/* 4. Quizzes of the lesson */}
          {isLessonType && quizzesList.length > 0 && (
            <Box title={`Lesson quizzes (${quizzesList.length})`}>
              {quizzesList.map((quiz) => <QuizRow key={quiz.id} quiz={quiz} startingId={startingId} onStart={start} />)}
            </Box>
          )}

          {!(isCourseType && chaptersList.length) && !(isChapterType && lessonsList.length) && !(isLessonType && (ideasList.length || quizzesList.length)) && (
            <section className="rp-card text-center py-8">
              <p className="text-sm text-slate-400">Nothing to show here yet.</p>
            </section>
          )}
        </div>

        <div className="flex flex-col gap-4 min-w-0">
          {/* 5. Semester */}
          {hasSemester && (
            <Box title="Semester">
              {rawData.semester ? (
                <MatRow icon="history" tone="blue" title={rawData.semester.name} />
              ) : (
                content.semesters?.map((semester) => <MatRow key={semester.id} icon="history" tone="blue" title={semester.name} />)
              )}
            </Box>
          )}

          {/* 6. Instructors */}
          {teachersList.length > 0 && (
            <Box title="Instructors">
              {teachersList.map((teacher, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white">
                  <TeacherAvatar name={teacher.name} big />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{teacher.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{teacher.role || "Instructor"}</p>
                  </div>
                </div>
              ))}
            </Box>
          )}
        </div>
      </div>

      {viewing && <MaterialViewer item={viewing} onClose={closeViewer} />}
    </Page>
  );
};

export default ContentDetails;
