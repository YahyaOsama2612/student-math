import React from "react";
import { useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loading";
import Errorpage from "@/components/Errorpage";
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Lock,
  Unlock,
  CheckCircle2,
  Wallet,
  AlertCircle,
  Lightbulb,
  Layers,
  FileText,
} from "lucide-react";

const Purchases = () => {
  const navigate = useNavigate();

  // جلب البيانات لجميع الأقسام بالتوازي
  const { data: coursesData, loading: coursesLoading, error: coursesError } = useGet("/api/user/courses/purchased");
  const { data: chaptersData, loading: chaptersLoading, error: chaptersError } = useGet("/api/user/chapters/purchased");
  const { data: lessonsData, loading: lessonsLoading, error: lessonsError } = useGet("/api/user/lessons/purchased");

  // معالجة حالة التحميل
  if (coursesLoading || chaptersLoading || lessonsLoading) return <Loader />;

  // معالجة حالة الخطأ (إذا فشل أي طلب)
  if (coursesError || chaptersError || lessonsError) {
    return <Errorpage error={coursesError || chaptersError || lessonsError} />;
  }

  // استخراج المصفوفات الأساسية بشكل آمن
  const courses = coursesData?.data?.courses || [];
  const rawChapters = chaptersData?.data?.chapters || [];
  const rawLessons = lessonsData?.data?.lessons || [];

  // مصفوفة تحتوي على جميع الـ IDs الخاصة بالكورسات التي يمتلكها المستخدم
  const purchasedCourseIds = courses.map((course) => course.id);

  // 1. فلترة الشباتر: نعرض الشابتر فقط لو مش تابع لأي كورس يمتلكه المستخدم (شابتر تم شراؤه منفصلاً)
  const chapters = rawChapters.filter((chapter) => {
    const associatedCourseId = chapter.courseId || chapter.course?.id;
    return !purchasedCourseIds.includes(associatedCourseId);
  });

  // 2. فلترة الدروس: نعرض الدرس فقط لو مش تابع لأي كورس يمتلكه المستخدم (درس تم شراؤه منفصلاً)
  const lessons = rawLessons.filter((lesson) => {
    const associatedCourseId = lesson.courseId || lesson.course?.id;
    return !purchasedCourseIds.includes(associatedCourseId);
  });

  // التحقق مما إذا كانت كل القوائم (بعد الفلترة) فارغة تماماً
  const isAllEmpty = courses.length === 0 && chapters.length === 0 && lessons.length === 0;

  // مكون فرعي لعرض كارت المحتوى لمنع تكرار الكود
  const ContentCard = ({ item, contentType }) => {
    const isExpired = new Date(item.expiresAt) < new Date();

    return (
      <div
        key={item.id || item.enrollmentId}
        className="flex flex-col justify-between p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
      >
        <div>
          {/* شارات الحالة */}
          <div className="flex justify-between items-start mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 capitalize">
              <Wallet className="w-3.5 h-3.5" />
              {item.status || "Active"}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                isExpired ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
              }`}
            >
              {isExpired ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              {isExpired ? "Expired" : "Access Active"}
            </span>
          </div>

          {/* العنوان والوصف */}
          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
            {item.name}
          </h3>
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {item.description || "No description provided."}
          </p>

          {/* تفاصيل إضافية */}
          <div className="space-y-2.5 border-t border-gray-100 pt-4 mb-6">
            {item.preRequisition && item.preRequisition !== "None" && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <GraduationCap className="w-4 h-4 text-gray-400" />
                <span>Prerequisite: {item.preRequisition}</span>
              </div>
            )}
            {item.whatYouGain && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Lightbulb className="w-4 h-4 text-emerald-500" />
                <span>Gain: {item.whatYouGain}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <CheckCircle2 className="w-4 h-4 text-gray-300" />
              <span>
                Purchased: {new Date(item.purchasedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* زر عرض المحتوى المعدل لتمرير الشباتر والدروس المفلترة */}
        <button
          disabled={isExpired}
          onClick={() => {
            // جلب الشباتر والدروس التي تنتمي لهذا الكورس تحديداً لتمريرها داخله
            const courseChapters = rawChapters.filter(ch => (ch.courseId || ch.course?.id) === item.id);
            const courseLessons = rawLessons.filter(ls => (ls.courseId || ls.course?.id) === item.id);

            navigate(`/user/contentdetails/${item.id}`, {
              state: { 
                contentType,
                passedChapters: courseChapters,
                passedLessons: courseLessons
              },
            });
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl font-medium transition-colors text-sm cursor-pointer"
        >
          <BookOpen className="w-4 h-4" />
          View Content
        </button>
      </div>
    );
  };

  return (
    <div className="min-w-full min-h-screen p-6 bg-gray-50/50">
      {/* الهيدر */}
      <div className="flex items-center gap-4 mb-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 transition-colors rounded-full hover:bg-gray-200"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            My Purchase History
          </h1>
          <p className="text-sm text-gray-500">
            Access your active subscriptions and content
          </p>
        </div>
      </div>

      {isAllEmpty ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white border border-dashed rounded-2xl border-gray-300">
          <AlertCircle className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-lg font-medium text-gray-700">
            No purchased items found.
          </p>
          <p className="text-sm text-gray-400">
            Items you purchase will appear right here.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* قسم الكورسات */}
          {courses.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-800">Purchased Courses ({courses.length})</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((item) => (
                  <ContentCard key={item.id || item.enrollmentId} item={item} contentType="courses" />
                ))}
              </div>
            </div>
          )}

          {/* قسم الشباتر */}
          {chapters.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
                <Layers className="w-5 h-5 text-purple-600" />
                <h2 className="text-xl font-bold text-gray-800">Purchased Chapters ({chapters.length})</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {chapters.map((item) => (
                  <ContentCard key={item.id || item.enrollmentId} item={item} contentType="chapters" />
                ))}
              </div>
            </div>
          )}

          {/* قسم الدروس */}
          {lessons.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h2 className="text-xl font-bold text-gray-800">Purchased Lessons ({lessons.length})</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lessons.map((item) => (
                  <ContentCard key={item.id || item.enrollmentId} item={item} contentType="lessons" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Purchases;