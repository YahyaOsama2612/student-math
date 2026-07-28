import React, { useState, useEffect } from "react";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost";
import Loading from "../../components/Loading";
import Errorpage from "../../components/Errorpage";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

const Diagnostic = () => {
  const { data, loading, error } = useGet("/api/user/diagnostic-exams");
  const { postData } = usePost("");
  const navigate = useNavigate();

  const courses = data?.data?.data || [];
  const [activeCourseId, setActiveCourseId] = useState("");

  useEffect(() => {
    if (courses.length > 0 && !activeCourseId) {
      setActiveCourseId(courses[0].id);
    }
  }, [courses]);

  const selectedCourse = courses.find((c) => c.id === activeCourseId);
  const exams = selectedCourse?.diagnosticExams || [];

  // امتحانات اتقفلت لإن المحاولة اتبعتت خلاص (already submitted) من الباك اند
  // بنخزنها في localStorage عشان القفل يفضل شغال حتى لو اليوزر عمل reload
  // أو قفل الموقع وفتحه تاني، مش بس لحد ما الصفحة تتغير
  const BLOCKED_EXAMS_STORAGE_KEY = "diagnosticBlockedExams";

  const [blockedExamIds, setBlockedExamIds] = useState(() => {
    try {
      const stored = localStorage.getItem(BLOCKED_EXAMS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // كل مرة الـ state يتغير بنحفظه في localStorage تاني
  useEffect(() => {
    try {
      localStorage.setItem(
        BLOCKED_EXAMS_STORAGE_KEY,
        JSON.stringify(blockedExamIds),
      );
    } catch {
      // تجاهل لو الـ localStorage مش متاح (مثلاً في وضع التصفح الخاص)
    }
  }, [blockedExamIds]);

  // لو الباك اند رجع isCompleted: true لامتحان معين، يبقى بقى عندنا مصدر رسمي للحالة
  // فمش محتاجين نفضل معتمدين على القفل المحلي (localStorage) بتاعه تاني، فبنمسحه
  useEffect(() => {
    const completedIds = courses
      .flatMap((c) => c.diagnosticExams || [])
      .filter((exam) => exam.isCompleted)
      .map((exam) => exam.id);

    if (completedIds.length === 0) return;

    setBlockedExamIds((prev) => {
      let changed = false;
      const next = { ...prev };
      completedIds.forEach((id) => {
        if (next[id]) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [courses]);

  const handleStartExam = (exam) => {
    // التحقق من حالة الامتحان قبل البدء
    if (exam.isCompleted) {
      Swal.fire({
        title: "Already Solved",
        text: "You have already completed this exam.",
        icon: "info",
        confirmButtonColor: "#4f46e5",
      });
      return;
    }

    // الامتحان ده اتقفل خلاص لإن المحاولة اتبعتت من قبل، فمش هنحاول نبدأه تاني
    if (blockedExamIds[exam.id]) {
      Swal.fire({
        title: "Attempt Already Submitted",
        text: "This exam attempt has already been submitted. Please contact the responsible manager if you'd like it reopened.",
        icon: "warning",
        confirmButtonColor: "#4f46e5",
      });
      return;
    }

    Swal.fire({
      title: "Are you ready?",
      html: `
      <div style="text-align: left;">
        <p>You are about to start: <b>${exam.name}</b></p>
        <ul style="list-style: none; padding: 0; margin-top: 10px;">
          <li>⏱️ <b>Duration:</b> ${exam.duration} Minutes</li>
          <li>❓ <b>Questions:</b> ${exam.numberOfQuestions} Questions</li>
        </ul>
      </div>
    `,
      icon: "info",
      showCancelButton: true,
      confirmButtonColor: "#4f46e5",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, Start Now!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await postData(
            {},
            `/api/user/diagnostic-exams/${exam.id}/start`,
            "start",
          );
          if (res?.success || res?.status === 200) {
            navigate(`/user/activeexam/${exam.id}`, {
              state: { exam: exam.duration, attemptId: res.data.attemptId },
            });
          }
        } catch (err) {
          const serverMessage =
            err?.response?.data?.message || err?.message || "";

          if (serverMessage.includes("already been submitted")) {
            // نقفل الزرار خالص لهذا الامتحان ومنسمحش بمحاولة تانية
            setBlockedExamIds((prev) => ({ ...prev, [exam.id]: true }));
            Swal.fire({
              title: "Attempt Already Submitted",
              text: "This exam attempt has already been submitted. Please contact the responsible manager if you'd like it reopened.",
              icon: "warning",
              confirmButtonColor: "#4f46e5",
            });
          } else {
            Swal.fire("Error", "Failed to start exam", "error");
          }
        }
      }
    });
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  if (error)
    return (
      <div className="h-screen flex items-center justify-center">
        <Errorpage />
      </div>
    );

  return (
    <div className="p-6 mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Available Diagnostic Exams
        </h1>
      </header>

      {/* Tabs */}
      <div className="flex space-x-2 mb-8 overflow-x-auto pb-2">
        {courses.map((course) => (
          <button
            key={course.id}
            onClick={() => setActiveCourseId(course.id)}
            className={`px-6 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeCourseId === course.id
                ? "bg-one text-white shadow-lg"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {course.name}
          </button>
        ))}
      </div>

      {/* Exams Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {exams.length > 0 ? (
          exams.map((exam) => {
            // isCompleted من الباك اند هو المصدر الرسمي؛ القفل المحلي (localStorage)
            // بيتفعل بس لو الباك اند لسه ملحقش يبعت isCompleted: true للامتحان ده
            const isBlocked = !exam.isCompleted && !!blockedExamIds[exam.id];

            return (
              <div
                key={exam.id}
                className={`group border rounded-2xl p-5 shadow-sm transition-all duration-300 bg-white flex flex-col justify-between ${
                  exam.isCompleted || isBlocked
                    ? "opacity-75 border-gray-200"
                    : "hover:shadow-xl"
                }`}
              >
                <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-3">
                    {exam.name}
                  </h2>
                  <p className="text-gray-600 text-sm mb-4">
                    {exam.description}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg">
                      ⏱️ {exam.duration} Mins
                    </span>
                    <span className="bg-green-50 text-green-600 px-3 py-1.5 rounded-lg">
                      ❓ {exam.numberOfQuestions} Qs
                    </span>
                  </div>

                  {isBlocked && (
                    <p className="mt-3 text-xs font-semibold text-red-500">
                      Attempt already submitted. Contact the responsible manager
                      to reopen it.
                    </p>
                  )}
                </div>

                <button
                  className={`w-full mt-6 py-3 rounded-xl font-bold transition-all ${
                    exam.isCompleted
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : isBlocked
                        ? "bg-red-50 text-red-500 cursor-not-allowed"
                        : "bg-one text-white hover:bg-opacity-90 shadow-lg shadow-one/20"
                  }`}
                  onClick={() => handleStartExam(exam)}
                >
                  {exam.isCompleted
                    ? "Solved"
                    : isBlocked
                      ? "Contact Manager to Reopen"
                      : "Start Exam"}
                </button>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-10 text-gray-500">
            No exams available.
          </div>
        )}
      </div>
    </div>
  );
};

export default Diagnostic;
