import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useGet from '@/hooks/useGet'; // تأكد من المسار
import Loader from '@/components/Loading';
import Errorpage from '@/components/Errorpage';
import { 
  ArrowLeft, 
  Clock, 
  CreditCard, 
  BookOpen, 
  Target, 
  UserSquare,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const OneCourses = () => {
  const { id } = useParams(); // استخراج الـ ID من الـ URL
  const navigate = useNavigate();
  
  // جلب بيانات الكورس المحددة باستخدام الـ hook بتاعك
  const { data, loading, error } = useGet(`/api/user/courses/${id}`);
  
  const course = data?.data;

  if (loading) return <Loader />;
  if (error || !course) return <Errorpage />;

  return (
    <div className="p-4 md:p-6 lg:p-8  mx-auto min-h-screen">
      
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
        {/* تأثير لوني خفيف في الخلفية */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-one/5 rounded-full blur-3xl -z-10"></div>
        
        {/* صورة الكورس (أو Placeholder لو مفيش صورة) */}
        <div className="w-full md:w-1/3 aspect-video bg-gray-100 rounded-2xl overflow-hidden shadow-inner flex-shrink-0 flex items-center justify-center border border-gray-200">
          {course.image ? (
            <img src={course.image} alt={course.name} className="w-full h-full object-cover" />
          ) : (
            <BookOpen className="w-16 h-16 text-gray-300" />
          )}
        </div>

        {/* عنوان ووصف الكورس السريع */}
        <div className="flex-1 space-y-4">
          <div className="inline-block px-3 py-1 bg-one/10 text-one text-sm font-bold rounded-full">
            {course.duration || "Self-paced"}
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
            {course.name}
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed">
            {course.description || "No description provided for this course yet."}
          </p>
        </div>
      </div>

      {/* تقسيم الصفحة لعمودين (تفاصيل يمين وشمال) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* العمود الرئيسي (الشمال) - التفاصيل */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* ماذا ستتعلم (What You Gain) */}
          {course.whatYouGain && (
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-6 h-6 text-one" />
                <h2 className="text-xl font-bold text-gray-800">What You'll Gain</h2>
              </div>
              <p className="text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100/50">
                {course.whatYouGain}
              </p>
            </section>
          )}

          {/* المتطلبات (Pre-requisites) */}
          {course.preRequisition && (
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-6 h-6 text-amber-500" />
                <h2 className="text-xl font-bold text-gray-800">Prerequisites</h2>
              </div>
              <p className="text-gray-600 leading-relaxed bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50 text-amber-900">
                {course.preRequisition}
              </p>
            </section>
          )}

          {/* الترمات (Semesters) - تظهر فقط لو isHaveSemester بـ true */}
          {course.isHaveSemester && course.semesters?.length > 0 && (
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <Layers className="w-6 h-6 text-one" />
                <h2 className="text-xl font-bold text-gray-800">Course Semesters</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {course.semesters.map((sem) => (
                  <div 
                    key={sem.id}
                    // تقدر تفعل الـ onClick ده لما تعمل صفحة الترم
                    // onClick={() => navigate(`/user/courses/${course.id}/semester/${sem.id}`)}
                    className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 hover:border-one hover:shadow-md transition-all cursor-pointer group bg-gray-50 hover:bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-one/10 text-one flex items-center justify-center font-bold">
                        {sem.name.charAt(sem.name.length - 1)} {/* لاستخراج رقم الترم مثلاً */}
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

        {/* العمود الجانبي (اليمين) - ملخص الكورس */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 sticky top-24">
            
            {/* السعر */}
            <div className="mb-6">
              <span className="block text-sm text-gray-500 font-semibold mb-1">Total Course Price</span>
              <div className="flex items-end gap-2">
                <h3 className="text-4xl font-extrabold text-gray-900">{course.totalPrice}</h3>
                <span className="text-lg font-medium text-gray-500 mb-1">LE</span>
              </div>
              {course.discount > 0 && (
                <span className="text-sm text-red-500 font-medium line-through">
                  {course.price} LE
                </span>
              )}
            </div>

            <hr className="border-gray-100 mb-6" />

            {/* تفاصيل سريعة */}
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-gray-600">
                <Clock className="w-5 h-5 text-one opacity-70" />
                <span className="font-medium">Duration: {course.duration || "N/A"}</span>
              </li>
              <li className="flex items-start gap-3 text-gray-600">
                <UserSquare className="w-5 h-5 text-one opacity-70 mt-0.5" />
                <div>
                  <span className="font-medium block mb-1">Instructors:</span>
                  {course.teachers?.map((t, idx) => (
                    <span key={idx} className="block text-sm text-gray-500">
                      • {t.name} <span className="text-xs opacity-70">({t.role})</span>
                    </span>
                  ))}
                </div>
              </li>
            </ul>

            <button
            onClick={()=>navigate(`/user/chapters/${course.id}`)}
            className="w-full py-4 rounded-2xl bg-one hover:bg-one/90 text-white font-bold text-lg transition-all active:scale-95 shadow-md flex items-center justify-center gap-2">
              <BookOpen className="w-5 h-5" />
              See Chapters
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OneCourses;