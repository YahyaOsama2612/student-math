import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import Icon from "@/components/portal/Icon";
import { Page, TeacherAvatar } from "@/components/portal/ui";
import { AccessPill, AccessTile, Crumbs, ErrorCard, PlanCards, money } from "@/pages/Payment/storeParts";

/* One course in the Store (design: courseView) — pick an access plan and buy, or open its chapters. */
const OneCourses = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, loading, error } = useGet(`/api/user/courses/${id}`);
  const course = data?.data;

  // the price plan the student picked
  const [selectedPlan, setSelectedPlan] = useState(null);

  // start on the default plan once the course loads
  useEffect(() => {
    if (course?.pricePlans && course.pricePlans.length > 0) {
      const defaultPlan = course.pricePlans.find((plan) => plan.isDefault) || course.pricePlans[0];
      setSelectedPlan(defaultPlan);
    }
  }, [course]);

  if (loading || (!data && !error)) {
    return (
      <Page>
        <div className="skel h-5 w-48 mb-5"></div>
        <div className="skel h-36 mb-6"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="skel h-64 lg:col-span-2"></div><div className="skel h-64"></div></div>
      </Page>
    );
  }
  if (error || !course) {
    return <Page><ErrorCard text="Could not load this course." /></Page>;
  }

  // the student owns the course when it is not locked
  const isPurchased = !course.isLocked;

  const handleProceedToBuy = () => {
    if (!selectedPlan) return;
    navigate("/user/enrollment", {
      state: {
        type: "courseId",
        selectedItems: [
          {
            courseId: course.id,
            courseName: course.name,
            planId: selectedPlan.id,
            planLabel: selectedPlan.durationLabel,
            price: parseFloat(selectedPlan.totalPriceEgp),
          },
        ],
        ids: [course.id],
        price: parseFloat(selectedPlan.totalPriceEgp),
        name: course.name,
      },
    });
  };

  const box = (title, children, tone = "") => (
    <section className="rp-card">
      <h4 className={`text-xs font-extrabold uppercase tracking-wider mb-3 ${tone || "text-slate-400"}`}>{title}</h4>
      {children}
    </section>
  );

  return (
    <Page>
      <Crumbs parts={[{ label: "Store", to: "/user/payment" }, { label: course.name }]} />

      {/* Header */}
      <section className="card p-6 mb-6 flex flex-col md:flex-row md:items-center gap-5">
        {course.image ? (
          <img src={course.image} alt="" className="w-full md:w-40 aspect-video md:aspect-square rounded-xl object-cover border border-slate-100 shrink-0" />
        ) : (
          <AccessTile open={isPurchased} size="w-16 h-16" iconSize={26} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-2xl font-extrabold text-gray-900">{course.name}</h3>
            <AccessPill open={isPurchased} />
          </div>
          <p className="text-sm text-gray-600">{course.description || "No description provided for this course yet."}</p>
          {course.pricePlans?.length > 0 && !isPurchased && (
            <p className="text-xs font-bold text-slate-400 mt-1">{course.pricePlans.length} access plan{course.pricePlans.length === 1 ? "" : "s"}</p>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {!isPurchased && course.pricePlans?.length > 0 && box(
            "Choose your access",
            <>
              <p className="text-sm text-slate-500 mb-3">Content is unlocked for the time you choose.</p>
              <PlanCards plans={course.pricePlans} value={selectedPlan?.id} onPick={setSelectedPlan} />
            </>,
          )}

          {course.whatYouGain && box("What you'll gain", <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{course.whatYouGain}</p>)}

          {course.preRequisition && box(
            "Prerequisites",
            <p className="text-sm text-amber-900 leading-relaxed bg-amber-50 border border-amber-100 rounded-xl p-3 whitespace-pre-line">{course.preRequisition}</p>,
            "text-amber-600",
          )}

          {course.isHaveSemester && course.semesters?.length > 0 && box(
            "Course semesters",
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {course.semesters.map((sem) => (
                <div key={sem.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white">
                  <span className="w-9 h-9 rounded-lg bg-[#FDECEC] text-one flex items-center justify-center font-extrabold text-sm shrink-0">{sem.name.charAt(sem.name.length - 1)}</span>
                  <span className="text-sm font-bold text-gray-900">{sem.name}</span>
                </div>
              ))}
            </div>,
          )}
        </div>

        {/* Price + actions */}
        <aside>
          <section className="card p-6 lg:sticky lg:top-24">
            <p className="text-[11px] font-bold text-slate-400 uppercase">{isPurchased ? "Course status" : "Selected plan"}</p>
            {isPurchased ? (
              <p className="text-2xl font-extrabold text-green-600 mb-1">Owned & unlocked</p>
            ) : selectedPlan ? (
              <div className="mb-1">
                <p className="text-3xl font-extrabold text-gray-900">{money(selectedPlan.totalPriceEgp)}</p>
                {selectedPlan.hasDiscount && <p className="text-sm text-slate-400 line-through">{money(selectedPlan.priceEgp)}</p>}
                <p className="text-xs text-slate-500 mt-1">Valid for {selectedPlan.durationLabel}</p>
              </div>
            ) : (
              <p className="text-2xl font-extrabold text-gray-900 mb-1">N/A</p>
            )}

            <div className="border-t border-slate-100 my-4"></div>
            <div className="space-y-3 text-sm mb-5">
              <div className="flex items-center gap-2 text-slate-600">
                <Icon name="clock" size={16} className="text-one" />
                <span>Duration: <b className="text-gray-900">{selectedPlan ? selectedPlan.durationLabel : "Self-paced"}</b></span>
              </div>
              {course.teachers?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase mb-2">Instructors</p>
                  <div className="space-y-2">
                    {course.teachers.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <TeacherAvatar name={t.name} />
                        <span className="text-sm font-bold text-gray-900">{t.name}</span>
                        {t.role && <span className="text-xs text-slate-400">{t.role}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {isPurchased ? (
                <button className="btn-primary" onClick={() => navigate(`/user/chapters/${course.id}`)}>
                  <Icon name="book" size={16} /> Open course chapters
                </button>
              ) : (
                <>
                  <button className="btn-primary" onClick={handleProceedToBuy} disabled={!selectedPlan} style={!selectedPlan ? { opacity: 0.55 } : undefined}>
                    <Icon name="store" size={16} /> {selectedPlan ? `Buy now · ${money(selectedPlan.totalPriceEgp)}` : "Buy now"}
                  </button>
                  <button className="btn-light" onClick={() => navigate(`/user/chapters/${course.id}`)}><span>See chapters & lessons</span></button>
                </>
              )}
            </div>
          </section>
        </aside>
      </div>
    </Page>
  );
};

export default OneCourses;
