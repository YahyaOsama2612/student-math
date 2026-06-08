import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { TbMathFunction, TbUserCircle } from "react-icons/tb";
import { Toaster } from "react-hot-toast";

const AdminLayout = () => {
  const navigator = useNavigate();
  return (
    <div className="min-h-screen max-w-screen  bg-[#F8FAFC] font-sans  overflow-x-hidden"  >

      {/* Navbar */}
      <nav className="h-16 bg-white border-b border-slate-200 fixed top-0 w-full z-50 px-6 flex items-center justify-between shadow-sm">
        <button onClick={()=>navigator("/user/home")} className="flex items-center gap-2">
          <div className="bg-one p-1.5 rounded-lg">
            <TbMathFunction className="text-white text-xl" />
          </div>

          <span className="text-lg font-bold text-slate-800 tracking-tight">
            Math<span className="text-one">Portal</span>
          </span>
        </button>

        <div className="flex items-center gap-3 cursor-pointer group transition-all">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-700 leading-none group-hover:text-one">
               User
            </p>
          </div>

<button onClick={()=>navigator("/user/profile")}>
          <TbUserCircle className="text-3xl text-slate-400 group-hover:text-one transition-colors" />
</button>
        </div>
      </nav>

      {/* Pages */}
<main className="pt-20  mx-auto">
          <Outlet />
      </main>
      <Toaster position="top-center" reverseOrder={false} />

    </div>
  );
};

export default AdminLayout;