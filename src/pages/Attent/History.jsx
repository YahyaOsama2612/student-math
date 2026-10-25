import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  BookOpen,
  RefreshCcw,
  Archive,
  CheckCircle2,
  XCircle,
  ArrowRight,
  MinusCircle,
  ExternalLink,
  Eye,
  X,
  Star,
  FileText,
  GraduationCap,
  Link2,
} from "lucide-react";
import useGet from "@/hooks/useGet";
import Loading from "../../components/Loading";
import Errorpage from "../../components/Errorpage";
import SessionRatingModal from "./SessionRatingModal";
import SessionRatingsHistory from "./SessionRatingsHistory";

// Import AOS for animations
import AOS from "aos";
import "aos/dist/aos.css";

const BRAND = "#7d0a0a";

const History = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useGet(
    "/api/user/sessions/history",
  );

  // State for modals
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    url: "",
    rawUrl: "",
    title: "",
    loading: false,
  });
  const blobUrlRef = useRef(null);
  const [ratingModal, setRatingModal] = useState({
    isOpen: false,
    sessionId: null,
    sessionName: null,
  });
  const [showRatings, setShowRatings] = useState(false);
  const modalRef = useRef(null);

  // Convert Google Drive URL to embeddable format (other URLs are returned as-is)
  const getEmbedUrl = (url) => {
    if (!url) return "";
    if (url.includes("drive.google.com")) {
      const driveIdMatch =
        url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
      if (driveIdMatch && driveIdMatch[1]) {
        return `https://drive.google.com/file/d/${driveIdMatch[1]}/preview`;
      }
    }
    return url;
  };

  // Backend-uploaded PDFs (e.g. https://bcknd.mathshouse.net/uploads/...pdf)
  const isBackendPdf = (url) =>
    /\.pdf(\?|#|$)/i.test(url) || url.includes("bcknd.mathshouse.net/uploads");

  const revokeBlobUrl = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  const handlePreview = async (rawUrl, title) => {
    revokeBlobUrl();

    if (!isBackendPdf(rawUrl)) {
      setPreviewModal({
        isOpen: true,
        url: getEmbedUrl(rawUrl),
        rawUrl,
        title,
        loading: false,
      });
      return;
    }

    // Open the modal immediately with a loader
    setPreviewModal({ isOpen: true, url: "", rawUrl, title, loading: true });

    try {
      // Fetch the file and re-wrap it as application/pdf so the browser
      // renders it inline instead of downloading it (ignores Content-Disposition)
      const res = await fetch(rawUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      const blob = new Blob([buffer], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      blobUrlRef.current = blobUrl;

      setPreviewModal((prev) =>
        prev.isOpen && prev.rawUrl === rawUrl
          ? { ...prev, url: `${blobUrl}#toolbar=1&view=FitH`, loading: false }
          : prev,
      );
      // If the modal was closed/changed meanwhile, release the blob
      if (blobUrlRef.current !== blobUrl) URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // Fallback (e.g. CORS blocked): Google Docs viewer
      console.warn("PDF fetch failed, using Google viewer:", err);
      setPreviewModal((prev) =>
        prev.isOpen && prev.rawUrl === rawUrl
          ? {
            ...prev,
            url: `https://docs.google.com/viewer?url=${encodeURIComponent(
              rawUrl,
            )}&embedded=true`,
            loading: false,
          }
          : prev,
      );
    }
  };

  const closePreview = () => {
    revokeBlobUrl();
    setPreviewModal({
      isOpen: false,
      url: "",
      rawUrl: "",
      title: "",
      loading: false,
    });
  };

  // Release any blob URL on unmount
  useEffect(() => () => revokeBlobUrl(), []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      modalRef.current?.requestFullscreen().catch((err) => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  // Time comes correct from the backend — just format it as-is: "11:30:00" -> "11:30 AM"
  const formatUTCTime = (timeStr) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":").map((v) => parseInt(v, 10));
    const hours24 = h || 0;
    const minutes = m || 0;
    const period = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return `${String(hours12).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )} ${period}`;
  };

  // Date as sent by the backend (formatted in UTC so the day never shifts)
  const formatSessionDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  // Get attendance status styling
  const getAttendanceStatus = (status) => {
    const s = status ? status.toLowerCase() : "";

    if (!s || s === "not_marked") {
      return {
        label: "Not Marked",
        bg: "bg-slate-100",
        text: "text-slate-600",
        dot: "bg-slate-400",
        icon: <MinusCircle size={14} />,
      };
    }
    if (s === "attended" || s === "present") {
      return {
        label: "Attended",
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        dot: "bg-emerald-500",
        icon: <CheckCircle2 size={14} />,
      };
    }
    if (s === "absent" || s === "missed") {
      return {
        label: "Missed",
        bg: "bg-red-50",
        text: "text-red-700",
        dot: "bg-red-500",
        icon: <XCircle size={14} />,
      };
    }

    return {
      label: status.replace(/_/g, " "),
      bg: "bg-blue-50",
      text: "text-blue-700",
      dot: "bg-blue-500",
      icon: <CheckCircle2 size={14} />,
    };
  };

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      easing: "ease-out-quad",
    });
  }, []);

  if (error) {
    return <Errorpage />;
  }

  const handleOpenRatingModal = (sessionId, sessionName) => {
    setRatingModal({ isOpen: true, sessionId, sessionName });
  };

  const handleCloseRatingModal = () => {
    setRatingModal({ isOpen: false, sessionId: null, sessionName: null });
  };

  const handleRatingSuccess = () => {
    refetch();
  };

  // One material button (disabled when the link is missing)
  const MaterialButton = ({ url, label, icon: Icon, title }) => {
    const available = Boolean(url);
    return (
      <button
        type="button"
        disabled={!available}
        onClick={() => available && handlePreview(url, title)}
        title={available ? label : `${label} not available yet`}
        className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-bold transition-all ${available
            ? "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 active:scale-[0.97]"
            : "bg-slate-50 text-slate-300 cursor-not-allowed"
          }`}
      >
        <Icon size={18} style={available ? { color: BRAND } : {}} />
        <span className="leading-tight text-center">{label}</span>
      </button>
    );
  };

  if (data)
    return (
      <div className="bg-[#F8FAFC] p-4 md:p-8 font-sans text-slate-900 min-h-screen">
        {/* --- Header Section --- */}
        <div className="mx-auto mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div data-aos="fade-right">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              Session <span style={{ color: BRAND }}>History</span>
            </h1>
            <p className="mt-2 text-slate-500 font-medium">
              Review your past classes and session ratings
            </p>
          </div>

          <div className="flex gap-2">
            {/* Ratings Tab Button */}
            <button
              onClick={() => setShowRatings(!showRatings)}
              className="group flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-2xl font-semibold text-slate-700 hover:bg-slate-50 hover:border-yellow-200 transition-all shadow-sm active:scale-95"
              data-aos="fade-left"
            >
              <Star
                size={18}
                style={showRatings ? { fill: BRAND, color: BRAND } : {}}
              />
              Ratings
            </button>

            {/* Refresh Button */}
            <button
              onClick={refetch}
              disabled={loading}
              className="group flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-2xl font-semibold text-slate-700 hover:bg-slate-50 hover:border-blue-200 transition-all shadow-sm active:scale-95 disabled:opacity-60"
              data-aos="fade-left"
            >
              <RefreshCcw
                size={18}
                className={`${loading ? "animate-spin" : "group-hover:rotate-180"
                  } transition-transform duration-500`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* --- Ratings View --- */}
        {showRatings && (
          <div className="mx-auto mb-10" data-aos="fade-up">
            <SessionRatingsHistory />
          </div>
        )}

        {/* --- Status Handlers --- */}
        {loading && <Loading />}

        {/* --- Main Content - Sessions List --- */}
        {!showRatings && data?.success && data.data.length > 0 ? (
          <div className="mx-auto grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {data.data.map((session, index) => {
              const statusStyle = getAttendanceStatus(session.attendanceStatus);

              return (
                <div
                  key={session.id}
                  data-aos="fade-up"
                  data-aos-delay={index * 100}
                  className="group relative bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col"
                >
                  {/* Top Row: Icon & Badge */}
                  <div className="flex justify-between items-start mb-6">
                    <div
                      className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center group-hover:text-white transition-colors duration-300"
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = BRAND)
                      }
                      onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        "rgb(241, 245, 249)")
                      }
                    >
                      <Archive size={24} />
                    </div>

                    {/* Attendance Status Badge */}
                    <div
                      className={`flex items-center gap-1.5 ${statusStyle.bg} ${statusStyle.text} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider`}
                    >
                      <span
                        className={`w-1.5 h-1.5 ${statusStyle.dot} rounded-full`}
                      />
                      {statusStyle.label}
                    </div>
                  </div>

                  {/* Session Info */}
                  <div className="mb-6">
                    <h3
                      className="text-xl font-bold text-slate-800 mb-4 transition-colors line-clamp-2"
                      onMouseEnter={(e) => (e.currentTarget.style.color = BRAND)}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "#1e293b")
                      }
                    >
                      {session.name}
                    </h3>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-slate-500">
                        <div className="p-1.5 bg-slate-50 rounded-lg">
                          <Calendar size={16} />
                        </div>
                        <span className="text-sm font-medium">
                          {formatSessionDate(session.sessionDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-500">
                        <div className="p-1.5 bg-slate-50 rounded-lg">
                          <Clock size={16} />
                        </div>
                        <span className="text-sm font-medium">
                          {formatUTCTime(session.timeFrom)} —{" "}
                          {formatUTCTime(session.timeTo)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lessons Box */}
                  <div className="bg-slate-50/80 rounded-2xl p-5 mb-6 flex-grow">
                    <div className="flex items-center gap-2.5 mb-4 text-slate-700">
                      <BookOpen size={20} style={{ color: BRAND }} />
                      <span className="text-sm font-bold uppercase tracking-widest">
                        Topics Covered
                      </span>
                    </div>

                    <ul className="space-y-4">
                      {session.lessons?.map((lesson) => (
                        <li
                          key={lesson.id}
                          className="flex items-start justify-between gap-3 text-base text-slate-600"
                        >
                          <div className="flex items-start gap-3">
                            <CheckCircle2
                              size={20}
                              className="text-emerald-500 mt-0.5 shrink-0"
                            />
                            <div>
                              <span className="font-bold text-slate-800 block leading-tight text-base">
                                {lesson.name}
                              </span>
                              <span className="text-xs font-medium text-slate-500 capitalize mt-1 block">
                                {lesson.course?.name} • {lesson.chapter?.name}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              navigate(`/user/lesson/${lesson.id}`, {
                                state: { fromPurchases: true },
                              })
                            }
                            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            style={{
                              color: BRAND,
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
                            <Eye size={14} />
                            Material
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Material Buttons */}
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <MaterialButton
                      url={session.materialLink}
                      label="Material Link"
                      icon={Link2}
                      title={`${session.name} — Material`}
                    />
                    <MaterialButton
                      url={session.session_pdf}
                      label="Session PDF"
                      icon={FileText}
                      title={`${session.name} — Session PDF`}
                    />
                    <MaterialButton
                      url={session.teacher_explanation_pdf}
                      label="Teacher PDF"
                      icon={GraduationCap}
                      title={`${session.name} — Teacher PDF`}
                    />
                  </div>

                  {/* Rating Button */}
                  <button
                    onClick={() =>
                      handleOpenRatingModal(session.id, session.name)
                    }
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold transition-all active:scale-[0.98]"
                    style={{
                      color: BRAND,
                      backgroundColor: "rgba(125, 10, 10, 0.08)",
                    }}
                    onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      "rgba(125, 10, 10, 0.15)")
                    }
                    onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      "rgba(125, 10, 10, 0.08)")
                    }
                  >
                    <Star size={18} />
                    Rate Session
                    <ArrowRight size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          !loading &&
          !showRatings && (
            <div
              className="flex flex-col items-center justify-center py-32 text-center"
              data-aos="fade-up"
            >
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <Archive className="text-slate-300" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">
                No Past Sessions
              </h3>
              <p className="text-slate-500 max-w-xs mx-auto mt-2">
                You haven't attended any sessions yet. Sessions will appear here
                after they are completed.
              </p>
            </div>
          )
        )}

        {/* --- Preview Modal (Material / Session PDF / Teacher PDF) --- */}
        {previewModal.isOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={closePreview}
          >
            <div
              ref={modalRef}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
                <h3 className="font-bold text-gray-900 truncate text-sm sm:text-base">
                  {previewModal.title}
                </h3>
                <div className="flex items-center gap-2">
                  <a
                    href={previewModal.rawUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                    style={{
                      color: BRAND,
                      backgroundColor: "rgba(125, 10, 10, 0.1)",
                    }}
                  >
                    <ExternalLink size={14} />
                    Open
                  </a>
                  <button
                    onClick={toggleFullScreen}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                  >
                    Fullscreen
                  </button>
                  <button
                    onClick={closePreview}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-gray-900 relative">
                {previewModal.loading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80">
                    <RefreshCcw size={28} className="animate-spin" />
                    <span className="text-sm font-medium">Loading PDF…</span>
                  </div>
                ) : (
                  <iframe
                    key={previewModal.url}
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

        {/* --- Session Rating Modal --- */}
        {ratingModal.isOpen && (
          <SessionRatingModal
            sessionId={ratingModal.sessionId}
            sessionName={ratingModal.sessionName}
            onClose={handleCloseRatingModal}
            onRatingSuccess={handleRatingSuccess}
          />
        )}
      </div>
    );
};

export default History;