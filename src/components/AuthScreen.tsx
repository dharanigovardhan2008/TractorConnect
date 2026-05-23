"use client";

import { useAuth } from "@/lib/context/AuthContext";
import { FcGoogle } from "react-icons/fc";
import { PiTractorFill } from "react-icons/pi";
import { HiOutlineShieldCheck } from "react-icons/hi2";
import { BsGraphUpArrow } from "react-icons/bs";
import { TbDeviceMobileCheck } from "react-icons/tb";

export default function AuthScreen() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-[#022c22] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />

      <div className="relative z-10 w-full max-w-[400px] flex flex-col items-center">
        
        {/* Logo Icon */}
        <div className="animate-slow-float mb-6">
          <div className="w-24 h-24 rounded-[30px] bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-glow">
            <PiTractorFill className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
            Farm Connect
          </h1>
          <p className="text-primary-300/60 font-medium tracking-wide">
            SMART FARM MANAGEMENT
          </p>
        </div>

        {/* Login Card */}
        <div className="glass w-full rounded-[40px] p-8 mb-10 flex flex-col items-center">
          <h2 className="text-xl font-bold text-white mb-1">Get Started</h2>
          <p className="text-primary-300/50 text-sm mb-8">Sign in to your account</p>

          <button
            onClick={signInWithGoogle}
            className="w-full h-16 bg-white hover:bg-gray-50 text-gray-900 flex items-center justify-center gap-4 pill-button shadow-xl active:scale-95 transition-all"
          >
            <FcGoogle className="w-7 h-7" />
            <span className="font-bold text-lg">Continue with Google</span>
          </button>

          <p className="mt-8 text-[11px] text-center text-primary-400/40 leading-relaxed px-4">
            By continuing, you agree to our <span className="underline">Terms of Service</span> and <span className="underline">Privacy Policy</span>
          </p>
        </div>

        {/* Feature Pills */}
        <div className="grid grid-cols-3 gap-3 w-full">
          <div className="glass rounded-[24px] py-4 px-2 flex flex-col items-center justify-center border-white/5">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2">
              <HiOutlineShieldCheck className="w-5 h-5 text-primary-400" />
            </div>
            <span className="text-[10px] font-bold text-primary-200 uppercase tracking-tighter">Secure</span>
          </div>
          
          <div className="glass rounded-[24px] py-4 px-2 flex flex-col items-center justify-center border-white/5">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2">
              <BsGraphUpArrow className="w-4 h-4 text-primary-400" />
            </div>
            <span className="text-[10px] font-bold text-primary-200 uppercase tracking-tighter">Analytics</span>
          </div>

          <div className="glass rounded-[24px] py-4 px-2 flex flex-col items-center justify-center border-white/5">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2">
              <TbDeviceMobileCheck className="w-5 h-5 text-primary-400" />
            </div>
            <span className="text-[10px] font-bold text-primary-200 uppercase tracking-tighter">Mobile</span>
          </div>
        </div>

        {/* App Version */}
        <p className="mt-12 text-[12px] font-bold text-white/20 tracking-widest uppercase">
          Farm Connect v1.0
        </p>
      </div>
    </div>
  );
}