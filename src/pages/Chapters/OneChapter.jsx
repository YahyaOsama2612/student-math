import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loading";
import Errorpage from "@/components/Errorpage";
import {
  ArrowLeft,
  ShoppingCart,
  CheckCircle2,
  X,
  Plus,
  BookOpen,
  ChevronRight,
  Wallet,
  Clock,
} from "lucide-react";

const OneChapter = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useGet(`/api/user/chapters/${id}`);

  // استخراج البيانات بناءً على هيكلة الـ Response الجديدة
  const responseData = data?.data;
  const chapterInfo = responseData?.chapter;
  const lessons = responseData?.lessons || [];

  // وضع الشراء
  const [isBuyMode, setIsBuyMode] = useState(false);

  // تخزين الدروس المختارة مع الخطة المحددة لكل درس
  const [selectedLessons, setSelectedLessons] = useState([]);

  // دالة مساعدة لجلب خطة السعر الافتراضية للدرس
  const getDefaultPlan = (plans) => {
    if (!plans || plans.length === 0) return null;
    return plans.find((plan) => plan.isDefault) || plans[0];
  };

  const toggleLesson = (lesson) => {
    if (!isBuyMode) {
      // التوجيه لصفحة الدرس الواحد عند الضغط عليه في الوضع العادي
      navigate(`/user/lesson/${lesson.id}`);
      return;
    }

    setSelectedLessons((prev) => {
      const isExist = prev.find((item) => item.lessonId === lesson.id);

      // لو الدرس مختار مسبقاً، نقوم بإلغاء تحديده
      if (isExist) {
        return prev.filter((item) => item.lessonId !== lesson.id);
      }

      // لو مش مختار، بنختاره بالخطة الافتراضية الخاصة به تلقائياً كبداية
      const defaultPlan = getDefaultPlan(lesson.pricePlans);
      return [
        ...prev,
        {
          lessonId: lesson.id,
          lessonName: lesson.name,
          planId: defaultPlan?.id || null,
          planLabel: defaultPlan?.durationLabel || "",
          price: defaultPlan ? parseFloat(defaultPlan.totalPriceEgp) : 0,
        },
      ];
    });
  };

  // تغيير الخطة لدرس معين تم تحديده بالفعل
  const handlePlanChange = (lesson, planId) => {
    const selectedPlan = lesson.pricePlans.find((p) => p.id === planId);
    if (!selectedPlan) return;

    setSelectedLessons((prev) =>
      prev.map((item) =>
        item.lessonId === lesson.id
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

  // حساب السعر الإجمالي بناءً على الخطط المختارة حالياً في الـ state
  const totalPrice = selectedLessons.reduce((sum, item) => sum + item.price, 0);

  // جلب السعر الافتراضي للشابتر بالكامل لعرضه في الهيدر
  const defaultPlan =
    chapterInfo?.pricePlans?.find((p) => p.isDefault) ||
    chapterInfo?.pricePlans?.[0];
  const chapterPrice = defaultPlan ? parseFloat(defaultPlan.totalPriceEgp) : 0;

  const handleBuy = () => {
    if (selectedLessons.length === 0) return;

    navigate("/user/enrollment", {
      state: {
        type: "lessonIds",
        selectedItems: selectedLessons,
        ids: selectedLessons.map((l) => l.lessonId),
        price: totalPrice,
        name:
          selectedLessons.length === 1
            ? selectedLessons[0].lessonName
            : `${selectedLessons.length} Lessons`,
      },
    });
  };

  if (loading) return <Loader />;
  if (error || !chapterInfo) return <Errorpage />;

  return (
    <div className="p-4 md:p-6 lg:p-8 mx-auto min-h-screen max-w-5xl relative pb-24">
      {/* Navigation & Actions */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {!isBuyMode ? (
          <button
            onClick={() => setIsBuyMode(true)}
            className="flex items-center gap-2 text-one font-bold bg-one/10 px-4 py-2 rounded-xl"
          >
            <ShoppingCart className="w-4 h-4" /> Buy Lessons
          </button>
        ) : (
          <button
            onClick={() => {
              setIsBuyMode(false);
              setSelectedLessons([]);
            }}
            className="text-red-500 font-bold flex items-center gap-2"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
        )}
      </div>

      {/* Header Card */}
      <div className="bg-gray-900 text-white rounded-[2rem] p-8 mb-10 relative overflow-hidden">
        <div className="relative z-10">
          <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-one">
            Order: {chapterInfo.order}
          </span>
          <h1 className="text-3xl md:text-5xl font-black mt-4 mb-4">
            {chapterInfo.name}
          </h1>
          <div className="flex gap-6 text-sm text-gray-400 font-bold">
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-one" /> {lessons.length} Lessons
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-one" /> {chapterPrice} LE (Full
              Chapter)
            </span>
          </div>
        </div>
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-one opacity-10 blur-[80px]"></div>
      </div>

      {/* Lessons List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Chapter Lessons
        </h2>
        {lessons.map((lesson, index) => {
          const selectedItem = selectedLessons.find(
            (l) => l.lessonId === lesson.id,
          );
          const isSelected = !!selectedItem;

          // جلب الخطة الحالية المعتمدة للعرض في تفاصيل الدرس
          const currentPlan = isSelected
            ? lesson.pricePlans?.find((p) => p.id === selectedItem.planId)
            : getDefaultPlan(lesson.pricePlans);

          const lessonPriceLabel = currentPlan
            ? `${parseFloat(currentPlan.totalPriceEgp)} LE`
            : "Included in Chapter";

          return (
            <div
              key={lesson.id}
              onClick={() => toggleLesson(lesson)}
              className={`group bg-white rounded-2xl p-5 border-2 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                isBuyMode
                  ? isSelected
                    ? "border-one bg-one/5"
                    : "border-gray-100 cursor-pointer hover:border-one/30"
                  : "border-gray-100 cursor-pointer hover:border-one/30"
              }`}
            >
              {/* قسم اليسار: الأيقونة، اسم الدرس، السعر الحالي المعتمد */}
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-all flex-shrink-0 ${
                    isSelected
                      ? "bg-one text-white"
                      : "bg-gray-50 text-gray-400"
                  }`}
                >
                  {isBuyMode ? (
                    isSelected ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Plus className="w-5 h-5" />
                    )
                  ) : (
                    index + 1
                  )}
                </div>

                <div className="min-w-0">
                  <h4 className="font-bold text-gray-800 group-hover:text-one transition-colors truncate">
                    {lesson.name}
                  </h4>
                  <p className="text-xs text-gray-400 font-medium">
                    {lessonPriceLabel}{" "}
                    {currentPlan && `• ${currentPlan.durationLabel}`}
                  </p>
                </div>
              </div>

              {/* قسم الوسط واليمين: الـ Price Plans (يظهر فقط في وضع الشراء) */}
              {isBuyMode && lesson.pricePlans?.length > 0 && (
                <div
                  className="flex flex-wrap gap-2 items-center justify-start md:justify-end w-full md:w-auto max-w-full md:max-w-md bg-gray-50/50 p-2 rounded-xl md:bg-transparent md:p-0"
                  onClick={(e) => e.stopPropagation()} // منع الـ toggle الرئيسي للكارت عند اختيار خطة
                >
                  {lesson.pricePlans.map((plan) => {
                    const isPlanSelected =
                      selectedItem?.planId === plan.id ||
                      (!isSelected && plan.isDefault);

                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => {
                          // إذا لم يكن الدرس محدداً بعد، نحدده أولاً ثم نطبق الخطة
                          if (!isSelected) toggleLesson(lesson);
                          handlePlanChange(lesson, plan.id);
                        }}
                        className={`flex-1 md:flex-initial min-w-[85px] md:min-w-[90px] text-center py-1.5 px-3 rounded-xl text-xs font-bold transition-all border duration-200 ${
                          isPlanSelected
                            ? "bg-one border-one text-white shadow-md shadow-one/20"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                        }`}
                      >
                        <div className="whitespace-nowrap">
                          {plan.durationLabel}
                        </div>
                        <div
                          className={`text-[10px] mt-0.5 font-medium ${isPlanSelected ? "text-white/80" : "text-gray-400"}`}
                        >
                          {parseFloat(plan.totalPriceEgp)} LE
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* أيقونة الانتقال في الوضع العادي */}
              {!isBuyMode && (
                <div className="p-2 rounded-full bg-gray-50 text-gray-300 group-hover:bg-one group-hover:text-white transition-all hidden md:block">
                  <ChevronRight className="w-5 h-5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Checkout */}
      {isBuyMode && selectedLessons.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-gray-900 text-white p-5 rounded-3xl shadow-2xl z-50 flex justify-between items-center px-8 animate-in fade-in slide-in-from-bottom-8 duration-300">
          <div>
            <p className="text-xs text-gray-400">Total Price</p>
            <p className="text-xl font-bold text-one">{totalPrice} LE</p>
          </div>
          <button
            onClick={handleBuy}
            className="bg-one text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2"
          >
            <Wallet className="w-5 h-5" /> Enroll Now ({selectedLessons.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default OneChapter;
