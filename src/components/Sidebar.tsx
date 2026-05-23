"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PiTractorFill } from "react-icons/pi";
import { useAuth } from "@/lib/context/AuthContext";
import {
  MdDashboard,
  MdPeople,
  MdAgriculture,
  MdPersonAdd,
  MdMiscellaneousServices,
  MdBuild,
  MdLandscape,
  MdAccountBalanceWallet,
  MdLogout,
  MdClose,
} from "react-icons/md";

const menuItems = [
  { name: "Dashboard",   path: "/dashboard",   icon: MdDashboard },
  { name: "Drivers",     path: "/drivers",     icon: MdPeople },
  { name: "Tractors",    path: "/tractors",    icon: MdAgriculture },
  { name: "Customers",   path: "/customers",   icon: MdPersonAdd },
  { name: "Services",    path: "/services",    icon: MdMiscellaneousServices },
  { name: "Maintenance", path: "/maintenance", icon: MdBuild },
  { name: "Fields",      path: "/fields",      icon: MdLandscape },
  { name: "Expenditure", path: "/expenditure", icon: MdAccountBalanceWallet },
];

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // ── Hydration guard ───────────────────────────────────────
  // Prevents SSR/client HTML mismatch: sidebar is always
  // hidden on server, only mounted after client hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const handleLinkClick = () => {
    // Only close on mobile — check done after mount so window is safe
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  };

  const handleLogout = () => {
    logout();
    if (onClose) onClose();
  };

  // ── Sidebar content (shared between mobile and desktop) ───
  const SidebarContent = () => (
    <div className="flex flex-col h-full p-8 lg:p-10">

      {/* Brand */}
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <PiTractorFill size={26} />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter uppercase text-white leading-none">
              Farm
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
              Connect
            </span>
          </div>
        </div>

        {/* Close button — mobile only */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90"
            aria-label="Close menu"
          >
            <MdClose size={20} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className="relative block group"
              onClick={handleLinkClick}
            >
              {/* Active pill — uses motion div WITHOUT layoutId to avoid
                  the removeChild DOM crash caused by layoutId + hydration mismatch */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 bg-white/5 border border-white/10 rounded-full -z-10"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div
                className={`flex items-center gap-5 px-6 py-4 rounded-full transition-all duration-200 ${
                  isActive
                    ? "text-white"
                    : "text-white/30 hover:text-white"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isActive
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                      : "bg-white/5 group-hover:bg-white/10"
                  }`}
                >
                  <item.icon size={18} />
                </div>
                <span className="font-bold text-sm tracking-tight">
                  {item.name}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-8 pt-8 border-t border-white/5">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-full bg-rose-500/10 text-rose-500 font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95"
        >
          <MdLogout size={18} /> Disconnect
        </button>
      </div>
    </div>
  );

  // ── Before mount: render nothing to match SSR output exactly ─
  if (!mounted) return null;

  return (
    <>
      {/* ── MOBILE: backdrop + sliding drawer via AnimatePresence ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={onClose}
            />

            {/* Drawer */}
            <motion.aside
              key="sidebar-drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 35 }}
              className="fixed top-0 bottom-0 left-0 w-[280px] bg-[#011410]/95 backdrop-blur-3xl border-r border-white/5 z-50 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── DESKTOP: always visible, no animation needed ── */}
      <aside className="hidden lg:flex fixed top-0 bottom-0 left-0 w-[280px] flex-col bg-[#011410]/95 backdrop-blur-3xl border-r border-white/5 z-50">
        <SidebarContent />
      </aside>
    </>
  );
}