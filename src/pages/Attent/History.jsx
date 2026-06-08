import React, { useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  RefreshCcw, 
  Archive,
  CheckCircle2,
  XCircle,
  ArrowRight,
  MinusCircle
} from "lucide-react";
import useGet from "@/hooks/useGet";
import Loading from "../../components/Loading";
import Errorpage from "../../components/Errorpage";

// Import AOS
import AOS from "aos";
import "aos/dist/aos.css";

const History = () => {
  const { data, loading, error, refetch } = useGet("/api/user/sessions/history");

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      easing: "ease-out-quad",
    });
  }, []);

  // دالة مساعدة لتحديد شكل ولون الـ Badge بناءً على حالة الحضور
  const getAttendanceStatus = (status) => {
    if (!status) return { label: "Not Set", bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", icon: <MinusCircle size={14} /> };
    
    const s = status.toLowerCase();
    if (s === "attended" || s === "present") {
      return { label: "Attended", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", icon: <CheckCircle2 size={14} /> };
    }
    if (s === "absent" || s === "missed") {
      return { label: "Missed", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", icon: <XCircle size={14} /> };
    }
    
    return { label: status, bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", icon: <CheckCircle2 size={14} /> };
  };

  if(error){
    return (
     <Errorpage />
    )
  }

if(data)
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
          <RefreshCcw size={18} className={`${loading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
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
                  <div className={`flex items-center gap-1.5 ${statusStyle.bg} ${statusStyle.text} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider`}>
                    <span className={`w-1.5 h-1.5 ${statusStyle.dot} rounded-full`} />
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
                      <div className="p-1.5 bg-slate-50 rounded-lg"><Calendar size={16} /></div>
                      <span className="text-sm font-medium">
                        {new Date(session.sessionDate).toLocaleDateString('en-US', { 
                          weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' 
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500">
                      <div className="p-1.5 bg-slate-50 rounded-lg"><Clock size={16} /></div>
                      <span className="text-sm font-medium">{session.timeFrom} — {session.timeTo}</span>
                    </div>
                  </div>
                </div>

                {/* Lessons Box */}
            <div className="bg-slate-50/80 rounded-2xl p-5 mb-8 flex-grow">
  {/* Header Section */}
  <div className="flex items-center gap-2.5 mb-4 text-slate-700">
    <BookOpen size={20} className="text-blue-500" />
    <span className="text-sm font-bold uppercase tracking-widest">Covered Lessons</span>
  </div>

  {/* Lessons List */}
  <ul className="space-y-4">
    {session.lessons.map((lesson) => (
      <li key={lesson.id} className="flex items-start gap-3 text-base text-slate-600">
        <CheckCircle2 size={20} className="text-emerald-500 mt-0.5 shrink-0" />
        <div>
          <span className="font-bold text-slate-800 block leading-tight text-base">
            {lesson.name}
          </span>
          <span className="text-xs font-medium text-slate-500 capitalize mt-1 block">
            {lesson.course.name} • {lesson.chapter.name}
          </span>
        </div>
      </li>
    ))}
  </ul>
</div>

                {/* CTA Button */}
                {session.sessionLink ? (
                  <a
                    href={session.sessionLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto flex items-center justify-center gap-2 w-full bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold hover:bg-slate-200 hover:text-slate-900 transition-all active:scale-[0.98]"
                  >
                    Review Material
                    <ArrowRight size={18} />
                  </a>
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
          <div className="flex flex-col items-center justify-center py-32 text-center" data-aos="fade-up">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <Archive className="text-slate-300" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">No Past Sessions</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-2">
              You haven't attended any sessions yet. They will appear here once completed.
            </p>
          </div>
        )
      )}
    </div>
  );
};

export default History;