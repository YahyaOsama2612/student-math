import React, { useState } from 'react';
import { Search, Play, CheckCircle, Clock, BookOpen, ChevronRight, ChevronLeft, ArrowLeft, LayoutGrid } from 'lucide-react';
import ActiveExam from './ActiveExam';


const generateQuestions = (count) => {
  const questions = [];

  for (let i = 1; i <= count; i++) {
    questions.push({
      id: `q${i}`,
      text: `Sample Math Question ${i}: What is ${i} + ${i}?`,
      options: [
        `${i}`,
        `${i * 2}`,
        `${i + 1}`,
        `${i * 3}`
      ],
      correctAnswer: `${i * 2}`
    });
  }

  return questions;
};

export const mockExams = [
  {
    id: 1,
    title: "SAT Practice Test 1 - Math",
    description: "Official full-length practice test for the Digital SAT.",
    status: "new",
    questionsCount: 50,
    duration: "134 mins",
    questions: generateQuestions(50)
  },
  {
    id: 2,
    title: "SAT Practice Test 2 - Math",
    description: "Advanced SAT math practice exam.",
    status: "new",
    questionsCount: 50,
    duration: "134 mins",
    questions: generateQuestions(50)
  }
];

const Exams = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [activeExam, setActiveExam] = useState(null);

  if (activeExam) {
    return <ActiveExam exam={activeExam} onExit={() => setActiveExam(null)} />;
  }

  const filteredExams = mockExams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "all" || exam.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen w-screen bg-gray-50 p-8 font-sans">
      <div className=" mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Practice Tests</h1>
            <p className="text-gray-500 mt-1">Select a test to start practicing.</p>
          </div>
          <div className="relative w-full ">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search tests..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-one/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => (
            <div key={exam.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-one/10 rounded-lg text-one">
                  <BookOpen className="w-6 h-6" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">{exam.title}</h2>
              <p className="text-gray-500 text-sm mb-6 flex-grow">{exam.description}</p>
              <button 
                onClick={() => setActiveExam(exam)}
                className="w-full flex justify-center items-center bg-one hover:bg-one/80 text-white font-semibold py-3 rounded-lg transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 mr-2" fill="currentColor" />
                Start Test
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Exams;