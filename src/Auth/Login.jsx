import { useState } from "react";
import { toast,Toaster } from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { TbMathFunction, TbArrowRight } from 'react-icons/tb';
 import api from '../api/api'
const Login = () => {
  const navigate = useNavigate();
 const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

 const handleLogin = async (e) => {
  e.preventDefault();
setLoading(true);
  if (!email) return alert("Email is required");
  if (!password) return alert("Password is required");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return alert("Please enter a valid email");

  try {
    const response = await api.post("/api/user/auth/login", {
      email,
      password,
    });

    const token = response.data.data.token;
    localStorage.setItem("token", token);

    toast.success("Logged in successfully 🎉");

    navigate("/user/home");

  } catch (error) {
  console.error("Login error:", error);

  const message = error.response?.data?.error?.message || "Something went wrong";
  if(message=="Invalid Credentials"){
  toast.error(message);
setLoading(false);
  }
  else{
  toast.error(message);
 setTimeout(() => {
    navigate("/resendverificationemail" ,{
      state: { email }
    });
  }, 2000);
  }
}
};

  return (
    <div className="min-h-screen flex bg-white font-sans text-left" dir="ltr">
      
      {/* 1. Left Section: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 md:p-16 bg-white z-10">
        <div className="w-full max-w-md mx-auto">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3 mb-12 justify-start">
            <div className="w-12 h-12 bg-one rounded-2xl flex items-center justify-center shadow-lg shadow-one/20">
              <TbMathFunction className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
              Math<span className="text-one">Portal</span>
            </h1>
          </div>

          {/* Welcome Text */}
          <div className="mb-10">
            <h2 className="text-4xl font-bold text-slate-950 mb-3">Welcome Back!</h2>
            <p className="text-slate-600 text-lg font-medium">Sign in to access the teacher dashboard.</p>
          </div>

          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2.5 text-left">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@school.com"
                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-one/10 focus:border-one outline-none transition-all text-slate-700 placeholder:text-slate-400"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2.5">
                <label className="block text-sm font-semibold text-slate-800">Password</label>
                <Link to="/forgetpassword" className="text-sm font-medium text-one hover:text-[#5a0707] transition-colors">Forgot password?</Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-one/10 focus:border-one outline-none transition-all text-slate-700 placeholder:text-slate-400"
              />
            </div>

            <button 
              disabled={loading}
              type="submit"
              className="w-full bg-one hover:bg-[#5a0707] text-white font-bold py-4 rounded-2xl transition-all duration-300 shadow-lg shadow-one/20 flex items-center justify-center gap-3 group text-lg"
            >
              {loading ? "Logging In..." : "Log In"}              <TbArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
          <div className="text-center pt-2">
  <p className="text-slate-500 text-sm">
    Don’t have an account?{" "}
    <button
      type="button"
      onClick={() => navigate("/signup")}
      className="text-one font-semibold hover:underline"
    >
      Sign Up
    </button>
  </p>
</div>

          {/* Footer */}
          <div className="mt-16 text-center text-sm text-slate-500">
            © {new Date().getFullYear()} MathPortal Education. All rights reserved.
          </div>
        </div>
      </div>

      {/* 2. Right Section: Image */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <img 
          src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=2000&auto=format&fit=crop" 
          alt="Mathematics Education" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Dark Red Overlay for theme consistency */}
        <div className="absolute inset-0 bg-gradient-to-t from-one/90 to-transparent opacity-80"></div>
        
        {/* Text on Image */}
        <div className="absolute bottom-16 left-16 right-16 text-left z-20">
          <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 inline-block">
            <TbMathFunction className="w-12 h-12 text-white mb-4"/>
            <h3 className="text-3xl font-bold text-white mb-3">Shape the Future</h3>
            <p className="text-slate-100 text-lg max-w-md">Advanced tools to manage classrooms and analyze student performance in Mathematics.</p>
          </div>
        </div>
      </div>

      <Toaster position="top-right" />
    </div>
  );
};

export default Login;