import React, { useState, useEffect } from "react"; // أضفنا useEffect
import { useParams } from "react-router-dom";
import useGet from "@/hooks/useGet";
import Loading from "../../components/Loading";
import Errorpage from "../../components/Errorpage";
import {
  CheckCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  LayoutGrid,
  Calculator,
  LineChart as LineChartIcon,
  X, // أضفنا أيقونة الإغلاق
} from "lucide-react";
import usePost from "@/hooks/usePost";
import Swal from "sweetalert2"; // Make sure to install: npm install sweetalert2
import { BiMath } from "react-icons/bi";

import Scientific from "../../components/Desmos/Scientific";
import GraphViewer from "../../components/Desmos/GraphViewer";
import Matrix from "../../components/Desmos/Matrix";
import Fourfunction from "../../components/Desmos/Fourfunction";
import Geometry from "../../components/Desmos/Geometry";
import D3 from "../../components/Desmos/D3";
import { TbMatrix } from "react-icons/tb";
import { TbMathOff } from "react-icons/tb";
import { TbGeometry } from "react-icons/tb";
import { MdOutline3dRotation } from "react-icons/md";

import { useLocation, useNavigate } from "react-router-dom";


const ActiveExam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    data: apiResponse,
    loading,
    error,
  } = useGet(`/api/user/diagnostic-exams/${id}/questions`);
  const location = useLocation();
  const exam = location.state?.exam;
  const attemptId = location.state?.attemptId;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showScientific, setShowScientific] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);
  const [showFourfunction, setShowFourfunction] = useState(false);
  const [showGeometry, setShowGeometry] = useState(false);
  const [showD3, setShowD3] = useState(false);

  const { postData, loading: userLoading, error: userError } = usePost("");

  const [timeLeft, setTimeLeft] = useState(exam * 60 || 60 * 60);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  const questions = apiResponse?.data?.data || [];
  const question = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // 2. منطق العداد الزمني
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // دالة لتحويل الثواني إلى تنسيق 00:00
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerChange = (value) => {
    setAnswers({ ...answers, [question.id]: value });
  };

  const handleSubmit = async () => {
    // 1. فلترة الإجابات الفاضية وحساب العدد
    const validAnswers = Object.entries(answers).filter(
      ([_, value]) => value && value.toString().trim() !== "",
    );

    const answeredCount = validAnswers.length;
    const unansweredCount = questions.length - answeredCount;

    // 2. التحقق من الأسئلة اللي ماتحلتش
    if (unansweredCount > 0) {
      const result = await Swal.fire({
        title: "Submit Exam?",
        text: `You have ${unansweredCount} unanswered questions.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#4f46e5",
        cancelButtonColor: "#d33",
        confirmButtonText: "Submit Anyway",
        cancelButtonText: "Review Answers",
      });

      if (!result.isConfirmed) return;
    }

    // 3. بناء الداتا بالشكل المطلوب بالظبط (answerId للـ MCQ و textValue للـ Grid in)
    const formattedAnswers = validAnswers.map(([questionId, value]) => {
      const questionObj = questions.find((q) => q.id === questionId);

      if (questionObj?.answerType === "MCQ") {
        return {
          questionId: questionId,
          answerId: value,
        };
      }

      // الديفولت أو لو النوع Grid in
      return {
        questionId: questionId,
        textValue: value.toString(),
      };
    });

    // ده الـ Payload النهائي اللي هيتبعت
    const payload = {
      answers: formattedAnswers,
    };

    // 4. إرسال الداتا للـ API
    try {
      const res = await postData(
        payload,
        `/api/user/diagnostic-exams/${attemptId}/submit`,
        "Exam submitted successfully!",
      );

      // التعديل هنا 👇
      await Swal.fire({
        title: "Well done! 🎉",
        text: "Your exam has been submitted. Let’s review your answers.",
        icon: "success",
        confirmButtonText: "Let's Review", // غيرنا نص الزرار
        confirmButtonColor: "#4f46e5",
      });

      navigate(`/user/review/${attemptId}`);
    } catch (err) {
      console.error("Error submitting exam:", err);

      Swal.fire({
        title: "Error",
        text: err.message || "Failed to submit exam",
        icon: "error",
        confirmButtonColor: "#d33",
      });
    }
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  if (error)
    return (
      <div className="h-screen flex items-center justify-center">
        <Errorpage />
      </div>
    );
  if (questions.length === 0)
    return (
      <div className="h-screen flex items-center justify-center text-sm">
        No questions found.
      </div>
    );

  return (
    <div className="bg-gray-50 flex flex-col items-center relative w-screen overflow-x-hidden font-sans pb-4">
      {/* --- نافذة تكبير الصورة (Full Screen Image) --- */}
      {isImageZoomed && question.image && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsImageZoomed(false)}
        >
          <button className="absolute top-6 right-6 text-white bg-white/10 p-2 rounded-full hover:bg-white/20">
            <X size={24} />
          </button>
          <img
            src={question.image}
            alt="Zoomed view"
            className="max-w-full max-h-full object-contain animate-in zoom-in-95 duration-300"
          />
        </div>
      )}

      {(showGraph ||
        showScientific ||
        showMatrix ||
        showFourfunction ||
        showGeometry ||
        showD3) && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in duration-200"
          onClick={() => {
            setShowGraph(false);
            setShowD3(false);
            setShowScientific(false);
            setShowMatrix(false);
            setShowFourfunction(false);
            setShowGeometry(false);
          }}
        />
      )}

     {showGraph && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] h-[98vh] z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50">
            <span className="text-xs font-bold text-gray-600 flex items-center gap-2">
              <LineChartIcon size={14} className="text-purple-600" /> Graphing Tool
            </span>
            <button
              onClick={() => setShowGraph(false)}
              className="text-gray-400 hover:text-black"
            >
              <X size={18} />
            </button>
          </div>
          {/* تمت إضافة overflow-y-auto هنا */}
          <div className="flex-1 overflow-y-auto">
            <GraphViewer />
          </div>
        </div>
      )}

      {showScientific && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] h-[98vh] z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50">
            <span className="text-xs font-bold text-gray-600 flex items-center gap-2">
              <LineChartIcon size={14} className="text-purple-600" /> Scientific Tool
            </span>
            <button
              onClick={() => setShowScientific(false)}
              className="text-gray-400 hover:text-black"
            >
              <X size={18} />
            </button>
          </div>
          {/* تمت إضافة overflow-y-auto هنا */}
          <div className="flex-1 overflow-y-auto">
            <Scientific />
          </div>
        </div>
      )}

      {showD3 && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] h-[98vh] z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50">
            <span className="text-xs font-bold text-gray-600 flex items-center gap-2">
              <LineChartIcon size={14} className="text-purple-600" /> 3D Tool
            </span>
            <button
              onClick={() => setShowD3(false)}
              className="text-gray-400 hover:text-black"
            >
              <X size={18} />
            </button>
          </div>
          {/* تمت إضافة overflow-y-auto هنا */}
          <div className="flex-1 overflow-y-auto">
            <D3 />
          </div>
        </div>
      )}

      {showMatrix && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] h-[98vh] z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50">
            <span className="text-xs font-bold text-gray-600 flex items-center gap-2">
              <LineChartIcon size={14} className="text-purple-600" /> Matrix Tool
            </span>
            <button
              onClick={() => setShowMatrix(false)}
              className="text-gray-400 hover:text-black"
            >
              <X size={18} />
            </button>
          </div>
          {/* تمت إضافة overflow-y-auto هنا */}
          <div className="flex-1 overflow-y-auto">
            <Matrix />
          </div>
        </div>
      )}

      {showFourfunction && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] h-[98vh] z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50">
            <span className="text-xs font-bold text-gray-600 flex items-center gap-2">
              <LineChartIcon size={14} className="text-purple-600" /> Fourfunction Tool
            </span>
            <button
              onClick={() => setShowFourfunction(false)}
              className="text-gray-400 hover:text-black"
            >
              <X size={18} />
            </button>
          </div>
          {/* تمت إضافة overflow-y-auto هنا */}
          <div className="flex-1 overflow-y-auto">
            <Fourfunction />
          </div>
        </div>
      )}

      {showGeometry && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] h-[98vh] z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50">
            <span className="text-xs font-bold text-gray-600 flex items-center gap-2">
              <LineChartIcon size={14} className="text-purple-600" /> Geometry Tool
            </span>
            <button
              onClick={() => setShowGeometry(false)}
              className="text-gray-400 hover:text-black"
            >
              <X size={18} />
            </button>
          </div>
          {/* تمت إضافة overflow-y-auto هنا */}
          <div className="flex-1 overflow-y-auto">
            <Geometry />
          </div>
        </div>
      )}
      {/* --- Header --- */}
     <div className="w-full bg-white border-b border-gray-200 px-2 md:px-4 py-2 flex justify-between items-center sticky top-0 z-30 shadow-sm">
  {/* الجزء الأيسر: زر الرجوع والعنوان */}
  <div onClick={() => navigate(-1)} className="flex items-center gap-2 cursor-pointer shrink-0 pr-2">
    <button className="hover:bg-gray-100 p-1.5 rounded-full transition">
      <ArrowLeft size={18} />
    </button>
    <h1 className="font-bold text-gray-700 hidden md:block text-xs whitespace-nowrap">
      Diagnostic Exam
    </h1>
  </div>

  {/* الجزء الأيمن: الأزرار والوقت (متجاوب مع إمكانية التمرير الأفقي للشاشات الصغيرة جداً) */}
  <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto scrollbar-hide">
    <button
      onClick={() => setShowGraph(!showGraph)}
      className={`flex shrink-0 items-center gap-1.5 px-2 lg:px-3 py-1.5 rounded-lg border transition-all font-bold text-[11px] ${showGraph ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-gray-100 text-gray-600"}`}
    >
      <LineChartIcon size={14} />
      <span className="hidden lg:block">Graph</span>
    </button>

    <button
      onClick={() => setShowScientific(!showScientific)}
      className={`flex shrink-0 items-center gap-1.5 px-2 lg:px-3 py-1.5 rounded-lg border transition-all font-bold text-[11px] ${showScientific ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-gray-100 text-gray-600"}`}
    >
      <TbMathOff size={14} />
      <span className="hidden lg:block">Scientific</span>
    </button>

    <button
      onClick={() => setShowMatrix(!showMatrix)}
      className={`flex shrink-0 items-center gap-1.5 px-2 lg:px-3 py-1.5 rounded-lg border transition-all font-bold text-[11px] ${showMatrix ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-gray-100 text-gray-600"}`}
    >
      <TbMatrix size={14} />
      <span className="hidden lg:block">Matrix</span>
    </button>

    <button
      onClick={() => setShowFourfunction(!showFourfunction)}
      className={`flex shrink-0 items-center gap-1.5 px-2 lg:px-3 py-1.5 rounded-lg border transition-all font-bold text-[11px] ${showFourfunction ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-gray-100 text-gray-600"}`}
    >
      <BiMath size={14} />
      <span className="hidden lg:block">Fourfunction</span>
    </button>

    <button
      onClick={() => setShowGeometry(!showGeometry)}
      className={`flex shrink-0 items-center gap-1.5 px-2 lg:px-3 py-1.5 rounded-lg border transition-all font-bold text-[11px] ${showGeometry ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-gray-100 text-gray-600"}`}
    >
      <TbGeometry size={14} />
      <span className="hidden lg:block">Geometry</span>
    </button>

    <button
      onClick={() => setShowD3(!showD3)}
      className={`flex shrink-0 items-center gap-1.5 px-2 lg:px-3 py-1.5 rounded-lg border transition-all font-bold text-[11px] ${showD3 ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-gray-100 text-gray-600"}`}
    >
      <MdOutline3dRotation size={14} />
      <span className="hidden lg:block">3D</span>
    </button>

    {/* عداد الوقت الديناميكي */}
    <div
      className={`flex shrink-0 items-center gap-1.5 px-2 lg:px-3 py-1.5 rounded-lg font-black border text-[11px] transition-colors ${timeLeft < 300 ? "bg-red-50 text-red-600 border-red-200" : "bg-one/10 text-one border-one/20"}`}
    >
      <Clock
        size={14}
        className={timeLeft < 300 ? "animate-bounce" : "animate-pulse"}
      />
      {formatTime(timeLeft)}
    </div>
  </div>
</div>

      {/* Main Container */}
      <div className="w-full p-2 md:p-4 flex flex-col gap-3">
        {/* Navigator */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <div className="flex items-center gap-2 mb-2 font-bold text-gray-400 uppercase text-[9px] tracking-widest">
            <LayoutGrid size={12} className="text-one" /> Questions
          </div>
          <div className="flex flex-wrap gap-1">
            {questions?.map((q, index) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-7 h-7 rounded-md font-bold transition-all text-[11px] ${currentQuestionIndex === index ? "ring-2 ring-one/30 border border-one" : "border border-transparent"} ${answers[q.id] ? "bg-one text-white" : "bg-gray-50 text-gray-400 hover:bg-gray-100"}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6 min-h-[380px] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <span className="text-one font-bold text-[10px] uppercase">
              Question {currentQuestionIndex + 1}
            </span>
            <span className="bg-gray-50 text-gray-400 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-tighter">
              {question.answerType}
            </span>
          </div>

          <div
            className={`flex flex-col ${question.image ? "lg:flex-row gap-6" : "flex-col"} mb-6`}
          >
            <div className="flex-1">
              <h2 className="text-base md:text-lg font-bold text-gray-800 leading-snug">
                {question.question}
              </h2>
            </div>

            {question.image && (
              <div className="flex-1 flex justify-center lg:justify-end">
                <div
                  className="bg-gray-50 rounded-lg p-1.5 border border-gray-100 w-full max-w-[300px] cursor-zoom-in group relative overflow-hidden"
                  onClick={() => setIsImageZoomed(true)} // تفعيل التكبير عند الضغط
                >
                  <img
                    src={question.image}
                    alt="Visual"
                    className="w-full h-auto max-h-[220px] object-contain rounded-md transition-transform group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                    <span className="bg-white/80 px-2 py-1 rounded text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to Enlarge
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Answers */}
          <div className="mt-auto">
            {question.answerType === "Grid in" ? (
              <div className="max-w-[200px]">
                <input
                  type="text"
                  autoFocus
                  value={answers[question.id] || ""}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder="Answer..."
                  className="w-full bg-gray-50 p-2 text-lg font-black text-one border border-gray-200 rounded-lg focus:border-one focus:bg-white outline-none"
                />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {question.options.map((opt, idx) => {
                  const isSelected = answers[question.id] === opt.id;
                  const labelLetter = String.fromCharCode(65 + idx);

                  return (
                    <label
                      key={opt.id}
                      className={`relative flex items-center gap-2 px-3 py-1.5 border rounded-lg cursor-pointer transition-all min-w-[100px] flex-1 sm:flex-none ${
                        isSelected
                          ? "border-one bg-one text-white"
                          : "border-gray-100 bg-white hover:border-one/30"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => handleAnswerChange(opt.id)}
                        className="hidden"
                      />
                      <div
                        className={`w-5 h-5 shrink-0 rounded text-[9px] font-black flex items-center justify-center ${isSelected ? "bg-white text-one" : "bg-gray-100 text-gray-500"}`}
                      >
                        {labelLetter}
                      </div>
                      <span className="text-xs font-medium">{opt.answer}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-50">
            <button
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
              className="px-3 py-1.5 rounded-lg font-bold text-gray-400 text-[11px] bg-gray-50 hover:bg-gray-100 disabled:opacity-30 flex items-center gap-1"
            >
              <ChevronLeft size={14} /> Prev
            </button>

            {isLastQuestion ? (
              <button
                onClick={handleSubmit}
                disabled={userLoading}
                className={`px-5 py-1.5 rounded-lg font-bold text-white text-[11px] transition flex items-center gap-1 ${userLoading ? "bg-gray-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"}`}
              >
                {userLoading ? "Submitting..." : "Submit"}{" "}
                <CheckCircle size={14} />
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                className="px-5 py-1.5 rounded-lg font-bold text-white text-[11px] bg-one hover:opacity-90 flex items-center gap-1"
              >
                Next <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveExam;
