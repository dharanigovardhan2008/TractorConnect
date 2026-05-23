"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdDashboard, MdPeople, MdAgriculture, MdPersonAdd, MdMoreHoriz } from "react-icons/md";

const items = [
  { name: "Home", path: "/dashboard", icon: MdDashboard },
  { name: "Drivers", path: "/drivers", icon: MdPeople },
  { name: "Tractors", path: "/tractors", icon: MdAgriculture },
  { name: "Customers", path: "/customers", icon: MdPersonAdd },
];

export default function MobileNav({ onMenuOpen }: { onMenuOpen: () => void }) {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-8 left-8 right-8 z-40 lg:hidden">
      <div className="ultra-glass rounded-full px-5 py-3 flex items-center justify-around border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {items.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link key={item.path} href={item.path} className="flex flex-col items-center p-1">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isActive ? "bg-emerald-neon text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "text-white/40 hover:text-white"}`}>
                <item.icon size={24} />
              </div>
            </Link>
          );
        })}
        <button onClick={onMenuOpen} className="w-12 h-12 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors">
          <MdMoreHoriz size={24} />
        </button>
      </div>
    </div>
  );
}