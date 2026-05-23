"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import {
  MdAdd, MdMenu, MdArrowUpward, MdArrowDownward,
  MdTimeline, MdLocalAtm, MdPendingActions, MdPayments,
  MdAgriculture, MdPeople, MdPersonAdd, MdStars, MdEmojiEvents
} from "react-icons/md";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

/* ─── safe number ─────────────────────────────────────── */
const safeNum = (v: unknown): number => {
  const n = Number(v);
  return isFinite(n) ? n : 0;
};

/* ─── types ───────────────────────────────────────────── */
interface Customer   { id: string; name: string; userId: string; }
interface Driver     { id: string; name: string; userId: string; }
interface ServiceRecord {
  id: string; customerId: string; customerName: string;
  serviceName: string; totalAmount?: number; amount?: number;
  paidAmount?: number; date: string; userId: string;
}
interface DriverPayment {
  id: string; driverId: string; driverName: string;
  amount: number; reason?: string; date: string; userId: string;
}
interface Stats { totalRevenue: number; pendingAmount: number; thisMonthRevenue: number; }

/* ─── limits ──────────────────────────────────────────── */
const LIMITS = { RECENT: 5, BEST: 5, DUES: 5, PAYS: 5 } as const;

/* ─── card class ──────────────────────────────────────── */
const CARD = "bg-white/5 border border-white/10 rounded-[45px] p-6 sm:p-8 shadow-2xl";

/* ─── animation variants (defined OUTSIDE component) ─── */
// Defined outside so object identity never changes → no re-trigger
const fadeInUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 } }
};

const staggerParent = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
};

/* ════════════════════════════════════════════════════════
   SUB-COMPONENTS  (all outside main component so they
   never get re-created on parent re-render)
════════════════════════════════════════════════════════ */

/* StatCard */
function StatCard({
  title, value, icon: Icon, color = "text-emerald-500", delay = 0
}: {
  title: string; value: number;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color?: string; delay?: number;
}) {
  return (
    <div className="bg-white/5 rounded-[35px] p-6 border border-white/5 flex flex-col justify-center min-h-[100px] relative overflow-hidden group">
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
        style={{
          background: `linear-gradient(135deg,${
            color === "text-rose-400" ? "#f43f5e" : "#10b981"
          } 0%,transparent 100%)`
        }}
      />
      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2 relative z-10">
        {title}
      </p>
      <div className="flex items-center gap-3 relative z-10">
        <Icon className={color} size={24} />
        <p className={`text-2xl sm:text-4xl font-black leading-none ${
          color !== "text-emerald-500" ? color : "text-white"
        }`}>
          ₹{value.toLocaleString("en-IN")}
        </p>
      </div>
    </div>
  );
}

/* QuickActionCard */
function QuickActionCard({
  label, icon: Icon, path, gradient
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  path: string; gradient: string;
}) {
  return (
    <Link href={path}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="bg-white/5 border border-white/10 p-5 rounded-[35px] flex items-center gap-4
                   hover:bg-white/10 transition-colors cursor-pointer relative overflow-hidden group"
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          initial={{ x: "-100%" }}
          whileHover={{ x: "100%" }}
          transition={{ duration: 0.55 }}
        />
        <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${gradient}
                         flex items-center justify-center shadow-lg flex-shrink-0 relative z-10`}>
          <Icon size={22} className="text-white" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40 truncate relative z-10">
          {label}
        </span>
      </motion.div>
    </Link>
  );
}

/* ListItem */
function ListItem({
  title, subtitle, value,
  valueColor = "text-emerald-400",
  bgColor = "bg-white/5",
  borderColor = "border-white/5"
}: {
  title: string; subtitle?: string; value: number;
  valueColor?: string; bgColor?: string; borderColor?: string;
}) {
  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ x: 4, transition: { duration: 0.15 } }}
      className={`flex items-center justify-between p-5 ${bgColor}
                  rounded-[30px] border ${borderColor} group cursor-pointer`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
          {title}
        </p>
        {subtitle && (
          <p className="text-[10px] text-white/30 uppercase font-black mt-1">{subtitle}</p>
        )}
      </div>
      <p className={`text-lg font-black ${valueColor} ml-4 flex-shrink-0`}>
        ₹{value.toLocaleString("en-IN")}
      </p>
    </motion.div>
  );
}

/* BestCustomerCard */
function BestCustomerCard({
  customer, rank
}: {
  customer: { id: string; name: string; amount: number };
  rank: number;
}) {
  const isTop3  = rank <= 3;
  const medals  = ["🥇", "🥈", "🥉"];
  const grads   = [
    "from-yellow-500/20 via-yellow-600/10 to-transparent",
    "from-gray-400/20 via-gray-500/10 to-transparent",
    "from-orange-600/20 via-orange-700/10 to-transparent"
  ];
  const amtColor = isTop3
    ? (rank === 1 ? "text-yellow-400" : rank === 2 ? "text-gray-300" : "text-orange-400")
    : "text-emerald-400";
  const barColor = isTop3
    ? (rank === 1 ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
      : rank === 2 ? "bg-gradient-to-r from-gray-300 to-gray-500"
      : "bg-gradient-to-r from-orange-400 to-orange-600")
    : "bg-gradient-to-r from-emerald-400 to-emerald-600";

  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ scale: 1.02, y: -4, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden rounded-[30px] border p-5 group cursor-pointer ${
        isTop3
          ? `bg-gradient-to-r ${grads[rank - 1]} border-white/20`
          : "bg-white/5 border-white/5"
      }`}
    >
      {isTop3 && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at 50% 50%,${
              rank === 1 ? "#fbbf24" : rank === 2 ? "#9ca3af" : "#f97316"
            }15,transparent)`
          }}
        />
      )}
      {rank === 1 && (
        <MdStars className="absolute top-2 right-2 text-yellow-500/30" size={24} />
      )}

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
            isTop3
              ? "bg-gradient-to-br from-white/20 to-white/5 border border-white/30"
              : "bg-white/5 border border-white/10"
          }`}>
            {isTop3
              ? <span className="text-2xl">{medals[rank - 1]}</span>
              : <span className="text-emerald-500/40">#{rank}</span>
            }
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-base font-bold truncate group-hover:text-emerald-400 transition-colors ${
              isTop3 ? "text-white" : "text-white/80"
            }`}>
              {customer.name}
            </p>
            <p className="text-[9px] text-white/20 uppercase font-black mt-1 tracking-wider">
              {isTop3 ? "Top Contributor" : "Valued Customer"}
            </p>
          </div>
        </div>

        <div className="text-right ml-4 flex-shrink-0">
          <p className={`text-xl font-black ${amtColor}`}>
            ₹{customer.amount.toLocaleString("en-IN")}
          </p>
          {rank === 1 && (
            <MdEmojiEvents className="inline-block text-yellow-500/60 text-xs ml-1" />
          )}
        </div>
      </div>

      {/* progress bar – static 85% visual */}
      <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: "85%" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}

/* SectionHeader */
function SectionHeader({
  icon: Icon, title, color = "text-emerald-500"
}: {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  title: string; color?: string;
}) {
  return (
    <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${color}
                    flex items-center gap-2 mb-8`}>
      <Icon className={color} size={18} />
      {title}
    </h3>
  );
}

/* EmptyState */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">📭</div>
      <p className="text-white/20 text-xs font-bold uppercase tracking-widest">{message}</p>
    </div>
  );
}

/* SkeletonLoader */
function SkeletonLoader() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.18 }}
          className="h-20 bg-white/5 rounded-[30px]"
        />
      ))}
    </div>
  );
}

/* CounterCard */
function CounterCard({
  icon: Icon, count, label, index = 0
}: {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  count: number; label: string; index?: number;
}) {
  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="bg-white/5 border border-white/5 p-7 rounded-[40px] text-center
                 group cursor-pointer relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent
                      opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <Icon
          className="mx-auto text-emerald-500/20 group-hover:text-emerald-500/40 transition-colors mb-3"
          size={26}
        />
      </div>
      <p className="text-2xl font-black relative z-10">{count}</p>
      <p className="text-[8px] font-black uppercase text-white/20
                    group-hover:text-white/40 transition-colors relative z-10">
        {label}
      </p>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { user, loading } = useAuth();

  const [sidebarOpen,       setSidebarOpen]       = useState(false);
  const [isMounted,         setIsMounted]         = useState(false);
  const [dataLoading,       setDataLoading]       = useState(true);
  const [error,             setError]             = useState<string | null>(null);
  const [rawServices,       setRawServices]       = useState<ServiceRecord[]>([]);
  const [rawCustomers,      setRawCustomers]      = useState<Customer[]>([]);
  const [rawDrivers,        setRawDrivers]        = useState<Driver[]>([]);
  const [rawDriverPayments, setRawDriverPayments] = useState<DriverPayment[]>([]);
  const [totalTractors,     setTotalTractors]     = useState(0);

  // Prevent stale closure issues with uid
  const uidRef = useRef<string | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  /* ── Firestore subscriptions ─────────────────────────── */
  useEffect(() => {
    const uid = user?.uid;
    if (!uid || !isMounted) return;

    uidRef.current = uid;
    setDataLoading(true);
    setError(null);

    const unsubs: (() => void)[] = [];

    // helper
    const sub = <T,>(
      col: string,
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      transform?: (raw: T[]) => T[]
    ) => {
      const q = query(collection(db, col), where("userId", "==", uid));
      return onSnapshot(
        q,
        snap => {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as T));
          setter(transform ? transform(docs) : docs);
        },
        err => setError(`${col}: ${err.message}`)
      );
    };

    unsubs.push(sub<Customer>("customers", setRawCustomers));
    unsubs.push(sub<Driver>("drivers",     setRawDrivers));

    unsubs.push(
      onSnapshot(
        query(collection(db, "tractors"), where("userId", "==", uid)),
        snap => setTotalTractors(snap.size),
        err  => setError(`tractors: ${err.message}`)
      )
    );

    unsubs.push(
      sub<ServiceRecord>(
        "serviceRecords",
        setRawServices,
        docs => docs.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      )
    );

    // Mark loading done once service records arrive
    const svcQ = query(
      collection(db, "serviceRecords"),
      where("userId", "==", uid)
    );
    unsubs.push(
      onSnapshot(svcQ, () => setDataLoading(false), () => setDataLoading(false))
    );

    unsubs.push(
      sub<DriverPayment>(
        "driverPayments",
        setRawDriverPayments,
        docs => docs.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      )
    );

    return () => unsubs.forEach(u => u());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, isMounted]);        // ← stable: uid string, not user object

  /* ── Computed data ───────────────────────────────────── */
  const data = useMemo(() => {
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    const stats: Stats = { totalRevenue: 0, pendingAmount: 0, thisMonthRevenue: 0 };

    // customerId → { id, name, amount }
    const custMap = new Map<string, { id: string; name: string; amount: number }>();

    const processed = rawServices.map(s => {
      const billed  = safeNum(s.totalAmount ?? s.amount);
      const paid    = Math.min(safeNum(s.paidAmount), billed);
      const balance = Math.max(0, billed - paid);

      stats.totalRevenue  += paid;
      stats.pendingAmount += balance;

      const sDate = new Date(s.date);
      if (!isNaN(sDate.getTime()) && sDate >= monthStart) {
        stats.thisMonthRevenue += paid;
      }

      const liveName =
        rawCustomers.find(c => c.id === s.customerId)?.name ||
        s.customerName || "Unknown";

      if (s.customerId && paid > 0) {
        const prev = custMap.get(s.customerId);
        custMap.set(s.customerId, {
          id:     s.customerId,
          name:   liveName,
          amount: (prev?.amount ?? 0) + paid,
        });
      }

      return { ...s, customerName: liveName, billed, balance };
    });

    const recentWork = processed.slice(0, LIMITS.RECENT);

    const bestCustomers = Array.from(custMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, LIMITS.BEST);

    const pendingDues = [...processed]
      .filter(s => s.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, LIMITS.DUES);

    const driverPays = rawDriverPayments
      .map(p => ({
        ...p,
        driverName:
          rawDrivers.find(d => d.id === p.driverId)?.name ||
          p.driverName || "Unknown Driver",
        amount: safeNum(p.amount),
      }))
      .slice(0, LIMITS.PAYS);

    return { stats, recentWork, bestCustomers, pendingDues, driverPays };
  }, [rawServices, rawCustomers, rawDrivers, rawDriverPayments]);

  /* ── Guards ──────────────────────────────────────────── */
  if (!isMounted || loading) {
    return (
      <div className="h-screen bg-[#010B09] flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          className="w-14 h-14 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full"
        />
        <p className="text-emerald-500 font-black text-xs tracking-widest">LOADING…</p>
      </div>
    );
  }

  if (!user) return null;

  const quickActions = [
    { label: "New Work", icon: MdAdd,         path: "/services",  gradient: "from-emerald-500 to-emerald-700" },
    { label: "Tractors", icon: MdAgriculture, path: "/tractors",  gradient: "from-teal-500 to-teal-800"      },
    { label: "Registry", icon: MdPersonAdd,   path: "/customers", gradient: "from-cyan-500 to-cyan-800"      },
    { label: "Drivers",  icon: MdPeople,      path: "/drivers",   gradient: "from-blue-500 to-blue-800"      },
  ];

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#010B09] text-white overflow-x-hidden selection:bg-emerald-500/30">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:ml-[280px] p-4 sm:p-8 lg:p-12 pb-32 max-w-7xl mx-auto relative z-10">

        {/* HEADER */}
        <motion.header
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-12 h-12 flex items-center justify-center
                         bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              aria-label="Open menu"
            >
              <MdMenu size={24} />
            </motion.button>
            <h1 className="text-2xl font-black tracking-tight">
              Hi, {user.displayName?.split(" ")[0] || "User"}
            </h1>
          </div>

          <motion.div
            className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10
                       flex items-center justify-center font-black text-emerald-400 uppercase"
            whileHover={{ scale: 1.1 }}
          >
            {user.displayName?.charAt(0) || "U"}
          </motion.div>
        </motion.header>

        {/* ERROR BANNER */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error-banner"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* MONEY CARD */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative bg-white/5 backdrop-blur-3xl rounded-[45px] p-6 sm:p-10
                     mb-8 border border-white/10 shadow-2xl overflow-hidden"
        >
          {/* animated bg orb – isolated so it never triggers parent re-render */}
          <motion.div
            className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"
            animate={{ scale: [1, 1.18, 1], x: [0, 18, 0], y: [0, -18, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />

          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-2 relative z-10">
            Total Money Earned
          </p>

          <h2 className="text-5xl sm:text-7xl font-black tracking-tighter mb-10
                         flex items-baseline leading-none relative z-10">
            <span className="text-2xl opacity-20 mr-2 font-medium">₹</span>
            {dataLoading
              ? <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}>…</motion.span>
              : data.stats.totalRevenue.toLocaleString("en-IN")
            }
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 relative z-10">
            <StatCard title="Month Profit" value={data.stats.thisMonthRevenue} icon={MdArrowUpward}  delay={0.45} />
            <StatCard title="To Receive"   value={data.stats.pendingAmount}    icon={MdArrowDownward} color="text-rose-400" delay={0.55} />
          </div>
        </motion.div>

        {/* QUICK ACTIONS */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
          variants={staggerParent}
          initial="hidden"
          animate="visible"
        >
          {quickActions.map(a => (
            <QuickActionCard key={a.path} {...a} />
          ))}
        </motion.div>

        {/* RECENT WORK + BEST CUSTOMERS */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
          variants={staggerParent}
          initial="hidden"
          animate="visible"
        >
          {/* Recent Work */}
          <motion.div className={CARD} variants={fadeInUp}>
            <SectionHeader icon={MdTimeline} title="Recent Work" />
            {dataLoading ? <SkeletonLoader /> : data.recentWork.length === 0
              ? <EmptyState message="No work records yet" />
              : (
                <motion.div className="space-y-4" variants={staggerParent} initial="hidden" animate="visible">
                  {data.recentWork.map(s => (
                    <ListItem
                      key={s.id}
                      title={s.customerName}
                      subtitle={s.serviceName}
                      value={s.billed}
                    />
                  ))}
                </motion.div>
              )
            }
          </motion.div>

          {/* Best Customers */}
          <motion.div className={CARD} variants={fadeInUp}>
            <SectionHeader icon={MdLocalAtm} title="Best Customers" />
            {dataLoading ? <SkeletonLoader /> : data.bestCustomers.length === 0
              ? <EmptyState message="No customer data yet" />
              : (
                <motion.div className="space-y-4" variants={staggerParent} initial="hidden" animate="visible">
                  {data.bestCustomers.map((c, i) => (
                    <BestCustomerCard
                      key={c.id}          // ✅ stable Firestore doc id
                      customer={c}
                      rank={i + 1}
                    />
                  ))}
                </motion.div>
              )
            }
          </motion.div>
        </motion.div>

        {/* PENDING DUES + DRIVER PAYMENTS */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10"
          variants={staggerParent}
          initial="hidden"
          animate="visible"
        >
          {/* Pending Dues */}
          <motion.div className={CARD} variants={fadeInUp}>
            <SectionHeader icon={MdPendingActions} title="Customers to Collect From" color="text-rose-400" />
            {dataLoading ? <SkeletonLoader /> : data.pendingDues.length === 0
              ? <EmptyState message="All Clear ✓" />
              : (
                <motion.div className="space-y-4" variants={staggerParent} initial="hidden" animate="visible">
                  {data.pendingDues.map(p => (
                    <ListItem
                      key={p.id}
                      title={p.customerName}
                      subtitle="Balance Due"
                      value={p.balance}
                      valueColor="text-rose-400"
                      bgColor="bg-rose-500/5"
                      borderColor="border-rose-500/10"
                    />
                  ))}
                </motion.div>
              )
            }
          </motion.div>

          {/* Driver Payments */}
          <motion.div className={CARD} variants={fadeInUp}>
            <SectionHeader icon={MdPayments} title="Salary History" color="text-cyan-400" />
            {dataLoading ? <SkeletonLoader /> : data.driverPays.length === 0
              ? <EmptyState message="No payment records" />
              : (
                <motion.div className="space-y-4" variants={staggerParent} initial="hidden" animate="visible">
                  {data.driverPays.map(dp => (
                    <motion.div
                      key={dp.id}
                      variants={fadeInUp}
                      whileHover={{ x: 4, transition: { duration: 0.15 } }}
                      className="flex items-center justify-between p-5 bg-cyan-500/5
                                 rounded-[30px] border border-cyan-500/10 group cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate group-hover:text-cyan-400 transition-colors">
                          {dp.driverName}
                        </p>
                        <p className="text-[8px] text-cyan-300/40 uppercase font-black mt-1">
                          {dp.reason || "Salary"}
                        </p>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <p className="text-lg font-black text-cyan-400">
                          ₹{dp.amount.toLocaleString("en-IN")}
                        </p>
                        <p className="text-[7px] text-white/20 uppercase">
                          {dp.date ? new Date(dp.date).toLocaleDateString("en-IN") : "—"}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )
            }
          </motion.div>
        </motion.div>

        {/* COUNTERS */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-3 gap-6"
          variants={staggerParent}
          initial="hidden"
          animate="visible"
        >
          <CounterCard icon={MdPeople}      count={rawDrivers.length}   label="Drivers"   index={0} />
          <CounterCard icon={MdAgriculture} count={totalTractors}       label="Tractors"  index={1} />
          <div className="col-span-2 lg:col-span-1">
            <CounterCard icon={MdPersonAdd} count={rawCustomers.length} label="Customers" index={2} />
          </div>
        </motion.div>

      </main>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <MobileNav onMenuOpen={() => setSidebarOpen(true)} />
      </div>
    </div>
  );
}