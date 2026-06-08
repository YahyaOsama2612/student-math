import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loading";
import Errorpage from "@/components/Errorpage";
import {
  ArrowLeft,
  Layers,
  ChevronRight,
  User,
  Layout,
  ShoppingCart,
  CheckCircle2,
  X,
  Plus,
  Wallet,
} from "lucide-react";

const colorPalette = [
  {
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-200",
    iconBg: "bg-red-200/50",
  },
  {
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
    iconBg: "bg-blue-200/50",
  },
  {
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-200",
    iconBg: "bg-green-200/50",
  },
  {
    bg: "bg-purple-100",
    text: "text-purple-700",
    border: "border-purple-200",
    iconBg: "bg-purple-200/50",
  },
  {
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-200",
    iconBg: "bg-amber-200/50",
  },
];

const getStyle = (name) => {
  if (!name) return colorPalette[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const index = Math.abs(hash) % colorPalette.length;
  return colorPalette[index];
};

const Chapters = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useGet(`/api/user/chapters/course/${id}`);

  const chapters = data?.data?.chapters || [];

  // وضع الشراء
  const [isBuyMode, setIsBuyMode] = useState(false);

  // سنقوم بتخزين كائنات الشباتر المختارة مع تفاصيل الخطة المحددة لها
  const [selectedChapters, setSelectedChapters] = useState([]);

  // دالة مساعدة لجلب الخطة الافتراضية للشابتر
  const getDefaultPlan = (plans) => {
    if (!plans || plans.length === 0) return null;
    return plans.find((plan) => plan.isDefault) || plans[0];
  };

  const toggleSelection = (item) => {
    // إذا لم نكن في وضع الشراء، الضغط على الكارت ينقل المستخدم لصفحة الشابتر
    if (!isBuyMode) {
      navigate(`/user/chapter/${item.chapter.id}`);
      return;
    }

    // بقية منطق الاختيار في وضع الشراء كما هو بدون تغيير:
    setSelectedChapters((prev) => {
      const isExist = prev.find((c) => c.chapterId === item.chapter.id);

      if (isExist) {
        return prev.filter((c) => c.chapterId !== item.chapter.id);
      }

      const defaultPlan = getDefaultPlan(item.chapter.pricePlans);
      return [
        ...prev,
        {
          chapterId: item.chapter.id,
          chapterName: item.chapter.name,
          planId: defaultPlan?.id || null,
          planLabel: defaultPlan?.durationLabel || "",
          price: defaultPlan ? parseFloat(defaultPlan.totalPriceEgp) : 0,
          rawItem: item,
        },
      ];
    });
  };
  // دالة لتغيير الخطة السعرية للشابتر المختار
  const handlePlanChange = (item, planId) => {
    const selectedPlan = item.chapter.pricePlans.find((p) => p.id === planId);
    if (!selectedPlan) return;

    setSelectedChapters((prev) =>
      prev.map((c) =>
        c.chapterId === item.chapter.id
          ? {
              ...c,
              planId: selectedPlan.id,
              planLabel: selectedPlan.durationLabel,
              price: parseFloat(selectedPlan.totalPriceEgp),
            }
          : c,
      ),
    );
  };

  // حساب الإجمالي الكلي بدقة بناءً على أسعار الخطط المختارة
  const totalPrice = selectedChapters.reduce(
    (sum, item) => sum + item.price,
    0,
  );

  const handleBuy = () => {
    if (selectedChapters.length === 0) return;

    navigate("/user/enrollment", {
      state: {
        type: "chapterIds",
        selectedItems: selectedChapters, // تمرير تفاصيل الخطط بالكامل للمرحلة القادمة
        ids: selectedChapters.map((c) => c.chapterId),
        price: totalPrice,
        name:
          selectedChapters.length === 1
            ? selectedChapters[0].chapterName
            : `${selectedChapters.length} Chapters`,
      },
    });
  };

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div className="p-4 md:p-6 lg:p-8 mx-auto min-h-screen relative pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-4 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Course Chapters
          </h1>
          <p className="text-gray-500">
            Select chapters to enroll or view details.
          </p>
        </div>

        {!isBuyMode ? (
          <button
            onClick={() => setIsBuyMode(true)}
            className="flex items-center gap-2 bg-one text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-one/20 hover:scale-105 active:scale-95 transition-all"
          >
            <ShoppingCart className="w-5 h-5" /> Buy Chapters
          </button>
        ) : (
          <button
            onClick={() => {
              setIsBuyMode(false);
              setSelectedChapters([]);
            }}
            className="flex items-center gap-2 bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-bold border border-red-100 hover:bg-red-100 transition-all"
          >
            <X className="w-5 h-5" /> Cancel Selection
          </button>
        )}
      </div>

      {/* Grid الشباتر */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {chapters.map((item) => {
          const style = getStyle(item.chapter.name);
          const selectedItem = selectedChapters.find(
            (c) => c.chapterId === item.chapter.id,
          );
          const isSelected = !!selectedItem;

          // جلب الخطة السعرية الحالية المعروضة
          const currentPlan = isSelected
            ? item.chapter.pricePlans.find((p) => p.id === selectedItem.planId)
            : getDefaultPlan(item.chapter.pricePlans);

          return (
            <div
              key={item.chapter.id}
              onClick={() => toggleSelection(item)}
              className={`group bg-white rounded-3xl border-2 p-6 flex flex-col h-full transition-all relative overflow-hidden ${
                isBuyMode
                  ? isSelected
                    ? "border-one ring-4 ring-one/10 scale-[1.02] shadow-xl"
                    : "border-gray-100 cursor-pointer hover:border-one/50"
                  : "border-gray-100 shadow-sm"
              }`}
            >
              {/* أيقونة الاختيار في وضع الشراء */}
              {isBuyMode && (
                <div
                  className={`absolute top-4 right-4 w-7 h-7 rounded-full border-4 border-white flex items-center justify-center shadow-md transition-all ${
                    isSelected
                      ? "bg-one text-white scale-110"
                      : "bg-gray-100 text-gray-300"
                  }`}
                >
                  {isSelected ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </div>
              )}

              {/* الأيقونة والترتيب */}
              <div className="flex justify-between items-start mb-5">
                <div
                  className={`p-3 rounded-2xl ${style.iconBg} ${style.text}`}
                >
                  <Layers className="w-6 h-6" />
                </div>
                {!isBuyMode && (
                  <span className="text-xs font-black text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
                    #{item.chapter.order}
                  </span>
                )}
              </div>

              {/* المحتوى النصي */}
              <div className="flex flex-col flex-grow">
                <h3 className="text-xl font-extrabold text-gray-800 mb-3 group-hover:text-one transition-colors">
                  {item.chapter.name}
                </h3>

                <div className="space-y-2.5 mb-5">
                  <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>{item.teacher.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                    <Layout className="w-4 h-4 text-gray-400" />
                    <span>{item.semester.name}</span>
                  </div>
                </div>

                {/* أزرار اختيار الخطة السعرية للشابتر (Grid ثنائي) */}
                {isBuyMode && item.chapter.pricePlans?.length > 0 && (
                  <div
                    className="mb-5 mt-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Select Plan:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {item.chapter.pricePlans.map((plan) => {
                        const isPlanSelected =
                          selectedItem?.planId === plan.id ||
                          (!isSelected && plan.isDefault);

                        return (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => {
                              if (!isSelected) toggleSelection(item);
                              handlePlanChange(item, plan.id);
                            }}
                            className={`text-center py-2 px-2 rounded-xl text-xs font-bold transition-all border duration-200 ${
                              isPlanSelected
                                ? "bg-one/10 border-one text-one shadow-sm shadow-one/5"
                                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300"
                            }`}
                          >
                            <div className="block truncate">
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

              {/* الفوتر الخاص بالكارت (السعر + تفاصيل) */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                <div className="flex flex-col">
                  {currentPlan ? (
                    <>
                      <span className="text-lg font-black text-gray-900">
                        {parseFloat(currentPlan.totalPriceEgp)} LE
                      </span>
                      {currentPlan.hasDiscount && (
                        <span className="text-xs text-gray-400 line-through">
                          {parseFloat(currentPlan.priceEgp)} LE
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-lg font-black text-gray-900">
                      N/A
                    </span>
                  )}
                </div>

                {!isBuyMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/user/chapter/${item.chapter.id}`);
                    }}
                    className="flex items-center gap-1 bg-gray-50 hover:bg-one/10 text-gray-700 hover:text-one px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200"
                  >
                    Details <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Checkout Bar */}
      {isBuyMode && selectedChapters.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-gray-900/95 backdrop-blur-md text-white p-5 rounded-[2.5rem] shadow-2xl z-50 flex items-center justify-between border border-white/10 animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="flex flex-col ml-2">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              Total Price
            </p>
            <p className="text-2xl font-black text-one">
              {totalPrice} <span className="text-xs">LE</span>
            </p>
          </div>

          <button
            onClick={handleBuy}
            className="bg-one hover:bg-one/90 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-one/20"
          >
            <Wallet className="w-5 h-5" /> Buy Now ({selectedChapters.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default Chapters;
