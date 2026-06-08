import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import {
  TbMathFunction,
  TbUser,
  TbMail,
  TbLock,
  TbPhone,
  TbSchool,
  TbChevronLeft
} from "react-icons/tb";

import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import api from "@/api/api";
// ✅ Input Component
const FormInput = ({ icon: Icon, ...props }) => (
  <div className="relative group">
    <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 group-focus-within:text-one transition-colors">
      <Icon size={20} />
    </div>
    <input
      {...props}
      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-one/10 focus:border-one outline-none transition-all"
    />
  </div>
);

const Signup = () => {
  const navigate = useNavigate();

  const { postData, loading: posting } = usePost();
  const { data: selectData } = useGet("/api/user/auth/select");

  const [grades, setGrades] = useState([]);
  const [loadingGrades, setLoadingGrades] = useState(false);

  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    nickname: "",
    email: "",
    password: "",
    phone: "",
    category: "",
    grade: "",
  });

  // ✅ Handle Change
  const handleChange = async (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    // 🎯 لما يختار category → نجيب grades
    if (name === "category") {
      setLoadingGrades(true);

      try {
const res = await api.get(`/api/user/auth/select`, {
  params: { categoryId: value },
});

setGrades(res.data?.data?.grades || []);


        // reset grade
        setForm((prev) => ({
          ...prev,
          category: value,
          grade: "",
        }));
      } catch (err) {
        console.error("Error fetching grades:", err);
      } finally {
        setLoadingGrades(false);
      }
    }
  };

  // ✅ Submit
  const handleSignup = async (e) => {
    e.preventDefault();

    try {
      await postData(form, "/api/user/auth/signup", "Welcome to MathPortal! 🎉");
      navigate("/message", { state: { email: form.email } });
    } catch (err) {
      console.error("Signup error:", err);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-left">
      
      {/* LEFT SIDE */}
      <div className="hidden lg:flex lg:w-1/2 relative p-12 items-center justify-center overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=2000"
          alt="Mathematics"
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-[1px]"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-one/95 via-one/80 to-transparent"></div>

        <div className="relative z-10 max-w-md text-white">
          <div className="bg-white/10 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/20 shadow-2xl">
            <TbMathFunction className="text-5xl mb-6" />
            <h2 className="text-4xl font-extrabold mb-4">
              Master Math <br /> With Ease.
            </h2>
            <p className="text-lg opacity-90">
              Join MathPortal today and access a world of interactive exams.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-xl">

          {/* HEADER */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-slate-500 hover:text-one"
            >
              <TbChevronLeft /> Back
            </button>
          </div>

          <h1 className="text-3xl font-bold mb-2">Create Account</h1>

          <form onSubmit={handleSignup} className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <FormInput icon={TbUser} name="firstname" placeholder="First Name" onChange={handleChange} required />
              <FormInput icon={TbUser} name="lastname" placeholder="Last Name" onChange={handleChange} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormInput icon={TbUser} name="nickname" placeholder="Nickname" onChange={handleChange} required />
              <FormInput icon={TbPhone} name="phone" placeholder="Phone" onChange={handleChange} required />
            </div>

            <FormInput icon={TbMail} name="email" type="email" placeholder="Email" onChange={handleChange} required />
            <FormInput icon={TbLock} name="password" type="password" placeholder="Password" onChange={handleChange} required />

            {/* CATEGORY + GRADE */}
            <div className="grid grid-cols-2 gap-4">

              {/* Category */}
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="p-3 border rounded-2xl"
                required
              >
                <option value="">Select Category</option>
                {selectData?.data?.categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {/* Grade */}
              <select
                name="grade"
                value={form.grade}
                onChange={handleChange}
                disabled={!form.category || loadingGrades}
                className="p-3 border rounded-2xl"
                required
              >
                <option value="">
                  {!form.category
                    ? "Select Category First"
                    : loadingGrades
                    ? "Loading..."
                    : "Select Grade"}
                </option>

                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

            </div>

            <button
              type="submit"
              disabled={posting}
              className="w-full bg-one text-white py-4 rounded-2xl"
            >
              {posting ? "Loading..." : "Create Account"}
            </button>
          </form>
        </div>
      </div>

      <Toaster position="top-right" />
    </div>
  );
};

export default Signup;