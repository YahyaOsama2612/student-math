import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import Icon from "@/components/portal/Icon";
import { Page } from "@/components/portal/ui";
import { AccessPill, AccessTile, Crumbs, ErrorCard, PlanPickerModal, SelectionCart, getDefaultPlan, money } from "@/pages/Payment/storeParts";

/* One chapter in the Store (design: chapterView) — its lessons; buy single lessons with a plan each,
   they collect in the cart and go to /user/enrollment together. */

/** Lesson item stored in the selection (same fields as before). */
const lessonItem = (lesson, plan) => ({
  lessonId: lesson.id,
  lessonName: lesson.name,
  planId: plan?.id || null,
  planLabel: plan?.durationLabel || "",
  price: plan ? parseFloat(plan.totalPriceEgp) : 0,
});

const OneChapter = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useGet(`/api/user/chapters/${id}`);

  const responseData = data?.data;
  const chapterInfo = responseData?.chapter;
  const lessons = responseData?.lessons || [];

  // selected lessons with the plan picked for each one
  const [selectedLessons, setSelectedLessons] = useState([]);
  const [picking, setPicking] = useState(null);

  const upsert = (lesson, plan) => {
    if (lesson.isLocked === false) return; // already open — can't be bought again
    setSelectedLessons((prev) =>
      prev.some((l) => l.lessonId === lesson.id)
        ? prev.map((l) => (l.lessonId === lesson.id ? lessonItem(lesson, plan) : l))
        : [...prev, lessonItem(lesson, plan)],
    );
  };
  const remove = (lessonId) => setSelectedLessons((prev) => prev.filter((l) => l.lessonId !== lessonId));

  const totalPrice = selectedLessons.reduce((sum, item) => sum + item.price, 0);

  // default plan of the whole chapter, shown in the header
  const defaultPlan = chapterInfo?.pricePlans?.find((p) => p.isDefault) || chapterInfo?.pricePlans?.[0];
  const chapterPrice = defaultPlan ? parseFloat(defaultPlan.totalPriceEgp) : 0;

  const handleBuy = () => {
    if (selectedLessons.length === 0) return;
    navigate("/user/enrollment", {
      state: {
        type: "lessonIds",
        selectedItems: selectedLessons,
        ids: selectedLessons.map((l) => l.lessonId),
        price: totalPrice,
        name: selectedLessons.length === 1 ? selectedLessons[0].lessonName : `${selectedLessons.length} Lessons`,
      },
    });
  };

  if (loading || (!data && !error)) {
    return (
      <Page>
        <div className="skel h-5 w-56 mb-5"></div>
        <div className="skel h-32 mb-6"></div>
        <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <div key={i} className="skel h-20"></div>)}</div>
      </Page>
    );
  }
  if (error || !chapterInfo) return <Page><ErrorCard text="Could not load this chapter." /></Page>;

  const course = responseData?.course;
  const chapterOpen = chapterInfo.isLocked === false;

  return (
    <Page>
      <div className={selectedLessons.length ? "pb-24" : ""}>
        <Crumbs
          parts={[
            { label: "Store", to: "/user/payment" },
            ...(course?.id ? [{ label: course.name, to: `/user/chapters/${course.id}` }] : []),
            { label: `Chapter ${chapterInfo.order}` },
          ]}
        />

        {/* Header */}
        <section className="card p-6 mb-6 flex flex-col md:flex-row md:items-center gap-5">
          <AccessTile open={chapterOpen} size="w-16 h-16" iconSize={26} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-extrabold text-one uppercase tracking-wider">{course?.name ? `${course.name} · ` : ""}Chapter {chapterInfo.order}</p>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-extrabold text-gray-900">{chapterInfo.name}</h3>
              {chapterInfo.isLocked != null && <AccessPill open={chapterOpen} />}
            </div>
            <p className="text-xs font-bold text-slate-400 mt-1">
              {lessons.length} lesson{lessons.length === 1 ? "" : "s"}
              {defaultPlan ? ` · Full chapter ${money(chapterPrice)}` : ""}
            </p>
          </div>
        </section>

        <h4 className="font-extrabold text-gray-900 mb-3">
          Lessons {!chapterOpen && <span className="text-sm font-semibold text-slate-400">— buy single lessons, or open one to see it</span>}
        </h4>

        {!lessons.length ? (
          <section className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
            <p className="text-lg font-extrabold text-gray-900 mb-1">No lessons yet</p>
            <p className="text-sm text-slate-500">This chapter has no lessons to show.</p>
          </section>
        ) : (
          <div className="flex flex-col gap-3">
            {lessons.map((lesson, index) => {
              const inCart = selectedLessons.find((l) => l.lessonId === lesson.id);
              const isUnlocked = lesson.isLocked === false;
              const plans = lesson.pricePlans || [];
              const currentPlan = inCart ? plans.find((p) => p.id === inCart.planId) : getDefaultPlan(plans);
              return (
                <div key={lesson.id} className={`card p-4 flex flex-col md:flex-row md:items-center gap-4 ${inCart ? "ring-2 ring-[#7d0a0a]" : ""}`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <AccessTile open={isUnlocked} size="w-11 h-11" iconSize={18} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-extrabold text-slate-400 uppercase">Lesson {index + 1}</p>
                      <p className="font-extrabold text-gray-900 truncate">{lesson.name}</p>
                      <p className={`text-xs ${isUnlocked ? "text-green-600 font-semibold" : "text-slate-400"}`}>
                        {isUnlocked ? "Unlocked" : currentPlan ? currentPlan.durationLabel : "Included in chapter"}
                      </p>
                    </div>
                  </div>
                  <div className="md:w-28 md:text-right">
                    {isUnlocked ? <AccessPill open /> : currentPlan ? (
                      <>
                        <p className="font-extrabold text-gray-900">{money(currentPlan.totalPriceEgp)}</p>
                        {currentPlan.hasDiscount && currentPlan.priceEgp && <p className="text-xs text-slate-400 line-through">{money(currentPlan.priceEgp)}</p>}
                      </>
                    ) : <p className="text-sm font-bold text-slate-400">—</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:w-72">
                    {isUnlocked ? (
                      <button className="btn-mini ok" disabled>Owned ✓</button>
                    ) : !plans.length ? (
                      <button className="btn-mini" disabled style={{ opacity: 0.55 }}>Chapter only</button>
                    ) : (
                      <button className="btn-mini primary" onClick={() => setPicking(lesson)}>{inCart ? "In cart ✓" : "Buy lesson"}</button>
                    )}
                    <button className="btn-mini" onClick={() => navigate(`/user/lesson/${lesson.id}`)}>{isUnlocked ? "Open lesson →" : "View lesson →"}</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {picking && (
        <PlanPickerModal
          title={picking.name}
          plans={picking.pricePlans || []}
          currentPlanId={selectedLessons.find((l) => l.lessonId === picking.id)?.planId}
          inCart={selectedLessons.some((l) => l.lessonId === picking.id)}
          onClose={() => setPicking(null)}
          onAdd={(plan) => upsert(picking, plan)}
          onRemove={() => remove(picking.id)}
        />
      )}

      <SelectionCart
        items={selectedLessons.map((l) => ({ key: l.lessonId, kind: "lesson", name: l.lessonName, sub: l.planLabel, price: l.price }))}
        total={totalPrice}
        onRemove={remove}
        onClear={() => setSelectedLessons([])}
        onCheckout={handleBuy}
      />
    </Page>
  );
};

export default OneChapter;
