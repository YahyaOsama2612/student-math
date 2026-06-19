import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost";
import Loader from "@/components/Loading";
import Errorpage from "@/components/Errorpage";
import ReusableTableSearch from "@/components/ReusableTableSearch";
import { toast } from "react-hot-toast";
import {
  Layers,
  ChevronRight,
  BookOpen,
  ArrowLeft,
  ShoppingCart,
  CheckCircle2,
  X,
  Plus,
  Check,
  ShoppingBag,
  CreditCard,
  Eye,
  Zap,
  Calendar,
  Wallet,
  AlertCircle,
  ExternalLink,
  XCircle,
  History,
} from "lucide-react";

const Payment = () => {
  const navigate = useNavigate();
  const [activeMainTab, setActiveMainTab] = useState("courses"); // courses | packages | history
  const [historySubTab, setHistorySubTab] = useState("pending-courses"); // pending-courses | completed-courses | rejected-courses | packages-history

  // --- 1. الـ States الخاصة بـ الكورسات والباقات ---
  const [isBuyMode, setIsBuyMode] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [receiptImg, setReceiptImg] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- الـ States الخاصة بجدول تاريخ الباقات ---
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  // --- 2. جلب كافة البيانات من الـ APIs ---
  const {
    data: coursesData,
    loading: coursesLoading,
    error: coursesError,
  } = useGet("/api/user/courses");
  const { data: packagesData, loading: packLoading } =
    useGet("/api/user/packages");
  const { data: methodsData, loading: methodsLoading } = useGet(
    "/api/user/payment/payment-methods",
  );
  const {
    data: purchasesData,
    loading: purchasesLoading,
    error: purchasesError,
    refetch: refetchPurchases,
  } = useGet("/api/user/enrollment/my-purchases");
  const {
    data: historyData,
    loading: historyLoading,
    refetch: refetchPackHistory,
  } = useGet(
    `/api/user/payment/package-buy/history?page=${currentPage}&limit=${rowsPerPage}`,
  );

  const { postData, loading: posting } = usePost();

  // مخرجات الـ APIs
  const courses = coursesData?.data?.courses || [];
  const packages = packagesData?.data?.data || [];
  const paymentMethods = methodsData?.data?.paymentMethods || [];
  const allPurchases = purchasesData?.data?.purchases || [];
  const purchaseHistory = historyData?.data?.history || [];
  const paginationInfo = historyData?.data?.pagination || {};

  // --- 3. منطق الكورسات المساعد ---
  const getDefaultPlan = (plans) => {
    if (!plans || plans.length === 0) return null;
    return plans.find((plan) => plan.isDefault) || plans[0];
  };

  const toggleCourseSelection = (course) => {
    if (!isBuyMode || course.isPurchased) return;
    setSelectedCourses((prev) => {
      const isExist = prev.find((item) => item.courseId === course.id);
      if (isExist) return prev.filter((item) => item.courseId !== course.id);

      const defaultPlan = getDefaultPlan(course.pricePlans);
      return [
        ...prev,
        {
          courseId: course.id,
          courseName: course.name,
          planId: defaultPlan?.id || null,
          planLabel: defaultPlan?.durationLabel || "",
          price: defaultPlan ? parseFloat(defaultPlan.totalPriceEgp) : 0,
        },
      ];
    });
  };

  const handlePlanChange = (course, planId) => {
    const selectedPlan = course.pricePlans.find((p) => p.id === planId);
    if (!selectedPlan) return;
    setSelectedCourses((prev) =>
      prev.map((item) =>
        item.courseId === course.id
          ? {
              ...item,
              planId: selectedPlan.id,
              planLabel: selectedPlan.durationLabel,
              price: parseFloat(selectedPlan.totalPriceEgp),
            }
          : item,
      ),
    );
  };

  const totalPrice = selectedCourses.reduce((sum, item) => sum + item.price, 0);

  const handleProceedToBuy = () => {
    if (selectedCourses.length === 0) return;
    navigate("/user/enrollment", {
      state: {
        type: "courseId",
        selectedItems: selectedCourses,
        ids: selectedCourses.map((c) => c.courseId),
        price: totalPrice,
        name:
          selectedCourses.length === 1
            ? selectedCourses[0].courseName
            : `${selectedCourses.length} Courses`,
      },
    });
  };

  // --- 4. منطق شراء الباقات والملفات ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // هنا تضع منطق الـ upload الخاص بك وتحويله لروابط مخزنة، كمثال بسيط:
      setReceiptImg(URL.createObjectURL(file));
      toast.success("Receipt attached successfully!");
    }
  };

  const handlePurchasePackage = async (e) => {
    e.preventDefault();
    if (!selectedMethod) return toast.error("Please select a payment method");

    const isAutomatic = selectedMethod.type === "Automatic";
    const endpoint = isAutomatic
      ? "/api/user/payment/package-buy/automatic"
      : "/api/user/payment/package-buy";

    const body = {
      packageId: selectedPackage.id,
      paymentMethodId: selectedMethod.id,
      ...(!isAutomatic && { receiptImg }),
    };

    try {
      const res = await postData(body, endpoint);
      if (isAutomatic && res?.paymentUrl) {
        window.location.href = res.paymentUrl;
      } else {
        toast.success("Purchase request submitted successfully!");
        setIsModalOpen(false);
        setSelectedPackage(null);
        setReceiptImg("");
        refetchPackHistory();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- 5. تصنيف طلبات الكورسات (Pending Purchases) ---
  const categorizedPurchases = {
    pending: allPurchases.filter(
      (p) => p.paymentStatus !== "completed" && p.paymentStatus !== "rejected",
    ),
    completed: allPurchases.filter((p) => p.paymentStatus === "completed"),
    rejected: allPurchases.filter((p) => p.paymentStatus === "rejected"),
  };

  // --- 6. أعمدة جدول الباقات ---
  const packageColumns = [
    {
      header: "Package",
      key: "package",
      render: (val) => <span className="font-bold text-one">{val?.name}</span>,
    },
    {
      header: "Amount",
      key: "amount",
      render: (val) => (
        <span className="font-bold text-green-600">{val} EGP</span>
      ),
    },
    {
      header: "Status",
      key: "status",
      render: (val) => (
        <span
          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
            val === "completed"
              ? "bg-green-100 text-green-700"
              : val === "rejected"
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
          }`}
        >
          {val}
        </span>
      ),
    },
    {
      header: "Date",
      key: "createdAt",
      render: (val) => (
        <span className="text-gray-400 text-xs">
          {new Date(val).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200 uppercase">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Success
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200 uppercase">
            <XCircle className="w-3.5 h-3.5 text-red-500" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />{" "}
            Pending
          </span>
        );
    }
  };

  // Loading Screen
  if (coursesLoading || packLoading || methodsLoading || purchasesLoading)
    return <Loader />;
  if (coursesError || purchasesError) return <Errorpage />;

  return (
    <div className="bg-[#fcfcfd] min-h-screen p-4 md:p-6 lg:p-8 relative pb-24">
      {/* ─── TOP HEADER & MAIN NAVIGATION ─── */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-gray-900 mb-2 transition-colors font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Billing & Courses
          </h1>
        </div>

        {/* التابات الرئيسية الاحترافية */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200 shadow-sm w-full md:w-auto">
          <button
            onClick={() => {
              setActiveMainTab("courses");
              setIsBuyMode(false);
            }}
            className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeMainTab === "courses"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <BookOpen className="w-4 h-4" /> Explore Courses
          </button>
          <button
            onClick={() => setActiveMainTab("packages")}
            className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeMainTab === "packages"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Buy Packages
          </button>
          <button
            onClick={() => setActiveMainTab("history")}
            className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeMainTab === "history"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <History className="w-4 h-4" /> History & Tracking
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* ─── TAB 1: EXPLORE & BUY COURSES ─── */}
        {activeMainTab === "courses" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
              <p className="text-gray-500 font-medium text-sm pl-2">
                Select courses and activate buying mode to checkout multiple
                plans.
              </p>
              {!isBuyMode ? (
                <button
                  onClick={() => setIsBuyMode(true)}
                  className="flex items-center gap-2 bg-one text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-one/20 hover:scale-105 active:scale-95 transition-all text-sm"
                >
                  <ShoppingCart className="w-4 h-4" /> Buy Courses
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsBuyMode(false);
                    setSelectedCourses([]);
                  }}
                  className="flex items-center gap-2 bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-bold border border-red-100 hover:bg-red-100 transition-all text-sm"
                >
                  <X className="w-4 h-4" /> Cancel Selection
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {courses.map((course) => {
                const selectedItem = selectedCourses.find(
                  (c) => c.courseId === course.id,
                );
                const isSelected = !!selectedItem;
                const isPurchased = course.isPurchased;
                const currentPlan = isSelected
                  ? course.pricePlans.find((p) => p.id === selectedItem.planId)
                  : getDefaultPlan(course.pricePlans);

                return (
                  <div
                    key={course.id}
                    onClick={() => toggleCourseSelection(course)}
                    className={`group relative bg-white rounded-[2.5rem] p-5 flex flex-col h-full transition-all duration-300 border-2 ${
                      isBuyMode && !isPurchased
                        ? isSelected
                          ? "border-one ring-4 ring-one/10 shadow-xl scale-[1.02]"
                          : "border-gray-200 cursor-pointer hover:border-one/50"
                        : isPurchased
                          ? "border-gray-100 opacity-80"
                          : "border-gray-50 shadow-sm"
                    }`}
                  >
                    {isBuyMode && !isPurchased && (
                      <div
                        className={`absolute -top-2 -right-2 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow-lg transition-all ${isSelected ? "bg-one text-white scale-110" : "bg-gray-100 text-gray-400"}`}
                      >
                        {isSelected ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </div>
                    )}

                    {isPurchased && (
                      <div className="absolute top-4 right-4 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Purchased
                      </div>
                    )}

                    <div className="aspect-video bg-gray-50 rounded-[2rem] mb-4 overflow-hidden border border-gray-100 flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                      <Layers
                        className={`w-10 h-10 ${isSelected ? "text-one" : "text-gray-200"}`}
                      />
                    </div>

                    <div className="flex flex-col flex-grow">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 px-1">
                        {course.category}
                      </span>
                      <h3 className="text-lg font-bold text-gray-800 mb-2 px-1">
                        {course.name}
                      </h3>
                      <div className="flex items-center gap-4 px-1 mb-4">
                        <div className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                          <BookOpen className="w-3.5 h-3.5" />{" "}
                          {course.numberOfChapters} Chapters
                        </div>
                      </div>

                      {isBuyMode &&
                        !isPurchased &&
                        course.pricePlans?.length > 0 && (
                          <div
                            className="mb-4 px-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">
                              Select Plan:
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {course.pricePlans.map((plan) => {
                                const isPlanSelected =
                                  selectedItem?.planId === plan.id ||
                                  (!isSelected && plan.isDefault);
                                return (
                                  <button
                                    key={plan.id}
                                    type="button"
                                    onClick={() => {
                                      if (!isSelected)
                                        toggleCourseSelection(course);
                                      handlePlanChange(course, plan.id);
                                    }}
                                    className={`flex-1 min-w-[85px] text-center py-2 px-3 rounded-xl text-xs font-bold transition-all border duration-200 ${
                                      isPlanSelected
                                        ? "bg-one/10 border-one text-one shadow-sm shadow-one/5"
                                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300"
                                    }`}
                                  >
                                    <div className="block whitespace-nowrap">
                                      {plan.durationLabel}
                                    </div>
                                    <div
                                      className={`text-[10px] mt-0.5 font-medium ${isPlanSelected ? "text-one/80" : "text-gray-400"}`}
                                    >
                                      {parseFloat(plan.totalPriceEgp)} LE
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between mt-auto bg-gray-50 p-3 rounded-2xl">
                      <div className="flex flex-col">
                        {isPurchased ? (
                          <span className="font-black text-green-600">
                            Owned
                          </span>
                        ) : currentPlan ? (
                          <>
                            <span className="font-black text-gray-900">
                              {parseFloat(currentPlan.totalPriceEgp)} LE
                            </span>
                            {currentPlan.hasDiscount && (
                              <span className="text-xs text-gray-400 line-through">
                                {parseFloat(currentPlan.priceEgp)} LE
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="font-black text-gray-900">N/A</span>
                        )}
                      </div>

                      {!isBuyMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/user/courses/${course.id}`);
                          }}
                          className="group flex items-center gap-2 px-4 py-2 bg-white rounded-2xl shadow-md hover:shadow-lg hover:bg-gray-50 active:scale-95 transition-all duration-200"
                        >
                          <span className="text-sm font-medium text-gray-700 group-hover:text-one transition-colors">
                            {isPurchased ? "Open" : "See Chapters"}
                          </span>
                          <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-one transform group-hover:translate-x-1 transition-all duration-200" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TAB 2: BUY PACKAGES ─── */}
        {activeMainTab === "packages" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white border-2 border-gray-100 rounded-[2.5rem] p-8 hover:border-one transition-all duration-500 group relative shadow-sm"
              >
                <h3 className="text-2xl font-black text-gray-800 mb-2">
                  {pkg.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-one">
                    {pkg.price}
                  </span>
                  <span className="text-gray-400 font-bold text-sm uppercase">
                    EGP
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedPackage(pkg);
                    setIsModalOpen(true);
                  }}
                  className="w-full py-4 bg-black text-white rounded-2xl font-black group-hover:bg-one/80 transition-all"
                >
                  BUY PACKAGE
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ─── TAB 3: INTEGRATED HISTORY & TRACKING ─── */}
        {activeMainTab === "history" && (
          <div className="space-y-8">
            {/* التابات الفرعية لتصنيف الطلبات (الكورسات المعلقة / الباقات) */}
            <div className="flex border-b border-gray-200 gap-2 overflow-x-auto pb-1">
              {[
                {
                  id: "pending-courses",
                  label: "Pending Courses",
                  count: categorizedPurchases.pending.length,
                  color: "bg-amber-100 text-amber-800",
                },
                {
                  id: "completed-courses",
                  label: "Completed Courses",
                  count: categorizedPurchases.completed.length,
                  color: "bg-green-100 text-green-800",
                },
                {
                  id: "rejected-courses",
                  label: "Rejected Courses",
                  count: categorizedPurchases.rejected.length,
                  color: "bg-red-100 text-red-800",
                },
                {
                  id: "packages-history",
                  label: "Packages Ledger",
                  count: paginationInfo.total || 0,
                  color: "bg-blue-100 text-blue-800",
                },
              ].map((subTab) => (
                <button
                  key={subTab.id}
                  onClick={() => setHistorySubTab(subTab.id)}
                  className={`pb-3 px-4 font-bold text-sm transition-all whitespace-nowrap relative flex items-center gap-2 ${
                    historySubTab === subTab.id
                      ? "text-one border-b-2 border-one"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {subTab.label}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${subTab.color}`}
                  >
                    {subTab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* عرض محتوى تابات الكورسات الثلاثة */}
            {historySubTab.includes("courses") &&
              (() => {
                const currentStatusType = historySubTab.split("-")[0]; // pending | completed | rejected
                const targetedPurchases =
                  categorizedPurchases[currentStatusType] || [];

                if (targetedPurchases.length === 0) {
                  return (
                    <div className="bg-white rounded-[2rem] border border-gray-100 p-12 text-center shadow-sm">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        No {currentStatusType} purchases found
                      </h3>
                      <p className="text-gray-500">
                        You don't have any course orders in this category.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid gap-6 md:grid-cols-2">
                    {targetedPurchases.map((purchase) => (
                      <div
                        key={purchase.id}
                        className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between transition-all hover:shadow-md"
                      >
                        <div className="p-6">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                              <BookOpen className="w-6 h-6" />
                            </div>
                            {getStatusBadge(purchase.paymentStatus)}
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">
                            {purchase.details?.name ||
                              `Purchase ID: #${purchase.id.slice(0, 8)}`}
                          </h3>
                          <p className="text-sm font-medium text-one mb-4">
                            Type:{" "}
                            <span className="capitalize">
                              {purchase.type || "N/A"}
                            </span>
                            {purchase.pricePlan?.label &&
                              ` (${purchase.pricePlan.label})`}
                          </p>
                          <hr className="border-gray-100 my-4" />
                          <div className="space-y-3 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Wallet className="w-4 h-4 text-gray-400" />
                              <span>
                                Paid{" "}
                                <strong>
                                  {purchase.payment?.amount || 0} EGP
                                </strong>{" "}
                                via {purchase.payment?.method || "Unknown"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span>
                                Requested:{" "}
                                {purchase.date
                                  ? new Date(purchase.date).toLocaleDateString()
                                  : "N/A"}
                              </span>
                            </div>
                            {purchase.payment?.reason && (
                              <div className="mt-2 p-2 bg-red-50 text-red-700 rounded-lg text-xs border border-red-100">
                                <strong>Reason:</strong>{" "}
                                {purchase.payment.reason}
                              </div>
                            )}
                          </div>
                        </div>
                        {purchase.payment?.receipt && (
                          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">
                              Payment Proof Attached
                            </span>
                            <a
                              href={purchase.payment.receipt}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-one hover:underline"
                            >
                              View Receipt <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}

            {/* عرض محتوى جدول باقات الدفع المحدث */}
            {historySubTab === "packages-history" && (
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <ReusableTableSearch
                  title="Packages Billing Ledger"
                  columns={packageColumns}
                  data={purchaseHistory}
                  loading={historyLoading}
                  currentPage={currentPage}
                  totalPages={paginationInfo.totalPages || 1}
                  totalResults={paginationInfo.total || 0}
                  rowsPerPage={rowsPerPage}
                  onPageChange={(page) => setCurrentPage(page)}
                  onRowsPerPageChange={(size) => {
                    setCurrentPage(size);
                    setCurrentPage(1);
                  }}
                  searchTerm={searchTerm}
                  onSearchChange={(val) => setSearchTerm(val)}
                  extraActions={(row) =>
                    row.receiptImg && (
                      <a
                        href={row.receiptImg}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-one hover:bg-one/5 rounded-lg transition-all"
                      >
                        <Eye size={18} />
                      </a>
                    )
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── FLOATING CHECKOUT BAR (FOR COURSES) ─── */}
      {activeMainTab === "courses" &&
        isBuyMode &&
        selectedCourses.length > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-gray-900/95 backdrop-blur-md text-white p-5 rounded-[2.5rem] shadow-2xl z-50 flex items-center justify-between border border-white/10">
            <div className="flex flex-col ml-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                Total Price
              </span>
              <span className="text-2xl font-black text-one">
                {totalPrice} <span className="text-xs">LE</span>
              </span>
            </div>
            <button
              onClick={handleProceedToBuy}
              className="bg-one hover:bg-one/90 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-one/20"
            >
              Checkout ({selectedCourses.length})
            </button>
          </div>
        )}

      {/* ─── PACKAGE PURCHASE MODAL ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
              <div>
                <h3 className="text-2xl font-black text-gray-800">Checkout</h3>
                <p className="text-sm text-gray-400">
                  Completing purchase for{" "}
                  <span className="text-one font-bold">
                    {selectedPackage?.name}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-red-500 text-3xl font-light"
              >
                ×
              </button>
            </div>

            <form onSubmit={handlePurchasePackage} className="p-8 space-y-8">
              <div className="space-y-4">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                  Choose Payment Method
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      onClick={() => setSelectedMethod(method)}
                      className={`relative cursor-pointer transition-all p-4 rounded-[2rem] border-2 flex flex-col items-center gap-3 ${
                        selectedMethod?.id === method.id
                          ? "border-one bg-one/5 ring-4 ring-one/5 shadow-inner"
                          : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <img
                        src={method.logo}
                        alt=""
                        className="w-10 h-10 object-contain rounded-xl"
                      />
                      <span
                        className={`text-[10px] font-black uppercase text-center leading-tight ${selectedMethod?.id === method.id ? "text-one" : "text-gray-400"}`}
                      >
                        {method.name}
                      </span>
                      {selectedMethod?.id === method.id && (
                        <CheckCircle2
                          size={16}
                          className="absolute top-2 right-2 text-one"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedMethod?.type === "Manual" && (
                <div className="space-y-4">
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3">
                    <AlertCircle className="text-amber-500 mt-1" size={20} />
                    <p className="text-xs text-amber-700 font-medium">
                      Please transfer{" "}
                      <span className="font-bold underline">
                        {selectedPackage?.price} EGP
                      </span>{" "}
                      to the wallet number, then upload the screenshot below.
                    </p>
                  </div>
                  <div className="relative border-2 border-dashed border-gray-200 rounded-[2rem] p-8 text-center hover:bg-gray-50 transition-all cursor-pointer group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-gray-100 rounded-full group-hover:bg-one group-hover:text-white transition-colors">
                        <Zap size={20} />
                      </div>
                      <p className="text-xs font-black text-gray-400">
                        {receiptImg
                          ? "✅ RECEIPT ATTACHED"
                          : "UPLOAD SCREENSHOT"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedMethod?.type === "Automatic" && (
                <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex items-center gap-4">
                  <div className="p-3 bg-blue-500 rounded-full text-white shadow-lg shadow-blue-200">
                    <Zap size={20} />
                  </div>
                  <p className="text-xs text-blue-700 font-bold leading-relaxed">
                    INSTANT ACTIVATION:
                    <br />
                    <span className="font-normal opacity-70 text-[10px]">
                      You'll be redirected to a secure payment gateway.
                    </span>
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={posting || !selectedMethod}
                className="w-full bg-one text-white py-6 rounded-[1.5rem] font-black shadow-2xl shadow-one/30 hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
              >
                {posting
                  ? "PROCESSING..."
                  : selectedMethod?.type === "Automatic"
                    ? "PROCEED TO SECURE PAY"
                    : "CONFIRM PURCHASE"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payment;
