import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useGet from '@/hooks/useGet';
import Loader from '@/components/Loading';
import Errorpage from '@/components/Errorpage';
import { 
  ArrowLeft, 
  PlayCircle, 
  Clock, 
  ShoppingCart,
  CheckCircle2,
  X,
  Plus,
  BookOpen,
  ChevronRight,
  Wallet 
} from 'lucide-react';

const OneChapter = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useGet(`/api/user/chapters/${id}`);

  const chapterData = data?.data?.chapter;
  const lessons = chapterData?.lessons || [];

  // وضع الشراء
  const [isBuyMode, setIsBuyMode] = useState(false);
  const [selectedLessons, setSelectedLessons] = useState([]);

  const toggleLesson = (lesson) => {
    if (!isBuyMode) return;
    setSelectedLessons((prev) => {
      const isExist = prev.find(l => l.id === lesson.id);
      if (isExist) return prev.filter(l => l.id !== lesson.id);
      return [...prev, lesson];
    });
  };

  const totalPrice = selectedLessons.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

  const handleBuy = () => {
    navigate('/user/enrollment', { 
      state: { 
        type: 'lessonIds', 
        ids: selectedLessons.map(l => l.id), 
        price: totalPrice,
        name: selectedLessons.length === 1 ? selectedLessons[0].name : `${selectedLessons.length} Lessons`
      } 
    });
  };

  if (loading) return <Loader />;
  if (error || !chapterData) return <Errorpage />;

  return (
    <div className="p-4 md:p-6 lg:p-8 mx-auto min-h-screen max-w-5xl relative pb-24">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        
        {!isBuyMode ? (
          <button onClick={() => setIsBuyMode(true)} className="flex items-center gap-2 text-one font-bold bg-one/10 px-4 py-2 rounded-xl">
            <ShoppingCart className="w-4 h-4" /> Buy Lessons
          </button>
        ) : (
          <button onClick={() => { setIsBuyMode(false); setSelectedLessons([]); }} className="text-red-500 font-bold flex items-center gap-2">
            <X className="w-4 h-4" /> Cancel
          </button>
        )}
      </div>

      {/* Header Card */}
      <div className="bg-gray-900 text-white rounded-[2rem] p-8 mb-10 relative overflow-hidden">
        <div className="relative z-10">
          <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-one">Order: {chapterData.chapter.order}</span>
          <h1 className="text-3xl md:text-5xl font-black mt-4 mb-4">{chapterData.chapter.name}</h1>
          <div className="flex gap-6 text-sm text-gray-400 font-bold">
            <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-one" /> {lessons.length} Lessons</span>
            <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-one" /> {chapterData.chapter.totalPrice} LE</span>
          </div>
        </div>
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-one opacity-10 blur-[80px]"></div>
      </div>

      {/* Lessons List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Chapter Lessons</h2>
        {lessons.map((lesson, index) => {
          const isSelected = selectedLessons.find(l => l.id === lesson.id);
          return (
            <div 
              key={lesson.id}
              onClick={() => toggleLesson(lesson)}
              className={`group bg-white rounded-2xl p-5 border-2 flex items-center gap-4 transition-all ${
                isBuyMode 
                ? isSelected ? "border-one bg-one/5" : "border-gray-100 cursor-pointer hover:border-one/30"
                : "border-gray-100"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-all ${
                isSelected ? "bg-one text-white" : "bg-gray-50 text-gray-400"
              }`}>
                {isBuyMode ? (isSelected ? <CheckCircle2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />) : index + 1}
              </div>
              
              <div className="flex-1">
                <h4 className="font-bold text-gray-800">{lesson.name}</h4>
                <p className="text-xs text-gray-400">{lesson.totalPrice} LE</p>
              </div>

              {!isBuyMode && (
                <div className="p-2 rounded-full bg-gray-50 text-gray-300 group-hover:bg-one group-hover:text-white transition-all">
                  <ChevronRight className="w-5 h-5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Checkout */}
      {isBuyMode && selectedLessons.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md bg-gray-900 text-white p-5 rounded-3xl shadow-2xl z-50 flex justify-between items-center px-8">
           <div><p className="text-xs text-gray-400">Total Price</p><p className="text-xl font-bold text-one">{totalPrice} LE</p></div>
           <button onClick={handleBuy} className="bg-one text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2">
             <Wallet className="w-5 h-5" /> Enroll Now ({selectedLessons.length})
           </button>
        </div>
      )}
    </div>
  );
};

export default OneChapter;