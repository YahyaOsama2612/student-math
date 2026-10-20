import React, { useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost";
import Loader from "@/components/Loading";
import Errorpage from "@/components/Errorpage";
import {
  ArrowLeft,
  BookOpen,
  User,
  GraduationCap,
  Lock,
  Unlock,
  CheckCircle2,
  Wallet,
  AlertCircle,
  Lightbulb,
  Sparkles,
  Video,
  FileText,
  HelpCircle,
  Clock,
  X,
  ExternalLink,
  Play,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const Lesson = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { postData, loading: startingQuiz } = usePost();
  const [loadingQuizId, setLoadingQuizId] = useState(null);

  // State for active tab
  const [activeTab, setActiveTab] = useState("ideas");

  // State for preview modal (PDF / video)
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    url: "",
    title: "",
    type: "", // "pdf" | "video" | "bunny"
    bunnyGuid: null,
  });
  const modalRef = useRef(null);

  // State for expanded idea cards
  const [expandedIdea, setExpandedIdea] = useState(null);

  // استدعاء الـ API الخاص بتفاصيل الدرس
  const { data, loading, error } = useGet(`/api/user/lessons/${id}`);

  // Fetch quizzes for this lesson
  const { data: quizzesData } = useGet(`/api/user/quizzes/lesson/${id}`);

  const responseData = data?.data;
  const lessonInfo = responseData?.lesson;
  const chapterInfo = responseData?.chapter;
  const courseInfo = responseData?.course;
  const teacherInfo = responseData?.teacher;
  const ideas = responseData?.ideas || [];
  const prices = responseData?.prices || [];
  const isLocked = location.state?.fromPurchases ? false : responseData?.isLocked;

  // Extract quizzes
  const rawQuizzes = quizzesData?.data?.quizzes || quizzesData?.quizzes || [];
  const quizzesList =
    rawQuizzes.length > 0
      ? [...rawQuizzes].sort((a, b) => (a.quizOrder || 0) - (b.quizOrder || 0))
      : [];

  // جلب السعر الافتراضي للدرس
  const defaultPricePlan = prices.find((p) => p.isDefault) || prices[0];
  const lessonPrice = defaultPricePlan
    ? parseFloat(defaultPricePlan.totalPriceEgp)
    : 0;

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

  // Convert Google Drive URL to embeddable format
  const getEmbedUrl = (url) => {
    if (!url) return "";
    const driveIdMatch = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
    if (driveIdMatch && driveIdMatch[1]) {
      return `https://drive.google.com/file/d/${driveIdMatch[1]}/preview`;
    }
    return url;
  };

  const handlePreview = (rawUrl, title, type = "pdf", bunnyGuid = null) => {
    if (type === "bunny" && bunnyGuid) {
      setPreviewModal({
        isOpen: true,
        url: "",
        title,
        type: "bunny",
        bunnyGuid,
      });
    } else {
      const embedUrl = getEmbedUrl(rawUrl);
      setPreviewModal({
        isOpen: true,
        url: embedUrl,
        title,
        type,
        bunnyGuid: null,
      });
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      modalRef.current?.requestFullscreen().catch((err) => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  if (loading) return <Loader />;
  if (error || !lessonInfo) return <Errorpage />;

  // Count available materials per tab
  const ideasWithMaterial = ideas.filter(
    (idea) => idea.pdf || idea.video || idea.bunnyGuid
  );
  const hasIdeas = ideas.length > 0;
  const hasQuizzes = quizzesList.length > 0;

  const tabs = [
    {
      key: "ideas",
      label: "Ideas & Material",
      icon: Sparkles,
      count: ideas.length,
      show: true,
    },
    {
      key: "quizzes",
      label: "Homework & Exams",
      icon: HelpCircle,
      count: quizzesList.length,
      show: true,
    },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 mx-auto min-h-screen max-w-5xl relative pb-24">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-medium mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Main Lesson Header Card */}
      <div className="bg-gray-900 text-white rounded-[2rem] p-6 md:p-8 mb-8 relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-one">
                Lesson {lessonInfo.order}
              </span>
              <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-gray-300">
                {courseInfo?.name} • {chapterInfo?.name}
              </span>
            </div>

            <h1 className="text-2xl md:text-4xl font-black mt-4 mb-3 text-white">
              {lessonInfo.name}
            </h1>

            <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
              <User className="w-4 h-4 text-one" />
              <span>Teacher: {teacherInfo?.name}</span>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-4 mt-4 flex-wrap">
              {ideas.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-full">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  {ideas.length} Ideas
                </span>
              )}
              {ideasWithMaterial.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-full">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  {ideasWithMaterial.length} PDFs/Videos
                </span>
              )}
              {quizzesList.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-full">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                  {quizzesList.length} Quizzes
                </span>
              )}
            </div>
          </div>

          {/* Lock / Unlock Status Badge */}
          <div
            className={`self-start md:self-center px-4 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 ${
              isLocked
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-green-500/10 text-green-400 border border-green-500/20"
            }`}
          >
            {isLocked ? (
              <>
                <Lock className="w-4 h-4" /> Locked Content
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" /> Available
              </>
            )}
          </div>
        </div>
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-one opacity-10 blur-[80px]"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Content Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description Section */}
          {lessonInfo.description && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-3">
                About This Lesson
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {lessonInfo.description}
              </p>
            </div>
          )}

          {/* Pre-requisites & What you gain Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2 text-sm text-gray-500">
                <AlertCircle className="w-4 h-4 text-amber-500" />{" "}
                Pre-requisites
              </h4>
              <p className="text-sm text-gray-600">
                {lessonInfo.preRequisition || "No pre-requisites required."}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2 text-sm text-gray-500">
                <GraduationCap className="w-4 h-4 text-one" /> What You'll Learn
              </h4>
              <p className="text-sm text-gray-600">
                {lessonInfo.whatYouGain ||
                  "Core foundations and practical problem solving."}
              </p>
            </div>
          </div>

          {/* ====== MATERIAL TABS ====== */}
          {!isLocked && (
            <>
              {/* Tab Navigation */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex border-b border-gray-100">
                  {tabs.map((tab) => {
                    if (!tab.show) return null;
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold transition-all relative ${
                          isActive
                            ? "text-one"
                            : "text-gray-400 hover:text-gray-600"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                        {tab.count > 0 && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isActive
                                ? "bg-one/10 text-one"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {tab.count}
                          </span>
                        )}
                        {isActive && (
                          <span className="absolute bottom-0 left-4 right-4 h-[3px] bg-one rounded-t-full" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {/* IDEAS TAB */}
                  {activeTab === "ideas" && (
                    <div>
                      {ideas.length > 0 ? (
                        <div className="space-y-4">
                          {ideas.map((idea) => {
                            const hasPdf = !!idea.pdf;
                            const hasVideo = !!idea.video;
                            const hasBunny = !!idea.bunnyGuid;
                            const hasMaterial = hasPdf || hasVideo || hasBunny;
                            const isExpanded = expandedIdea === idea.id;

                            return (
                              <div
                                key={idea.id}
                                className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50/50 hover:border-gray-200 transition-all"
                              >
                                {/* Idea Header */}
                                <div
                                  className={`flex items-center justify-between gap-3 p-4 ${
                                    hasMaterial ? "cursor-pointer" : ""
                                  }`}
                                  onClick={() =>
                                    hasMaterial &&
                                    setExpandedIdea(
                                      isExpanded ? null : idea.id
                                    )
                                  }
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-amber-50 text-amber-600 font-bold rounded-full text-xs border border-amber-100">
                                      {idea.ideaOrder}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-sm font-semibold text-gray-800 block truncate">
                                        {idea.idea}
                                      </span>
                                      <div className="flex items-center gap-2 mt-1">
                                        {hasPdf && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                            <FileText className="w-3 h-3" />
                                            PDF
                                          </span>
                                        )}
                                        {(hasVideo || hasBunny) && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                                            <Video className="w-3 h-3" />
                                            Video
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {hasMaterial && (
                                    <div className="shrink-0 text-gray-400">
                                      {isExpanded ? (
                                        <ChevronUp className="w-5 h-5" />
                                      ) : (
                                        <ChevronDown className="w-5 h-5" />
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Expanded Material Actions */}
                                {isExpanded && hasMaterial && (
                                  <div className="px-4 pb-4 pt-0 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                                    {hasPdf && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePreview(
                                            idea.pdf,
                                            `PDF: ${idea.idea}`,
                                            "pdf"
                                          );
                                        }}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer border border-blue-100"
                                      >
                                        <FileText className="w-4 h-4" />
                                        View PDF
                                      </button>
                                    )}
                                    {hasVideo && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePreview(
                                            idea.video,
                                            `Video: ${idea.idea}`,
                                            "video"
                                          );
                                        }}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer border border-red-100"
                                      >
                                        <Video className="w-4 h-4" />
                                        Watch Video (Drive)
                                      </button>
                                    )}
                                    {hasBunny && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePreview(
                                            null,
                                            `Video: ${idea.idea}`,
                                            "bunny",
                                            idea.bunnyGuid
                                          );
                                        }}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors cursor-pointer border border-purple-100"
                                      >
                                        <Play className="w-4 h-4" />
                                        Watch Video
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-10">
                          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Lightbulb className="w-6 h-6 text-gray-300" />
                          </div>
                          <p className="text-sm text-gray-400 font-medium">
                            No ideas uploaded for this lesson yet.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* QUIZZES TAB */}
                  {activeTab === "quizzes" && (
                    <div>
                      {quizzesList.length > 0 ? (
                        <div className="space-y-4">
                          {quizzesList.map((quiz) => (
                            <div
                              key={quiz.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-gray-100 rounded-xl bg-indigo-50/20 hover:border-indigo-100 transition-all"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-indigo-50 text-indigo-600 font-bold rounded-lg text-xs mt-0.5 border border-indigo-100">
                                  {quiz.quizOrder}
                                </div>
                                <div>
                                  <span className="text-sm font-semibold text-gray-800 block">
                                    {quiz.title}
                                  </span>
                                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                      <Clock className="w-3 h-3" />{" "}
                                      {quiz.durationMinutes ||
                                        quiz.durationHours * 60}{" "}
                                      mins
                                    </span>
                                    <span className="inline-flex items-center text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                      Score: {quiz.totalScore}
                                    </span>
                                    {quiz.type && (
                                      <span className="inline-flex items-center text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded capitalize">
                                        {quiz.type}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button
                                disabled={loadingQuizId === quiz.id}
                                onClick={async () => {
                                  setLoadingQuizId(quiz.id);
                                  try {
                                    const res = await postData(
                                      {},
                                      `/api/user/quizzes/${quiz.id}/start`,
                                      "Quiz started successfully!"
                                    );
                                    if (res) navigate(`/user/quiz/${quiz.id}`);
                                  } catch (err) {
                                    console.error(err);
                                  } finally {
                                    setLoadingQuizId(null);
                                  }
                                }}
                                className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-xl transition-colors shadow-sm cursor-pointer"
                              >
                                {loadingQuizId === quiz.id
                                  ? "Starting..."
                                  : "Start Quiz"}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10">
                          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <HelpCircle className="w-6 h-6 text-gray-300" />
                          </div>
                          <p className="text-sm text-gray-400 font-medium">
                            No quizzes or homework available yet.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Locked Ideas Preview (just names, no material) */}
          {isLocked && ideas.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-one" /> Lesson Key Ideas
              </h3>
              <div className="space-y-3">
                {ideas.map((idea, index) => (
                  <div
                    key={idea.id || index}
                    className="flex gap-3 items-start"
                  >
                    <CheckCircle2 className="w-5 h-5 text-one shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">
                        {idea.idea || "No specific sub-topic text uploaded."}
                      </p>
                      {(idea.pdf || idea.video || idea.bunnyGuid) && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Lock className="w-3 h-3 text-amber-500" />
                          <span className="text-[10px] text-amber-600 font-medium">
                            Material available after enrollment
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Action / Paywall Column */}
        <div className="lg:col-span-1">
          {isLocked ? (
            <div className="bg-white rounded-3xl border-2 border-amber-100 p-6 shadow-md sticky top-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mx-auto mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-800 mb-2">
                Unlock Lesson
              </h3>
              <p className="text-xs text-gray-500 mb-6">
                Get full instant access to videos, assignments, and files for
                this lesson.
              </p>

              {defaultPricePlan && (
                <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
                  <span className="text-3xl font-black text-gray-900">
                    {lessonPrice} LE
                  </span>
                  <span className="text-xs text-gray-400 block mt-1">
                    Access Period: {defaultPricePlan.durationLabel}
                  </span>
                </div>
              )}

              <button
                onClick={handleEnroll}
                className="w-full bg-one hover:bg-one/90 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-one/20"
              >
                <Wallet className="w-4 h-4" /> Enroll Now
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-emerald-100 p-6 shadow-md sticky top-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto mb-4">
                <Unlock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-800 mb-2 text-center">
                You Have Access
              </h3>
              <p className="text-xs text-gray-500 mb-4 text-center">
                You are enrolled in this lesson. Enjoy learning!
              </p>
              <div className="text-xs font-bold text-emerald-600 bg-emerald-50 py-2 rounded-xl border border-emerald-100 text-center mb-4">
                Ready to stream
              </div>

              {/* Quick access to material from sidebar */}
              <div className="space-y-2 mt-4">
                {ideasWithMaterial.length > 0 && (
                  <button
                    onClick={() => setActiveTab("ideas")}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === "ideas"
                        ? "bg-one/10 text-one border border-one/20"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      View Ideas & Material
                    </span>
                    <span className="bg-white/80 px-2 py-0.5 rounded-full text-[10px]">
                      {ideas.length}
                    </span>
                  </button>
                )}
                {quizzesList.length > 0 && (
                  <button
                    onClick={() => setActiveTab("quizzes")}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === "quizzes"
                        ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4" />
                      Homework & Exams
                    </span>
                    <span className="bg-white/80 px-2 py-0.5 rounded-full text-[10px]">
                      {quizzesList.length}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ====== PREVIEW MODAL (PDF / Video / Bunny) ====== */}
      {previewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            ref={modalRef}
            className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50 shrink-0">
              <h3 className="font-bold text-gray-900 truncate text-sm sm:text-base pr-4">
                {previewModal.title}
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                {previewModal.url && (
                  <a
                    href={previewModal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                    style={{
                      color: "#7d0a0a",
                      backgroundColor: "rgba(125, 10, 10, 0.1)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        "rgba(125, 10, 10, 0.2)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        "rgba(125, 10, 10, 0.1)")
                    }
                  >
                    <ExternalLink size={14} />
                    Open
                  </a>
                )}
                <button
                  onClick={toggleFullScreen}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                >
                  Fullscreen
                </button>
                <button
                  onClick={() =>
                    setPreviewModal({
                      isOpen: false,
                      url: "",
                      title: "",
                      type: "",
                      bunnyGuid: null,
                    })
                  }
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 bg-gray-900">
              {previewModal.type === "bunny" && previewModal.bunnyGuid ? (
                <iframe
                  src={`https://iframe.mediadelivery.net/embed/427553/${previewModal.bunnyGuid}?autoplay=true&loop=false&muted=false&preload=true&responsive=true`}
                  title={previewModal.title}
                  className="w-full h-full border-0"
                  loading="lazy"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <iframe
                  src={previewModal.url}
                  title={previewModal.title}
                  className="w-full h-full border-0"
                  allowFullScreen
                ></iframe>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lesson;
