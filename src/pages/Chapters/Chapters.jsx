import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useGet from '@/hooks/useGet';
import Loader from '@/components/Loading';
import Errorpage from '@/components/Errorpage';
import { 
  ArrowLeft, 
  Layers, 
  ChevronRight, 
  User,
  Layout,
  ShoppingCart,
  CheckCircle2,
  X,
  Plus,
  Wallet
} from 'lucide-react';

const colorPalette = [
  { bg: "bg-red-100", text: "text-red-700", border: "border-red-200", iconBg: "bg-red-200/50" },
  { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200", iconBg: "bg-blue-200/50" },
  { bg: "bg-green-100", text: "text-green-700", border: "border-green-200", iconBg: "bg-green-200/50" },
  { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200", iconBg: "bg-purple-200/50" },
  { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200", iconBg: "bg-amber-200/50" },
];

const getStyle = (name) => {
  if (!name) return colorPalette[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const index = Math.abs(hash) % colorPalette.length;
  return colorPalette[index];
};

const Chapters = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useGet(`/api/user/chapters/course/${id}`);

  const chapters = data?.data?.chapters || [];

  // وضع الشراء
  const [isBuyMode, setIsBuyMode] = useState(false);
  const [selectedChapters, setSelectedChapters] = useState([]);

  const toggleSelection = (item) => {
    if (!isBuyMode) return;
    setSelectedChapters((prev) => {
      const isExist = prev.find(c => c.chapter.id === item.chapter.id);
      if (isExist) return prev.filter(c => c.chapter.id !== item.chapter.id);
      return [...prev, item];
    });
  };

  const totalPrice = selectedChapters.reduce((sum, item) => sum + (item.chapter.totalPrice || 0), 0);

  const handleBuy = () => {
    navigate('/user/enrollment', { 
      state: { 
        type: 'chapterIds', 
        ids: selectedChapters.map(c => c.chapter.id), 
        price: totalPrice,
        name: selectedChapters.length === 1 ? selectedChapters[0].chapter.name : `${selectedChapters.length} Chapters`
      } 
    });
  };

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div className="p-4 md:p-6 lg:p-8 mx-auto min-h-screen relative pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-4 transition-colors font-medium">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Course Chapters</h1>
          <p className="text-gray-500">Select chapters to enroll or view details.</p>
        </div>

        {!isBuyMode ? (
          <button onClick={() => setIsBuyMode(true)} className="flex items-center gap-2 bg-one text-white px-6 py-3 rounded-2xl font-bold shadow-lg">
            <ShoppingCart className="w-5 h-5" /> Buy Chapters
          </button>
        ) : (
          <button onClick={() => { setIsBuyMode(false); setSelectedChapters([]); }} className="flex items-center gap-2 bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-bold border border-red-100">
            <X className="w-5 h-5" /> Cancel
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {chapters.map((item) => {
          const style = getStyle(item.chapter.name);
          const isSelected = selectedChapters.find(c => c.chapter.id === item.chapter.id);

          return (
            <div 
              key={item.chapter.id}
              onClick={() => toggleSelection(item)}
              className={`group bg-white rounded-3xl border-2 p-6 transition-all relative overflow-hidden ${
                isBuyMode 
                ? isSelected ? "border-one ring-4 ring-one/10 scale-[1.02]" : "border-gray-100 cursor-pointer hover:border-one/50"
                : "border-gray-100"
              }`}
            >
              {isBuyMode && (
                <div className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  isSelected ? "bg-one text-white" : "bg-gray-100 text-gray-300"
                }`}>
                  {isSelected ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
              )}

              <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-2xl ${style.iconBg} ${style.text}`}>
                  <Layers className="w-6 h-6" />
                </div>
                {!isBuyMode && <span className="text-xs font-bold text-gray-400">#{item.chapter.order}</span>}
              </div>

              <h3 className="text-xl font-bold text-gray-800 mb-2">{item.chapter.name}</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-500"><User className="w-4 h-4" /> <span>{item.teacher.name}</span></div>
                <div className="flex items-center gap-2 text-sm text-gray-500"><Layout className="w-4 h-4" /> <span>{item.semester.name}</span></div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <span className="text-lg font-bold text-gray-900">{item.chapter.totalPrice} LE</span>
                {!isBuyMode && (
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/user/chapter/${item.chapter.id}`); }} className="flex items-center gap-1 text-one font-bold text-sm">
                    Details <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isBuyMode && selectedChapters.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-gray-900 text-white p-5 rounded-[2.5rem] shadow-2xl z-50 flex items-center justify-between">
          <div><p className="text-xs text-gray-400 uppercase">Total</p><p className="text-2xl font-black text-one">{totalPrice} LE</p></div>
          <button onClick={handleBuy} className="bg-one px-8 py-4 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-one/20">
            <Wallet className="w-5 h-5" /> Buy Now ({selectedChapters.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default Chapters;