import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loading";
import Errorpage from "@/components/Errorpage";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Filter,
} from "lucide-react";

const Remaining = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLessonId = searchParams.get("lessonId");
  const [selectedLesson, setSelectedLesson] = useState(null);

  // جلب الدروس المشتراة
  const {
    data: lessonsData,
    loading: lessonsLoading,
    error: lessonsError,
  } = useGet("/api/user/lessons/purchased");

  // جلب الواجبات المتبقية (مع أو بدون lesson id)
  const remainingUrl = selectedLessonId
    ? `/api/user/quizzes/remaining-homework?lessonId=${selectedLessonId}`
    : "/api/user/quizzes/remaining-homework";

  const {
    data: homeworkData,
    loading: homeworkLoading,
    error: homeworkError,
  } = useGet(remainingUrl);

  const lessons = lessonsData?.data?.lessons || [];
  const homework = homeworkData?.data || {};
  const quizzes = homework.quizzes || [];
  const summary = homework.summary || { total: 0, solved: 0, remaining: 0 };

  // الحصول على بيانات الدرس المختار
  React.useEffect(() => {
    if (selectedLessonId && lessons.length > 0) {
      const lesson = lessons.find((l) => l.id === selectedLessonId);
      setSelectedLesson(lesson);
    } else {
      setSelectedLesson(null);
    }
  }, [selectedLessonId, lessons]);

  const handleSelectLesson = (lessonId) => {
    setSearchParams({ lessonId });
  };

  const handleClearFilter = () => {
    setSearchParams({});
  };

  if (lessonsLoading || homeworkLoading) return <Loader />;
  if (lessonsError || homeworkError)
    return <Errorpage error={lessonsError || homeworkError} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            📚 Remaining Homework
          </h1>
          <p className="text-slate-600">
            Track your pending assignments and complete them on time
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Purchased Lessons */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-6">
              <div className="p-6 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  <h2 className="text-lg font-bold">
                    Purchased Lessons ({lessons.length})
                  </h2>
                </div>
              </div>

              <div className="divide-y max-h-[600px] overflow-y-auto">
                {lessons.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No purchased lessons yet</p>
                  </div>
                ) : (
                  <>
                    {/* Show All Button */}
                    {selectedLessonId && (
                      <button
                        onClick={handleClearFilter}
                        className="w-full p-4 text-left hover:bg-slate-50 transition-colors border-b flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              All Lessons
                            </p>
                            <p className="text-xs text-slate-500">
                              Show all remaining homework
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}

                    {/* Lessons List */}
                    {lessons.map((lesson) => {
                      const isSelected = selectedLessonId === lesson.id;
                      const isExpired = lesson.status === "expired";

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => handleSelectLesson(lesson.id)}
                          className={`w-full p-4 text-left hover:bg-slate-50 transition-all border-b flex items-start justify-between group ${
                            isSelected
                              ? "bg-indigo-50 border-l-4 border-l-indigo-500"
                              : ""
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {lesson.name}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {lesson.courseName}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {lesson.chapterName}
                            </p>
                            {isExpired && (
                              <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 text-xs bg-red-50 text-red-600 rounded font-medium">
                                ⏰ Expired
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Homework Summary & Quizzes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 font-medium">Total</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">
                      {summary.total}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 font-medium">Solved</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">
                      {summary.solved}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 font-medium">
                      Remaining
                    </p>
                    <p className="text-3xl font-bold text-amber-600 mt-1">
                      {summary.remaining}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Homework List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-slate-600" />
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedLesson
                      ? `Homework for "${selectedLesson.name}"`
                      : "All Remaining Homework"}
                  </h3>
                </div>
                {selectedLesson && (
                  <button
                    onClick={handleClearFilter}
                    className="text-xs px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {quizzes.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500 opacity-20" />
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">
                    {selectedLesson
                      ? `No homework for "${selectedLesson.name}"`
                      : "No remaining homework"}
                  </h4>
                  <p className="text-slate-600 max-w-md mx-auto">
                    {selectedLesson
                      ? "You have completed all assignments for this lesson!"
                      : "You have completed all your assignments. Great job! 🎉"}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {quizzes.map((quiz, index) => (
                    <div
                      key={quiz.id || index}
                      className="p-6 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg font-bold text-sm">
                              {index + 1}
                            </span>
                            <h4 className="text-base font-semibold text-slate-900">
                              {quiz.title || quiz.name || "Untitled Quiz"}
                            </h4>
                          </div>
                          <p className="text-sm text-slate-600 ml-11">
                            {quiz.description || "No description provided"}
                          </p>
                        </div>
                        <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                          Start Now
                        </button>
                      </div>

                      <div className="ml-11 flex flex-wrap gap-4 text-sm text-slate-600 mt-3">
                        {quiz.durationMinutes && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{quiz.durationMinutes} minutes</span>
                          </div>
                        )}
                        {quiz.totalScore && (
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">
                              Score: {quiz.totalScore}
                            </span>
                          </div>
                        )}
                        {quiz.dueDate && (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            <span>
                              Due: {new Date(quiz.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Remaining;
