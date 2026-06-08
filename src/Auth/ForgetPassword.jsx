import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TbMail, TbMathFunction } from "react-icons/tb";
import { Toaster, toast } from "react-hot-toast";
import usePost from "@/hooks/usePost";
import { TbChevronLeft } from "react-icons/tb";

const ForgetPassword = () => {
  const navigate = useNavigate();
  const { postData, loading } = usePost();

  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    try {
      await postData(
        { email },
        "/api/user/auth/forgot-password",
        "Verification code sent successfully ✅"
      );

      // نروح لصفحة إدخال الكود ونبعت معاها الإيميل
      navigate("/validateResetCode", { state: { email } });

    } catch (err) {
      toast.error("Something went wrong");
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
            Forgot Password
          </h1>

          <p className="text-slate-500 text-center mt-2">
            Enter your email to receive a verification code
          </p>
        </div>

        {/* Card */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>

              <div className="relative">
                <TbMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                <input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-one/10 focus:border-one outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-one hover:bg-[#5a0707] text-white font-bold py-4 rounded-xl shadow-lg shadow-one/20 transition-all flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Send Code"
              )}
            </button>

          </form>

 <button
            onClick={() => navigate('/')}
            className="w-full mt-6 flex items-center justify-center gap-2 text-slate-500 hover:text-one transition-colors text-sm font-medium"
          >
            <TbChevronLeft size={18} />
            back  Login
          </button>
        </div>

      </div>
      <Toaster position="top-right" />
    </div>
  );
};

export default ForgetPassword;