import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loading";
import Errorpage from "@/components/Errorpage";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  HelpCircle,
  Award,
  Calendar,
  FileText,
} from "lucide-react";
import usePost from "@/hooks/usePost";

// دالة مساعدة لتنظيف النصوص التي تحتوي على تاغات p أو نصوص زائدة قادمة من الـ API
const cleanQuestionText = (text) => {
  if (!text) return "";
  return text
    .replace(/^p/, "")
    .replace(/\/p$/, "")
    .replace(/<\/?[^>]+(>|$)/g, "");
};

const Quiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  // جلب الأسئلة باستخدام الهوك الخاص بالمشروع
  const { data, loading, error } = useGet(
    `/api/user/quizzes/${quizId}/questions`,
  );
  // مؤشر السؤال الحالي
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // حفظ إجابات المستخدم: مفتاح الكائن هو الـ questionId
  // القيمة ستكون عبارة عن كائن يحتوي على { selectedOptionId, gridInAnswer }
  const [userAnswers, setUserAnswers] = useState({});

  const { postData, loading: submitting } = usePost();

  if (loading) return <Loader />;
  if (error) return <Errorpage error={error} />;

  // استخراج مصفوفة الأسئلة بناءً على الريسبونس المرسل
  const questionsList = data?.data?.data || [];

  if (questionsList.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <HelpCircle className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          No Questions Found
        </h2>
        <p className="text-gray-500 mb-6">
          This quiz doesn't have any questions yet.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm"
        >
          Go Back
        </button>
      </div>
    );
  }

  const currentQuestion = questionsList[currentQuestionIndex];
  const totalQuestions = questionsList.length;

  // التعامل مع اختيار إجابة في أسئلة الـ MCQ
  const handleOptionSelect = (questionId, optionId) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: {
        questionId: questionId,
        selectedOptionId: optionId,
        gridInAnswer: null,
      },
    }));
  };

  // التعامل مع إدخال إجابة نصية / رقمية في أسئلة الـ GridIn
  const handleGridInChange = (questionId, val) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: {
        questionId: questionId,
        selectedOptionId: null,
        gridInAnswer: val,
      },
    }));
  };

  // تسليم وتأكيد الاختبار وتجميع الداتا المطلوبة للـ API
  const handleSubmitQuiz = async () => {
    const confirmSubmit = window.confirm(
      "Are you sure you want to submit your quiz?",
    );
    if (!confirmSubmit) return;

    // تجميع الإجابات بالهيكل المطلوب تماماً من الباك إند
    const formattedAnswers = questionsList.map((q) => {
      const savedAns = userAnswers[q.id];
      return {
        questionId: q.id,
        selectedOptionId: savedAns?.selectedOptionId || null,
        gridInAnswer: savedAns?.gridInAnswer || null,
      };
    });

    const payload = {
      answers: formattedAnswers,
    };

    console.log("Submitting Payload via usePost:", payload);

    try {
      // استخدام postData وتمرير الـ payload والـ URL المخصص ورسالة النجاح للـ Toast
      const result = await postData(
        payload,
        `/api/user/quizzes/${quizId}/submit`,
        "Quiz submitted successfully!",
      );

      // الـ usePost يعيد الـ res.data مباشرة عند النجاح
      if (result) {
        // العودة لصفحة الـ ContentDetails بعد حل الاختبار بنجاح
        navigate(-1);
      }
    } catch (err) {
      // الـ usePost يقوم بعمل toast.error تلقائياً عند حدوث خطأ، فلا حاجة لكتابة alert هنا
      console.error("Submission error:", err);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      {/* Top Header navbar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Quiz Assessment</h1>
            <p className="text-xs text-gray-400">
              Answer all questions carefully
            </p>
          </div>
        </div>

        <button
          onClick={handleSubmitQuiz}
          disabled={submitting}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <CheckCircle className="w-4 h-4" />
          {submitting ? "Submitting..." : "Submit Quiz"}
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Section: Question Card and Controls */}
        <div className="lg:col-span-3 flex flex-col justify-between space-y-6">
          {/* Question View Area */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex-1 flex flex-col justify-between">
            <div>
              {/* Question Meta tags */}
              <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
                <span className="px-2.5 py-1 font-medium bg-gray-100 text-gray-600 rounded-md">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>
                <span
                  className={`px-2.5 py-1 font-medium rounded-md ${
                    currentQuestion.difficulty === "A" ||
                    currentQuestion.difficulty === "B"
                      ? "bg-green-50 text-green-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  Difficulty: {currentQuestion.difficulty || "Medium"}
                </span>
                {currentQuestion.year && (
                  <span className="px-2.5 py-1 font-medium bg-blue-50 text-blue-700 rounded-md flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {currentQuestion.month}{" "}
                    {currentQuestion.year}
                  </span>
                )}
                <span className="px-2.5 py-1 font-medium bg-purple-50 text-purple-700 rounded-md">
                  Type: {currentQuestion.questionType}
                </span>
              </div>

              {/* Question Text */}
              <div className="text-base sm:text-lg font-semibold text-gray-800 mb-6 leading-relaxed">
                {cleanQuestionText(currentQuestion.question)}
              </div>

              {/* Question Optional Image */}
              {currentQuestion.image && (
                <div className="mb-6 max-w-full rounded-xl overflow-hidden border border-gray-100 bg-gray-50 p-2 flex justify-center">
                  <img
                    src={currentQuestion.image}
                    alt={`Question ${currentQuestionIndex + 1}`}
                    className="max-h-[300px] object-contain"
                  />
                </div>
              )}

              {/* Answers & Options Rendering */}
              <div className="mt-4">
                {currentQuestion.answerType === "MCQ" ? (
                  // حقل الإجابة في حال كان نوع السؤال متعدد الاختيارات MCQ
                  <div className="grid grid-cols-1 gap-3">
                    {currentQuestion.options?.map((option) => {
                      const isSelected =
                        userAnswers[currentQuestion.id]?.selectedOptionId ===
                        option.id;
                      return (
                        <button
                          key={option.id}
                          onClick={() =>
                            handleOptionSelect(currentQuestion.id, option.id)
                          }
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <div
                            className={`w-7 h-7 flex items-center justify-center font-bold text-xs rounded-lg transition-colors ${
                              isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {option.order}
                          </div>
                          <span
                            className={`text-sm font-medium ${isSelected ? "text-indigo-900" : "text-gray-700"}`}
                          >
                            {option.answer}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  // حقل الإجابة في حال كان نوع السؤال يدوي مقالي أو شبكي Grid-In
                  <div className="max-w-md">
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      Type your answer here (Grid-In)
                    </label>
                    <input
                      type="text"
                      value={
                        userAnswers[currentQuestion.id]?.gridInAnswer || ""
                      }
                      onChange={(e) =>
                        handleGridInChange(currentQuestion.id, e.target.value)
                      }
                      placeholder="Enter value..."
                      className="w-full p-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-semibold text-gray-800"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-100 mt-8">
              <button
                onClick={() =>
                  setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))
                }
                disabled={currentQuestionIndex === 0}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              {currentQuestionIndex < totalQuestions - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                  className="inline-flex items-center gap-1 px-5 py-2 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmitQuiz}
                  disabled={submitting}
                  className="inline-flex items-center gap-1 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 rounded-xl transition-colors cursor-pointer"
                >
                  Finish Exam
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Quiz Navigator (Sidebar Grid) */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm h-full flex flex-col">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-100">
              <FileText className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-bold text-gray-900">
                Questions Grid
              </h3>
            </div>

            {/* Grid of numbers */}
            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-2 flex-1 content-start overflow-y-auto max-h-[350px] lg:max-h-[none] pr-1">
              {questionsList.map((q, idx) => {
                const isCurrent = idx === currentQuestionIndex;
                const isAnswered =
                  userAnswers[q.id]?.selectedOptionId ||
                  userAnswers[q.id]?.gridInAnswer;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`h-11 flex flex-col items-center justify-center text-xs font-bold rounded-xl transition-all border cursor-pointer ${
                      isCurrent
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-100"
                        : isAnswered
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isAnswered && !isCurrent && (
                      <span className="w-1 h-1 bg-emerald-500 rounded-full mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Informative Legend */}
            <div className="mt-6 pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-600 rounded-sm" />
                <span>Current Question</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-50 border border-emerald-200 rounded-sm" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-50 border border-gray-200 rounded-sm" />
                <span>Not Answered</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
