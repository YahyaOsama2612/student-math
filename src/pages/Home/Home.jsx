import React from "react";
import {
  CreditCard,
  Wallet,
  ShoppingBag,
  FileSearch,
  BarChart,
  Clock,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SiCoursera } from "react-icons/si";

// 1. مصفوفة البيانات: فصلنا الداتا عن الـ UI عشان لو حبيت تزود كارت رابع يكون في ثانية
const mainFeatures = [
  {
    title: "Payments",
    description: "Manage your transactions and check your balance easily",
    MainIcon: CreditCard,
    buttons: [
      { label: "Payment", icon: CreditCard, path: "/user/payment" },
      { label: "Wallet", icon: Wallet, path: "/user/wallet" },
    ],
  },
  {
    title: "Attend",
    // تم تعديل الوصف ليتناسب مع الحضور بدلاً من المعاملات المالية
    description: "Track your upcoming sessions and review your attendance history",
    MainIcon: ShoppingBag,
    buttons: [
      { label: "Upcoming", icon: BarChart, path: "/user/upcoming" },
      { label: "History", icon: Clock, path: "/user/history" },
    ],
  },
  {
    title: "Exams",
    description: "Take exams, evaluate your level, and track your performance",
    MainIcon: FileSearch,
    buttons: [
      { label: "Exam", icon: FileText, path: "/user/exams" },
      { label: "Diagnostic Exam", icon: BarChart, path: "/user/diagnostic" },
    ],
  },
  {
    title: "Buy Courses",
    description: "Learn new skills and improve your knowledge",
    MainIcon: SiCoursera,
    buttons: [
      { label: "Buy Courses", icon: FileText, path: "/user/mycourses" },
      { label: "Lesson", icon: BarChart, path: "/user/lesson" },
    ],
  },
];

// 2. Component مخصص للكروت الرئيسية لمنع التكرار
const ActionCard = ({ title, description, MainIcon, buttons, navigate }) => {
  return (
    <Card className="p-6 bg-white/20 backdrop-blur-lg border border-white/20 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 group hover:scale-[1.02]">
      {/* استخدمنا h-full هنا عشان لو الوصف طوله اختلف، الزراير تفضل متساوية تحت */}
      <div className="flex flex-col gap-6 h-full">
        <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-sm border border-white/30 rounded-3xl group-hover:scale-110 transition-transform duration-300">
          <MainIcon className="text-one w-8 h-8" />
        </div>

        <div className="space-y-2 flex-grow">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            {title}
          </h2>
          <p className="text-sm text-gray-600">{description}</p>
        </div>

        {/* mt-auto بتزق الزراير لآخر الكارت دايماً */}
        <div className="flex flex-col gap-4 mt-auto">
          {buttons.map((btn, idx) => (
            <button
              key={idx}
              onClick={() => navigate(btn.path)}
              className="flex items-center justify-center gap-3 bg-gradient-to-r from-one to-one/80 text-white px-5 py-3 rounded-2xl font-semibold hover:scale-95 active:scale-95 transition-all shadow-lg hover:shadow-2xl"
            >
              <btn.icon size={20} />
              <span>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
};

const Home = () => {
  const navigate = useNavigate();

  return (
    // ضفنا max-w-7xl عشان الصفحة متبقاش ممطوطة جداً في الشاشات العملاقة
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* رسم الكروت الرئيسية بشكل ديناميكي */}
        {mainFeatures.map((feature, index) => (
          <ActionCard key={index} {...feature} navigate={navigate} />
        ))}

      
        <Card>
          <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
          <img
            src="https://via.placeholder.com/300x150"
            alt="Activity"
            className="rounded-xl w-full object-cover"
          />
        </Card>

        <Card className="flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 bg-gray-50/50">
          <h2 className="text-lg font-bold">Upcoming Feature</h2>
        </Card>

        <Card className="flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 bg-gray-50/50">
          <h2 className="text-lg font-bold">Quick Links</h2>
        </Card>
      </div>
    </div>
  );
};

// 3. إصلاح الـ Card Component: ضفنا className عشان يقبل الكلاسات اللي بتتبعتله ويدمجها
const Card = ({ children, className = "" }) => {
  return (
    <div className={`bg-white rounded-2xl shadow-md p-4 min-h-[150px] hover:shadow-xl transition ${className}`}>
      {children}
    </div>
  );
};

export default Home;