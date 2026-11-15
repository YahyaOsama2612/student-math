import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStudentData } from "@/context/StudentData";
import { fmtDay } from "@/lib/portal";
import Icon from "@/components/portal/Icon";
import { EmptyCard, Page, PageHead, TypeDot } from "@/components/portal/ui";

/** Notes, PDFs and videos from the student's own sessions — by course and chapter. */
export default function ClassMaterials() {
  const { history, loading, ratingFor } = useStudentData();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [closed, setClosed] = useState({});
  const list = history || [];
  const courses = useMemo(() => [...new Set(list.map((s) => s.course || "Other sessions"))], [list]);
  const current = courses.includes(course) ? course : courses[0];
  const mine = list.filter((s) => (s.course || "Other sessions") === current);
  const groups = [...new Set(mine.map((s) => s.lessons[0]?.chapter?.name || "Reviews & evaluations"))].map((name) => ({
    name,
    items: mine.filter((s) => (s.lessons[0]?.chapter?.name || "Reviews & evaluations") === name).sort((a, b) => a.iso.localeCompare(b.iso)),
  }));

  return (
    <Page>
      <PageHead title="Class materials" text="Notes, PDFs, videos and quizzes from your live sessions — by course, chapter and lesson. Rate a session to open its materials." />
      {loading ? <div className="skel h-64"></div> : courses.length ? (
        <>
          <div className="flex flex-wrap gap-2 mb-5">
            {courses.map((c) => (
              <button key={c} onClick={() => setCourse(c)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold border ${current === c ? "bg-one text-white border-one" : "bg-white text-slate-600 border-slate-200 hover:border-one hover:text-one"}`}>{c}</button>
            ))}
          </div>
          <div className="space-y-3">
            {groups.map((g) => {
              const key = `${current}|${g.name}`;
              const open = !closed[key];
              return (
                <section key={key} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <button onClick={() => setClosed((c) => ({ ...c, [key]: open }))} className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-slate-50">
                    <span><span className="block text-[11px] font-extrabold uppercase tracking-wider text-one">{current}</span><span className="block font-bold text-slate-900">{g.name}</span></span>
                    <span className="text-xs font-bold text-slate-400 shrink-0">{g.items.length} session{g.items.length === 1 ? "" : "s"} {open ? "▲" : "▼"}</span>
                  </button>
                  {open && (
                    <div className="border-t border-slate-100 divide-y divide-slate-100">
                      {g.items.map((s) => {
                        const attended = s.attendance === "present";
                        const lock = !attended || !ratingFor(s.id);
                        const state = !attended ? "Opens after you attend" : lock ? "Rate to open" : "Open";
                        return (
                          <button key={s.id} onClick={() => navigate(`/user/session/${s.id}`, { state: { from: "materials" } })} className="w-full flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-1 px-5 py-3 text-left hover:bg-slate-50">
                            <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${lock ? "bg-red-50 text-one" : "bg-green-50 text-green-600"}`}><Icon name={lock ? "lock" : "unlock"} size={17} /></span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-bold text-slate-900 truncate">{s.topic}</span>
                              <span className="block text-xs text-slate-500 truncate"><TypeDot type={s.type} />{s.type} · {fmtDay(s.iso)} · {s.teacher}</span>
                            </span>
                            <span className={`text-[11px] font-bold shrink-0 ${lock ? "text-one" : "text-green-700"}`}>{state}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      ) : (
        <EmptyCard title="No class materials yet" text="They appear here after your first live session." />
      )}
    </Page>
  );
}
