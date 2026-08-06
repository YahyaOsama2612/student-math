import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { TbMathFunction, TbUserCircle, TbArrowBackUp } from "react-icons/tb";
import { Toaster, toast } from "react-hot-toast";
import api from "../api/api";
import Favlogo from "../../public/favicon.svg";
const AdminLayout = () => {
  const navigator = useNavigate();
  const [isImpersonated, setIsImpersonated] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    setIsImpersonated(localStorage.getItem("isImpersonated") === "true");
  }, []);

  const handleSwitchBack = async () => {
    setSwitching(true);
    try {
      const res = await api.post("/api/admin/auth/switch-back");

      // Adjust this path if your API returns the admin token elsewhere.
      const adminToken = res?.data?.data?.token;

      if (!adminToken) {
        throw new Error("No admin token returned from server");
      }

      localStorage.setItem("token", adminToken);
      localStorage.removeItem("isImpersonated");

      toast.success("Switched back to admin");

      // Adjust this to wherever your admin panel actually lives.
      window.location.href = "https://admin.mathshouse.net/";
    } catch (err) {
      const errorMsg =
        err.response?.data?.error?.message || "Failed to switch back";
      toast.error(errorMsg);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="min-h-screen max-w-screen  bg-[#F8FAFC] font-sans  overflow-x-hidden"  >

      {/* Navbar */}
      <nav className="h-16 bg-white border-b border-slate-200 fixed top-0 w-full z-50 px-6 flex items-center justify-between shadow-sm">
        <button onClick={()=>navigator("/user/home")} className="flex items-center gap-2">
          <div className=" p-1.5 rounded-lg">
         <img src={Favlogo} alt="Logo" className="w-6 h-6" />
          </div>

          <span className="text-lg font-bold text-slate-800 tracking-tight">
            Math<span className="text-one">Portal</span>
          </span>
        </button>

        <div className="flex items-center gap-3 cursor-pointer group transition-all">
          {isImpersonated && (
            <button
              onClick={handleSwitchBack}
              disabled={switching}
              title="Switch back to admin"
              className="flex items-center gap-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-60"
            >
              <TbArrowBackUp className="text-base" />
              {switching ? "Switching..." : "Switch back to admin"}
            </button>
          )}

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