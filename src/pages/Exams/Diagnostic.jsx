import React, { useState } from 'react';
import useGet from '@/hooks/useGet';
import usePost from '@/hooks/usePost'
import Loading from '../../components/Loading';
import Errorpage from '../../components/Errorpage';
import Swal from 'sweetalert2'; // Make sure to install: npm install sweetalert2
import { useNavigate } from 'react-router-dom';

const Diagnostic = () => {
  // Fetch data from API
  const { data, loading, error } = useGet('/api/user/diagnostic-exams');
 const { postData, loading: userLoading, error: userError } = usePost('');
  // Access the exams array from your nested structure
  const exams = data?.data?.data || [];
const navigate = useNavigate();
  // 🔥 Filter States
  const [search, setSearch] = useState('');
  const [durationFilter, setDurationFilter] = useState('');
  const [questionsFilter, setQuestionsFilter] = useState('');
  const [scoreFilter, setScoreFilter] = useState('');

  // 🔍 Filter Logic
  const filteredExams = exams.filter((exam) => {
    // 1. Search by Name and Description
    const matchSearch =
      exam.name.toLowerCase().includes(search.toLowerCase()) ||
      exam.description?.toLowerCase().includes(search.toLowerCase());

    // 2. Duration Filter
    let matchDuration = true;
    if (durationFilter === 'short') matchDuration = exam.duration <= 30;
    if (durationFilter === 'medium') matchDuration = exam.duration > 30 && exam.duration <= 60;
    if (durationFilter === 'long') matchDuration = exam.duration > 60;

    // 3. Questions Filter
    let matchQuestions = true;
    if (questionsFilter === 'few') matchQuestions = exam.numberOfQuestions <= 20;
    if (questionsFilter === 'medium') matchQuestions = exam.numberOfQuestions > 20 && exam.numberOfQuestions <= 50;
    if (questionsFilter === 'many') matchQuestions = exam.numberOfQuestions > 50;

    // 4. Pass Score % Filter
    let matchScore = true;
    const percentage = (exam.passScore / exam.totalScore) * 100;
    if (scoreFilter === 'easy') matchScore = percentage <= 50;
    if (scoreFilter === 'medium') matchScore = percentage > 50 && percentage <= 75;
    if (scoreFilter === 'hard') matchScore = percentage > 75;

    return matchSearch && matchDuration && matchQuestions && matchScore;
  });

  // 🔥 Start Exam Confirmation Function
 const handleStartExam = (exam) => {
  Swal.fire({
    title: 'Are you ready?',
    html: `
      <div style="text-align: left;">
        <p>You are about to start: <b>${exam.name}</b></p>
        <ul style="list-style: none; padding: 0; margin-top: 10px;">
          <li>⏱️ <b>Duration:</b> ${exam.duration} Minutes</li>
          <li>❓ <b>Questions:</b> ${exam.numberOfQuestions} Questions</li>
        </ul>
        <p style="font-size: 0.875rem; color: #6b7280; margin-top: 8px;">
          Once you start, the timer will begin automatically.
        </p>
      </div>
    `,
    icon: 'info',
    showCancelButton: true,
    confirmButtonColor: '#4f46e5',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Yes, Start Now!',
    cancelButtonText: 'Cancel',
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const res = await postData({},
          `/api/user/diagnostic-exams/${exam.id}/start`,
          "start"
        );
        // لو عندك success flag من API
        if (res?.success || res?.status === 200) {
          navigate(`/user/activeexam/${exam.id}`, {
            state: { exam: exam.duration , attemptId: res.data.attemptId },
          });
        } else {
          Swal.fire('Error', 'Something went wrong', 'error');
        }
      } catch (error) {
        Swal.fire('Error', 'Failed to start exam', 'error');
      }
    }
  });
};

  if (loading) return <div className="h-screen flex items-center justify-center"><Loading /></div>;
  if (error) return <div className="h-screen flex items-center justify-center"><Errorpage /></div>;

  return (
    <div className="p-6  mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Available Diagnostic Exams</h1>
        <p className="text-gray-500">Select the appropriate exam to start your assessment</p>
      </header>

      {/* 🔍 Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Search */}
        <input
          type="text"
          placeholder="Search exams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border rounded-xl focus:ring-2 focus:ring-one outline-none transition-all"
        />

        {/* Duration */}
        <select
          value={durationFilter}
          onChange={(e) => setDurationFilter(e.target.value)}
          className="px-4 py-2 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-one"
        >
          <option value="">All Durations</option>
          <option value="short">Short (≤ 30 mins)</option>
          <option value="medium">Medium (30 - 60 mins)</option>
          <option value="long">Long (60+ mins)</option>
        </select>

        {/* Questions */}
        <select
          value={questionsFilter}
          onChange={(e) => setQuestionsFilter(e.target.value)}
          className="px-4 py-2 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-one"
        >
          <option value="">Questions Count</option>
          <option value="few">Few (≤ 20)</option>
          <option value="medium">Medium (20 - 50)</option>
          <option value="many">Many (50+)</option>
        </select>

        {/* Difficulty (Based on Pass %) */}
        <select
          value={scoreFilter}
          onChange={(e) => setScoreFilter(e.target.value)}
          className="px-4 py-2 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-one"
        >
          <option value="">Difficulty</option>
          <option value="easy">Easy (≤ 50% Pass)</option>
          <option value="medium">Medium (50% - 75%)</option>
          <option value="hard">Hard (75%+ Pass)</option>
        </select>
      </div>

      {/* 🗂️ Exams Grid */}
      {filteredExams.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed">
          <p className="text-gray-500 text-lg">No exams found matching your criteria.</p>
          <button 
            onClick={() => {setSearch(''); setDurationFilter(''); setQuestionsFilter(''); setScoreFilter('');}}
            className="mt-4 text-one font-semibold underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => (
            <div 
              key={exam.id} 
              className="group border rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 bg-white flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-xl font-bold text-gray-800 group-hover:text-one transition-colors">
                    {exam.name}
                  </h2>
                  <span className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-400 uppercase tracking-widest font-bold">
                    {exam.course?.name || 'General'}
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                  {exam.description || "No description provided for this exam."}
                </p>
                
                <div className="flex flex-wrap gap-2 mt-5 text-xs font-semibold">
                  <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg flex items-center gap-1">
                    ⏱️ {exam.duration} Mins
                  </span>
                  <span className="bg-green-50 text-green-600 px-3 py-1.5 rounded-lg flex items-center gap-1">
                    ❓ {exam.numberOfQuestions} Questions
                  </span>
                  <span className="bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg flex items-center gap-1">
                    🎯 Pass: {exam.passScore}/{exam.totalScore}
                  </span>
                </div>
              </div>

              <button 
                className="w-full mt-6 bg-one text-white py-3 rounded-xl font-bold hover:bg-opacity-90 active:scale-95 transition-all shadow-lg shadow-one/20"
                onClick={() => handleStartExam(exam)}
              >
                Start Exam
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Diagnostic;