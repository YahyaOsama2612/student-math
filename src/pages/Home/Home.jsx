import { useNavigate } from "react-router-dom";
import { useStudentData } from "@/context/StudentData";
import { relDay, fmtTime, typeOf } from "@/lib/portal";
import Icon from "@/components/portal/Icon";
import { LiveStrip } from "@/components/portal/ui";
import { money } from "@/lib/currency";

function Hero() {
  const { profile, upcoming, nextSession, homework, plansWaiting } = useStudentData();
  const navigate = useNavigate();
  const h = new Date().getHours();
  const hello = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const first = (profile?.fullName || "").trim().split(/\s+/)[0];
  const live = Number(profile?.livebalance ?? 0);
  const wallet = Number(profile?.wallet?.balance ?? 0);
  const up = nextSession;
  const stat = (n, label, to) => (
    <button onClick={() => navigate(to)} className="s-stat">
      <p className="text-2xl font-extrabold leading-none">{n}</p>
      <p className="text-[11px] text-white/75 mt-1.5 font-semibold">{label}</p>
    </button>
  );

  return (
    <section className="s-hero rounded-2xl text-white shadow-xl relative overflow-hidden mb-6">
      <div className="absolute -right-12 -top-20 w-72 h-72 rounded-full bg-white/10"></div>
      <div className="absolute right-24 -bottom-24 w-52 h-52 rounded-full bg-white/5"></div>
      <div className="relative p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
        <div className="lg:col-span-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white/70">{hello} · {today}</p>
            {profile?.nickname && <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-white/15 border border-white/25" title="Your nickname">{profile.nickname}</span>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">{first ? `Welcome back, ${first}` : "Welcome back to MathPortal"}</h1>
          {up ? (
            <div className="mt-4 bg-white/10 border border-white/20 rounded-xl p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/60">Next session · {relDay(up.iso)}, {fmtTime(up.start)}</p>
              <p className="text-lg font-bold mt-1 truncate">{up.topic}</p>
              <p className="text-sm text-white/75 truncate">{[up.course, typeOf(up.type).label, up.teacher].filter(Boolean).join(" · ")}</p>
            </div>
          ) : (
            <p className="text-white/80 text-sm mt-3 max-w-lg">You have no sessions booked yet. Share the times you’re free and the admin will propose a study plan.</p>
          )}
          <div className="flex flex-wrap gap-2 mt-5">
            {up
              ? <button onClick={() => navigate("/user/upcoming")} className="s-hero-btn solid">My upcoming sessions →</button>
              : <button onClick={() => navigate("/user/availability-plans")} className="s-hero-btn solid">Share my free times →</button>}
            <button onClick={() => navigate("/user/reports/quizzes")} className="s-hero-btn ghost">My reports</button>
            <button onClick={() => navigate("/user/payment")} className="s-hero-btn ghost">Store</button>
            <button onClick={() => navigate("/user/wallet")} className="s-hero-btn ghost"><Icon name="wallet" size={16} /> Wallet · {money(wallet)}</button>
          </div>
        </div>
        <div className="lg:col-span-2 grid grid-cols-2 gap-2.5">
          {stat(live, "Live sessions left", "/user/upcoming")}
          {stat(upcoming.filter((s) => !s.cancelled).length, "Upcoming sessions", "/user/upcoming")}
          {stat(homework.quizzes + homework.extra, "Homework to do", "/user/remaining")}
          {stat(plansWaiting, "Plans to review", "/user/availability-plans")}
        </div>
      </div>
    </section>
  );
}

const CARDS = [
  { key: "store", icon: "store", title: "Store", text: "Courses, chapters, lessons and session packages", buttons: [["store", "Open Store", "/user/payment"], ["purchases", "My Purchases", "/user/mypurchases"]] },
  { key: "attend", icon: "upcoming", title: "Attend", text: "Track your upcoming sessions and review your attendance history", strip: true, buttons: [["reports", "Upcoming", "/user/upcoming"], ["history", "History", "/user/history"]] },
  { key: "exams", icon: "exam", title: "Exams", text: "Take exams, evaluate your level, and track your performance", buttons: [["exam", "Exam", "/user/exams"], ["diagnose", "Diagnose", "/user/diagnostic"]] },
  { key: "plans", icon: "plans", title: "Availability Plans", text: "Share the times you are available and follow up on proposed sessions", buttons: [["plans", "Manage Availability", "/user/availability-plans"]] },
  { key: "promo", icon: "ticket", title: "Promo Code", text: "Check the latest promo codes and offers to save on your purchases", buttons: [["ticket", "Promo Code", "/user/promo"]] },
  { key: "homework", icon: "homework", title: "Remaining H.W", text: "Solve your homework and quizzes, and see what is still left to do", buttons: [["homework", "Remaining Homework", "/user/remaining"]] },
  { key: "reports", icon: "grid", title: "Reports", text: "Quiz, exam and diagnostic reports with your mistakes to review", buttons: [["grid", "My Reports", "/user/reports/quizzes"]] },
];

export default function Home() {
  const navigate = useNavigate();
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <Hero />
      <div className="flex items-end justify-between gap-3 mb-3 mt-1">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Quick access</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-5">
        {CARDS.map((c) => (
          <section key={c.key} className="card p-5">
            <div className="flex flex-col gap-4 h-full">
              <div className="card-top"><div className="icon-tile text-one"><Icon name={c.icon} size={24} /></div></div>
              {c.strip && <LiveStrip compact />}
              <div className="space-y-2 flex-grow">
                <h2 className="text-lg font-extrabold tracking-tight text-gray-900">{c.title}</h2>
                <p className="text-sm text-gray-600">{c.text}</p>
              </div>
              <div className="flex flex-col gap-2.5 mt-auto">
                {c.buttons.map(([icon, label, to]) => (
                  <button key={label} className="btn-light" onClick={() => navigate(to)}><Icon name={icon} size={20} /><span>{label}</span></button>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
