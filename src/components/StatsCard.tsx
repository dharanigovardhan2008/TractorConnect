"use client";

import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  subtitle?: string;
  className?: string;
}

export default function StatsCard({ title, value, icon, className = "" }: StatsCardProps) {
  return (
    <div className={`bg-white rounded-[32px] p-6 shadow-soft border border-emerald-50/50 hover:shadow-glow transition-all duration-500 group ${className}`}>
      <div className="flex flex-col h-full justify-between">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
          <div className="text-emerald-600">
            {icon}
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-800/50 uppercase tracking-widest mb-1">
            {title}
          </p>
          <p className="text-3xl font-black text-emerald-950 tracking-tight">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}