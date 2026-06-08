import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { TbMathFunction, TbLockCheck, TbChevronLeft } from "react-icons/tb";

// Hooks
import usePost from "@/hooks/usePost";

const ValidateResetCode = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { postData, loading } = usePost();

  const email = location.state?.email;

  const [code, setCode] = useState(["", "", "", "", "", ""]);

  useEffect(() => {
    if (!email) {
      navigate("/");
    }
  }, [email, navigate]);

  const handleChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      document.getElementById(`code-${index + 1}`).focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      document.getElementById(`code-${index - 1}`).focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalCode = code.join("");

    try {
      await postData(
        { email, code: finalCode },
        "/api/user/auth/validate-reset-code",
        "Code verified successfully! ✅"
      );

      navigate("/resetpassword", { state: { email, code: finalCode } });
    } catch (err) {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-6">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-one rounded-2xl flex items-center justify-center shadow-xl shadow-one/20 mb-6">
            <TbMathFunction className="text-3xl text-white" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Verify Your Email
          </h1>

          <p className="text-slate-500 text-center mt-2">
            We've sent a verification code to <br />
            <span className="font-semibold text-slate-700">{email}</span>
          </p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* OTP Inputs */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-4 text-center">
                Verification Code
              </label>

              <div className="flex justify-center gap-3">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    type="text"
                    value={digit}
                    maxLength={1}
                    onChange={(e) =>
                      handleChange(e.target.value, index)
                    }
                    onKeyDown={(e) =>
                      handleKeyDown(e, index)
                    }
                    className="w-12 h-14 text-center text-xl font-bold border border-slate-300 rounded-xl focus:ring-4 focus:ring-one/10 focus:border-one outline-none"
                  />
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || code.join("").length < 6}
              className="w-full bg-one hover:bg-[#5a0707] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-2xl shadow-lg shadow-one/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Verify Code"
              )}
            </button>

          </form>
          <button
            onClick={() => navigate(-1)}
            className="w-full mt-6 flex items-center justify-center gap-2 text-slate-500 hover:text-one transition-colors text-sm font-medium"
          >
            <TbChevronLeft size={18} />
            Edit Email
          </button>
        </div>

          {/* Back */}

        

      </div>

      <Toaster position="top-right" />
    </div>
  );
};

export default ValidateResetCode;