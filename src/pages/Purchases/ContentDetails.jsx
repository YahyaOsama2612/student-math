import React, { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost"; // تأكد من المسار حسب ترتيب مجلدات مشروعك
import Loader from "@/components/Loading";
import Errorpage from "@/components/Errorpage";
import {
  ArrowLeft,
  User,
  GraduationCap,
  Lock,
  Unlock,
  Lightbulb,
  Layers,
  BookOpen,
  Sparkles,
  Video,
  FileText,
  HelpCircle,
  Clock,
  X,
} from "lucide-react";

const ContentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { postData, loading: startingQuiz } = usePost();

  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    url: "",
    title: "",
  });

  const currentState = location.state?.contentType;
  const contentType =
    currentState === "lessons" ||
    currentState === "lesson" ||
    location.pathname.includes("/lesson")
      ? "lessons"
      : location.pathname.includes("/chapters/") || currentState === "chapters"
        ? "chapters"
        : "courses";

  const isLessonType = contentType === "lessons";
  const isChapterType = contentType === "chapters";

  const endpoints = {
    courses: `/api/user/courses/${id}`,
    chapters: `/api/user/chapters/${id}`,
    lessons: `/api/user/lessons/${id}`,
  };

  const { data, loading, error } = useGet(endpoints[contentType]);
  const { data: quizzesData } = useGet(
    isLessonType ? `/api/user/quizzes/lesson/${id}` : null,
  );

  if (loading) return <Loader />;
  if (error) return <Errorpage error={error} />;

  const rawData = data?.data || {};

  let content = rawData;
  if (isChapterType) content = rawData.chapter || {};
  if (isLessonType) content = rawData.lesson || {};

  const lessonsList = rawData.lessons || [];
  const ideasList = rawData.ideas || [];

  // [إعادة تفعيل] تجميع خطط الأسعار والمدرسين والترمات بناءً على هيكل البيانات المرسل
  const pricePlansList = content.pricePlans || rawData.prices || [];

  const teachersList =
    (isChapterType || isLessonType) && rawData.teacher
      ? [{ name: rawData.teacher.name, role: "Instructor" }]
      : content.teachers || [];

  // جلب مصفوفة الاختبارات وترتيبها
  const rawQuizzes = quizzesData?.data?.quizzes || quizzesData?.quizzes || [];
  const quizzesList =
    isLessonType && rawQuizzes.length > 0
      ? [...rawQuizzes].sort((a, b) => (a.quizOrder || 0) - (b.quizOrder || 0))
      : [];

  const getEmbedUrl = (url) => {
    if (!url) return "";
    const driveIdMatch = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
    if (driveIdMatch && driveIdMatch[1]) {
      return `https://drive.google.com/file/d/${driveIdMatch[1]}/preview`;
    }
    return url;
  };

  const handlePreview = (rawUrl, title) => {
    const embedUrl = getEmbedUrl(rawUrl);
    setPreviewModal({
      isOpen: true,
      url: embedUrl,
      title: title,
    });
  };

  return (
    <div className="min-w-full min-h-screen p-6 bg-gray-50/50 relative">
      {/* Header Section */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 transition-colors rounded-full hover:bg-gray-200"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-semibold uppercase bg-blue-50 text-blue-700 rounded-md border border-blue-100">
              {isLessonType
                ? "Lesson Info"
                : isChapterType
                  ? "Chapter Info"
                  : "Course Info"}
            </span>
            {rawData.course && (
              <span className="px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-md">
                Course: {rawData.course.name}
              </span>
            )}
            {rawData.chapter && isLessonType && (
              <span className="px-2.5 py-0.5 text-xs font-medium bg-purple-50 text-purple-600 rounded-md">
                Chapter: {rawData.chapter.name}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {content.name || "Untitled Content"}
          </h1>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* About Card */}
          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900">About Content</h2>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                  rawData.isLocked || content.isLocked
                    ? "bg-red-50 text-red-700 border border-red-100"
                    : "bg-green-50 text-green-700 border border-green-100"
                }`}
              >
                {rawData.isLocked || content.isLocked ? (
                  <>
                    <Lock className="w-3 h-3" /> Locked
                  </>
                ) : (
                  <>
                    <Unlock className="w-3 h-3" /> Accessible
                  </>
                )}
              </span>
            </div>

            <p className="text-gray-600 mb-6 leading-relaxed">
              {content.description || "No description provided for this item."}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              {content.preRequisition && content.preRequisition !== "None" && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <GraduationCap className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-400">
                      Prerequisite
                    </p>
                    <p className="text-sm font-semibold text-gray-700">
                      {content.preRequisition}
                    </p>
                  </div>
                </div>
              )}

              {content.whatYouGain && (
                <div className="flex items-start gap-3 p-3 bg-emerald-50/40 rounded-xl">
                  <Lightbulb className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-emerald-600">
                      What you will gain
                    </p>
                    <p className="text-sm font-semibold text-emerald-800">
                      {content.whatYouGain}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isChapterType && lessonsList.length > 0 && (
            <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-bold text-gray-900">
                  Lessons in this Chapter ({lessonsList.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {lessonsList.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex justify-between items-center py-3.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-600 font-semibold rounded-lg text-xs">
                        {lesson.order}
                      </div>
                      <span className="text-sm font-semibold text-gray-800">
                        {lesson.name}
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md font-medium ${lesson.isLocked ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}
                    >
                      {lesson.isLocked ? "Locked" : "Accessible"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLessonType && ideasList.length > 0 && (
            <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold text-gray-900">
                  Covered Ideas ({ideasList.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {ideasList.map((idea) => (
                  <div
                    key={idea.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 shrink-0 flex items-center justify-center bg-amber-50 text-amber-600 font-bold rounded-full text-xs border border-amber-100">
                        {idea.ideaOrder}
                      </div>
                      <span className="text-sm font-semibold text-gray-800">
                        {idea.idea}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {idea.video && (
                        <button
                          onClick={() =>
                            handlePreview(idea.video, `Video: ${idea.idea}`)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100 cursor-pointer"
                        >
                          <Video className="w-3.5 h-3.5" /> Watch Video
                        </button>
                      )}
                      {idea.pdf && (
                        <button
                          onClick={() =>
                            handlePreview(idea.pdf, `PDF: ${idea.idea}`)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" /> View PDF
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLessonType && quizzesList.length > 0 && (
            <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-bold text-gray-900">
                  Lesson Quizzes ({quizzesList.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {quizzesList.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-gray-100 rounded-xl bg-indigo-50/10 hover:bg-indigo-50/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 shrink-0 flex items-center justify-center bg-indigo-50 text-indigo-600 font-bold rounded-lg text-xs border border-indigo-100 mt-0.5">
                        {quiz.quizOrder}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-800 block">
                          {quiz.title}
                        </span>
                        {quiz.description && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {quiz.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3" />{" "}
                            {quiz.durationMinutes || quiz.durationHours * 60}{" "}
                            mins
                          </span>
                          <span className="inline-flex items-center text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            Score: {quiz.totalScore}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        disabled={startingQuiz} // تعطيل الزر أثناء التحميل لمنع الضغط المتكرر
                        onClick={async () => {
                          try {
                            // 1. عمل الـ POST لتهيئة المحاولة في السيرفر
                            const res = await postData(
                              {}, // البودي فارغ
                              `/api/user/quizzes/${quiz.id}/start`,
                              "Quiz started successfully!", // رسالة النجاح للـ Toast
                            );

                            // 2. التوجيه فوراً عند نجاح الطلب
                            if (res) {
                              navigate(`/user/quiz/${quiz.id}`);
                            }
                          } catch (err) {
                            console.error("Failed to start quiz:", err);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg transition-colors shadow-sm cursor-pointer"
                      >
                        {startingQuiz ? (
                          <>
                            {/* أنيميشن تحميل بسيط يظهر داخل الزر أثناء الإرسال */}
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            Starting...
                          </>
                        ) : (
                          "Start Quiz"
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {((content.isHaveSemester && content.semesters?.length > 0) ||
            rawData.semester) && (
            <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-bold text-gray-900">
                  Semester Info
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rawData.semester ? (
                  <div className="flex items-center gap-3 p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {rawData.semester.name}
                    </span>
                  </div>
                ) : (
                  content.semesters?.map((semester) => (
                    <div
                      key={semester.id}
                      className="flex items-center gap-3 p-4 border border-gray-100 rounded-xl bg-gray-50/50"
                    >
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {semester.name}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {teachersList.length > 0 && (
            <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-bold text-gray-900">Instructors</h3>
              </div>
              <div className="space-y-3">
                {teachersList.map((teacher, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-full font-bold text-gray-700 uppercase">
                      {teacher.name?.charAt(0) || "T"}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        {teacher.name}
                      </h4>
                      <p className="text-xs text-gray-500 capitalize">
                        {teacher.role || "Instructor"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {previewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-gray-900 truncate">
                {previewModal.title}
              </h3>
              <button
                onClick={() =>
                  setPreviewModal({ isOpen: false, url: "", title: "" })
                }
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-gray-900 relative">
              <iframe
                src={previewModal.url}
                title={previewModal.title}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentDetails;
