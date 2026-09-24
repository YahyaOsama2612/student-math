import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost";
import Loader from "@/components/Loading";
import Errorpage from "@/components/Errorpage";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Filter,
  FileText,
  Download,
  Eye,
  ExternalLink,
  Upload,
  X,
  Send,
  Award,
  MessageSquare,
} from "lucide-react";

// ─── إعدادات الواجب الإضافي ───────────────────────────────
const EXTRA_HOMEWORK_URL = "/api/user/extra-homework";
// الـ id اللي بيتبعت في /api/user/extra-homework/{id}/submit
// لو الباك إند متوقع assignmentId غيّرها لـ "assignmentId"
const SUBMIT_ID_KEY = "homeworkId";
const MAX_PDF_SIZE_MB = 10;
// ألوان المشروع من index.css: one = #7d0a0a

const STATUS_STYLES = {
  assigned: { label: "Pending", className: "bg-amber-50 text-amber-700" },
  submitted: { label: "Submitted", className: "bg-slate-100 text-slate-700" },
  graded: { label: "Graded", className: "bg-green-50 text-green-700" },
};

// تحويل الملف لـ data:application/pdf;base64,...
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });

const formatSize = (bytes) =>
  bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

const Remaining = () => {
  // ─── 1) كل الـ useState في الأول ──────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLessonId = searchParams.get("lessonId");
  const [selectedLesson, setSelectedLesson] = useState(null);

  // حالة الرفع لكل واجب: { [id]: { file, notes, error, submitting } }
  const [uploads, setUploads] = useState({});
  // الواجبات اللي اتسلمت في الجلسة دي (لحد ما الـ refetch يرجع)
  const [localSubmitted, setLocalSubmitted] = useState({});

  // ─── 2) الـ API hooks ─────────────────────────────────────
  const {
    data: lessonsData,
    loading: lessonsLoading,
    error: lessonsError,
  } = useGet("/api/user/lessons/purchased");

  const remainingUrl = selectedLessonId
    ? `/api/user/quizzes/remaining-homework?lessonId=${selectedLessonId}`
    : "/api/user/quizzes/remaining-homework";

  const {
    data: homeworkData,
    loading: homeworkLoading,
    error: homeworkError,
  } = useGet(remainingUrl);

  const {
    data: extraData,
    loading: extraLoading,
    error: extraError,
    refetch: refetchExtra,
  } = useGet(EXTRA_HOMEWORK_URL);

  const { postData } = usePost();

  // ─── 3) useMemo للـ transformations ───────────────────────
  const lessons = useMemo(
    () => lessonsData?.data?.lessons || [],
    [lessonsData],
  );
  const homework = homeworkData?.data || {};
  const quizzes = homework.quizzes || [];
  const summary = homework.summary || { total: 0, solved: 0, remaining: 0 };

  // الـ response ممكن ييجي data.data أو data مباشرة
  const extra = useMemo(() => {
    const payload = extraData?.data?.data || extraData?.data || {};
    const list = Array.isArray(payload.homework) ? payload.homework : [];
    return {
      summary: payload.summary || {
        total: list.length,
        pendingCount: 0,
        submittedCount: 0,
        gradedCount: 0,
      },
      list,
    };
  }, [extraData]);

  // ─── 4) useEffect ─────────────────────────────────────────
  useEffect(() => {
    if (selectedLessonId && lessons.length > 0) {
      setSelectedLesson(lessons.find((l) => l.id === selectedLessonId) || null);
    } else {
      setSelectedLesson(null);
    }
  }, [selectedLessonId, lessons]);

  // ─── 5) Functions ─────────────────────────────────────────
  const handleSelectLesson = (lessonId) => setSearchParams({ lessonId });
  const handleClearFilter = () => setSearchParams({});

  const updateUpload = (id, patch) =>
    setUploads((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const handleFileChange = (id, file) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      updateUpload(id, { file: null, error: "Choose a PDF file." });
      return;
    }
    if (file.size > MAX_PDF_SIZE_MB * 1024 * 1024) {
      updateUpload(id, {
        file: null,
        error: `The file is larger than ${MAX_PDF_SIZE_MB} MB. Compress it and try again.`,
      });
      return;
    }
    updateUpload(id, { file, error: null });
  };

  // تحميل الـ PDF؛ لو الـ CORS منع التحميل المباشر بنفتحه في tab جديدة
  const handleDownload = async (url, title) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${title || "homework"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleSubmit = async (item) => {
    const id = item[SUBMIT_ID_KEY];
    const state = uploads[id] || {};
    if (!state.file) {
      updateUpload(id, {
        error: "Attach your solution PDF before submitting.",
      });
      return;
    }

    updateUpload(id, { submitting: true, error: null });
    try {
      const pdf = await fileToBase64(state.file);
      await postData(
        { pdf, studentNotes: state.notes?.trim() || "" },
        `/api/user/extra-homework/${id}/submit`,
        "Homework submitted",
      );

      setLocalSubmitted((prev) => ({
        ...prev,
        [id]: {
          submittedAt: new Date().toISOString(),
          studentNotes: state.notes,
        },
      }));
      setUploads((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      refetchExtra?.();
    } catch (err) {
      updateUpload(id, {
        submitting: false,
        error:
          err?.response?.data?.message ||
          err?.message ||
          "Submission failed. Check your connection and try again.",
      });
    }
  };

  // ─── 6) Early returns بعد كل الـ hooks ─────────────────────
  if (lessonsLoading || homeworkLoading) return <Loader />;
  if (lessonsError || homeworkError)
    return <Errorpage error={lessonsError || homeworkError} />;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
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
              <div className="p-6 bg-one text-white">
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
                    {selectedLessonId && (
                      <button
                        onClick={handleClearFilter}
                        className="w-full p-4 text-left hover:bg-slate-50 transition-colors border-b flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-one" />
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

                    {lessons.map((lesson) => {
                      const isSelected = selectedLessonId === lesson.id;
                      const isExpired = lesson.status === "expired";

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => handleSelectLesson(lesson.id)}
                          className={`w-full p-4 text-left hover:bg-slate-50 transition-all border-b flex items-start justify-between group ${
                            isSelected ? "bg-one/5 border-l-4 border-l-one" : ""
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
                            <CheckCircle2 className="w-5 h-5 text-one shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel */}
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
                  <div className="p-3 bg-one/10 rounded-lg">
                    <BookOpen className="w-6 h-6 text-one" />
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

            {/* Quizzes Homework List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
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
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-one/10 text-one rounded-lg font-bold text-sm">
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
                        <button className="px-4 py-2 bg-one text-white text-sm font-medium rounded-lg hover:bg-one/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-one/40 focus-visible:ring-offset-2 transition-colors shadow-sm">
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

            {/* ─── Extra Homework ─────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-one" />
                  <h3 className="text-lg font-bold text-slate-900">
                    Extra Homework ({extra.summary.total || extra.list.length})
                  </h3>
                </div>
                <div className="flex gap-2 text-xs font-medium">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700">
                    {extra.summary.pendingCount ?? 0} pending
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                    {extra.summary.submittedCount ?? 0} submitted
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-green-50 text-green-700">
                    {extra.summary.gradedCount ?? 0} graded
                  </span>
                </div>
              </div>

              {extraLoading ? (
                <div className="p-10 text-center text-slate-500 text-sm">
                  Loading extra homework…
                </div>
              ) : extraError ? (
                <div className="p-10 text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                  <p className="text-sm text-slate-700 mb-3">
                    Extra homework couldn't be loaded.
                  </p>
                  {refetchExtra && (
                    <button
                      onClick={() => refetchExtra()}
                      className="text-sm px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium"
                    >
                      Try again
                    </button>
                  )}
                </div>
              ) : extra.list.length === 0 ? (
                <div className="p-10 text-center text-slate-500">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">
                    No extra homework assigned to you right now.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {extra.list.map((item) => {
                    const id = item[SUBMIT_ID_KEY];
                    const local = localSubmitted[id];
                    const status =
                      local && item.status === "assigned"
                        ? "submitted"
                        : item.status;
                    const statusStyle =
                      STATUS_STYLES[status] || STATUS_STYLES.assigned;
                    const isPending = status === "assigned";
                    const isOverdue =
                      isPending &&
                      item.dueDate &&
                      new Date(item.dueDate) < new Date();
                    const upload = uploads[id] || {};
                    const inputId = `extra-pdf-${id}`;

                    return (
                      <div key={item.assignmentId || id} className="p-6">
                        {/* Title + status */}
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="min-w-0">
                            <h4 className="text-base font-semibold text-slate-900">
                              {item.title || "Untitled homework"}
                            </h4>
                            {item.description && (
                              <p className="text-sm text-slate-600 mt-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <span
                            className={`shrink-0 px-2.5 py-1 text-xs font-semibold rounded-lg ${statusStyle.className}`}
                          >
                            {statusStyle.label}
                          </span>
                        </div>

                        {item.dueDate && (
                          <div
                            className={`flex items-center gap-1.5 text-sm mb-4 ${
                              isOverdue ? "text-red-600" : "text-slate-600"
                            }`}
                          >
                            <Clock className="w-4 h-4" />
                            <span>
                              {isOverdue ? "Overdue since " : "Due "}
                              {formatDateTime(item.dueDate)}
                            </span>
                          </div>
                        )}

                        {/* Materials: PDF + link */}
                        {(item.pdfUrl || item.link) && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {item.pdfUrl && (
                              <>
                                <a
                                  href={item.pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-one/5 text-one hover:bg-one/10 transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                  View PDF
                                </a>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDownload(item.pdfUrl, item.title)
                                  }
                                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                >
                                  <Download className="w-4 h-4" />
                                  Download PDF
                                </button>
                              </>
                            )}
                            {item.link && (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Open link
                              </a>
                            )}
                          </div>
                        )}

                        {/* Upload & submit (pending only) */}
                        {isPending && (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 space-y-3">
                            <p className="text-sm font-semibold text-slate-800">
                              Upload your solution
                            </p>

                            {upload.file ? (
                              <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-5 h-5 text-red-500 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">
                                      {upload.file.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {formatSize(upload.file.size)}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateUpload(id, { file: null })
                                  }
                                  disabled={upload.submitting}
                                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                                  aria-label="Remove file"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <label
                                htmlFor={inputId}
                                className="flex flex-col items-center justify-center gap-1 py-6 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-one/50 focus-within:ring-2 focus-within:ring-one/40 transition-colors"
                              >
                                <Upload className="w-6 h-6 text-slate-400" />
                                <span className="text-sm font-medium text-slate-700">
                                  Choose a PDF file
                                </span>
                                <span className="text-xs text-slate-500">
                                  PDF only, up to {MAX_PDF_SIZE_MB} MB
                                </span>
                                <input
                                  id={inputId}
                                  type="file"
                                  accept="application/pdf"
                                  className="sr-only"
                                  onChange={(e) => {
                                    handleFileChange(id, e.target.files?.[0]);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            )}

                            <textarea
                              rows={2}
                              value={upload.notes || ""}
                              onChange={(e) =>
                                updateUpload(id, { notes: e.target.value })
                              }
                              disabled={upload.submitting}
                              placeholder="Notes for your teacher (optional)"
                              className="w-full text-sm rounded-lg border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-one/40 disabled:opacity-60"
                            />

                            {upload.error && (
                              <p className="flex items-center gap-1.5 text-sm text-red-600">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {upload.error}
                              </p>
                            )}

                            <button
                              type="button"
                              onClick={() => handleSubmit(item)}
                              disabled={!upload.file || upload.submitting}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-one text-white text-sm font-medium rounded-lg hover:bg-one/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-one/40 focus-visible:ring-offset-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Send className="w-4 h-4" />
                              {upload.submitting
                                ? "Submitting…"
                                : "Submit homework"}
                            </button>
                          </div>
                        )}

                        {/* Submitted / graded info */}
                        {!isPending && (
                          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-sm">
                            <p className="flex items-center gap-1.5 text-slate-700">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              Submitted{" "}
                              {formatDateTime(
                                item.submittedAt || local?.submittedAt,
                              )}
                            </p>
                            {item.submittedPdf && (
                              <a
                                href={item.submittedPdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-one font-medium hover:underline"
                              >
                                <FileText className="w-4 h-4" />
                                View your submission
                              </a>
                            )}
                            {(item.studentNotes || local?.studentNotes) && (
                              <p className="text-slate-600">
                                <span className="font-medium">
                                  Your notes:{" "}
                                </span>
                                {item.studentNotes || local?.studentNotes}
                              </p>
                            )}
                            {status === "graded" && (
                              <div className="pt-2 mt-2 border-t border-slate-200 space-y-1">
                                {item.score !== null &&
                                  item.score !== undefined && (
                                    <p className="flex items-center gap-1.5 font-semibold text-green-700">
                                      <Award className="w-4 h-4" />
                                      Score: {item.score}
                                    </p>
                                  )}
                                {item.feedback && (
                                  <p className="flex items-start gap-1.5 text-slate-700">
                                    <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
                                    {item.feedback}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
