import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
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
  LineChart as LineChartIcon,
  X,
  Coffee,
  Play,
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
import { TbMatrix, TbMathOff, TbGeometry } from "react-icons/tb";
import { MdOutline3dRotation } from "react-icons/md";

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

// ─── Helpers ─────────────────────────────────────────────────────────────────
const resolveGridInValue = (rawValue) => {
  const raw = rawValue.toString();
  const evaluated = evaluateExpression(raw);
  return evaluated && evaluated !== "—" ? evaluated : raw;
};

const formatClock = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const getErrorMessage = (err, fallback) =>
  (typeof err === "string" ? err : err?.message) || fallback;

// Seconds left until `endsAt` (ms timestamp). Computed from the wall clock on
// every render, so it stays accurate even if the tab is throttled.
const useCountdown = (endsAt) => {
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => forceTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [endsAt]);
  return endsAt ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)) : 0;
};

// ─── SectionRequest ──────────────────────────────────────────────────────────
// Fires a GET (via useGet) as soon as it is mounted, then reports back once.
// Used for the /start and /break endpoints, because a hook can't be called
// conditionally from inside an event handler.
const SectionRequest = ({ url, onSuccess, onError }) => {
  const { data, loading, error } = useGet(url);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current || loading) return;
    if (error) {
      handledRef.current = true;
      onError(error);
    } else if (data) {
      handledRef.current = true;
      onSuccess(data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loading, error]);

  return null;
};

// ─── SectionTransition ───────────────────────────────────────────────────────
// "intro": shown before any section is started.
// "break": shown after a section is submitted.
// In both, the student can start ANY section that hasn't been submitted yet.
const SectionTransition = ({
  variant,
  sections,
  submittedIds,
  startingIndex,
  onStart,
  onBack,
}) => {
  const isNext = variant === "next";
  const busy = startingIndex !== null && startingIndex !== undefined;

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col items-center font-sans p-4">
      <div className="w-full max-w-3xl flex flex-col gap-4">
        {!isNext && onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-gray-400 hover:text-gray-900 transition-colors font-medium text-sm self-start"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}

        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          {isNext ? (
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center">
                <CheckCircle size={22} />
              </div>
              <h1 className="text-xl font-black text-gray-800">
                Section submitted
              </h1>
              <p className="text-sm text-gray-500">
                Choose which section to start next.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-black text-gray-800">
                Choose a section to start
              </h1>
              <p className="text-sm text-gray-500">
                You can start the sections in any order. The timer begins when
                you press Start, and you can't return to a section after you
                submit it. You can take a break from inside a section.
              </p>
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-3">
          {sections.map((sec, i) => {
            const done = submittedIds.includes(sec.id);
            const isStarting = startingIndex === i;
            return (
              <div
                key={sec.id}
                className={`bg-white rounded-2xl shadow-sm border p-5 flex flex-col md:flex-row md:items-center gap-4 ${
                  done ? "border-gray-100 opacity-70" : "border-gray-100"
                }`}
              >
                <div
                  className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-sm font-black ${
                    done ? "bg-green-500 text-white" : "bg-one/10 text-one"
                  }`}
                >
                  {done ? <CheckCircle size={16} /> : i + 1}
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <h2 className="text-base font-black text-gray-800">
                    {sec.name}
                  </h2>
                  {sec.description && (
                    <p className="text-sm text-gray-500">{sec.description}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-gray-500 mt-1">
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} className="text-one" /> {sec.duration}{" "}
                      min
                    </span>
                    <span className="flex items-center gap-1.5">
                      <LayoutGrid size={13} className="text-one" />
                      {sec.questions.length} questions
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Coffee size={13} className="text-one" />
                      {sec.breakLimited && sec.maxBreakDuration
                        ? `${sec.maxBreakDuration} min break allowed`
                        : "No break time limit"}
                    </span>
                  </div>
                </div>

                {done ? (
                  <span className="text-xs font-bold text-green-600 shrink-0">
                    Submitted
                  </span>
                ) : (
                  <button
                    onClick={() => onStart(i)}
                    disabled={busy}
                    className={`px-5 py-2.5 rounded-lg font-bold text-white text-sm transition flex items-center justify-center gap-2 shrink-0 ${
                      isStarting
                        ? "bg-gray-400 cursor-wait" // the clicked one: looks like it's running
                        : busy
                          ? "bg-one opacity-40 cursor-not-allowed" // the others: locked, but not "running"
                          : "bg-one hover:opacity-90"
                    }`}
                  >
                    <Play
                      size={14}
                      className={isStarting ? "animate-pulse" : ""}
                    />
                    {isStarting ? "Starting..." : "Start"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── BreakScreen ─────────────────────────────────────────────────────────────
// Shown while a section is paused for a break (after GET .../break).
const BreakScreen = ({
  sectionName,
  isTimed,
  secondsLeft,
  resuming,
  onResume,
}) => (
  <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center font-sans p-4">
    <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-one/10 text-one flex items-center justify-center">
        <Coffee size={22} />
      </div>
      <h1 className="text-xl font-black text-gray-800">Break</h1>
      <p className="text-sm text-gray-500">
        {sectionName} is paused. Your answers are saved.
      </p>
      {isTimed ? (
        <>
          <span
            className={`text-4xl font-black tabular-nums tracking-widest ${
              secondsLeft < 60 ? "text-red-600" : "text-one"
            }`}
          >
            {formatClock(secondsLeft)}
          </span>
          <p className="text-xs text-gray-400">
            The section resumes automatically when the break ends.
          </p>
        </>
      ) : (
        <p className="text-xs text-gray-400">This break has no time limit.</p>
      )}
      <button
        onClick={onResume}
        disabled={resuming}
        className={`mt-2 w-full px-6 py-2.5 rounded-lg font-bold text-white text-sm transition flex items-center justify-center gap-2 ${
          resuming
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-one hover:opacity-90"
        }`}
      >
        <Play size={14} />
        {resuming ? "Resuming..." : "Resume section"}
      </button>
    </div>
  </div>
);

// ─── ActiveExam Component ────────────────────────────────────────────────────
const ActiveExam = ({ onExit, examMode: examModeProp, exam: examProp }) => {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const examMode =
    examModeProp ||
    (examProp ? "exam" : null) ||
    location.state?.examMode ||
    location.state?.type ||
    (location.pathname.includes("/exams") ? "exam" : "diagnostic");

  const id = examProp?.id ?? params.id;

  const endpoint =
    examMode === "exam"
      ? `/api/user/exams/${id}`
      : `/api/user/diagnostic-exams/${id}/questions`;

  const { data: apiResponse, loading, error } = useGet(endpoint);

  const diagnosticDuration = location.state?.exam;
  const attemptIdFromState = location.state?.attemptId;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  // Section flow (exam mode only): intro -> active -> break -> active -> ...
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [submittedIds, setSubmittedIds] = useState([]); // ids of submitted sections
  const [breakUsedIds, setBreakUsedIds] = useState([]); // sections that already had their break
  const [pausedSeconds, setPausedSeconds] = useState(0); // section time left when the break began
  const [phase, setPhase] = useState(examMode === "exam" ? "intro" : "active");
  const [sectionEndsAt, setSectionEndsAt] = useState(null);
  const [breakEndsAt, setBreakEndsAt] = useState(null);
  const [pending, setPending] = useState(null); // { type: "start" | "break", url, sectionIndex }
  const submittingRef = useRef(false);
  const autoStartedRef = useRef(false);
  const [showScientific, setShowScientific] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);
  const [showFourfunction, setShowFourfunction] = useState(false);
  const [showGeometry, setShowGeometry] = useState(false);
  const [showD3, setShowD3] = useState(false);

  const { postData, loading: userLoading } = usePost("");

  const [timeLeft, setTimeLeft] = useState(diagnosticDuration * 60 || 60 * 60);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  const sectionSecondsLeft = useCountdown(sectionEndsAt);
  const breakSecondsLeft = useCountdown(breakEndsAt);

  const rawExam =
    examMode === "exam"
      ? (apiResponse?.data?.data?.exam ??
        apiResponse?.data?.exam ??
        apiResponse?.exam ??
        null)
      : null;
  const rawAttempt =
    examMode === "exam"
      ? (apiResponse?.data?.data?.attempt ??
        apiResponse?.data?.attempt ??
        apiResponse?.attempt ??
        null)
      : null;

  const attemptId =
    examMode === "exam"
      ? (examProp?.attemptId ?? rawAttempt?.id)
      : attemptIdFromState;

  // The `calculators` key can come from the exam response, the route state
  // (diagnostic exams usually arrive this way) or the diagnostic response.
  const apiPayload =
    apiResponse?.data?.data ?? apiResponse?.data ?? apiResponse;
  const calculatorsRaw =
    rawExam?.calculators ??
    examProp?.calculators ??
    examProp?.diagnosticExam?.calculators ??
    location.state?.calculators ??
    location.state?.diagnosticExam?.calculators ??
    location.state?.exam?.calculators ??
    apiPayload?.calculators ??
    apiPayload?.exam?.calculators ??
    apiPayload?.diagnosticExam?.calculators ??
    apiResponse?.data?.calculators ??
    apiResponse?.calculators ??
    "[]";

  const normalizeToolKey = (s) =>
    s
      ?.toString()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const allowedTools = useMemo(() => {
    let parsed = calculatorsRaw;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        // Not JSON, e.g. "3D, four function"
        parsed = parsed.split(",");
      }
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeToolKey).filter(Boolean);
  }, [calculatorsRaw]);

  const allTools = [
    {
      key: "graph",
      name: "Graph",
      state: showGraph,
      setter: setShowGraph,
      icon: <LineChartIcon size={16} />,
    },
    {
      key: "scientific",
      name: "Scientific",
      state: showScientific,
      setter: setShowScientific,
      icon: <TbMathOff size={16} />,
    },
    {
      key: "matrix",
      name: "Matrix",
      state: showMatrix,
      setter: setShowMatrix,
      icon: <TbMatrix size={16} />,
    },
    {
      key: "fourfunction",
      name: "Fourfunction",
      state: showFourfunction,
      setter: setShowFourfunction,
      icon: <BiMath size={16} />,
    },
    {
      key: "geometry",
      name: "Geometry",
      state: showGeometry,
      setter: setShowGeometry,
      icon: <TbGeometry size={16} />,
    },
    {
      key: "3d",
      name: "3D",
      state: showD3,
      setter: setShowD3,
      icon: <MdOutline3dRotation size={16} />,
    },
  ];

  // Same rule for normal and diagnostic exams: show only the calculators
  // listed in the exam's `calculators` key.
  const availableTools = allTools.filter((tool) =>
    allowedTools.includes(tool.key),
  );

  const mapQuestion = (q, sectionName) => ({
    id: q.questionId,
    sectionName,
    question: q.questionText,
    image: q.questionImage,
    answerType: q.answerType,
    score: q.score,
    options: (q.options || []).map((o) => ({
      id: o.id,
      answer: o.answer,
      order: o.order,
    })),
  });

  // Exam mode: sections sorted by sectionOrder, each with its own questions.
  const sections = useMemo(() => {
    if (examMode !== "exam" || !rawExam?.sections) return [];
    return [...rawExam.sections]
      .sort((a, b) => a.sectionOrder - b.sectionOrder)
      .map((section) => ({
        id: section.id,
        name: section.sectionName,
        description: section.sectionDescription,
        duration: section.effectiveDuration ?? rawExam.duration ?? 0,
        breakLimited: !!section.breakLimited,
        maxBreakDuration: section.maxBreakDuration,
        questions: [...(section.questions || [])]
          .sort((a, b) => a.questionOrder - b.questionOrder)
          .map((q) => mapQuestion(q, section.sectionName)),
      }));
  }, [examMode, rawExam]);

  const currentSection = sections[currentSectionIndex];
  // The section being taken is the last one when it's the only one not yet submitted.
  const isLastSection = sections.length - submittedIds.length <= 1;

  // Exam mode: only the current section's questions are shown at a time.
  // Diagnostic mode: the whole flat list, as before.
  const questions = useMemo(() => {
    if (examMode === "exam") return currentSection?.questions ?? [];
    return apiResponse?.data?.data || [];
  }, [apiResponse, examMode, currentSection]);

  const question = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  useEffect(() => {
    if (
      examMode === "exam" &&
      rawAttempt &&
      rawAttempt.status &&
      rawAttempt.status !== "in_progress"
    ) {
      navigate(`/user/review/${rawAttempt.id}`, { replace: true });
    }
  }, [examMode, rawAttempt, navigate]);

  const getNavButtonSize = (count) => {
    if (count <= 10) return "w-9 h-9 text-sm";
    if (count <= 20) return "w-8 h-8 text-[12px]";
    if (count <= 40) return "w-7 h-7 text-[11px]";
    if (count <= 60) return "w-6 h-6 text-[10px]";
    return "w-5 h-5 text-[9px]";
  };

  const navBtnSize = getNavButtonSize(questions.length);

  // Diagnostic exams keep the single countdown. Exam sections use
  // sectionEndsAt / useCountdown instead.
  useEffect(() => {
    if (examMode === "exam" || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, examMode]);

  const handleBack = async () => {
    if (onExit) {
      onExit();
    } else {
      navigate(-1);
    }
  };

  const formatTime = formatClock;

  const handleAnswerChange = (value) => {
    setAnswers({ ...answers, [question.id]: value });
  };

  const isAnswered = (value) =>
    value !== undefined && value !== null && value.toString().trim() !== "";

  // ── Diagnostic exam: one submit for the whole list (unchanged behaviour) ────
  const handleSubmit = async () => {
    const validAnswers = Object.entries(answers).filter(([_, value]) =>
      isAnswered(value),
    );

    const unansweredCount = questions.length - validAnswers.length;

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

    const payload = {
      answers: validAnswers.map(([questionId, value]) => ({
        questionId,
        answerId: value,
      })),
    };

    try {
      await postData(
        payload,
        `/api/user/diagnostic-exams/${attemptId}/submit`,
        "Exam submitted successfully!",
      );

      await Swal.fire({
        title: "Well done! 🎉",
        text: "Your exam has been submitted. Let’s review your answers.",
        icon: "success",
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

  // ── Exam: section flow ──────────────────────────────────────────────────────
  const sectionUrl = (section, action) =>
    `/api/user/exams/${id}/attempts/${attemptId}/sections/${section.id}/${action}`;

  const showError = (text) =>
    Swal.fire({
      title: "Error",
      text,
      icon: "error",
      confirmButtonColor: "#d33",
    });

  // GET .../start  (useGet, through <SectionRequest />)
  const requestStart = (index) => {
    const section = sections[index];
    if (!section || pending || submittedIds.includes(section.id)) return;
    if (!attemptId) {
      showError("No active attempt found for this exam.");
      return;
    }
    setPending({
      type: "start",
      sectionIndex: index,
      url: sectionUrl(section, "start"),
    });
  };

  // GET .../break  (useGet, through <SectionRequest />) — student presses "Start break"
  const startBreak = async () => {
    if (pending || !currentSection) return;
    if (!attemptId) {
      showError("No active attempt found for this exam.");
      return;
    }
    const limit =
      currentSection.breakLimited && currentSection.maxBreakDuration;
    const result = await Swal.fire({
      title: "Start break?",
      text: `${
        limit ? `You can take up to ${limit} minutes. ` : ""
      }Your section timer is paused during the break.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#4f46e5",
      cancelButtonColor: "#d33",
      confirmButtonText: "Start break",
      cancelButtonText: "Keep working",
    });
    if (!result.isConfirmed) return;

    setPending({
      type: "break",
      sectionIndex: currentSectionIndex,
      url: sectionUrl(currentSection, "break"),
    });
  };

  const handleRequestSuccess = (res) => {
    if (pending?.type === "break") {
      const section = sections[pending.sectionIndex];
      const limitSeconds =
        section.breakLimited && section.maxBreakDuration
          ? section.maxBreakDuration * 60
          : null;

      setPausedSeconds(sectionSecondsLeft);
      setSectionEndsAt(null);
      setBreakEndsAt(limitSeconds ? Date.now() + limitSeconds * 1000 : null);
      setBreakUsedIds((prev) => [...prev, section.id]);
      autoStartedRef.current = false;
      setPhase("break");
    } else if (pending?.type === "start") {
      const section = sections[pending.sectionIndex];
      const isResume = phase === "break"; // coming back from a break
      const sectionAttempt =
        res?.data?.data?.sectionAttempt ??
        res?.data?.sectionAttempt ??
        res?.sectionAttempt;

      // Prefer the server's remaining time; fall back to what we know locally.
      const seconds =
        sectionAttempt?.remainingSeconds ??
        (isResume ? pausedSeconds : (section.duration || 0) * 60);

      setCurrentSectionIndex(pending.sectionIndex);
      if (!isResume) setCurrentQuestionIndex(0);
      setIsImageZoomed(false);
      setBreakEndsAt(null);
      setSectionEndsAt(Date.now() + seconds * 1000);
      setPhase("active");
    }
    setPending(null);
  };

  const handleRequestError = (err) => {
    const type = pending?.type;
    setPending(null);
    showError(
      getErrorMessage(
        err,
        type === "start"
          ? "Failed to start the section"
          : "Failed to start the break",
      ),
    );
  };

  // POST .../submit  (usePost) — sends only the current section's answers
  const submitSection = async ({ auto = false } = {}) => {
    if (submittingRef.current || !currentSection) return;
    if (!attemptId) {
      showError("No active attempt found for this exam.");
      return;
    }

    const sectionAnswers = questions
      .filter((q) => isAnswered(answers[q.id]))
      .map((q) =>
        q.answerType === "MCQ"
          ? { questionId: q.id, selectedOptionId: answers[q.id] }
          : {
              questionId: q.id,
              gridInAnswer: resolveGridInValue(answers[q.id]),
            },
      );

    if (!auto) {
      const unanswered = questions.length - sectionAnswers.length;
      const result = await Swal.fire({
        title: isLastSection ? "Submit Exam?" : "Submit Section?",
        text: `${
          unanswered > 0
            ? `You have ${unanswered} unanswered question${unanswered > 1 ? "s" : ""}. `
            : ""
        }You won't be able to come back to this section.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#4f46e5",
        cancelButtonColor: "#d33",
        confirmButtonText: "Submit",
        cancelButtonText: "Keep working",
      });
      if (!result.isConfirmed) return;
    }

    submittingRef.current = true;
    try {
      const res = await postData(
        { answers: sectionAnswers },
        sectionUrl(currentSection, "submit"),
        isLastSection
          ? "Exam submitted successfully!"
          : "Section submitted successfully!",
      );

      setSubmittedIds((prev) => [...prev, currentSection.id]);

      if (isLastSection) {
        await Swal.fire({
          title: "Well done! 🎉",
          text: "Your exam has been submitted. Let’s review your answers.",
          icon: "success",
          confirmButtonColor: "#4f46e5",
        });

        navigate(`/user/review/${attemptId}`, {
          state: {
            examMode: "exam",
            examId: id,
            examResult: res?.data?.result ?? res?.result ?? res,
          },
        });
      } else {
        setSectionEndsAt(null);
        setBreakEndsAt(null);
        setPhase("intro");
      }
    } catch (err) {
      console.error("Error submitting section:", err);
      showError(getErrorMessage(err, "Failed to submit section"));
    } finally {
      submittingRef.current = false;
    }
  };

  // Section time is up -> submit automatically.
  useEffect(() => {
    if (examMode !== "exam" || phase !== "active" || !sectionEndsAt) return;
    if (sectionSecondsLeft > 0) return;
    Swal.fire({
      title: "Time's up!",
      text: "Submitting your answers for this section.",
      icon: "info",
      timer: 2000,
      showConfirmButton: false,
    });
    submitSection({ auto: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionSecondsLeft, phase, sectionEndsAt]);

  // Timed break is over -> resume the same section automatically.
  useEffect(() => {
    if (examMode !== "exam" || phase !== "break" || !breakEndsAt) return;
    if (breakSecondsLeft > 0 || pending || autoStartedRef.current) return;
    autoStartedRef.current = true;
    requestStart(currentSectionIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakSecondsLeft, phase, breakEndsAt, pending]);

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

  const hasNoQuestions =
    examMode === "exam"
      ? sections.every((sec) => sec.questions.length === 0)
      : questions.length === 0;

  if (hasNoQuestions)
    return (
      <div className="w-full h-screen bg-gray-50 flex flex-col font-sans p-4 relative">
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

  const requestNode = pending ? (
    <SectionRequest
      key={pending.url}
      url={pending.url}
      onSuccess={handleRequestSuccess}
      onError={handleRequestError}
    />
  ) : null;

  if (examMode === "exam" && phase === "intro") {
    return (
      <>
        {requestNode}
        <SectionTransition
          variant={submittedIds.length > 0 ? "next" : "intro"}
          sections={sections}
          submittedIds={submittedIds}
          startingIndex={
            pending?.type === "start" ? pending.sectionIndex : null
          }
          onStart={requestStart}
          onBack={handleBack}
        />
      </>
    );
  }

  if (examMode === "exam" && phase === "break") {
    return (
      <>
        {requestNode}
        <BreakScreen
          sectionName={currentSection?.name}
          isTimed={!!breakEndsAt}
          secondsLeft={breakSecondsLeft}
          resuming={pending?.type === "start"}
          onResume={() => requestStart(currentSectionIndex)}
        />
      </>
    );
  }

  if (!question)
    return (
      <div className="w-full h-screen bg-gray-50 flex flex-col items-center justify-center gap-3 text-sm text-gray-500">
        <span>This section has no questions.</span>
        {examMode === "exam" && (
          <button
            onClick={() => submitSection()}
            className="px-4 py-2 rounded-lg font-bold text-white text-xs bg-green-500 hover:bg-green-600"
          >
            {isLastSection ? "Submit Exam" : "Submit Section"}
          </button>
        )}
      </div>
    );

  const timerSeconds = examMode === "exam" ? sectionSecondsLeft : timeLeft;
  const canTakeBreak =
    examMode === "exam" &&
    !!currentSection &&
    !(currentSection.breakLimited && breakUsedIds.includes(currentSection.id));
  const submitLabel =
    examMode === "exam"
      ? isLastSection
        ? "Submit Exam"
        : "Submit Section"
      : "Submit";

  return (
    <div className="bg-gray-50 flex flex-col items-center relative w-full overflow-x-hidden font-sans pb-4 px-4 pt-1">
      {requestNode}
      {/* Full Screen Image */}
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

      {/* Main Container */}
      <div className="w-full flex flex-col gap-2">
        {/* COMPACT HEADER: Back, Navigator, and Timer on one line */}
        <div className="w-full flex flex-wrap md:flex-nowrap justify-between items-center gap-3 z-30 bg-gray-50 pb-1">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-gray-400 hover:text-gray-900 transition-colors font-medium text-sm shrink-0"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {/* Questions Navigator */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-1.5 flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1 font-bold text-gray-400 uppercase text-[9px] tracking-widest px-1">
                <LayoutGrid size={12} className="text-one" /> Qs
              </div>
              <div className="flex flex-wrap gap-1">
                {questions?.map((q, index) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`${navBtnSize} rounded-md font-bold transition-all ${currentQuestionIndex === index ? "ring-2 ring-one/30 border border-one" : "border border-transparent"} ${isAnswered(answers[q.id]) ? "bg-one text-white" : "bg-gray-50 text-gray-400 hover:bg-gray-100"}`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section + Timer */}
          <div className="flex items-center gap-2 shrink-0">
            {examMode === "exam" && currentSection && (
              <>
                <span className="hidden sm:inline text-xs font-bold text-gray-500">
                  {currentSection.name} · {currentSectionIndex + 1}/
                  {sections.length}
                </span>
                {canTakeBreak && (
                  <button
                    onClick={startBreak}
                    disabled={!!pending || userLoading}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-one bg-one/10 hover:bg-one/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1"
                  >
                    <Coffee size={13} />
                    {pending?.type === "break" ? "Starting..." : "Start break"}
                  </button>
                )}
                <button
                  onClick={() => submitSection()}
                  disabled={userLoading}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  {submitLabel}
                </button>
              </>
            )}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black border-2 text-sm shadow-sm transition-colors ${
                timerSeconds < 300
                  ? "bg-red-50 text-red-600 border-red-200"
                  : "bg-white text-one border-one/20"
              }`}
            >
              <Clock
                size={16}
                className={
                  timerSeconds < 300 ? "animate-bounce" : "animate-pulse"
                }
              />
              <span className="tabular-nums tracking-widest">
                {formatTime(timerSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Question + Your Answer Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3 items-start">
          {/* Question Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6 min-h-[420px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-800 font-bold text-sm flex items-center gap-2">
                Question {currentQuestionIndex + 1}
                {question.sectionName && (
                  <span className="bg-one/10 text-one px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide">
                    {question.sectionName}
                  </span>
                )}
              </span>
              <span className="bg-gray-50 text-gray-400 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-tighter">
                {question.answerType}
              </span>
            </div>

            {(!question.image || question.question) && (
              <h2 className="text-base md:text-lg font-bold text-gray-800 leading-snug mb-4">
                {question.question}
              </h2>
            )}

            {question.image && (
              <div
                className="bg-white rounded-xl border border-gray-100 p-3 cursor-zoom-in group relative overflow-hidden flex-1 flex items-center justify-center"
                onClick={() => setIsImageZoomed(true)}
              >
                <img
                  src={question.image}
                  alt="Visual"
                  className="w-full h-auto max-h-[420px] object-contain rounded-md transition-transform group-hover:scale-[1.01]"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                  <span className="bg-white/90 px-2.5 py-1 rounded text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow">
                    Click to Enlarge
                  </span>
                </div>
              </div>
            )}

            {/* Grid-in input stays inside the question card on small screens */}
            {question.answerType === "Grid in" && (
              <div className="mt-6 lg:hidden">
                <GridInInput
                  value={answers[question.id] || ""}
                  onChange={handleAnswerChange}
                />
              </div>
            )}
          </div>

          {/* Your Answer Panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3 lg:sticky lg:top-4">
            <span className="text-gray-800 font-bold text-sm mb-1">
              Your Answer
            </span>

            {question.answerType === "Grid in" ? (
              <div className="hidden lg:block">
                <GridInInput
                  value={answers[question.id] || ""}
                  onChange={handleAnswerChange}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {question.options?.map((opt, idx) => {
                  const isSelected = answers[question.id] === opt.id;
                  const labelLetter = String.fromCharCode(65 + idx);

                  return (
                    <label
                      key={opt.id}
                      className={`relative flex items-center gap-3 px-4 py-3 border rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? "border-one bg-one/5"
                          : "border-gray-200 bg-white hover:border-one/40"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => handleAnswerChange(opt.id)}
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? "border-one bg-one"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <span
                        className={`text-sm font-semibold ${isSelected ? "text-one" : "text-gray-700"}`}
                      >
                        {labelLetter}
                        {opt.answer ? `. ${opt.answer}` : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Controls (Positioned directly under Question & Answer Container) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-3 flex justify-between items-center mt-2">
          <button
            disabled={currentQuestionIndex === 0}
            onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
            className="px-4 py-2 rounded-lg font-bold text-gray-400 text-xs bg-gray-50 hover:bg-gray-100 disabled:opacity-30 flex items-center gap-1"
          >
            <ChevronLeft size={14} /> Previous
          </button>

          <span className="text-xs font-semibold text-gray-500">
            Questions:{" "}
            {questions.filter((q) => isAnswered(answers[q.id])).length}/
            {questions.length} answered
          </span>

          {isLastQuestion ? (
            <button
              onClick={() =>
                examMode === "exam" ? submitSection() : handleSubmit()
              }
              disabled={userLoading}
              className={`px-6 py-2 rounded-lg font-bold text-white text-xs transition flex items-center gap-1 ${userLoading ? "bg-gray-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"}`}
            >
              {userLoading ? "Submitting..." : submitLabel}{" "}
              <CheckCircle size={14} />
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
              className="px-6 py-2 rounded-lg font-bold text-white text-xs bg-one hover:opacity-90 flex items-center gap-1"
            >
              Next <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* --- Tools Trigger Buttons --- */}
        {availableTools.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col md:flex-row gap-3 md:items-center w-full mt-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 shrink-0">
              <LayoutGrid size={12} className="text-one" /> Available Tools
            </span>
            <div className="flex flex-wrap gap-2">
              {availableTools.map((tool) => (
                <button
                  key={tool.name}
                  onClick={() => tool.setter(!tool.state)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    tool.state
                      ? "bg-purple-600 text-white shadow-md border border-purple-600"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200"
                  }`}
                >
                  <span className={tool.state ? "text-white" : "text-gray-400"}>
                    {tool.icon}
                  </span>
                  {tool.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* --- Active Inline Tools Screens (Renders below Controls) --- */}
        <div className="flex flex-col gap-3">
          {availableTools
            .filter((tool) => tool.state)
            .map((tool) => (
              <div
                key={tool.key}
                className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px] md:h-[600px] animate-in fade-in duration-200"
              >
                <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-50">
                  <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <span className="text-one">{tool.icon}</span>
                    {tool.name} Tool
                  </span>
                  <button
                    onClick={() => tool.setter(false)}
                    className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex-1 w-full relative">
                  {tool.key === "graph" && <GraphViewer />}
                  {tool.key === "scientific" && <Scientific />}
                  {tool.key === "matrix" && <Matrix />}
                  {tool.key === "fourfunction" && <Fourfunction />}
                  {tool.key === "geometry" && <Geometry />}
                  {tool.key === "3d" && <D3 />}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ActiveExam;
