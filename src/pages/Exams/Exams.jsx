import React, { useState, useMemo, useEffect } from "react";
import { Play } from "lucide-react";
import Swal from "sweetalert2"; // تم إضافة SweetAlert2 للتنبيهات
import useGet from "../../hooks/useGet";
import usePost from "../../hooks/usePost";
import ActiveExam from "./ActiveExam";

const Exams = () => {
  const { data: response, loading, error } = useGet("api/user/exams");
  const { postData } = usePost("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeExam, setActiveExam] = useState(null);
  const [activeTab, setActiveTab] = useState("");

  // استخراج التبويبات الفريدة
  const tabs = useMemo(() => {
    if (!response?.data?.courses) return [];
    const codes = new Set();
    response.data.courses.forEach((course) => {
      course.exams.forEach((exam) => {
        if (exam.codeName) codes.add(exam.codeName);
      });
    });
    return Array.from(codes);
  }, [response]);

  useEffect(() => {
    if (tabs.length > 0 && !activeTab) {
      setActiveTab(tabs[0]);
    }
  }, [tabs, activeTab]);

  // دالة البدء التي تتصل بالسيرفر
  const handleStartExam = async (exam) => {
    try {
      // إرسال طلب البدء للسيرفر
      const res = await postData(
        {},
        `/api/user/exams/${exam.id}/start`,
        "start",
      );

      if (res?.success || res?.status === 200) {
        // تمرير الـ attemptId القادم من السيرفر إلى مكون ActiveExam
        setActiveExam({ ...exam, attemptId: res.data.attemptId });
      } else {
        Swal.fire("Error", "Could not start the exam", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Failed to connect to server", "error");
    }
  };

  if (activeExam) {
    return <ActiveExam exam={activeExam} onExit={() => setActiveExam(null)} />;
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const courses = response?.data?.courses || [];

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Practice Tests
        </h1>

        {/* التبات (Tabs) */}
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                activeTab === tab
                  ? "bg-one text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* عرض الامتحانات */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) =>
            course.exams
              .filter(
                (exam) =>
                  exam.codeName === activeTab &&
                  exam.title.toLowerCase().includes(searchTerm.toLowerCase()),
              )
              .map((exam) => (
                <div
                  key={exam.id}
                  className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow"
                >
                  <h2 className="text-xl font-bold mb-2">{exam.title}</h2>
                  <p className="text-gray-500 text-sm mb-4">
                    {exam.description}
                  </p>
                  <button
                    onClick={() => handleStartExam(exam)}
                    className="w-full flex justify-center items-center bg-one text-white py-2 rounded-lg hover:bg-opacity-90 transition-all"
                  >
                    <Play className="w-4 h-4 mr-2" /> Start Test
                  </button>
                </div>
              )),
          )}
        </div>
      </div>
    </div>
  );
};

export default Exams;
