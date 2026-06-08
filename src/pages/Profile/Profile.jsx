import React from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Wallet,
  LayoutGrid,
  LogOut,
  ShieldCheck,
  ArrowLeft
} from "lucide-react";
import useGet from "@/hooks/useGet";
import Loading from "@/components/Loading";
import Errorpage from "@/components/Errorpage";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigator = useNavigate();
  const { data, loading, error } = useGet("/api/user/profile");

  if (loading) return <Loading />;
  if (error) return <Errorpage />;

  const student = data?.data?.student;

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.1, duration: 0.6 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-100 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-violet-100 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="w-full px-4 md:px-10 py-8">
        {/* Back Button */}
        <div className="mb-8 flex items-center">
          <button
            onClick={() => navigator(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:text-one transition-all shadow-sm font-bold active:scale-95"
          >
            <ArrowLeft size={18} />
            Back
          </button>
        </div>

        {student && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left */}
            <div className="lg:col-span-8 space-y-8">
              <div className="bg-white/80 backdrop-blur-md border border-white rounded-[2rem] shadow-2xl overflow-hidden">
                <div className="h-48 bg-gradient-to-r from-one via-one/80 to-one/60 relative">
                  <div className="absolute -bottom-16 left-10 p-1 bg-white rounded-3xl shadow-xl">
                    <div className="w-32 h-32 bg-slate-100 rounded-[1.4rem] flex items-center justify-center text-one">
                      <User size={64} strokeWidth={1.5} />
                    </div>
                  </div>
                </div>

                <div className="pt-20 p-10">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-8 mb-8">
                    <div>
                      <h2 className="text-3xl font-bold text-slate-900">
                        {student.fullName}
                      </h2>
                      <div className="flex items-center gap-2 text-one font-medium mt-1">
                        <ShieldCheck className="w-4 h-4" />
                        Verified Student
                      </div>
                    </div>

                    <div className="mt-4 md:mt-0">
                      <span className="px-4 py-2 bg-indigo-50 text-one rounded-xl text-sm font-bold border border-indigo-100">
                        {student.category?.name || "General"}
                      </span>
                    </div>
                  </div>

                  {/* ✅ Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                    <ProfileField
                      icon={<Mail />}
                      label="Email Address"
                      value={student.email}
                    />

                    <ProfileField
                      icon={<Phone />}
                      label="Phone Number"
                      value={student.phone}
                    />

                    {/* ✅ FIXED GRADE */}
                    <ProfileField
                      icon={<GraduationCap />}
                      label="Academic Grade"
                      value={student.grade?.name || "Not Assigned"}
                    />

                    {/* ✅ NEW CATEGORY FIELD */}
                    <ProfileField
                      icon={<LayoutGrid />}
                      label="Category"
                      value={student.category?.name || "Not Set"}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="lg:col-span-4 space-y-6">
              {/* Wallet */}
              <motion.div
                whileHover={{ y: -5 }}
                className="relative overflow-hidden bg-white border rounded-[2.5rem] p-8 shadow-lg"
              >
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-one/10 rounded-full blur-3xl" />

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-slate-400 text-xs uppercase">
                        Available Balance
                      </p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-bold text-one">$</span>
                        <h3 className="text-5xl font-black">
                          {student.wallet?.balance || "0.00"}
                        </h3>
                      </div>
                    </div>

                    <div className="p-3 bg-one/10 text-one rounded-2xl">
                      <Wallet size={24} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 mt-8">
                    <button className="w-full py-4 bg-one text-white rounded-2xl font-bold">
                      Add Funds
                    </button>

                    <button className="w-full py-4 bg-slate-50 rounded-2xl font-bold">
                      Transaction History
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Actions */}
              <div className="bg-white border rounded-[2rem] p-8">
                <h4 className="font-bold text-lg mb-4">Quick Actions</h4>

                <button
                  onClick={() => {
                    localStorage.removeItem("token");
                    navigator("/");
                  }}
                  className="w-full flex justify-between p-4 rounded-2xl hover:bg-red-50"
                >
                  <span>Log Out</span>
                  <LogOut />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const ProfileField = ({ icon, label, value }) => (
  <motion.div className="group">
    <div className="flex items-center gap-4">
      <div className="p-3 bg-slate-50 rounded-2xl">
        {React.cloneElement(icon, { size: 20 })}
      </div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="font-semibold text-lg">{value || "Not Set"}</p>
      </div>
    </div>
  </motion.div>
);

export default Profile;