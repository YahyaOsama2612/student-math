import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { TbMail, TbChevronLeft, TbMathFunction } from "react-icons/tb";
import { Toaster, toast } from "react-hot-toast";
import usePost from "@/hooks/usePost";

const ResendVerificationEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { postData, loading } = usePost();

  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      navigate("/"); // لو مفيش إيميل، نرجع للصفحة السابقة
    }
  }, [email, navigate]);

  const handleResend = async () => {
    try {
      await postData(
        { email },
        "/api/user/auth/resend-verification-email",
        "Verification email sent ✅"
      );
    } catch (err) {
      // الخطأ متعالج داخل usePost غالبًا، لو مش كده ممكن نعمل toast.error(err.message)
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
            Resend Verification Email
          </h1>

          <p className="text-slate-500 text-center mt-2">
            We'll resend the verification email to your account
          </p>
        </div>

        {/* Card */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">

          {/* Email display */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <div className="relative">
              <TbMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email || ""}
                readOnly
                className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>
          </div>

          {/* Resend button */}
          <button
            onClick={handleResend}
            disabled={loading}
            className="w-full bg-one hover:bg-[#5a0707] text-white font-bold py-4 rounded-xl shadow-lg shadow-one/20 transition-all flex items-center justify-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Resend Email"
            )}
          </button>

          {/* Back button */}
          <button
            onClick={() => navigate("/")}
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

export default ResendVerificationEmail;