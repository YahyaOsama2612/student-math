
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { TbLock, TbMathFunction } from "react-icons/tb";
import { Toaster, toast } from "react-hot-toast";
import usePost from "@/hooks/usePost";
import {  TbChevronLeft } from "react-icons/tb";

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { postData, loading } = usePost();

  const email = location.state?.email;
  const code = location.state?.code;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!email || !code) {
      navigate("/");
    }
  }, [email, code, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match ❌");
      return;
    }

    try {
      await postData(
        {
          email,
          code,
          newPassword,
        },
        "/api/user/auth/reset-password",
        "Password reset successfully 🔐"
      );

      navigate("/");
    } catch (err) {
        
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-one rounded-2xl flex items-center justify-center shadow-xl shadow-one/20 mb-6">
            <TbMathFunction className="text-3xl text-white" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Reset Password
          </h1>

          <p className="text-slate-500 text-center mt-2">
            Create a new password for your account
          </p>
        </div>

        {/* Card */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                New Password
              </label>

              <div className="relative">
                <TbLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-one/10 focus:border-one outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Confirm Password
              </label>

              <div className="relative">
                <TbLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-one/10 focus:border-one outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-one hover:bg-[#5a0707] text-white font-bold py-4 rounded-xl shadow-lg shadow-one/20 transition-all flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Reset Password"
              )}
            </button>

          </form>
         <button
                    onClick={() => navigate("/forgetpassword")}
                    className="w-full mt-6 flex items-center justify-center gap-2 text-slate-500 hover:text-one transition-colors text-sm font-medium"
                  >
                    <TbChevronLeft size={18} />
                    Edit Email
                  </button>
        </div>
      </div>

      <Toaster position="top-right" />
    </div>
  );
};

export default ResetPassword;

