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
} from "lucide-react";
import useGet from "@/hooks/useGet";
import Loading from "../../components/Loading";
import Errorpage from "../../components/Errorpage";

// Import AOS
import AOS from "aos";
import "aos/dist/aos.css";

const History = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useGet(
    "/api/user/sessions/history",
  );

  // مودال عرض محتوى الحصة (سيشن لينك)
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    url: "",
    title: "",
  });
  const modalRef = useRef(null);

  // بيحول أي لينك جوجل درايف لصيغة قابلة للـ embed جوه الـ iframe
  const getEmbedUrl = (url) => {
    if (!url) return "";
    const driveIdMatch = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
    if (driveIdMatch && driveIdMatch[1]) {
      return `https://drive.google.com/file/d/${driveIdMatch[1]}/preview`;
    }
    return url;
  };

  const handlePreviewSession = (rawUrl, title) => {
    setPreviewModal({
      isOpen: true,
      url: getEmbedUrl(rawUrl),
      title,
    });
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      modalRef.current?.requestFullscreen().catch((err) => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  // الأوقات (timeFrom/timeTo) بتتخزن وتتبعت من الباك اند بتوقيت UTC،
  // فبنحولها هنا لتوقيت جهاز اليوزر قبل ما نعرضها
  const formatUTCTimeToLocal = (timeStr) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":");
    const d = new Date();
    d.setUTCHours(parseInt(hours, 10));
    d.setUTCMinutes(parseInt(minutes, 10));
    d.setUTCSeconds(0);
    d.setUTCMilliseconds(0);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      easing: "ease-out-quad",
    });
  }, []);

  // دالة مساعدة لتحديد شكل ولون الـ Badge بناءً على حالة الحضور
  const getAttendanceStatus = (status) => {
    if (!status)
      return {
        label: "Not Set",
        bg: "bg-slate-100",
        text: "text-slate-600",
        dot: "bg-slate-400",
        icon: <MinusCircle size={14} />,
      };

    const s = status.toLowerCase();
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
      label: status,
      bg: "bg-blue-50",
      text: "text-blue-700",
      dot: "bg-blue-500",
      icon: <CheckCircle2 size={14} />,
    };
  };

  if (error) {
    return <Errorpage />;
  }

  if (data)
    return (
      <div className=" bg-[#F8FAFC] p-4 md:p-8 font-sans text-slate-900">
        {/* --- Header Section --- */}
        <div className="mx-auto mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div data-aos="fade-right">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              Session <span className="text-one">History</span>
            </h1>
            <p className="mt-2 text-slate-500 font-medium">
              Review your past classes and attendance records.
            </p>
          </div>

          <button
            onClick={refetch}
            disabled={loading}
            className="group flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-2xl font-semibold text-slate-700 hover:bg-slate-50 hover:border-blue-200 transition-all shadow-sm active:scale-95 disabled:opacity-60"
            data-aos="fade-left"
          >
            <RefreshCcw
              size={18}
              className={`${loading ? "animate-spin" : "group-hover:rotate-180"} transition-transform duration-500`}
            />
            Refresh History
          </button>
        </div>

        {/* --- Status Handlers --- */}
        {loading && (
          <div className=" ">
            <Loading />
          </div>
        )}

        {/* --- Main Content --- */}
        {data?.success && data.data.length > 0 ? (
          <div className=" mx-auto grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {data.data.map((session, index) => {
              const statusStyle = getAttendanceStatus(session.attendanceStatus);

              return (
                <div
                  key={session.id}
                  data-aos="fade-up"
                  data-aos-delay={index * 100} // ده بيعمل تتابع (Cascade) للأنيميشن
                  className="group relative bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col"
                >
                  {/* Top Row: Icon & Badge */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center group-hover:bg-one group-hover:text-white transition-colors duration-300">
                      <Archive size={24} />
                    </div>

                    {/* Dynamic Attendance Badge */}
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
                    <h3 className="text-xl font-bold text-slate-800 mb-4 group-hover:text-one transition-colors line-clamp-2">
                      {session.name}
                    </h3>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-slate-500">
                        <div className="p-1.5 bg-slate-50 rounded-lg">
                          <Calendar size={16} />
                        </div>
                        <span className="text-sm font-medium">
                          {new Date(session.sessionDate).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "long",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-500">
                        <div className="p-1.5 bg-slate-50 rounded-lg">
                          <Clock size={16} />
                        </div>
                        <span className="text-sm font-medium">
                          {formatUTCTimeToLocal(session.timeFrom)} —{" "}
                          {formatUTCTimeToLocal(session.timeTo)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lessons Box */}
                  <div className="bg-slate-50/80 rounded-2xl p-5 mb-8 flex-grow">
                    {/* Header Section */}
                    <div className="flex items-center gap-2.5 mb-4 text-slate-700">
                      <BookOpen size={20} className="text-blue-500" />
                      <span className="text-sm font-bold uppercase tracking-widest">
                        Covered Lessons
                      </span>
                    </div>

                    {/* Lessons List */}
                    <ul className="space-y-4">
                      {session.lessons.map((lesson) => (
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
                                {lesson.course.name} • {lesson.chapter.name}
                              </span>
                            </div>
                          </div>

                          {/* View Material Button - lesson content details page */}
                          <button
                            onClick={() =>
                              navigate(`/user/contentdetails/${lesson.id}`, {
                                state: { contentType: "lessons" },
                              })
                            }
                            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye size={14} />
                           lesson Material
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button - Session Content Preview */}
                  {session.materialLink ? (
                    <button
                      onClick={() =>
                        handlePreviewSession(session.materialLin, session.name)
                      }
                      className="mt-auto flex items-center justify-center gap-2 w-full bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold hover:bg-slate-200 hover:text-slate-900 transition-all active:scale-[0.98]"
                    >
                   Session  Material
                      <ArrowRight size={18} />
                    </button>
                  ) : (
                    <button
                      disabled
                      className="mt-auto flex items-center justify-center gap-2 w-full bg-slate-50 text-slate-400 py-4 rounded-2xl font-bold cursor-not-allowed"
                    >
                      No Material Available
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          !loading && (
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
                You haven't attended any sessions yet. They will appear here
                once completed.
              </p>
            </div>
          )
        )}

        {/* --- Session Content Preview Modal --- */}
        {previewModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div
              ref={modalRef}
              className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
                <h3 className="font-bold text-gray-900 truncate text-sm sm:text-base">
                  {previewModal.title}
                </h3>
                <div className="flex items-center gap-2">
                  {/* Open in New Tab */}
                  <a
                    href={previewModal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                  >
                    <ExternalLink size={14} />
                    Open
                  </a>
                  {/* Full Screen Toggle */}
                  <button
                    onClick={toggleFullScreen}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                  >
                    Full Screen
                  </button>
                  {/* Close */}
                  <button
                    onClick={() =>
                      setPreviewModal({ isOpen: false, url: "", title: "" })
                    }
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-gray-900">
                <iframe
                  src={previewModal.url}
                  title={previewModal.title}
                  className="w-full h-full border-0"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>
        )}
      </div>
    );
};

export default History;