import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost";
import { toast } from "react-hot-toast";
import Icon from "@/components/portal/Icon";
import { Modal, Page, PageHead } from "@/components/portal/ui";
import { CourseCatalog, ErrorCard, PayMethods, PromoBox, ReceiptUpload, SkelGrid, money } from "./storeParts";

/* Store (MathPortal design): Courses catalog with plan picker + cart → /user/enrollment,
   packages (live sessions / exams / questions) bought in a checkout dialog, and order history. */

const STORE_TABS = [
  ["courses", "Explore Courses", "book", "Full courses with a time plan"],
  ["packages", "Buy Packages", "store", "Live sessions, exams & questions"],
  ["history", "History", "history", "Your orders and their status"],
];
/** packages.type → design kind */
const PACK_KIND = {
  live: { kind: "sessions", label: "Live sessions", unit: "sessions", one: "session" },
  exam: { kind: "exams", label: "Exams", unit: "exams", one: "exam" },
  question: { kind: "questions", label: "Questions", unit: "questions", one: "question" },
};
const packKind = (t) => PACK_KIND[t] || { kind: "sessions", label: "Package", unit: "items", one: "item" };
const fmtDate = (v) => {
  const d = new Date(v);
  return v && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A";
};
const statusPill = (status) =>
  status === "completed" ? <span className="pill bg-green-100 text-green-700">PAID</span>
    : status === "rejected" ? <span className="pill bg-red-100 text-red-600">REJECTED</span>
      : <span className="pill bg-amber-100 text-amber-700">AWAITING APPROVAL</span>;

const Payment = () => {
  const navigate = useNavigate();
  const [activeMainTab, setActiveMainTab] = useState("courses"); // courses | packages | history
  const [historySubTab, setHistorySubTab] = useState("pending-courses"); // pending-courses | completed-courses | rejected-courses | packages-history

  // --- Courses selection (cart) + package checkout ---
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [receiptImg, setReceiptImg] = useState("");
  const [receiptName, setReceiptName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState("buy"); // buy | upgrade
  const [upgradeSourceId, setUpgradeSourceId] = useState(null); // id of the package-buy history row being upgraded
  const [includeAnswersAddon, setIncludeAnswersAddon] = useState(false); // buying a package together with the answers add-on
  // promo code inside the package checkout
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState(null);
  const [appliedPromo, setAppliedPromo] = useState(null); // { code, discountAmount }
  // packages history table
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  // packages filters
  const [packFilter, setPackFilter] = useState("all");
  const [packCourse, setPackCourse] = useState("all");

  // --- APIs ---
  const { data: coursesData, loading: coursesLoading, error: coursesError } = useGet("/api/user/courses");
  const { data: packagesData, loading: packLoading, error: packError } = useGet("/api/user/packages");
  const { data: methodsData, loading: methodsLoading, error: methodsError } = useGet("/api/user/payment/payment-methods");
  const { data: purchasesData, loading: purchasesLoading, error: purchasesError } = useGet("/api/user/enrollment/my-purchases");
  const { data: historyData, loading: historyLoading, refetch: refetchPackHistory } = useGet(
    `/api/user/payment/package-buy/history?page=${currentPage}&limit=${rowsPerPage}`,
  );

  const { postData, loading: posting } = usePost();
  const { postData: validatePromo, loading: validatingPromo } = usePost("/api/user/promo-codes/validate");

  const courses = coursesData?.data?.courses || [];
  const packages = packagesData?.data?.data || [];
  const paymentMethods = methodsData?.data?.paymentMethods || [];
  const allPurchases = purchasesData?.data?.purchases || [];
  const purchaseHistory = historyData?.data?.history || [];
  const paginationInfo = historyData?.data?.pagination || {};

  // --- Package purchase ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImg(reader.result);
        setReceiptName(file.name);
        toast.success("Receipt attached successfully!");
      };
      reader.onerror = () => toast.error("Failed to convert file to Base64");
      reader.readAsDataURL(file);
    }
  };

  const resetPromoState = () => {
    setAppliedPromo(null);
    setPromoCode("");
    setPromoError(null);
  };

  const openCheckout = (pkg, { mode = "buy", sourceId = null, addon = false } = {}) => {
    setCheckoutMode(mode);
    setSelectedPackage(pkg);
    setUpgradeSourceId(sourceId);
    setIncludeAnswersAddon(addon);
    resetPromoState();
    setIsModalOpen(true);
  };

  const closeCheckout = () => {
    setIsModalOpen(false);
    setCheckoutMode("buy");
    setUpgradeSourceId(null);
    setIncludeAnswersAddon(false);
    resetPromoState();
  };

  const basePackagePrice =
    (checkoutMode === "upgrade"
      ? Number(selectedPackage?.answersPrice)
      : Number(selectedPackage?.price) + (includeAnswersAddon ? Number(selectedPackage?.answersPrice) || 0 : 0)) || 0;
  const discountedPackagePrice = appliedPromo
    ? basePackagePrice - (basePackagePrice * appliedPromo.discountAmount) / 100
    : basePackagePrice;

  const handlePurchasePackage = async (e) => {
    e?.preventDefault?.();
    if (!selectedMethod) return toast.error("Please select a payment method");

    const isAutomatic = selectedMethod.type === "Automatic";
    const endpoint = isAutomatic ? "/api/user/payment/package-buy/automatic" : "/api/user/payment/package-buy";

    const isUpgrade = checkoutMode === "upgrade";
    const upgradeAmount = Number(selectedPackage?.answersPrice) || 0;

    if (isUpgrade && upgradeAmount <= 0) {
      return toast.error("This package has no answers plan price set.");
    }

    const upgradeAmountWithDiscount = appliedPromo
      ? upgradeAmount - (upgradeAmount * appliedPromo.discountAmount) / 100
      : upgradeAmount;

    const body = {
      packageId: selectedPackage.id,
      paymentMethodId: selectedMethod.id,
      ...(!isAutomatic && { receiptImg }),
      ...(appliedPromo?.code && { promoCode: appliedPromo.code }),
      ...(isUpgrade && {
        isUpgrade: true,
        includedAnswers: true,
        packageBuyId: upgradeSourceId,
        amount: upgradeAmountWithDiscount,
        reason: "answers_upgrade",
      }),
      ...(!isUpgrade && {
        amount: discountedPackagePrice,
        ...(includeAnswersAddon && { includedAnswers: true }),
      }),
    };

    try {
      const res = await postData(body, endpoint);
      const redirectUrl = res?.checkoutUrl || res?.paymentUrl || res?.data?.checkoutUrl || res?.data?.paymentUrl;

      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        toast.success(isUpgrade ? "Upgrade request submitted successfully!" : "Purchase request submitted successfully!");
        setIsModalOpen(false);
        setSelectedPackage(null);
        setReceiptImg("");
        setReceiptName("");
        setCheckoutMode("buy");
        setUpgradeSourceId(null);
        setIncludeAnswersAddon(false);
        resetPromoState();
        refetchPackHistory();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim() || !selectedPackage) return;
    setPromoError(null);
    try {
      const json = await validatePromo({
        code: promoCode.trim().toUpperCase(),
        items: { packageIds: [selectedPackage.id], courseIds: [], chapterIds: [], lessonIds: [] },
      });
      if (json?.success) {
        setAppliedPromo({
          code: promoCode.trim().toUpperCase(),
          discountAmount: json?.data?.discountAmount ?? json?.discountAmount,
        });
        toast.success("Promo code applied!");
      } else {
        setPromoError(json?.error?.message || json?.message || "Invalid promo code");
      }
    } catch (err) {
      setPromoError(err.message || "This code couldn't be validated");
    }
  };

  // --- Course orders by status ---
  const categorizedPurchases = {
    pending: allPurchases.filter((p) => p.paymentStatus !== "completed" && p.paymentStatus !== "rejected"),
    completed: allPurchases.filter((p) => p.paymentStatus === "completed"),
    rejected: allPurchases.filter((p) => p.paymentStatus === "rejected"),
  };

  const upgradeEligibleRowIds = useMemo(() => {
    const rowsByPackage = new Map();
    purchaseHistory.forEach((row) => {
      const list = rowsByPackage.get(row.package.id) || [];
      list.push(row);
      rowsByPackage.set(row.package.id, list);
    });
    const eligible = new Set();
    rowsByPackage.forEach((rows) => {
      if (rows.some((r) => r.reason === "answers_upgrade")) return;
      const candidate = rows.find((r) => r.status === "completed" && r.includedAnswers === true && r.package?.hasAnswers);
      if (candidate) eligible.add(candidate.id);
    });
    return eligible;
  }, [purchaseHistory]);

  // per package: already owned? can it be upgraded with the answers add-on?
  const packageStatusById = useMemo(() => {
    const rowsByPackage = new Map();
    purchaseHistory.forEach((row) => {
      const list = rowsByPackage.get(row.package.id) || [];
      list.push(row);
      rowsByPackage.set(row.package.id, list);
    });
    const statusMap = new Map();
    rowsByPackage.forEach((rows, packageId) => {
      const owned = rows.some((r) => r.status === "completed");
      const upgradeAlreadyRequested = rows.some((r) => r.reason === "answers_upgrade");
      const candidate = rows.find((r) => r.status === "completed" && r.includedAnswers === true && r.package?.hasAnswers);
      statusMap.set(packageId, { owned, canUpgrade: !upgradeAlreadyRequested && !!candidate, upgradeSourceId: candidate?.id || null });
    });
    return statusMap;
  }, [purchaseHistory]);

  // --- Packages filters ---
  const packTypes = [...new Set(packages.map((p) => p.type))];
  const packCourses = [...new Map(packages.filter((p) => p.course?.id).map((p) => [p.course.id, p.course.name])).entries()];
  const shownPackages = packages.filter((p) => (packFilter === "all" || p.type === packFilter) && (packCourse === "all" || p.course?.id === packCourse));

  const loadingCourses = coursesLoading || (!coursesData && !coursesError);
  const loadingPurchases = purchasesLoading || (!purchasesData && !purchasesError);
  const filteredHistory = searchTerm.trim()
    ? purchaseHistory.filter((r) => (r.package?.name || "").toLowerCase().includes(searchTerm.trim().toLowerCase()))
    : purchaseHistory;
  const totalPages = paginationInfo.totalPages || 1;

  /* ---------------- render pieces ---------------- */

  const packageCard = (pkg) => {
    const k = packKind(pkg.type);
    const st = packageStatusById.get(pkg.id);
    const isOwned = st?.owned;
    const canUpgrade = st?.canUpgrade;
    const price = Number(pkg.price) || 0;
    const addon = pkg.hasAnswers && Number(pkg.answersPrice) > 0;
    const n = Number(pkg.number) || 0;
    return (
      <section key={pkg.id} className="card p-6 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className={`kind-pill kind-${k.kind}`}>{k.label}</span>
          {isOwned && <span className="pill bg-green-100 text-green-700">OWNED</span>}
        </div>
        <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
          {[pkg.course?.name, n ? `${n} ${k.unit}` : ""].filter(Boolean).join(" · ")}
        </p>
        <h4 className="text-xl font-extrabold text-gray-900 -mt-1">{pkg.name}</h4>
        <div>
          <p className="text-3xl font-extrabold text-gray-900">{money(price)}</p>
          {n > 0 && <p className="text-xs text-slate-400">{money(price / n)} / {k.one}</p>}
        </div>
        <ul className="text-sm text-slate-600 space-y-1.5 flex-1">
          {n > 0 && <li className="flex gap-2"><span className="text-green-600 mt-0.5"><Icon name="check" size={14} /></span>{n} {k.unit}{pkg.course?.name ? ` for ${pkg.course.name}` : ""}</li>}
          {Number(pkg.duration) > 0 && <li className="flex gap-2"><span className="text-green-600 mt-0.5"><Icon name="check" size={14} /></span>Valid for {pkg.duration} days</li>}
          {pkg.category?.name && <li className="flex gap-2"><span className="text-green-600 mt-0.5"><Icon name="check" size={14} /></span>{pkg.category.name}</li>}
        </ul>
        {addon && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3">
            <p className="text-xs font-extrabold text-blue-700">Answers review add-on · +{money(pkg.answersPrice)}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Purchase this add-on first, then you can upgrade your package with answers anytime.</p>
          </div>
        )}
        {isOwned && canUpgrade ? (
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-mini ok" disabled>Owned ✓</button>
            <button className="btn-mini primary" onClick={() => openCheckout(pkg, { mode: "upgrade", sourceId: st.upgradeSourceId })}>Upgrade</button>
          </div>
        ) : isOwned ? (
          <button className="btn-primary" disabled style={{ opacity: 0.55 }}>Owned ✓</button>
        ) : addon ? (
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-mini primary" onClick={() => openCheckout(pkg)}>Buy · {money(price)}</button>
            <button className="btn-mini" onClick={() => openCheckout(pkg, { addon: true })}>With answers · {money(price + Number(pkg.answersPrice))}</button>
          </div>
        ) : (
          <button className="btn-primary" onClick={() => openCheckout(pkg)}><Icon name="store" size={16} /> Buy package · {money(price)}</button>
        )}
      </section>
    );
  };

  const filterBtn = (active, label, onClick, key) => (
    <button key={key} className={`tab-btn ${active ? "active" : ""}`} style={{ border: "1px solid #e2e8f0" }} onClick={onClick}>{label}</button>
  );

  const purchaseCard = (purchase) => (
    <section key={purchase.id} className="rp-card flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-[#FDECEC] text-one flex items-center justify-center shrink-0"><Icon name="book" size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-gray-900 truncate">{purchase.details?.name || `Purchase ID: #${String(purchase.id).slice(0, 8)}`}</p>
          <p className="text-xs text-slate-500">
            <span className="capitalize">{purchase.type || "N/A"}</span>
            {purchase.pricePlan?.label && ` · ${purchase.pricePlan.label}`}
          </p>
        </div>
        {statusPill(purchase.paymentStatus)}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm border-t border-slate-100 pt-3">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase">Paid</p>
          <p className="font-extrabold text-gray-900">{money(purchase.payment?.amount || 0)}</p>
          <p className="text-xs text-slate-500">via {purchase.payment?.method || "Unknown"}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase">Requested</p>
          <p className="font-bold text-gray-900">{fmtDate(purchase.date)}</p>
        </div>
      </div>
      {purchase.payment?.reason && (
        <p className="text-xs rounded-xl bg-red-50 text-red-700 border border-red-100 p-2.5"><b>Reason:</b> {purchase.payment.reason}</p>
      )}
      {purchase.payment?.receipt && (
        <a href={purchase.payment.receipt} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-one hover:underline self-start">View payment receipt →</a>
      )}
    </section>
  );

  const historyTabs = [
    { id: "pending-courses", label: "Pending", count: categorizedPurchases.pending.length },
    { id: "completed-courses", label: "Completed", count: categorizedPurchases.completed.length },
    { id: "rejected-courses", label: "Rejected", count: categorizedPurchases.rejected.length },
    { id: "packages-history", label: "Packages", count: paginationInfo.total || 0 },
  ];

  return (
    <Page wide>
      <div className={activeMainTab === "courses" && selectedCourses.length ? "pb-24" : ""}>
        <PageHead title="Store" text="Courses, live sessions, exams and question packages. Prices are in EGP.">
          <button className="btn-ghost" onClick={() => navigate("/user/mypurchases")}><Icon name="purchases" size={16} /> My purchases</button>
        </PageHead>

        {/* Store tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {STORE_TABS.map(([k, l, icon, sub]) => (
            <button key={k} onClick={() => setActiveMainTab(k)} className={`store-tab ${activeMainTab === k ? "active" : ""}`} aria-pressed={activeMainTab === k}>
              <span className="store-tab-icon"><Icon name={icon} size={20} /></span>
              <span className="text-left min-w-0">
                <span className="block font-extrabold text-sm">{l}</span>
                <span className="block text-[11px] opacity-70 truncate">{sub}</span>
              </span>
            </button>
          ))}
        </div>

        {/* ─── Courses ─── */}
        {activeMainTab === "courses" && (
          loadingCourses ? <SkelGrid /> : coursesError ? <ErrorCard text="Could not load the courses." /> : (
            <>
              <p className="text-sm text-slate-500 mb-4">Pick an access plan for each course you want — they collect in your cart, then check out once.</p>
              <CourseCatalog courses={courses} selected={selectedCourses} setSelected={setSelectedCourses} />
            </>
          )
        )}

        {/* ─── Packages ─── */}
        {activeMainTab === "packages" && (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">Packages</h3>
                <p className="text-sm text-slate-500">Live session, exam and question packages for your courses.</p>
              </div>
            </div>
            {packTypes.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {filterBtn(packFilter === "all", "All", () => setPackFilter("all"), "all")}
                {packTypes.map((t) => filterBtn(packFilter === t, packKind(t).label, () => setPackFilter(t), t))}
              </div>
            )}
            {packCourses.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {filterBtn(packCourse === "all", "All courses", () => setPackCourse("all"), "all-c")}
                {packCourses.map(([id, name]) => filterBtn(packCourse === id, name, () => setPackCourse(id), id))}
              </div>
            )}
            {packError && !packagesData ? <ErrorCard text="Could not load the packages." /> : packLoading || !packagesData ? <SkelGrid /> : shownPackages.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{shownPackages.map(packageCard)}</div>
            ) : (
              <section className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <p className="text-lg font-extrabold text-gray-900 mb-1">No packages here</p>
                <p className="text-sm text-slate-500">Packages for your courses show up here.</p>
              </section>
            )}
          </>
        )}

        {/* ─── History ─── */}
        {activeMainTab === "history" && (
          <>
            <div className="flex flex-wrap gap-1 bg-slate-100 rounded-xl p-1 mb-5 w-fit max-w-full">
              {historyTabs.map((t) => (
                <button key={t.id} onClick={() => setHistorySubTab(t.id)} className={`px-3.5 py-1.5 rounded-lg text-xs font-bold ${historySubTab === t.id ? "bg-white text-one shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                  {t.label} <span className="text-slate-400">· {t.count}</span>
                </button>
              ))}
            </div>

            {historySubTab.includes("courses") && (() => {
              if (loadingPurchases) return <SkelGrid n={2} h="h-44" cols="md:grid-cols-2" />;
              if (purchasesError) return <ErrorCard text="Could not load your orders." />;
              const currentStatusType = historySubTab.split("-")[0]; // pending | completed | rejected
              const targeted = categorizedPurchases[currentStatusType] || [];
              if (!targeted.length) {
                return (
                  <section className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                    <p className="text-lg font-extrabold text-gray-900 mb-1">No {currentStatusType} purchases found</p>
                    <p className="text-sm text-slate-500">You don't have any course orders in this category.</p>
                  </section>
                );
              }
              return <div className="grid gap-4 md:grid-cols-2">{targeted.map(purchaseCard)}</div>;
            })()}

            {historySubTab === "packages-history" && (
              <section className="rp-card !p-0 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
                  <h3 className="font-extrabold text-gray-900">Package orders</h3>
                  <input className="input sm:!w-64" placeholder="Search packages…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} aria-label="Search packages" />
                </div>
                <div className={`overflow-x-auto ${historyLoading ? "opacity-60" : ""}`}>
                  <table className="rp-table">
                    <thead>
                      <tr><th>Package</th><th>Amount</th><th>Status</th><th>Answers</th><th>Date</th><th className="text-right">Actions</th></tr>
                    </thead>
                    <tbody>
                      {filteredHistory.length ? filteredHistory.map((row) => {
                        const canUpgrade = upgradeEligibleRowIds.has(row.id);
                        return (
                          <tr key={row.id}>
                            <td className="font-bold text-gray-900">{row.package?.name}</td>
                            <td className="font-bold whitespace-nowrap">{money(row.amount)}</td>
                            <td>{statusPill(row.status)}</td>
                            <td>{row.includedAnswers ? <span className="pill bg-blue-100 text-blue-700">INCLUDED</span> : <span className="pill bg-slate-100 text-slate-500">NONE</span>}</td>
                            <td className="text-slate-500 whitespace-nowrap">{fmtDate(row.createdAt)}</td>
                            <td>
                              <div className="flex items-center justify-end gap-2">
                                {row.receiptImg && <a href={row.receiptImg} target="_blank" rel="noreferrer" className="btn-mini">Receipt</a>}
                                {canUpgrade && <button className="btn-mini primary" onClick={() => openCheckout(row.package, { mode: "upgrade", sourceId: row.id })}>Upgrade</button>}
                              </div>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan={6} className="text-center text-slate-400 py-10">{historyLoading ? "Loading…" : "No package orders found."}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-slate-100 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">Total <b className="text-gray-900">{paginationInfo.total || 0}</b></span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="input !w-auto !py-1.5 text-xs"
                      aria-label="Rows per page"
                    >
                      {[10, 20, 50, 100].map((size) => <option key={size} value={size}>Show {size}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="btn-mini" disabled={currentPage <= 1} style={currentPage <= 1 ? { opacity: 0.4 } : undefined} onClick={() => setCurrentPage(currentPage - 1)}>← Prev</button>
                    <span className="text-xs font-bold text-slate-500">Page {currentPage} of {totalPages}</span>
                    <button className="btn-mini" disabled={currentPage >= totalPages} style={currentPage >= totalPages ? { opacity: 0.4 } : undefined} onClick={() => setCurrentPage(currentPage + 1)}>Next →</button>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* ─── Package checkout ─── */}
      {isModalOpen && selectedPackage && (
        <Modal
          wide
          title={checkoutMode === "upgrade" ? "Upgrade with answers" : "Checkout"}
          onClose={closeCheckout}
          actions={<>
            <button className="pl-btn" onClick={closeCheckout}>Cancel</button>
            <button className="pl-btn primary" onClick={handlePurchasePackage} disabled={posting || !selectedMethod}>
              {posting
                ? "Processing…"
                : selectedMethod?.type === "Automatic"
                  ? `Pay ${money(discountedPackagePrice)}`
                  : checkoutMode === "upgrade"
                    ? `Confirm upgrade · ${money(discountedPackagePrice)}`
                    : `Place order · ${money(discountedPackagePrice)}`}
            </button>
          </>}
        >
          {/* Order line(s) */}
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl px-3 mb-5">
            <div className="flex items-start gap-3 py-3">
              <span className={`kind-pill kind-${packKind(selectedPackage.type).kind}`}>{packKind(selectedPackage.type).label}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">{selectedPackage.name}</p>
                <p className="text-xs text-slate-400">{checkoutMode === "upgrade" ? "Adding answers to your purchase" : "Package"}</p>
              </div>
              <p className="text-sm font-extrabold text-gray-900 whitespace-nowrap">{money(checkoutMode === "upgrade" ? selectedPackage.answersPrice : selectedPackage.price)}</p>
            </div>
            {checkoutMode !== "upgrade" && includeAnswersAddon && (
              <div className="flex items-start gap-3 py-3">
                <span className="kind-pill kind-questions">Add-on</span>
                <p className="flex-1 text-sm font-bold text-gray-900">Answers review add-on</p>
                <p className="text-sm font-extrabold text-gray-900 whitespace-nowrap">+{money(selectedPackage.answersPrice)}</p>
              </div>
            )}
          </div>

          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Payment method</p>
          {methodsLoading || (!methodsData && !methodsError) ? <div className="skel h-20 mb-4"></div> : (
            <div className="mb-4"><PayMethods methods={paymentMethods} selected={selectedMethod} onSelect={setSelectedMethod} group="pkg-pay" /></div>
          )}

          {selectedMethod?.type === "Manual" && (
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-slate-600 mb-3">
                Transfer <b>{money(discountedPackagePrice)}</b> with <b>{selectedMethod.name}</b>, then upload the screenshot below.
                {checkoutMode !== "upgrade" && includeAnswersAddon && <span className="block text-xs text-blue-700 font-semibold mt-1">Includes the answers review add-on (+{money(selectedPackage.answersPrice)})</span>}
              </p>
              <ReceiptUpload value={receiptImg} fileName={receiptName} methodName={selectedMethod.name} onPick={handleFileChange} onRemove={() => { setReceiptImg(""); setReceiptName(""); }} />
            </div>
          )}
          {selectedMethod?.type === "Automatic" && (
            <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3 mb-4">
              Instant activation — you'll be redirected to a secure payment page to pay <b>{money(discountedPackagePrice)}</b>.
              {checkoutMode !== "upgrade" && includeAnswersAddon && <span className="block mt-1">Includes the answers review add-on (+{money(selectedPackage.answersPrice)}).</span>}
            </p>
          )}

          {checkoutMode === "buy" && (
            <>
              <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Promo code</p>
              <PromoBox
                code={promoCode}
                setCode={setPromoCode}
                applied={appliedPromo}
                error={promoError}
                validating={validatingPromo}
                onApply={handleApplyPromo}
                onRemove={resetPromoState}
              />
            </>
          )}

          <div className="space-y-2 text-sm border-t border-slate-100 pt-3">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-bold text-gray-900">{money(basePackagePrice)}</span></div>
            {appliedPromo && (
              <div className="flex justify-between"><span className="text-slate-500">Discount ({appliedPromo.code})</span><span className="font-bold text-green-700">− {money(basePackagePrice - discountedPackagePrice)}</span></div>
            )}
            <div className="flex justify-between items-baseline"><span className="font-extrabold text-gray-900">Total</span><span className="font-extrabold text-xl text-gray-900">{money(discountedPackagePrice)}</span></div>
          </div>
        </Modal>
      )}
    </Page>
  );
};

export default Payment;
