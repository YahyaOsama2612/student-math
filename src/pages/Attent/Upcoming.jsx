import React, { useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  ExternalLink, 
  BookOpen, 
  RefreshCcw, 
  Video,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import useGet from "@/hooks/useGet";
import Loading from "../../components/Loading";

// Import AOS
import AOS from "aos";
import "aos/dist/aos.css";

const Upcoming = () => {
  const { data, loading, error, refetch } = useGet("/api/user/sessions/upcoming");

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      easing: "ease-out-quad",
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans text-slate-900">
      {/* --- Header Section --- */}
      <div className="mx-auto mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div data-aos="fade-right">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            Upcoming <span className="text-one">Sessions</span>
          </h1>
          <p className="mt-2 text-slate-500 font-medium">
            Manage your schedule and join your upcoming live classes.
          </p>
        </div>

        <button
          onClick={refetch}
          disabled={loading}
          className="group flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-2xl font-semibold text-slate-700 hover:bg-slate-50 hover:border-blue-200 transition-all shadow-sm active:scale-95 disabled:opacity-60"
          data-aos="fade-left"
        >
          <RefreshCcw size={18} className={`${loading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
          Refresh Schedule
        </button>
      </div>

      {/* --- Status Handlers --- */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24">
          <Loading />
          <p className="mt-4 text-slate-400 animate-pulse">Fetching your sessions...</p>
        </div>
      )}

      {error && (
        <div className="max-w-md mx-auto p-6 bg-red-50 border border-red-100 rounded-3xl text-center" data-aos="zoom-in">
          <p className="text-red-600 font-semibold">{error}</p>
          <button onClick={refetch} className="mt-3 text-red-500 underline text-sm">Try again</button>
        </div>
      )}

      {/* --- Main Content --- */}
      {data?.success && data.data.length > 0 ? (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {data.data.map((session, index) => (
            <div
              key={session.id}
              data-aos="fade-up"
              data-aos-delay={index * 100}
              className="group relative bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              {/* Top Row: Icon & Badge */}
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <Video size={24} />
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Confirmed
                </div>
              </div>

              {/* Session Info */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4 group-hover:text-blue-600 transition-colors">
                  {session.name}
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-slate-500">
                    <div className="p-1.5 bg-slate-50 rounded-lg"><Calendar size={16} /></div>
                    <span className="text-sm font-medium">
                      {new Date(session.sessionDate).toLocaleDateString('en-US', { 
                        weekday: 'long', month: 'short', day: 'numeric' 
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
              <div className="bg-slate-50/80 rounded-2xl p-4 mb-8 flex-grow">
                <div className="flex items-center gap-2 mb-3 text-slate-700">
                  <BookOpen size={16} className="text-blue-500" />
                  <span className="text-xs font-bold uppercase tracking-widest">Included Lessons</span>
                </div>
                <ul className="space-y-2.5">
                  {session.lessons.map((lesson) => (
                    <li key={lesson.id} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold block leading-tight">{lesson.name}</span>
                        <span className="text-[11px] text-slate-400 capitalize">{lesson.course.name} • {lesson.chapter.name}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Button */}
              <a
                href={session.sessionLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto flex items-center justify-center gap-2 w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-200 transition-all active:scale-[0.98]"
              >
                Join Session Now
                <ArrowRight size={18} />
              </a>
            </div>
          ))}
        </div>
      ) : (
        !loading && (
          <div className="flex flex-col items-center justify-center py-32 text-center" data-aos="fade-up">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <Calendar className="text-slate-300" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">No Sessions Found</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-2">
              Your schedule is currently clear. Check back later for new updates.
            </p>
          </div>
        )
      )}
    </div>
  );
};

export default Upcoming;