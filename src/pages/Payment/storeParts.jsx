// Shared pieces of the Store (MathPortal design): prices, lock tiles, plan picker,
// the cart-style selection bar/drawer and the course catalog grid.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/portal/Icon";
import { Modal } from "@/components/portal/ui";

/** 1200 → "1,200 EGP" */
export const money = (n) => `${(Number(n) || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} EGP`;

export const getDefaultPlan = (plans) => {
  if (!plans || plans.length === 0) return null;
  return plans.find((plan) => plan.isDefault) || plans[0];
};

/** Cheapest plan price (for "from X"). */
export const fromPrice = (plans) => {
  const list = (plans || []).map((p) => parseFloat(p?.totalPriceEgp)).filter((v) => !Number.isNaN(v));
  return list.length ? Math.min(...list) : null;
};

export const KIND_LABEL = { course: "Course", chapter: "Chapter", lesson: "Lesson", sessions: "Sessions", exams: "Exams", questions: "Questions", package: "Package" };

/** Lock / unlocked tile (design: accessTile). */
export const AccessTile = ({ open, size = "w-12 h-12", iconSize = 20 }) => (
  <div className={`${size} rounded-xl ${open ? "bg-green-50 text-green-600" : "bg-[#FDECEC] text-one"} flex items-center justify-center shrink-0`} title={open ? "Unlocked" : "Locked"}>
    <Icon name={open ? "unlock" : "lock"} size={iconSize} />
  </div>
);

/** UNLOCKED / LOCKED pill (design: accessPill). */
export const AccessPill = ({ open }) =>
  open ? <span className="pill bg-green-100 text-green-700">UNLOCKED</span> : <span className="pill bg-slate-100 text-slate-500">LOCKED</span>;

/** Breadcrumbs (design: crumbs). parts = [{ label, to? }] — the last one is the current page. */
export function Crumbs({ parts }) {
  const navigate = useNavigate();
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-sm mb-5" aria-label="Breadcrumb">
      {parts.map((p, i) =>
        i < parts.length - 1 ? (
          <span key={i} className="flex items-center gap-1.5">
            <button onClick={() => (p.to === -1 ? navigate(-1) : navigate(p.to))} className="font-semibold text-slate-500 hover:text-one py-1.5">{p.label}</button>
            <span className="text-slate-300">/</span>
          </span>
        ) : (
          <span key={i} className="font-extrabold text-gray-900 truncate max-w-full">{p.label}</span>
        ),
      )}
    </nav>
  );
}

/** Price plan cards (design: planPicker body). */
export function PlanCards({ plans, value, onPick }) {
  const cols = Math.min(3, plans.length) || 1;
  return (
    <div className={`grid grid-cols-1 ${cols >= 2 ? "sm:grid-cols-2" : ""} ${cols >= 3 ? "lg:grid-cols-3" : ""} gap-3`}>
      {plans.map((p) => {
        const on = value === p.id;
        const price = parseFloat(p.totalPriceEgp);
        const days = Number(p.durationDays) || 0;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p)}
            aria-pressed={on}
            className={`text-left rounded-2xl border p-4 transition ${on ? "border-one ring-2 ring-[#7d0a0a] bg-red-50/40" : "border-slate-200 hover:border-slate-400 bg-white"}`}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 truncate">{p.durationLabel || "Plan"}</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{money(price)}</p>
            {p.hasDiscount && p.priceEgp && <p className="text-xs text-slate-400 line-through">{money(p.priceEgp)}</p>}
            {days > 0 && <p className="text-xs text-slate-500">{days} days of access · {money(price / days)} / day</p>}
          </button>
        );
      })}
    </div>
  );
}

/** "Choose your access" dialog → adds the item to the selection with the picked plan. */
export function PlanPickerModal({ title, plans, currentPlanId, inCart, onClose, onAdd, onRemove }) {
  const [pick, setPick] = useState(currentPlanId || getDefaultPlan(plans)?.id || null);
  const chosen = plans.find((p) => p.id === pick);
  return (
    <Modal
      wide
      title={`Choose your access — ${title}`}
      onClose={onClose}
      actions={<>
        <button className="pl-btn" onClick={onClose}>Cancel</button>
        {inCart && <button className="pl-btn" onClick={() => { onRemove(); onClose(); }}>Remove from cart</button>}
        {plans.length > 0 && (
          <button className="pl-btn primary" disabled={!chosen} onClick={() => { onAdd(chosen); onClose(); }}>
            {inCart ? "Update cart" : "Add to cart"}
          </button>
        )}
      </>}
    >
      <p className="mb-3">Content is unlocked for the time you choose.</p>
      {plans.length ? <PlanCards plans={plans} value={pick} onPick={(p) => setPick(p.id)} /> : <p className="text-sm text-slate-500">No plans are set for this item yet.</p>}
    </Modal>
  );
}

/**
 * Cart-style selection (design: cart badge + drawer). items = [{ key, kind, name, sub, price }].
 * Shows a sticky bar while something is selected; "View" opens the drawer.
 */
export function SelectionCart({ items, total, onRemove, onClear, onCheckout }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  const n = items.length;
  return (
    <>
      <div className="fixed z-40 left-4 right-4 bottom-[76px] lg:bottom-6 sm:left-auto sm:right-6 sm:w-[26rem] bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 flex items-center gap-3 fade-in" role="region" aria-label="Your selection">
        <button onClick={() => setOpen(true)} className="relative w-11 h-11 rounded-xl bg-[#FDECEC] text-one flex items-center justify-center shrink-0" aria-label="View your cart">
          <Icon name="store" size={20} />
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-one text-white text-[10px] font-extrabold flex items-center justify-center">{n}</span>
        </button>
        <button onClick={() => setOpen(true)} className="min-w-0 flex-1 text-left">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{n} item{n === 1 ? "" : "s"} · view cart</p>
          <p className="text-lg font-extrabold text-gray-900 leading-tight">{money(total)}</p>
        </button>
        <button onClick={onCheckout} className="btn-mini primary shrink-0 !px-4 !py-2.5">Checkout</button>
      </div>

      {open && (
        <div className="modal-bg" style={{ justifyContent: "flex-end", padding: 0 }} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <aside className="drawer bg-white h-full w-full max-w-md shadow-2xl flex flex-col" role="dialog" aria-modal="true" aria-label="Your cart">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <p className="text-lg font-extrabold text-gray-900">Your cart</p>
                <p className="text-xs text-slate-400">{n} item{n === 1 ? "" : "s"} · prices in EGP</p>
              </div>
              <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:text-one" aria-label="Close cart">
                <Icon name="x" size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {items.map((i) => (
                <div key={i.key} className="flex gap-3 items-start border border-slate-100 rounded-xl p-3">
                  <span className={`kind-pill kind-${i.kind}`}>{KIND_LABEL[i.kind] || i.kind}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900">{i.name}</p>
                    {i.sub && <p className="text-xs text-slate-400">{i.sub}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-gray-900">{money(i.price)}</p>
                    <button onClick={() => { onRemove(i.key); if (n === 1) setOpen(false); }} className="text-[11px] font-bold text-slate-400 hover:text-red-600">Remove</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 px-6 py-5">
              <div className="flex justify-between text-sm mb-4">
                <span className="text-slate-500 font-semibold">Subtotal</span>
                <span className="font-extrabold text-gray-900 text-lg">{money(total)}</span>
              </div>
              <button className="btn-primary !w-full" onClick={() => { setOpen(false); onCheckout(); }}>Checkout</button>
              <button className="w-full text-center text-xs font-bold text-slate-400 hover:text-red-600 mt-3" onClick={() => { onClear(); setOpen(false); }}>Clear selection</button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

/* ---------- Checkout pieces (course checkout page + package checkout dialog) ---------- */

/** Payment method cards (design: pay-opt). */
export function PayMethods({ methods, selected, onSelect, group = "pay" }) {
  if (!methods.length) return <p className="text-sm text-red-600">No payment method is enabled yet.</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {methods.map((m) => {
        const on = selected?.id === m.id;
        return (
          <label key={m.id} className={`pay-opt ${on ? "active" : ""}`}>
            <input type="radio" name={group} className="accent-[#7d0a0a]" checked={on} onChange={() => onSelect(m)} />
            {m.logo && <img src={m.logo} alt="" className="w-9 h-9 rounded-lg object-contain border border-slate-100 bg-white shrink-0" />}
            <span className="min-w-0">
              <span className="block font-extrabold text-sm text-gray-900">{m.name}</span>
              <span className="block text-xs text-slate-400">{m.type === "Automatic" ? "Instant payment" : m.type === "Manual" ? "Transfer + screenshot" : m.type}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

/** Payment screenshot picker (design: proof upload). `value` is the base64 image. */
export function ReceiptUpload({ value, fileName, methodName, onPick, onRemove }) {
  return value ? (
    <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-white p-2.5">
      <img src={value} alt="Payment screenshot" className="w-16 h-16 rounded-lg object-cover border border-slate-200 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900 truncate">{fileName || "Payment screenshot"}</p>
        <p className="text-xs text-green-700 font-semibold">✓ Attached — the admin checks it before unlocking</p>
      </div>
      <label className="text-xs font-bold text-slate-400 hover:text-one px-2 py-1 cursor-pointer">
        Change
        <input type="file" accept="image/*" className="sr-only" onChange={onPick} />
      </label>
      {onRemove && <button type="button" onClick={onRemove} className="text-xs font-bold text-slate-400 hover:text-red-600 px-2 py-1">Remove</button>}
    </div>
  ) : (
    <label className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-5 text-center cursor-pointer hover:border-one">
      <span className="text-one"><Icon name="pdf" size={22} /></span>
      <span className="text-sm font-bold text-slate-800">Upload the screenshot of your {methodName || ""} transfer</span>
      <span className="text-xs text-slate-400">PNG or JPG · it must show the amount</span>
      <input type="file" accept="image/*" className="sr-only" onChange={onPick} />
    </label>
  );
}

/** Promo code box (design: order summary promo row). */
export function PromoBox({ code, setCode, applied, error, validating, onApply, onRemove }) {
  if (applied) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 mb-4">
        <p className="text-xs font-bold text-green-700">{applied.code} applied — {applied.discountAmount}% off</p>
        <button type="button" onClick={onRemove} className="text-green-700 hover:text-red-600" title="Remove promo code" aria-label="Remove promo code"><Icon name="x" size={14} /></button>
      </div>
    );
  }
  return (
    <div className="mb-4">
      <div className="flex gap-2">
        <input className="input font-mono tracking-wide" placeholder="Promo code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <button type="button" className="btn-ghost shrink-0" onClick={onApply} disabled={validating || !code.trim()} style={validating || !code.trim() ? { opacity: 0.55 } : undefined}>
          {validating ? "Checking…" : "Apply"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}

/** Skeleton grid while a list loads. */
export const SkelGrid = ({ n = 3, h = "h-64", cols = "md:grid-cols-2 lg:grid-cols-3" }) => (
  <div className={`grid grid-cols-1 ${cols} gap-6`}>
    {Array.from({ length: n }).map((_, i) => <div key={i} className={`skel ${h}`}></div>)}
  </div>
);

/** Short error message in an rp-card. */
export const ErrorCard = ({ text = "Could not load this page. Please try again." }) => (
  <section className="rp-card text-center py-10">
    <p className="font-extrabold text-gray-900 mb-1">Something went wrong</p>
    <p className="text-sm text-slate-500">{text}</p>
  </section>
);

/* ---------- Course catalog (Store → Courses, and /user/mycourses) ---------- */

/** Builds the /user/enrollment state for the selected courses (unchanged shape). */
export const courseCheckoutState = (selectedCourses) => ({
  type: "courseId",
  selectedItems: selectedCourses,
  ids: selectedCourses.map((c) => c.courseId),
  price: selectedCourses.reduce((sum, item) => sum + item.price, 0),
  name: selectedCourses.length === 1 ? selectedCourses[0].courseName : `${selectedCourses.length} Courses`,
});

/** Course item stored in the selection (same fields the old buy mode stored). */
export const courseItem = (course, plan) => ({
  courseId: course.id,
  courseName: course.name,
  planId: plan?.id || null,
  planLabel: plan?.durationLabel || "",
  price: plan ? parseFloat(plan.totalPriceEgp) : 0,
});

/** Grid of course cards with plan picker + cart. Selection state lives in the page. */
export function CourseCatalog({ courses, selected, setSelected }) {
  const navigate = useNavigate();
  const [picking, setPicking] = useState(null);

  const upsert = (course, plan) =>
    setSelected((prev) =>
      prev.some((i) => i.courseId === course.id)
        ? prev.map((i) => (i.courseId === course.id ? courseItem(course, plan) : i))
        : [...prev, courseItem(course, plan)],
    );
  const remove = (courseId) => setSelected((prev) => prev.filter((i) => i.courseId !== courseId));

  if (!courses.length) {
    return (
      <section className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
        <p className="text-lg font-extrabold text-gray-900 mb-1">No courses yet</p>
        <p className="text-sm text-slate-500">Courses for your grade show up here.</p>
      </section>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {courses.map((course) => {
          const plans = course.pricePlans || [];
          const inCart = selected.find((c) => c.courseId === course.id);
          const owned = course.isPurchased;
          const shown = inCart ? plans.find((p) => p.id === inCart.planId) : getDefaultPlan(plans);
          const from = fromPrice(plans);
          return (
            <section key={course.id} className={`card p-6 flex flex-col gap-4 ${inCart ? "ring-2 ring-[#7d0a0a]" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <AccessTile open={owned} />
                {inCart ? <span className="pill bg-one text-white">IN CART</span> : <AccessPill open={owned} />}
              </div>
              <div>
                {course.category && <p className="text-[11px] font-extrabold text-one uppercase tracking-wider">{course.category}</p>}
                <h3 className="text-xl font-extrabold tracking-tight text-gray-900">{course.name}</h3>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                <span>{course.numberOfChapters} chapters</span>
                {plans.length > 0 && <><span>·</span><span>{plans.length} access plan{plans.length === 1 ? "" : "s"}</span></>}
              </div>
              <div className="flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400 uppercase truncate">{owned ? "Your course" : shown?.durationLabel || "Full course"}</p>
                  {owned ? (
                    <p className="text-2xl font-extrabold text-green-600">Owned</p>
                  ) : shown ? (
                    <p className="text-2xl font-extrabold text-gray-900">
                      {money(shown.totalPriceEgp)}
                      {shown.hasDiscount && shown.priceEgp && <span className="ml-2 text-sm font-semibold text-slate-400 line-through">{money(shown.priceEgp)}</span>}
                    </p>
                  ) : (
                    <p className="text-2xl font-extrabold text-gray-900">N/A</p>
                  )}
                </div>
                {!owned && plans.length > 1 && from != null && (
                  <p className="text-xs text-slate-400 text-right shrink-0">from <b className="text-slate-600">{money(from)}</b><br />{plans.length} plans</p>
                )}
              </div>
              <div className="flex flex-col gap-2 mt-auto">
                {owned ? (
                  <button className="btn-primary" disabled style={{ opacity: 0.55 }}>Owned ✓</button>
                ) : !plans.length ? (
                  <button className="btn-primary" disabled style={{ opacity: 0.55 }}>No price plans yet</button>
                ) : inCart ? (
                  <button className="btn-primary" onClick={() => setPicking(course)}>In cart ✓ · {inCart.planLabel || "change plan"}</button>
                ) : (
                  <button className="btn-primary" onClick={() => setPicking(course)}><Icon name="store" size={16} /> Buy course · from {money(from)}</button>
                )}
                <button className="btn-light" onClick={() => navigate(`/user/courses/${course.id}`)}><span>{owned ? "Open course" : "Chapters & lessons"}</span></button>
              </div>
            </section>
          );
        })}
      </div>

      {picking && (
        <PlanPickerModal
          title={picking.name}
          plans={picking.pricePlans || []}
          currentPlanId={selected.find((c) => c.courseId === picking.id)?.planId}
          inCart={selected.some((c) => c.courseId === picking.id)}
          onClose={() => setPicking(null)}
          onAdd={(plan) => upsert(picking, plan)}
          onRemove={() => remove(picking.id)}
        />
      )}

      <SelectionCart
        items={selected.map((c) => ({ key: c.courseId, kind: "course", name: c.courseName, sub: c.planLabel, price: c.price }))}
        total={selected.reduce((sum, item) => sum + item.price, 0)}
        onRemove={remove}
        onClear={() => setSelected([])}
        onCheckout={() => selected.length && navigate("/user/enrollment", { state: courseCheckoutState(selected) })}
      />
    </>
  );
}
