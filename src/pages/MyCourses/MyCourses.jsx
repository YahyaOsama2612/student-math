import React, { useState } from "react";
import useGet from "@/hooks/useGet";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import Loader from "@/components/Loading";
import Errorpage from "@/components/Errorpage";

const MyCourses = () => {
  const navigate = useNavigate();
  const { data, loading, error } = useGet("/api/user/courses");
  const courses = data?.data?.courses || [];

  const [isBuyMode, setIsBuyMode] = useState(false);
  // تخزين الكورسات المختارة مع الخطة المحددة لكل كورس
  const [selectedCourses, setSelectedCourses] = useState([]);

  // دالة مساعدة لجلب خطة السعر الافتراضية للكورس
  const getDefaultPlan = (plans) => {
    if (!plans || plans.length === 0) return null;
    return plans.find((plan) => plan.isDefault) || plans[0];
  };

  const toggleCourseSelection = (course) => {
    // لو مش في وضع الشراء، أو لو الكورس مشترى بالفعل، لا تفعل شيء
    if (!isBuyMode || course.isPurchased) return;

    setSelectedCourses((prev) => {
      const isExist = prev.find((item) => item.courseId === course.id);

      // لو الكورس مختار مسبقاً، نقوم بإلغاء تحديده
      if (isExist) {
        return prev.filter((item) => item.courseId !== course.id);
      }

      // لو مش مختار، بنختاره بالخطة الافتراضية الخاصة به تلقائياً كبداية
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

  // تغيير الخطة لكورس معين تم تحديده بالفعل
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

  // حساب الإجمالي بناءً على الخطط المختارة حالياً في الـ state
  const totalPrice = selectedCourses.reduce((sum, item) => sum + item.price, 0);

  const handleProceedToBuy = () => {
    if (selectedCourses.length === 0) return;

    // تمرير البيانات المفصلة إلى صفحة الـ Enrollment
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

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div className="p-4 md:p-6 lg:p-8 mx-auto min-h-screen relative pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-gray-900 mb-2 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-3xl font-black text-gray-900">Explore Courses</h1>
        </div>

        {/* زرار تفعيل وضع الشراء */}
        {!isBuyMode ? (
          <button
            onClick={() => setIsBuyMode(true)}
            className="flex items-center gap-2 bg-one text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-one/20 hover:scale-105 active:scale-95 transition-all"
          >
            <ShoppingCart className="w-5 h-5" />
            Buy Courses
          </button>
        ) : (
          <button
            onClick={() => {
              setIsBuyMode(false);
              setSelectedCourses([]);
            }}
            className="flex items-center gap-2 bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-bold border border-red-100 hover:bg-red-100 transition-all"
          >
            <X className="w-5 h-5" />
            Cancel Selection
          </button>
        )}
      </div>

      {/* Grid الكورسات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {courses.map((course) => {
          const selectedItem = selectedCourses.find(
            (c) => c.courseId === course.id,
          );
          const isSelected = !!selectedItem;
          const isPurchased = course.isPurchased;

          // جلب الخطة الحالية المعتمدة للعرض
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
              {/* أيقونة الاختيار تظهر في وضع الشراء (لو الكورس لسه مشتراهوش) */}
              {isBuyMode && !isPurchased && (
                <div
                  className={`absolute -top-2 -right-2 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow-lg transition-all ${
                    isSelected
                      ? "bg-one text-white scale-110"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isSelected ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </div>
              )}

              {/* شارة توضح إن الكورس تم شراؤه */}
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
                    <BookOpen className="w-3.5 h-3.5" />
                    {course.numberOfChapters} Chapters
                  </div>
                </div>

                {/* أزرار اختيار الخطة السعرية (Chips) بتصميم أنيق واحترافي */}
                {isBuyMode && !isPurchased && course.pricePlans?.length > 0 && (
                  <div
                    className="mb-4 px-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Select Plan:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {course.pricePlans.map((plan) => {
                        // التحقق هل هذه الخطة هي المختارة حالياً للكورس
                        const isPlanSelected =
                          selectedItem?.planId === plan.id ||
                          (!isSelected && plan.isDefault);

                        return (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => {
                              // لو الكورس غير محدد، نقوم بتحديده فوراً وتثبيت الخطة المضغوطة
                              if (!isSelected) toggleCourseSelection(course);
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
                {/* عرض السعر بناءً على الخطة أو كتابة Owned */}
                <div className="flex flex-col">
                  {isPurchased ? (
                    <span className="font-black text-green-600">Owned</span>
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
                    className="group flex items-center gap-2 px-4 py-2 bg-white rounded-2xl shadow-md 
                               hover:shadow-lg hover:bg-gray-50 active:scale-95 
                               transition-all duration-200"
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

      {/* Floating Checkout Bar */}
      {isBuyMode && selectedCourses.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-gray-900/95 backdrop-blur-md text-white p-5 rounded-[2.5rem] shadow-2xl z-50 flex items-center justify-between border border-white/10 animate-in fade-in slide-in-from-bottom-8 duration-500">
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
    </div>
  );
};

export default MyCourses;
