"use client";

import {
  MdPhone,
  MdEdit,
  MdPayment,
  MdHistory,
  MdAccountBalanceWallet,
  MdMiscellaneousServices,
} from "react-icons/md";

/* ── safe number ─────────────────────────────────────────── */
const safeNum = (v: unknown): number => {
  const x = Number(v);
  return isFinite(x) ? x : 0;
};

/* ── types ───────────────────────────────────────────────── */
export interface Driver {
  id: string;
  name: string;
  phone: string;
  yearlySalary: number;
  picLink?: string;
}

/* ── driver avatar ───────────────────────────────────────── */
function DriverAvatar({
  name,
  picLink,
}: {
  name: string;
  picLink?: string;
}) {
  const initial = name?.charAt(0)?.toUpperCase() || "?";

  if (picLink) {
    return (
      <div className="w-20 h-20 rounded-full border-2 border-emerald-400/20 overflow-hidden flex-shrink-0">
        <img
          src={picLink}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="w-20 h-20 rounded-full bg-emerald-400/10 border-2 border-emerald-400/20 flex items-center justify-center flex-shrink-0">
      <span className="text-2xl font-black text-emerald-400 uppercase">
        {initial}
      </span>
    </div>
  );
}

/* ── props ───────────────────────────────────────────────── */
interface DriverCardProps {
  driver: Driver;
  onEdit: (driver: Driver) => void;
  onPay: (driver: Driver) => void;
  onPayments: (driver: Driver) => void;
  onServices: (driver: Driver) => void;
}

/* ════════════════════════════════════════════════════════════
   DRIVER CARD COMPONENT
════════════════════════════════════════════════════════════ */
export default function DriverCard({
  driver,
  onEdit,
  onPay,
  onPayments,
  onServices,
}: DriverCardProps) {
  return (
    <div className="bg-white/5 border border-white/5 p-6 sm:p-8 relative overflow-hidden rounded-[40px] backdrop-blur-xl">
      {/* subtle bg glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-400/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

      {/* Profile */}
      <div className="flex items-center gap-4 mb-7">
        <div className="relative flex-shrink-0">
          <DriverAvatar name={driver.name} picLink={driver.picLink} />
          <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#010B09]" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-lg sm:text-xl font-black text-white truncate leading-none mb-1.5">
            {driver.name}
          </h3>
          <div className="flex items-center gap-1.5 text-emerald-400/50">
            <MdPhone size={13} />
            <span className="text-xs font-bold">{driver.phone}</span>
          </div>
        </div>
      </div>

      {/* Salary */}
      <div className="bg-white/5 rounded-3xl p-4 mb-6 border border-white/5 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-0.5">
            Annual Package
          </p>
          <p className="text-lg font-black text-white">
            ₹{safeNum(driver.yearlySalary).toLocaleString("en-IN")}
          </p>
        </div>
        <MdAccountBalanceWallet
          className="text-emerald-400/15"
          size={28}
        />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => onEdit(driver)}
          className="h-11 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 text-white/40 hover:text-white transition-all border border-white/5 text-[10px] font-black uppercase"
        >
          <MdEdit size={15} />
          <span>Edit</span>
        </button>

        <button
          onClick={() => onPay(driver)}
          className="h-11 rounded-full bg-emerald-400/10 hover:bg-emerald-400 flex items-center justify-center gap-2 text-emerald-400 hover:text-emerald-950 transition-all border border-emerald-400/20 text-[10px] font-black uppercase"
        >
          <MdPayment size={15} />
          <span>Pay</span>
        </button>

        <button
          onClick={() => onPayments(driver)}
          className="h-11 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 text-white/40 hover:text-white transition-all border border-white/5 text-[10px] font-black uppercase"
        >
          <MdHistory size={15} />
          <span>Payments</span>
        </button>

        <button
          onClick={() => onServices(driver)}
          className="h-11 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 text-white/40 hover:text-white transition-all border border-white/5 text-[10px] font-black uppercase"
        >
          <MdMiscellaneousServices size={15} />
          <span>Services</span>
        </button>
      </div>
    </div>
  );
}