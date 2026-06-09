import React from "react";
import { useParams, useNavigate,useLocation } from "react-router-dom";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loading";
import Errorpage from "@/components/Errorpage";
import {
  ArrowLeft,
  BookOpen,
  User,
  GraduationCap,
  Lock,
  Unlock,
  CheckCircle2,
  Wallet,
  AlertCircle,
  Lightbulb,
} from "lucide-react";

const Lesson = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // استدعاء الـ API الخاص بتفاصيل الدرس
  const { data, loading, error } = useGet(`/api/user/lessons/${id}`);

  const responseData = data?.data;
  const lessonInfo = responseData?.lesson;
  const chapterInfo = responseData?.chapter;
  const courseInfo = responseData?.course;
  const teacherInfo = responseData?.teacher;
  const ideas = responseData?.ideas || [];
  const prices = responseData?.prices || [];
const isLocked = location.state?.fromPurchases ? false : responseData?.isLocked;

  // جلب السعر الافتراضي للدرس
  const defaultPricePlan = prices.find((p) => p.isDefault) || prices[0];
  const lessonPrice = defaultPricePlan
    ? parseFloat(defaultPricePlan.totalPriceEgp)
    : 0;

  const handleEnroll = () => {
    if (!defaultPricePlan) return;

    navigate("/user/enrollment", {
      state: {
        type: "lessonIds",
        selectedItems: [
          {
            id: lessonInfo.id,
            name: lessonInfo.name,
            planId: defaultPricePlan.id, // 👈 أضف هذا السطر لإرسال الـ ID الخاص بالخطة السعرية
            planLabel: defaultPricePlan.durationLabel,
            price: lessonPrice,
          },
        ],
        ids: [lessonInfo.id],
        price: lessonPrice,
        name: lessonInfo.name,
      },
    });
  };

  if (loading) return <Loader />;
  if (error || !lessonInfo) return <Errorpage />;

  return (
    <div className="p-4 md:p-6 lg:p-8 mx-auto min-h-screen max-w-4xl relative pb-24">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-medium mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Main Lesson Header Card */}
      <div className="bg-gray-900 text-white rounded-[2rem] p-6 md:p-8 mb-8 relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-one">
                Lesson {lessonInfo.order}
              </span>
              <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-gray-300">
                {courseInfo?.name} • {chapterInfo?.name}
              </span>
            </div>

            <h1 className="text-2xl md:text-4xl font-black mt-4 mb-3 text-white">
              {lessonInfo.name}
            </h1>

            <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
              <User className="w-4 h-4 text-one" />
              <span>Teacher: {teacherInfo?.name}</span>
            </div>
          </div>

          {/* Lock / Unlock Status Badge */}
          <div
            className={`self-start md:self-center px-4 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 ${
              isLocked
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-green-500/10 text-green-400 border border-green-500/20"
            }`}
          >
            {isLocked ? (
              <>
                <Lock className="w-4 h-4" /> Locked Content
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" /> Available
              </>
            )}
          </div>
        </div>
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-one opacity-10 blur-[80px]"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Content Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description Section */}
          {lessonInfo.description && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-3">
                About This Lesson
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {lessonInfo.description}
              </p>
            </div>
          )}

          {/* Pre-requisites & What you gain Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2 text-sm text-gray-500">
                <AlertCircle className="w-4 h-4 text-amber-500" />{" "}
                Pre-requisites
              </h4>
              <p className="text-sm text-gray-600">
                {lessonInfo.preRequisition || "No pre-requisites required."}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2 text-sm text-gray-500">
                <GraduationCap className="w-4 h-4 text-one" /> What You'll Learn
              </h4>
              <p className="text-sm text-gray-600">
                {lessonInfo.whatYouGain ||
                  "Core foundations and practical problem solving."}
              </p>
            </div>
          </div>

          {/* Lesson Ideas List */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-one" /> Lesson Key Ideas
            </h3>
            {ideas.length > 0 ? (
              <div className="space-y-3">
                {ideas.map((idea, index) => (
                  <div
                    key={idea.id || index}
                    className="flex gap-3 items-start"
                  >
                    <CheckCircle2 className="w-5 h-5 text-one shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-600">
                      {idea.idea || "No specific sub-topic text uploaded."}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">
                No specific sub-topics uploaded yet for this lesson.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar Action / Paywall Column */}
        <div className="lg:col-span-1">
          {isLocked ? (
            <div className="bg-white rounded-3xl border-2 border-amber-100 p-6 shadow-md sticky top-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mx-auto mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-800 mb-2">
                Unlock Lesson
              </h3>
              <p className="text-xs text-gray-500 mb-6">
                Get full instant access to videos, assignments, and files for
                this lesson.
              </p>

              {defaultPricePlan && (
                <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
                  <span className="text-3xl font-black text-gray-900">
                    {lessonPrice} LE
                  </span>
                  <span className="text-xs text-gray-400 block mt-1">
                    Access Period: {defaultPricePlan.durationLabel}
                  </span>
                </div>
              )}

              <button
                onClick={handleEnroll}
                className="w-full bg-one hover:bg-one/90 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-one/20"
              >
                <Wallet className="w-4 h-4" /> Enroll Now
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-emerald-100 p-6 shadow-md sticky top-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto mb-4">
                <Unlock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-800 mb-2">
                You Have Access
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                You are enrolled in this lesson. Enjoy learning!
              </p>
              <div className="text-xs font-bold text-emerald-600 bg-emerald-50 py-2 rounded-xl border border-emerald-100">
                Ready to stream
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lesson;
