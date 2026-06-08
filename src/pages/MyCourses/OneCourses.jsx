import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loading";
import Errorpage from "@/components/Errorpage";
import {
  ArrowLeft,
  Clock,
  BookOpen,
  Target,
  UserSquare,
  Layers,
  CheckCircle2,
  AlertCircle,
  ShoppingCart,
  Eye,
} from "lucide-react";

const OneCourses = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, loading, error } = useGet(`/api/user/courses/${id}`);
  const course = data?.data;

  // State لتخزين الخطة السعرية المحددة من قبل المستخدم
  const [selectedPlan, setSelectedPlan] = useState(null);

  // دالة مساعدة لتعيين الخطة الافتراضية بمجرد تحميل بيانات الكورس
  useEffect(() => {
    if (course?.pricePlans && course.pricePlans.length > 0) {
      const defaultPlan =
        course.pricePlans.find((plan) => plan.isDefault) ||
        course.pricePlans[0];
      setSelectedPlan(defaultPlan);
    }
  }, [course]);

  if (loading) return <Loader />;
  if (error || !course) return <Errorpage />;

  // التحقق من حالة الشراء (بناءً على الـ response: إذا كان الكورس غير مغلق فالطالب يمتلكه)
  const isPurchased = !course.isLocked;

  const handleProceedToBuy = () => {
    if (!selectedPlan) return;

    // تمرير البيانات بالتفصيل لصفحة الـ Enrollment
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

  return (
    <div className="p-4 md:p-6 lg:p-8 mx-auto min-h-screen">
      {/* زر الرجوع */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-6 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Courses
      </button>

      {/* الهيدر (صورة الكورس واسمه) */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-8 items-center md:items-start relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-one/5 rounded-full blur-3xl -z-10"></div>

        <div className="w-full md:w-1/3 aspect-video bg-gray-100 rounded-2xl overflow-hidden shadow-inner flex-shrink-0 flex items-center justify-center border border-gray-200">
          {course.image ? (
            <img
              src={course.image}
              alt={course.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <BookOpen className="w-16 h-16 text-gray-300" />
          )}
        </div>

        <div className="flex-1 space-y-4">
          <div className="inline-block px-3 py-1 bg-one/10 text-one text-sm font-bold rounded-full">
            {selectedPlan ? selectedPlan.durationLabel : "Self-paced"}
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
            {course.name}
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed">
            {course.description ||
              "No description provided for this course yet."}
          </p>
        </div>
      </div>

      {/* تقسيم الصفحة لعمودين */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* العمود الرئيسي (الشمال) - التفاصيل */}
        <div className="lg:col-span-2 space-y-8">
          {/* اختيار الخطط السعرية - يظهر فقط إذا كان الكورس غير مشترى ولديه خطط */}
          {!isPurchased && course.pricePlans?.length > 0 && (
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="w-6 h-6 text-one" />
                <h2 className="text-xl font-bold text-gray-800">
                  Select Access Plan
                </h2>
              </div>

              {/* شبكة الأزرار الأنيقة (تتسع لأي عدد بانتظام هندسي) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {course.pricePlans.map((plan) => {
                  const isPlanSelected = selectedPlan?.id === plan.id;

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan)}
                      className={`text-center py-3 px-4 rounded-2xl text-sm font-bold transition-all border duration-200 ${
                        isPlanSelected
                          ? "bg-one/10 border-one text-one shadow-sm shadow-one/5 ring-2 ring-one/20"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300"
                      }`}
                    >
                      <div className="block truncate font-extrabold mb-0.5">
                        {plan.durationLabel}
                      </div>
                      <div
                        className={`text-xs ${isPlanSelected ? "text-one/80" : "text-gray-400"}`}
                      >
                        {parseFloat(plan.totalPriceEgp)} LE
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ماذا ستتعلم */}
          {course.whatYouGain && (
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-6 h-6 text-one" />
                <h2 className="text-xl font-bold text-gray-800">
                  What You'll Gain
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100/50">
                {course.whatYouGain}
              </p>
            </section>
          )}

          {/* المتطلبات */}
          {course.preRequisition && (
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-6 h-6 text-amber-500" />
                <h2 className="text-xl font-bold text-gray-800">
                  Prerequisites
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50 text-amber-900">
                {course.preRequisition}
              </p>
            </section>
          )}

          {/* الترمات */}
          {course.isHaveSemester && course.semesters?.length > 0 && (
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <Layers className="w-6 h-6 text-one" />
                <h2 className="text-xl font-bold text-gray-800">
                  Course Semesters
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {course.semesters.map((sem) => (
                  <div
                    key={sem.id}
                    className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 hover:border-one hover:shadow-md transition-all cursor-pointer group bg-gray-50 hover:bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-one/10 text-one flex items-center justify-center font-bold">
                        {sem.name.charAt(sem.name.length - 1)}
                      </div>
                      <span className="font-bold text-gray-700 group-hover:text-one transition-colors">
                        {sem.name}
                      </span>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-gray-300 group-hover:text-one transition-colors" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* العمود الجانبي (اليمين) - ملخص الكورس والأسعار والأزرار */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 sticky top-24">
            {/* السعر بناءً على الخطة المحددة */}
            <div className="mb-6">
              <span className="block text-sm text-gray-500 font-semibold mb-1">
                {isPurchased ? "Course Status" : "Selected Plan Price"}
              </span>
              {isPurchased ? (
                <h3 className="text-3xl font-extrabold text-green-600">
                  Owned & Unlocked
                </h3>
              ) : selectedPlan ? (
                <div>
                  <div className="flex items-end gap-2">
                    <h3 className="text-4xl font-extrabold text-gray-900">
                      {parseFloat(selectedPlan.totalPriceEgp)}
                    </h3>
                    <span className="text-lg font-medium text-gray-500 mb-1">
                      LE
                    </span>
                  </div>
                  {selectedPlan.hasDiscount && (
                    <span className="text-sm text-red-500 font-medium line-through">
                      {parseFloat(selectedPlan.priceEgp)} LE
                    </span>
                  )}
                  <span className="block text-xs text-gray-400 mt-1 font-medium">
                    Valid for {selectedPlan.durationLabel}
                  </span>
                </div>
              ) : (
                <h3 className="text-2xl font-extrabold text-gray-900">N/A</h3>
              )}
            </div>

            <hr className="border-gray-100 mb-6" />

            {/* تفاصيل سريعة */}
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-gray-600">
                <Clock className="w-5 h-5 text-one opacity-70" />
                <span className="font-medium">
                  Duration:{" "}
                  {selectedPlan ? selectedPlan.durationLabel : "Self-paced"}
                </span>
              </li>
              <li className="flex items-start gap-3 text-gray-600">
                <UserSquare className="w-5 h-5 text-one opacity-70 mt-0.5" />
                <div>
                  <span className="font-medium block mb-1">Instructors:</span>
                  {course.teachers?.map((t, idx) => (
                    <span key={idx} className="block text-sm text-gray-500">
                      • {t.name}{" "}
                      <span className="text-xs opacity-70">({t.role})</span>
                    </span>
                  ))}
                </div>
              </li>
            </ul>

            {/* الأزرار الديناميكية بدون حذف See Chapters */}
            <div className="space-y-3">
              {isPurchased ? (
                // لو الكورس مشترى، يظهر زر الدخول للفصول مباشرة
                <button
                  onClick={() => navigate(`/user/chapters/${course.id}`)}
                  className="w-full py-4 rounded-2xl bg-one hover:bg-one/90 text-white font-bold text-lg transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-5 h-5" />
                  Open Course / Chapters
                </button>
              ) : (
                // لو الكورس غير مشترى، يظهر زر الشراء وجنب أو تحت زر استعراض الفصول
                <>
                  <button
                    onClick={handleProceedToBuy}
                    disabled={!selectedPlan}
                    className="w-full py-4 rounded-2xl bg-one hover:bg-one/90 disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-bold text-lg transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Buy Now
                  </button>

                  <button
                    onClick={() => navigate(`/user/chapters/${course.id}`)}
                    className="w-full py-3.5 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-base transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Eye className="w-5 h-5 opacity-70" />
                    See Chapters Preview
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OneCourses;
