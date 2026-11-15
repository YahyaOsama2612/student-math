import { useState, Component } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import Icon from "@/components/portal/Icon";
import { Page, PageHead } from "@/components/portal/ui";
import { Crumbs, ErrorCard, PlanPickerModal, SelectionCart, SkelGrid, getDefaultPlan, money } from "@/pages/Payment/storeParts";

/* Chapters of a course in the Store (design: courseView chapter cards). Buy chapters with a plan each;
   they collect in the cart and go to /user/enrollment together. */

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Page>
          <section className="rp-card text-center py-10">
            <p className="font-extrabold text-gray-900 mb-1">Could not show the chapters</p>
            <p className="text-sm text-slate-500 mb-4">{this.state.error?.message || "Something unexpected happened."}</p>
            <button onClick={() => window.location.reload()} className="pl-btn primary">Reload the page</button>
          </section>
        </Page>
      );
    }
    return this.props.children;
  }
}

/** Chapter item stored in the selection (same fields as before). */
const chapterItem = (item, plan) => ({
  chapterId: item.chapter.id,
  chapterName: item.chapter.name || "Unnamed Chapter",
  planId: plan?.id || null,
  planLabel: plan?.durationLabel || "",
  price: plan ? parseFloat(plan.totalPriceEgp) : 0,
  rawItem: item,
});

const Chapters = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useGet(`/api/user/chapters/course/${id}`);

  // drop null / incomplete rows
  const chapters = (data?.data?.chapters || []).filter((item) => item && item.chapter && item.chapter.id && item.chapter.name);
  const courseName = chapters[0]?.course?.name;

  // selected chapters with the plan picked for each one
  const [selectedChapters, setSelectedChapters] = useState([]);
  const [picking, setPicking] = useState(null);

  const upsert = (item, plan) =>
    setSelectedChapters((prev) =>
      prev.some((c) => c.chapterId === item.chapter.id)
        ? prev.map((c) => (c.chapterId === item.chapter.id ? chapterItem(item, plan) : c))
        : [...prev, chapterItem(item, plan)],
    );
  const remove = (chapterId) => setSelectedChapters((prev) => prev.filter((c) => c.chapterId !== chapterId));

  const totalPrice = selectedChapters.reduce((sum, item) => sum + item.price, 0);

  const handleBuy = () => {
    if (selectedChapters.length === 0) return;
    navigate("/user/enrollment", {
      state: {
        type: "chapterIds",
        selectedItems: selectedChapters,
        ids: selectedChapters.map((c) => c.chapterId),
        price: totalPrice,
        name: selectedChapters.length === 1 ? selectedChapters[0].chapterName : `${selectedChapters.length} Chapters`,
      },
    });
  };

  return (
    <Page>
      <div className={selectedChapters.length ? "pb-24" : ""}>
        <Crumbs parts={[{ label: "Store", to: "/user/payment" }, { label: courseName || "Course", to: `/user/courses/${id}` }, { label: "Chapters" }]} />
        <PageHead title="Chapters" text={`${courseName ? `${courseName} — ` : ""}buy one chapter, or open it to buy single lessons.`} />

        {loading || (!data && !error) ? <SkelGrid n={4} h="h-40" cols="md:grid-cols-2" /> : error ? <ErrorCard text="Could not load the chapters." /> : !chapters.length ? (
          <section className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
            <p className="text-lg font-extrabold text-gray-900 mb-1">No chapters yet</p>
            <p className="text-sm text-slate-500">This course has no chapters to show.</p>
          </section>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chapters.map((item) => {
              if (!item?.chapter) return null;
              const inCart = selectedChapters.find((c) => c.chapterId === item.chapter.id);
              const pricePlans = item.chapter?.pricePlans || [];
              const currentPlan = inCart ? pricePlans.find((p) => p?.id === inCart.planId) : getDefaultPlan(pricePlans);
              const meta = [item?.teacher?.name, item?.semester?.name].filter(Boolean).join(" · ");
              return (
                <div key={item.chapter.id} className={`card p-5 flex flex-col gap-3 ${inCart ? "ring-2 ring-[#7d0a0a]" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#FDECEC] text-one flex items-center justify-center shrink-0"><Icon name="book" size={18} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-extrabold text-one uppercase tracking-wider">Chapter {item.chapter.order}</p>
                      <p className="font-extrabold text-gray-900">{item.chapter.name}</p>
                      {meta && <p className="text-xs text-slate-400">{meta}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-gray-900 whitespace-nowrap">{currentPlan ? money(currentPlan.totalPriceEgp || 0) : "N/A"}</p>
                      {currentPlan?.hasDiscount && currentPlan.priceEgp && <p className="text-xs text-slate-400 line-through">{money(currentPlan.priceEgp)}</p>}
                      {currentPlan?.durationLabel && <p className="text-[11px] text-slate-400">{currentPlan.durationLabel}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    {!pricePlans.length ? (
                      <button className="btn-mini" disabled style={{ opacity: 0.55 }}>No price plans</button>
                    ) : inCart ? (
                      <button className="btn-mini primary" onClick={() => setPicking(item)}>In cart ✓</button>
                    ) : (
                      <button className="btn-mini primary" onClick={() => setPicking(item)}>Buy chapter</button>
                    )}
                    <button className="btn-mini" onClick={() => navigate(`/user/chapter/${item.chapter.id}`)}>Open lessons →</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {picking && (
        <PlanPickerModal
          title={picking.chapter.name}
          plans={(picking.chapter.pricePlans || []).filter((p) => p?.id)}
          currentPlanId={selectedChapters.find((c) => c.chapterId === picking.chapter.id)?.planId}
          inCart={selectedChapters.some((c) => c.chapterId === picking.chapter.id)}
          onClose={() => setPicking(null)}
          onAdd={(plan) => upsert(picking, plan)}
          onRemove={() => remove(picking.chapter.id)}
        />
      )}

      <SelectionCart
        items={selectedChapters.map((c) => ({ key: c.chapterId, kind: "chapter", name: c.chapterName, sub: c.planLabel, price: c.price }))}
        total={totalPrice}
        onRemove={remove}
        onClear={() => setSelectedChapters([])}
        onCheckout={handleBuy}
      />
    </Page>
  );
};

export default function ChaptersWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <Chapters />
    </ErrorBoundary>
  );
}
