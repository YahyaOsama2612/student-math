import { TbMailCheck, TbChevronLeft } from "react-icons/tb";
import { useLocation, useNavigate } from "react-router-dom";

const Message = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-sm border text-center">

        {/* Icon */}
        <div className="w-16 h-16 mx-auto flex items-center justify-center bg-one/10 rounded-2xl mb-6">
          <TbMailCheck className="text-3xl text-one" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          Verify Your Email
        </h1>

        {/* Email */}
        <h3 className="text-lg font-semibold text-one mb-3 break-all">
          {email}
        </h3>

        {/* Message */}
        <p className="text-slate-600 leading-relaxed">
          We have sent a verification link to your email address.  
          Please check your inbox and click the link to activate your account.
        </p>

        {/* Note */}
        <p className="text-sm text-slate-400 mt-4">
          If you don't see the email, please check your spam folder.
        </p>

        {/* Back Button */}
        <button
          onClick={() => navigate("/")}
          className="mt-6 w-full flex items-center justify-center gap-2 bg-one text-white py-3 rounded-xl hover:bg-[#5a0707] transition"
        >
          <TbChevronLeft size={18} />
          Back
        </button>

      </div>
    </div>
  );
};


export default Message