import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import api from "../api/api";
import { StudentDataProvider, useStudentData } from "../context/StudentData";
import { initials, relDay, fmtTime, timeAgo } from "../lib/portal";
import Icon from "../components/portal/Icon";

/* ---------------------------------------------------------------------------
   Student shell (MathPortal design): sidebar on desktop, bottom bar on phones,
   top bar with notifications and the account menu.
   --------------------------------------------------------------------------- */

const NAV = [
  { key: "home", label: "Home", to: "/user/home", group: "" },
  { key: "upcoming", label: "Upcoming sessions", to: "/user/upcoming", group: "Learning" },
  { key: "history", label: "Session history", to: "/user/history", group: "Learning" },
  { key: "materials", label: "Class materials", to: "/user/materials", group: "Learning" },
  { key: "homework", label: "Remaining H.W", to: "/user/remaining", group: "Learning" },
  { key: "exam", label: "Exams", to: "/user/exams", group: "Learning" },
  { key: "reports", label: "Reports", to: "/user/reports/quizzes", group: "Learning" },
  { key: "plans", label: "Study plans", to: "/user/availability-plans", group: "Planning" },
  { key: "store", label: "Store", to: "/user/payment", group: "Shop" },
  { key: "purchases", label: "My purchases", to: "/user/mypurchases", group: "Shop" },
];
// Phones: four main sections on the bottom bar; everything else is under "More".
const MOBILE = [["home", "Home"], ["upcoming", "Sessions"], ["homework", "H.W"], ["store", "Store"]];
const MORE_EXTRA = [
  { key: "wallet", label: "Wallet", to: "/user/wallet", icon: "wallet", group: "Account" },
  { key: "promo", label: "Promo codes", to: "/user/promo", icon: "promo", group: "Account" },
  { key: "profile", label: "My profile", to: "/user/profile", icon: "user", group: "Account" },
];

/** Which menu item a URL belongs to (deeper pages light up their section). */
const SECTION_OF = [
  [/^\/user\/(upcoming)/, "upcoming"],
  [/^\/user\/(history|session\/)/, "history"],
  [/^\/user\/materials/, "materials"],
  [/^\/user\/(remaining|quiz\/)/, "homework"],
  [/^\/user\/(exams|diagnostic|activeexam|review)/, "exam"],
  [/^\/user\/reports/, "reports"],
  [/^\/user\/availability-plans/, "plans"],
  [/^\/user\/(payment|mycourses|courses|chapters|chapter|lesson|enrollment)/, "store"],
  [/^\/user\/(mypurchases|pendingpurchases|contentdetails)/, "purchases"],
  [/^\/user\/home/, "home"],
];
const TITLES = { promo: "Promo codes", wallet: "Wallet", profile: "My profile" };
const SIDEBAR_KEY = "mp_s_sidebar";

function readCollapsed() {
  try {
    const v = localStorage.getItem(SIDEBAR_KEY);
    return v ? v === "collapsed" : window.innerWidth >= 1024 && window.innerWidth < 1280;
  } catch {
    return false;
  }
}

function NotificationBell() {
  const { notifications, unread, markNotificationsRead } = useStudentData();
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  useEffect(() => {
    const close = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  const openItem = (n) => {
    if (!n.isRead) markNotificationsRead([n.id]);
    const link = n.materialLink || n.materialFile;
    if (link) window.open(link, "_blank", "noopener");
  };
  return (
    <div ref={wrap} className="relative">
      <button onClick={() => setOpen((o) => !o)} title="Notifications" aria-label="Notifications" aria-expanded={open} className={`nt-bell ${open ? "open" : ""}`}>
        <Icon name="bell" size={21} />
        {unread > 0 && <span className="nt-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="nt-panel">
          <div className="nt-head">
            <span className="nt-title">Notifications{unread > 0 && <span className="nt-count">{unread} new</span>}</span>
            {unread > 0 && <button className="nt-link" onClick={() => markNotificationsRead()}>Mark all as read</button>}
          </div>
          <div className="nt-list">
            {notifications.length ? notifications.map((n) => (
              <button key={n.id} onClick={() => openItem(n)} className={`nt-item ${n.isRead ? "" : "unread"}`}>
                <span className="nt-icon brand"><Icon name={n.materialLink || n.materialFile ? "link" : "bell"} size={16} /></span>
                <span className="nt-body">
                  <span className="nt-text" style={{ color: "#334155", WebkitLineClamp: 3 }}>{n.text}</span>
                  <span className="nt-meta">{timeAgo(n.dateTime)} · MathPortal</span>
                </span>
                {!n.isRead && <span className="nt-dot"></span>}
              </button>
            )) : <p className="nt-empty">You are all caught up.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function AccountMenu({ name, sub, onSwitchBack, impersonated }) {
  const { profile } = useStudentData();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  useEffect(() => {
    const close = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", esc); };
  }, []);
  const go = (to) => { setOpen(false); navigate(to); };
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("isImpersonated");
    navigate("/");
  };
  const wallet = Number(profile?.wallet?.balance ?? 0);
  return (
    <div ref={wrap} className="relative">
      <div className="flex items-center gap-3 cursor-pointer group rounded-xl px-2 py-1 hover:bg-gray-50" onClick={() => setOpen((o) => !o)} role="button" aria-haspopup="menu" aria-expanded={open} aria-label="My account">
        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-gray-900 leading-none group-hover:text-one">{name}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>
        </div>
        <span className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow shrink-0 bg-one">{initials(name)}</span>
      </div>
      {open && (
        <div className="s-menu" role="menu">
          <div className="px-3 py-2 mb-1 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-900 truncate">{name}</p>
            {profile?.email && <p className="text-[11px] text-slate-400 truncate">{profile.email}</p>}
          </div>
          <button role="menuitem" onClick={() => go("/user/wallet")}><Icon name="wallet" size={17} /> Wallet · <b>{wallet.toLocaleString("en-US")} EGP</b></button>
          <button role="menuitem" onClick={() => go("/user/mypurchases")}><Icon name="purchases" size={17} /> My purchases</button>
          <button role="menuitem" onClick={() => go("/user/reports/quizzes")}><Icon name="reports" size={17} /> My reports</button>
          <button role="menuitem" onClick={() => go("/user/availability-plans")}><Icon name="plans" size={17} /> Study plans</button>
          <button role="menuitem" onClick={() => go("/user/promo")}><Icon name="promo" size={17} /> Promo codes</button>
          <button role="menuitem" onClick={() => go("/user/profile")}><Icon name="user" size={17} /> My profile</button>
          {impersonated && <button role="menuitem" onClick={onSwitchBack}><Icon name="back" size={17} /> Switch back to admin</button>}
          <button role="menuitem" onClick={logout} className="!text-red-600"><Icon name="logout" size={17} /> Sign out</button>
        </div>
      )}
    </div>
  );
}

function Shell() {
  const { profile, nextSession, upcoming, homework, plansWaiting, toast: portalToast } = useStudentData();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [impersonated, setImpersonated] = useState(false);
  const [switching, setSwitching] = useState(false);

  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => { setImpersonated(localStorage.getItem("isImpersonated") === "true"); }, []);
  useEffect(() => { window.scrollTo(0, 0); setMoreOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!moreOpen) return undefined;
    const esc = (e) => e.key === "Escape" && setMoreOpen(false);
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [moreOpen]);

  const active = (SECTION_OF.find(([re]) => re.test(location.pathname)) || [null, ""])[1];
  const page = location.pathname.split("/")[2];
  const title = NAV.find((n) => n.key === active)?.label || TITLES[page] || "MathPortal";
  useEffect(() => { document.title = active === "home" ? "MathPortal Student" : `${title} — MathPortal`; }, [active, title]);

  const name = profile?.fullName || profile?.nickname || "Student";
  const sub = [profile?.category?.name, profile?.grade?.name].filter(Boolean).join(" · ") || "Student";
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = upcoming.filter((s) => s.iso === today && !s.cancelled).length;
  const notes = {
    upcoming: [todayCount, `${todayCount} session${todayCount === 1 ? "" : "s"} today`],
    homework: [homework.quizzes + homework.extra, `${homework.extra} extra H.W to submit · ${homework.quizzes} quiz${homework.quizzes === 1 ? "" : "zes"} to solve`],
    plans: [plansWaiting, `${plansWaiting} study plan${plansWaiting === 1 ? "" : "s"} waiting for your review`],
  };
  const liveLeft = Number(profile?.livebalance ?? 0);

  const toggleSide = () => setCollapsed((c) => {
    try { localStorage.setItem(SIDEBAR_KEY, c ? "open" : "collapsed"); } catch { /* storage blocked */ }
    return !c;
  });

  const handleSwitchBack = async () => {
    setSwitching(true);
    try {
      const res = await api.post("/api/admin/auth/switch-back");
      const adminToken = res?.data?.data?.token;
      if (!adminToken) throw new Error("No admin token returned from server");
      localStorage.setItem("token", adminToken);
      localStorage.removeItem("isImpersonated");
      toast.success("Switched back to admin");
      window.location.href = "https://admin.mathshouse.net/";
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Failed to switch back");
    } finally {
      setSwitching(false);
    }
  };

  // "More" sheet: every section not on the bottom bar, grouped like the sidebar, plus account pages.
  const mainKeys = MOBILE.map(([k]) => k);
  const hidden = [...NAV.filter((n) => !mainKeys.includes(n.key)), ...MORE_EXTRA];
  const moreGroups = [...new Set(hidden.map((n) => n.group || "General"))].map((g) => [g, hidden.filter((n) => (n.group || "General") === g)]);
  const moreActive = !mainKeys.includes(active) && (hidden.some((n) => n.key === active) || MORE_EXTRA.some((n) => n.key === page));
  const moreCount = hidden.reduce((sum, n) => sum + ((notes[n.key] || [0])[0] || 0), 0);

  let lastGroup = null;
  return (
    <div className={`s-shell min-h-screen bg-page text-slate-800 overflow-x-hidden ${collapsed ? "s-collapsed" : ""}`}>
      {/* Top bar */}
      {/* Left edge follows the sidebar (open 16rem / collapsed 4.75rem); right edge stays on the screen.
          Set with utilities: portal.css lives in the "components" layer, so it can't override w-full/left-0. */}
      <nav id="s-top" className={`h-16 bg-white/95 backdrop-blur border-b border-gray-200 fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 transition-[left] duration-200 ${collapsed ? "lg:left-[4.75rem]" : "lg:left-64"}`}>
        <div className="hidden lg:flex items-center gap-3 min-w-0 mr-auto">
          <button onClick={toggleSide} className="w-9 h-9 -ml-2 rounded-lg inline-flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 shrink-0" title={collapsed ? "Show sidebar" : "Hide sidebar"} aria-label="Toggle sidebar" aria-expanded={!collapsed}>
            <Icon name="menu" size={20} />
          </button>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 leading-tight truncate">{title}</h2>
            <p className="text-xs text-slate-400">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
          </div>
        </div>
        <button className="flex items-center gap-2 lg:hidden" onClick={() => navigate("/user/home")}>
          <img src="/favicon.svg" alt="MathPortal" className="w-8 h-8 rounded-lg" />
          <span className="text-lg font-bold text-slate-800 tracking-tight">Math<span className="text-one">Portal</span></span>
        </button>
        <div className="flex items-center gap-2 sm:gap-3">
          {impersonated && (
            <button onClick={handleSwitchBack} disabled={switching} className="hidden sm:flex items-center gap-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-60">
              <Icon name="back" size={15} /> {switching ? "Switching..." : "Switch back to admin"}
            </button>
          )}
          <NotificationBell />
          <AccountMenu name={name} sub={sub} impersonated={impersonated} onSwitchBack={handleSwitchBack} />
        </div>
      </nav>

      {/* Sidebar (desktop) */}
      <aside className="s-side" aria-label="Student navigation">
        <div className="s-side-head flex items-center gap-3 px-5 h-16 border-b border-slate-100 shrink-0">
          <img src="/favicon.svg" alt="MathPortal" className="w-9 h-9 rounded-lg shadow-sm" />
          <div className="s-hide-c leading-tight min-w-0">
            <div className="font-bold text-lg text-gray-900 tracking-tight whitespace-nowrap">Math<span className="text-one">Portal</span></div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Student portal</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {NAV.map((n) => {
            const head = n.group && n.group !== lastGroup ? <p key={`g-${n.group}`} className="s-group s-hide-c">{n.group}</p> : null;
            lastGroup = n.group;
            const [count, line] = notes[n.key] || [0, ""];
            return [
              head,
              <NavLink key={n.key} to={n.to} className="s-nav" title={count ? `${n.label} · ${line}` : n.label} aria-current={active === n.key ? "page" : undefined}>
                <Icon name={n.key} size={19} />
                <span className="s-lbl">{n.label}</span>
                {count > 0 && <span className="s-dot">{count > 99 ? "99+" : count}</span>}
              </NavLink>,
            ];
          })}
        </nav>
        <div className="s-hide-c p-3 border-t border-slate-100 shrink-0">
          {nextSession ? (
            <button onClick={() => navigate("/user/upcoming")} className="w-full text-left rounded-xl bg-red-50 border border-red-100 p-3 hover:border-one transition-colors">
              <p className="text-[10px] font-extrabold text-one uppercase tracking-widest mb-1">Next session</p>
              <p className="text-sm font-bold text-slate-900 truncate">{nextSession.topic}</p>
              <p className="text-xs text-slate-500">{relDay(nextSession.iso)} · {fmtTime(nextSession.start)}</p>
            </button>
          ) : (
            <button onClick={() => navigate("/user/availability-plans")} className="w-full text-left rounded-xl bg-slate-50 border border-slate-200 p-3 hover:border-one transition-colors">
              <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">No sessions booked</p>
              <p className="text-sm font-bold text-slate-900">Share your free times →</p>
            </button>
          )}
          <p className="text-[11px] text-slate-400 mt-2 px-1">{liveLeft} live session{liveLeft === 1 ? "" : "s"} left in your packages</p>
        </div>
      </aside>

      {/* Bottom bar (phones): main sections + "More" */}
      <nav className="s-mbar" aria-label="Student sections">
        {MOBILE.map(([key, label]) => {
          const n = NAV.find((x) => x.key === key);
          const count = (notes[key] || [0])[0];
          return (
            <NavLink key={key} to={n.to} className="s-mnav" aria-current={active === key ? "page" : undefined}>
              <Icon name={key} size={20} />
              <span>{label}</span>
              {count > 0 && <span className="s-mdot">{count > 99 ? "99+" : count}</span>}
            </NavLink>
          );
        })}
        <button type="button" onClick={() => setMoreOpen(true)} className="s-mnav" aria-haspopup="dialog" aria-expanded={moreOpen}
          aria-current={moreActive ? "page" : undefined}>
          <Icon name="more" size={20} />
          <span>More</span>
          {moreCount > 0 && <span className="s-mdot">{moreCount > 99 ? "99+" : moreCount}</span>}
        </button>
      </nav>

      {moreOpen && (
        <div className="s-sheet-wrap" onClick={() => setMoreOpen(false)}>
          <div className="s-sheet" role="dialog" aria-modal="true" aria-label="More sections" onClick={(e) => e.stopPropagation()}>
            <div className="s-sheet-grip" aria-hidden="true"></div>
            <div className="flex items-center justify-between px-5 pb-2">
              <p className="text-base font-bold text-slate-900">More</p>
              <button type="button" onClick={() => setMoreOpen(false)} className="w-9 h-9 rounded-full inline-flex items-center justify-center text-slate-500 hover:bg-slate-100" aria-label="Close">
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-3 pb-4">
              {moreGroups.map(([group, items]) => (
                <div key={group} className="mb-2">
                  <p className="s-group !pt-2">{group}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {items.map((n) => {
                      const count = (notes[n.key] || [0])[0];
                      const on = active === n.key || page === n.key;
                      return (
                        <NavLink key={n.key} to={n.to} onClick={() => setMoreOpen(false)} className={`s-sheet-item ${on ? "on" : ""}`}>
                          <Icon name={n.icon || n.key} size={20} />
                          <span>{n.label}</span>
                          {count > 0 && <span className="s-mdot">{count > 99 ? "99+" : count}</span>}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="pt-16 mx-auto">
        <Outlet />
      </main>

      {portalToast && (
        <div className="fixed bottom-20 lg:bottom-5 right-5 z-[99] toast-msg" role="status" aria-live="polite">{portalToast}</div>
      )}
      <Toaster position="top-center" reverseOrder={false} />
    </div>
  );
}

const AdminLayout = () => (
  <StudentDataProvider>
    <Shell />
  </StudentDataProvider>
);

export default AdminLayout;
