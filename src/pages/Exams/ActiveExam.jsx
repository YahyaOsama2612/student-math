import React, { useState, useEffect } from "react";
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
  X,
} from "lucide-react";
import usePost from "@/hooks/usePost";
import Swal from "sweetalert2";
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

// ─── GridInInput Component ───────────────────────────────────────────────────
const evaluateExpression = (expr) => {
  if (!expr || expr.trim() === "") return "";
  try {
    if (!/^[\d\s\+\-\*\/\.\(\)]+$/.test(expr.trim())) return "—";
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + expr + ")")();
    if (!isFinite(result)) return "—";
    return parseFloat(result.toFixed(6)).toString();
  } catch {
    return "—";
  }
};

const GridInInput = ({ value, onChange }) => {
  const [activeTab, setActiveTab] = useState("keyboard");
  const inputRef = React.useRef(null);

  const insertAtCursor = (char) => {
    const input = inputRef.current;
    if (!input) {
      onChange(value + char);
      return;
    }
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const newVal = value.slice(0, start) + char + value.slice(end);
    onChange(newVal);
    requestAnimationFrame(() => {
      input.setSelectionRange(start + char.length, start + char.length);
      input.focus();
    });
  };

  const deleteLast = () => {
    const input = inputRef.current;
    if (!input) {
      onChange(value.slice(0, -1));
      return;
    }
    const start = input.selectionStart;
    const end = input.selectionEnd;
    if (start !== end) {
      const newVal = value.slice(0, start) + value.slice(end);
      onChange(newVal);
      requestAnimationFrame(() => input.setSelectionRange(start, start));
    } else if (start > 0) {
      const newVal = value.slice(0, start - 1) + value.slice(start);
      onChange(newVal);
      requestAnimationFrame(() =>
        input.setSelectionRange(start - 1, start - 1),
      );
    }
  };

  const clearAll = () => onChange("");

  const keys = [
    ["7", "8", "9"],
    ["4", "5", "6"],
    ["1", "2", "3"],
    ["0", ".", "/"],
    ["-", "(", ")"],
  ];

  const preview = evaluateExpression(value);

  return (
    <div className="flex flex-col gap-3 max-w-[280px]">
      <input
        ref={inputRef}
        type="text"
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Answer..."
        className="w-full bg-gray-50 p-2 text-lg font-black text-one border border-gray-200 rounded-lg focus:border-one focus:bg-white outline-none"
      />
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab("keyboard")}
          className={`flex-1 py-1 rounded-md text-[11px] font-bold transition-all ${
            activeTab === "keyboard"
              ? "bg-white text-one shadow-sm"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          ⌨️ Keyboard
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={`flex-1 py-1 rounded-md text-[11px] font-bold transition-all ${
            activeTab === "preview"
              ? "bg-white text-one shadow-sm"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          👁 Preview
        </button>
      </div>
      {activeTab === "keyboard" && (
        <div className="flex flex-col gap-1">
          {keys.map((row, ri) => (
            <div key={ri} className="flex gap-1">
              {row.map((k) => (
                <button
                  key={k}
                  onClick={() => insertAtCursor(k)}
                  className="flex-1 h-9 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-one hover:text-white hover:border-one transition-all active:scale-95"
                >
                  {k}
                </button>
              ))}
            </div>
          ))}
          <div className="flex gap-1 mt-1">
            <button
              onClick={deleteLast}
              className="flex-1 h-9 bg-red-50 border border-red-100 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition-all active:scale-95"
            >
              ⌫ Del
            </button>
            <button
              onClick={clearAll}
              className="flex-1 h-9 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-400 hover:bg-gray-200 transition-all active:scale-95"
            >
              ✕ Clear
            </button>
          </div>
        </div>
      )}
      {activeTab === "preview" && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Expression
            </span>
            <span className="text-sm font-black text-gray-700 font-mono">
              {value || "—"}
            </span>
          </div>
          <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Value
            </span>
            <span
              className={`text-lg font-black font-mono ${preview === "—" ? "text-gray-300" : "text-one"}`}
            >
              {preview || "—"}
            </span>
          </div>
          {value.includes("/") && preview !== "—" && (
            <p className="text-[10px] text-gray-400 mt-1">
              <span className="font-bold">{value}</span> = {preview}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// أضفنا هنا onExit المستقبلة من المكون الأب لتقوم بإغلاق الامتحان
const ActiveExam = ({ onExit }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isToolsOpen, setIsToolsOpen] = useState(false);
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

  const getNavButtonSize = (count) => {
    if (count <= 10) return "w-10 h-10 text-sm";
    if (count <= 20) return "w-9 h-9 text-[12px]";
    if (count <= 40) return "w-7 h-7 text-[11px]";
    if (count <= 60) return "w-6 h-6 text-[10px]";
    return "w-5 h-5 text-[9px]";
  };

  const navBtnSize = getNavButtonSize(questions.length);

  // منطق العداد الزمني
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleBack = () => {
    if (onExit) {
      onExit();
    } else {
      navigate(-1);
    }
  };

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
    const validAnswers = Object.entries(answers).filter(
      ([_, value]) => value && value.toString().trim() !== "",
    );

    const answeredCount = validAnswers.length;
    const unansweredCount = questions.length - answeredCount;

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

    const formattedAnswers = validAnswers.map(([questionId, value]) => {
      const questionObj = questions.find((q) => q.id === questionId);

      if (questionObj?.answerType === "MCQ") {
        return {
          questionId: questionId,
          answerId: value,
        };
      }

      return {
        questionId: questionId,
        textValue: value.toString(),
      };
    });

    const payload = {
      answers: formattedAnswers,
    };

    try {
      const res = await postData(
        payload,
        `/api/user/diagnostic-exams/${attemptId}/submit`,
        "Exam submitted successfully!",
      );

      await Swal.fire({
        title: "Well done! 🎉",
        text: "Your exam has been submitted. Let’s review your answers.",
        icon: "success",
        // confirmButtonText: "Let's Review",
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
      <div className="w-screen h-screen bg-gray-50 flex flex-col font-sans p-4 relative">
        <div className="w-full flex justify-start">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
          <span>No questions found.</span>
        </div>
      </div>
    );

  return (
    <div className="bg-gray-50 flex flex-col items-center relative w-screen overflow-x-hidden font-sans pb-4 px-4 pt-4">
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
              <LineChartIcon size={14} className="text-purple-600" /> Graphing
              Tool
            </span>
            <button
              onClick={() => setShowGraph(false)}
              className="text-gray-400 hover:text-black"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <GraphViewer />
          </div>
        </div>
      )}

      {showScientific && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] h-[98vh] z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50">
            <span className="text-xs font-bold text-gray-600 flex items-center gap-2">
              <LineChartIcon size={14} className="text-purple-600" /> Scientific
              Tool
            </span>
            <button
              onClick={() => setShowScientific(false)}
              className="text-gray-400 hover:text-black"
            >
              <X size={18} />
            </button>
          </div>
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
          <div className="flex-1 overflow-y-auto">
            <D3 />
          </div>
        </div>
      )}

      {showMatrix && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] h-[98vh] z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50">
            <span className="text-xs font-bold text-gray-600 flex items-center gap-2">
              <LineChartIcon size={14} className="text-purple-600" /> Matrix
              Tool
            </span>
            <button
              onClick={() => setShowMatrix(false)}
              className="text-gray-400 hover:text-black"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Matrix />
          </div>
        </div>
      )}

      {showFourfunction && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] h-[98vh] z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50">
            <span className="text-xs font-bold text-gray-600 flex items-center gap-2">
              <LineChartIcon size={14} className="text-purple-600" />{" "}
              Fourfunction Tool
            </span>
            <button
              onClick={() => setShowFourfunction(false)}
              className="text-gray-400 hover:text-black"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Fourfunction />
          </div>
        </div>
      )}

      {showGeometry && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] h-[98vh] z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50">
            <span className="text-xs font-bold text-gray-600 flex items-center gap-2">
              <LineChartIcon size={14} className="text-purple-600" /> Geometry
              Tool
            </span>
            <button
              onClick={() => setShowGeometry(false)}
              className="text-gray-400 hover:text-black"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Geometry />
          </div>
        </div>
      )}

      <div className="w-full flex justify-between items-center mb-4 z-30">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors font-medium text-sm shrink-0"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* الجزء الأيمن: أدوات الـ Desmos والوقت */}
        <div className="flex items-center gap-2 relative">
          {/* أضفنا الزر هنا ليظهر بجانب الأدوات */}
          <button
            onClick={() => setIsToolsOpen(!isToolsOpen)}
            className="bg-one text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all z-40"
          >
            <LayoutGrid size={16} /> Tools
          </button>

          {/* قائمة الأدوات المنسدلة */}
          {isToolsOpen && (
            <div
              className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[100] p-2 flex flex-col animate-in fade-in zoom-in-95 duration-200"
              style={{ maxHeight: "calc(100vh - 100px)", overflowY: "auto" }}
            >
              <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Available Tools
              </div>

              {[
                {
                  name: "Graph",
                  state: showGraph,
                  setter: setShowGraph,
                  icon: <LineChartIcon size={16} />,
                },
                {
                  name: "Scientific",
                  state: showScientific,
                  setter: setShowScientific,
                  icon: <TbMathOff size={16} />,
                },
                {
                  name: "Matrix",
                  state: showMatrix,
                  setter: setShowMatrix,
                  icon: <TbMatrix size={16} />,
                },
                {
                  name: "Fourfunction",
                  state: showFourfunction,
                  setter: setShowFourfunction,
                  icon: <BiMath size={16} />,
                },
                {
                  name: "Geometry",
                  state: showGeometry,
                  setter: setShowGeometry,
                  icon: <TbGeometry size={16} />,
                },
                {
                  name: "3D",
                  state: showD3,
                  setter: setShowD3,
                  icon: <MdOutline3dRotation size={16} />,
                },
              ].map((tool) => (
                <button
                  key={tool.name}
                  onClick={() => {
                    tool.setter(!tool.state);
                    setIsToolsOpen(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    tool.state
                      ? "bg-purple-600 text-white shadow-md"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <span className={tool.state ? "text-white" : "text-gray-400"}>
                    {tool.icon}
                  </span>
                  {tool.name}
                </button>
              ))}
            </div>
          )}
          <div
            className={`flex shrink-0 items-center gap-3 px-6 py-3 rounded-2xl font-black border-2 text-lg shadow-sm transition-colors ${
              timeLeft < 300
                ? "bg-red-50 text-red-600 border-red-200"
                : "bg-white text-one border-one/20"
            }`}
          >
            <Clock
              size={22}
              className={timeLeft < 300 ? "animate-bounce" : "animate-pulse"}
            />
            <span className="tabular-nums tracking-widest text-xl">
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full flex flex-col gap-3">
        {/* Navigator */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 w-fit">
          <div className="flex items-center gap-2 mb-2 font-bold text-gray-400 uppercase text-[9px] tracking-widest">
            <LayoutGrid size={12} className="text-one" /> Questions
          </div>
          <div className="flex flex-wrap gap-1 w-fit">
            {questions?.map((q, index) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`${navBtnSize} rounded-md font-bold transition-all ${currentQuestionIndex === index ? "ring-2 ring-one/30 border border-one" : "border border-transparent"} ${answers[q.id] ? "bg-one text-white" : "bg-gray-50 text-gray-400 hover:bg-gray-100"}`}
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
                  onClick={() => setIsImageZoomed(true)}
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
              <GridInInput
                value={answers[question.id] || ""}
                onChange={handleAnswerChange}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {question.options?.map((opt, idx) => {
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
