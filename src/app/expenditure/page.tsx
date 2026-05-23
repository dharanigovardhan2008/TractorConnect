"use client";

import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import Modal from "@/components/Modal";
import {
  MdMenu, MdAttachMoney, MdPeople,
  MdAgriculture, MdLandscape, MdAccountBalanceWallet,
  MdCalendarMonth, MdEventNote, MdUpdate, MdTimeline, MdGrass,
  MdMoneyOff, MdPerson, MdChevronRight, MdCheckCircle,
  MdTrendingUp, MdTrendingDown, MdBarChart
} from "react-icons/md";
import {
  collection, query, where, onSnapshot, serverTimestamp,
  doc, updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────
interface ServiceRecord {
  id: string; userId: string; date: string;
  customerName?: string; farmerName?: string;
  totalAmount?: number; amount?: number;
  paidAmount?: number; paymentStatus?: "paid" | "partial" | "unpaid";
}
interface MaintenanceRecord { id: string; userId: string; date: string; cost?: number; }
interface FieldMaintenanceRecord { id: string; userId: string; date: string; amount?: number; }
interface FieldIncomeRecord { id: string; userId: string; date: string; amount?: number; }
interface DriverPayment { id: string; userId: string; date: string; amount?: number; }
type Period = "today" | "week" | "month" | "year";

// ── Helpers ───────────────────────────────────────────────────
const n = (v: unknown): number => { const x = Number(v); return isFinite(x) ? x : 0; };
const fmt = (v: number) => "₹" + Math.abs(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });

function inPeriod(dateStr: string | undefined, period: Period): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  if (period === "today") return d.toDateString() === now.toDateString();
  if (period === "week") {
    const w = new Date(now); w.setDate(now.getDate() - 6); w.setHours(0,0,0,0);
    return d >= w;
  }
  if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (period === "year") return d.getFullYear() === now.getFullYear();
  return false;
}

// ── Animation Variants ────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, type: "spring" as const, stiffness: 240, damping: 24 }
  })
};
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const periods: { label: string; key: Period; icon: React.ElementType }[] = [
  { label: "Today", key: "today", icon: MdUpdate },
  { label: "Week",  key: "week",  icon: MdTimeline },
  { label: "Month", key: "month", icon: MdCalendarMonth },
  { label: "Year",  key: "year",  icon: MdEventNote }
];

// ═════════════════════════════════════════════════════════════
export default function ExpenditurePage() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [serviceRecords,          setServiceRecords]          = useState<ServiceRecord[]>([]);
  const [maintenanceRecords,      setMaintenanceRecords]      = useState<MaintenanceRecord[]>([]);
  const [fieldMaintenanceRecords, setFieldMaintenanceRecords] = useState<FieldMaintenanceRecord[]>([]);
  const [fieldIncomeRecords,      setFieldIncomeRecords]      = useState<FieldIncomeRecord[]>([]);
  const [driverPaymentRecords,    setDriverPaymentRecords]    = useState<DriverPayment[]>([]);

  const [modalOpen,      setModalOpen]      = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<{
    id: string; name: string; total: number; paid: number; due: number;
  } | null>(null);
  const [collectInput, setCollectInput] = useState("");
  const [collecting,   setCollecting]   = useState(false);

  useEffect(() => setIsMounted(true), []);

  // ── Subscriptions ─────────────────────────────────────────
  useEffect(() => {
    if (!user || !isMounted) return;
    const uid = user.uid;
    const subs = [
      onSnapshot(query(collection(db,"serviceRecords"),    where("userId","==",uid)), s => setServiceRecords(s.docs.map(d=>({id:d.id,...d.data()} as ServiceRecord)))),
      onSnapshot(query(collection(db,"maintenanceRecords"),where("userId","==",uid)), s => setMaintenanceRecords(s.docs.map(d=>({id:d.id,...d.data()} as MaintenanceRecord)))),
      onSnapshot(query(collection(db,"fieldMaintenance"),  where("userId","==",uid)), s => setFieldMaintenanceRecords(s.docs.map(d=>({id:d.id,...d.data()} as FieldMaintenanceRecord)))),
      onSnapshot(query(collection(db,"fieldIncome"),       where("userId","==",uid)), s => setFieldIncomeRecords(s.docs.map(d=>({id:d.id,...d.data()} as FieldIncomeRecord)))),
      onSnapshot(query(collection(db,"driverPayments"),    where("userId","==",uid)), s => setDriverPaymentRecords(s.docs.map(d=>({id:d.id,...d.data()} as DriverPayment)))),
    ];
    return () => subs.forEach(u => u());
  }, [user, isMounted]);

  // ── Derived ───────────────────────────────────────────────
  const normService = useMemo(() => serviceRecords.map(r => {
    const total = n(r.totalAmount ?? r.amount);
    const paid  = Math.min(n(r.paidAmount), total);
    const due   = total - paid;
    const status: "paid"|"partial"|"unpaid" = due <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid";
    return { ...r, total, paid, due, status };
  }), [serviceRecords]);

  const unpaidRecords = useMemo(() =>
    normService.filter(r => r.due > 0)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [normService]);

  const totalOutstanding = useMemo(() => unpaidRecords.reduce((s,r) => s+r.due, 0), [unpaidRecords]);

  // Aggregators
  const tractorRevenue  = (p: Period) => normService.filter(r=>inPeriod(r.date,p)).reduce((s,r)=>s+r.paid,0);
  const tractorMaint    = (p: Period) => maintenanceRecords.filter(r=>inPeriod(r.date,p)).reduce((s,r)=>s+n(r.cost),0);
  const driverSalary    = (p: Period) => driverPaymentRecords.filter(r=>inPeriod(r.date,p)).reduce((s,r)=>s+n(r.amount),0);
  const tractorProfit   = (p: Period) => tractorRevenue(p) - tractorMaint(p) - driverSalary(p);
  const fIncome         = (p: Period) => fieldIncomeRecords.filter(r=>inPeriod(r.date,p)).reduce((s,r)=>s+n(r.amount),0);
  const fExpense        = (p: Period) => fieldMaintenanceRecords.filter(r=>inPeriod(r.date,p)).reduce((s,r)=>s+n(r.amount),0);
  const fieldProfit     = (p: Period) => fIncome(p) - fExpense(p);
  const unpaidInPeriod  = (p: Period) => unpaidRecords.filter(r=>inPeriod(r.date,p)).reduce((s,r)=>s+r.due,0);

  // ── Collect handler ───────────────────────────────────────
  const openCollect = (record: typeof unpaidRecords[0]) => {
    setSelectedRecord({ id: record.id, name: record.customerName || record.farmerName || "Unknown", total: record.total, paid: record.paid, due: record.due });
    setCollectInput(""); setModalOpen(true);
  };

  const handleCollect = async (fullPay: boolean) => {
    if (!selectedRecord) return;
    setCollecting(true);
    try {
      const addAmt = fullPay ? selectedRecord.due : n(collectInput);
      if (addAmt <= 0) { toast.error("Enter a valid amount"); return; }
      if (addAmt > selectedRecord.due) { toast.error(`Max: ${fmt(selectedRecord.due)}`); return; }
      const newPaid   = selectedRecord.paid + addAmt;
      const newStatus = newPaid >= selectedRecord.total ? "paid" : "partial";
      await updateDoc(doc(db,"serviceRecords",selectedRecord.id), {
        paidAmount: newPaid, paymentStatus: newStatus, updatedAt: serverTimestamp()
      });
      toast.success(newStatus === "paid" ? "Payment fully cleared!" : `Collected ${fmt(addAmt)}`);
      setModalOpen(false);
    } catch { toast.error("Failed to update"); }
    finally { setCollecting(false); }
  };

  if (!isMounted || loading) return null;

  // ══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#010B09] text-white overflow-x-hidden">
      <Sidebar isOpen={sidebarOpen} />

      <main className="lg:ml-[280px] px-4 pt-8 pb-36 lg:px-10 lg:pt-10 space-y-14">

        {/* ── HEADER ─────────────────────────────────────── */}
        <motion.header
          initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }}
          className="flex items-center gap-4"
        >
          <button onClick={()=>setSidebarOpen(true)}
            className="lg:hidden w-12 h-12 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl flex items-center justify-center">
            <MdMenu size={22}/>
          </button>
          <div>
        
            <h1 className="text-3xl lg:text-4xl font-black tracking-tighter">Expenditure</h1>
          </div>
        </motion.header>

        {/* ── NET PROFIT ──────────────────────────────────── */}
        <section className="space-y-5">
          <Eyebrow icon={MdTrendingUp} label="Net Profit" color="emerald"/>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <NetProfitCard
              title="Tractor" icon={MdAgriculture}
              accent="#10b981" accentBg="rgba(16,185,129,0.07)"
              periods={periods} getValue={tractorProfit}
            />
            <NetProfitCard
              title="Field" icon={MdLandscape}
              accent="#a3e635" accentBg="rgba(163,230,53,0.07)"
              periods={periods} getValue={fieldProfit}
            />
          </div>
        </section>

        {/* ── OUTSTANDING PAYMENTS ────────────────────────── */}
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Eyebrow icon={MdMoneyOff} label="Outstanding Payments" color="rose"/>
            {totalOutstanding > 0 && (
              <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-rose-500/25 bg-rose-500/10 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"/>
                <span className="text-rose-300 text-xs font-black">{fmt(totalOutstanding)} due</span>
              </motion.div>
            )}
          </div>

          {/* Period pills */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {periods.map((p,i) => (
              <motion.div key={p.key} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                className="relative rounded-[28px] border border-white/8 overflow-hidden"
                style={{ background:"rgba(255,255,255,0.03)", backdropFilter:"blur(20px)" }}>
                <div className="absolute inset-0 bg-rose-500/5 pointer-events-none"/>
                <div className="relative z-10 p-5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-3">{p.label}</p>
                  <p className="text-xl font-black text-rose-400">{fmt(unpaidInPeriod(p.key))}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Records */}
          <div className="rounded-[36px] border border-white/8 overflow-hidden"
            style={{ background:"rgba(255,255,255,0.025)", backdropFilter:"blur(30px)" }}>
            <AnimatePresence mode="popLayout">
              {unpaidRecords.length === 0 ? (
                <motion.div key="empty" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                  className="py-20 flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
                    <MdCheckCircle className="text-emerald-400" size={32}/>
                  </div>
                  <p className="text-white/20 font-black uppercase tracking-widest text-xs">All payments collected</p>
                </motion.div>
              ) : (
                <LayoutGroup>
                  {/* Desktop heading */}
                  <div className="hidden md:grid grid-cols-12 px-8 py-3">
                    {["Customer","Date","Total","Collected","Due",""].map((h,i)=>(
                      <div key={i} className={`col-span-${[3,2,2,2,2,1][i]} ${i>=2?"text-right":""}`}>
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/20">{h}</span>
                      </div>
                    ))}
                  </div>

                  {unpaidRecords.map((record, idx) => {
                    const pct = record.total > 0 ? (record.paid/record.total)*100 : 0;
                    return (
                      <motion.div layout key={record.id} custom={idx} variants={fadeUp}
                        initial="hidden" animate="visible"
                        exit={{opacity:0,x:40,transition:{duration:0.2}}}
                        className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">

                        {/* Desktop */}
                        <div className="hidden md:grid grid-cols-12 items-center px-8 py-5 gap-2">
                          <div className="col-span-3 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                              <MdPerson className="text-white/30" size={20}/>
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-sm truncate">{record.customerName||record.farmerName||"Unknown"}</p>
                              <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mt-1 border ${
                                record.status==="partial"
                                  ?"bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  :"bg-rose-500/10 text-rose-400 border-rose-500/20"}`}>
                                {record.status}
                              </span>
                            </div>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs font-black text-white/30">{record.date}</p>
                          </div>
                          <div className="col-span-2 text-right">
                            <p className="text-sm font-black text-white/40">{fmt(record.total)}</p>
                          </div>
                          <div className="col-span-2 text-right">
                            <p className="text-sm font-black text-emerald-400">{fmt(record.paid)}</p>
                            <div className="h-1 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                              <motion.div className="h-full bg-emerald-400 rounded-full"
                                initial={{width:0}} animate={{width:`${pct}%`}}
                                transition={{duration:0.8,delay:idx*0.04}}/>
                            </div>
                          </div>
                          <div className="col-span-2 text-right">
                            <p className="text-base font-black text-rose-400">{fmt(record.due)}</p>
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <motion.button whileHover={{scale:1.12}} whileTap={{scale:0.92}}
                              onClick={()=>openCollect(record)}
                              className="w-10 h-10 rounded-full bg-emerald-400 flex items-center justify-center text-emerald-950 shadow-lg shadow-emerald-400/20">
                              <MdChevronRight size={22}/>
                            </motion.button>
                          </div>
                        </div>

                        {/* Mobile */}
                        <div className="md:hidden p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <MdPerson className="text-white/30" size={22}/>
                              </div>
                              <div>
                                <p className="font-black">{record.customerName||record.farmerName||"Unknown"}</p>
                                <p className="text-[9px] font-black text-white/25 uppercase tracking-widest">{record.date}</p>
                              </div>
                            </div>
                            <motion.button whileTap={{scale:0.9}} onClick={()=>openCollect(record)}
                              className="w-11 h-11 rounded-full bg-emerald-400 flex items-center justify-center text-emerald-950 shadow-lg shadow-emerald-400/20">
                              <MdChevronRight size={22}/>
                            </motion.button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              {label:"Total",  val:fmt(record.total), cls:"text-white/50"},
                              {label:"Paid",   val:fmt(record.paid),  cls:"text-emerald-400"},
                              {label:"Due",    val:fmt(record.due),   cls:"text-rose-400"},
                            ].map(x=>(
                              <div key={x.label} className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
                                <p className="text-[8px] font-black uppercase tracking-widest text-white/25 mb-1">{x.label}</p>
                                <p className={`text-sm font-black ${x.cls}`}>{x.val}</p>
                              </div>
                            ))}
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div className="h-full bg-emerald-400 rounded-full"
                              initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.8}}/>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Summary footer */}
                  {unpaidRecords.length > 0 && (
                    <div className="px-6 lg:px-8 py-4 border-t border-white/5 bg-white/[0.015] flex flex-wrap items-center justify-between gap-4">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/20">
                        {unpaidRecords.length} {unpaidRecords.length===1?"record":"records"} outstanding
                      </p>
                      <div className="flex items-center gap-6 flex-wrap">
                        {[
                          {label:"Billed",    val: fmt(unpaidRecords.reduce((s,r)=>s+r.total,0)), cls:"text-white/40"},
                          {label:"Collected", val: fmt(unpaidRecords.reduce((s,r)=>s+r.paid,0)),  cls:"text-emerald-400"},
                          {label:"Due",       val: fmt(totalOutstanding),                          cls:"text-rose-400"},
                        ].map(x=>(
                          <div key={x.label} className="text-right">
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/20">{x.label}</p>
                            <p className={`text-sm font-black ${x.cls}`}>{x.val}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </LayoutGroup>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ── CATEGORY BREAKDOWN ──────────────────────────── */}
        <section className="space-y-5">
          <Eyebrow icon={MdBarChart} label="Category Breakdown" color="white"/>
          <motion.div variants={stagger} initial="hidden" animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { title:"Payments Received",  icon:MdAttachMoney, color:"#10b981", getValue:(p:Period)=>normService.filter(r=>inPeriod(r.date,p)).reduce((s,r)=>s+r.paid,0)},
              { title:"Tractor Maintenance",icon:MdAgriculture,  color:"#60a5fa", getValue:(p:Period)=>maintenanceRecords.filter(r=>inPeriod(r.date,p)).reduce((s,r)=>s+n(r.cost),0)},
              { title:"Field Income",       icon:MdGrass,        color:"#a3e635", getValue:(p:Period)=>fieldIncomeRecords.filter(r=>inPeriod(r.date,p)).reduce((s,r)=>s+n(r.amount),0)},
              { title:"Field Maintenance",  icon:MdLandscape,    color:"#fb923c", getValue:(p:Period)=>fieldMaintenanceRecords.filter(r=>inPeriod(r.date,p)).reduce((s,r)=>s+n(r.amount),0)},
              { title:"Driver Salaries",    icon:MdPeople,       color:"#c084fc", getValue:(p:Period)=>driverPaymentRecords.filter(r=>inPeriod(r.date,p)).reduce((s,r)=>s+n(r.amount),0)},
            ].map((card,i) => (
              <motion.div key={i} variants={fadeUp}
                className="rounded-[36px] border border-white/8 overflow-hidden p-6 space-y-5"
                style={{ background:"rgba(255,255,255,0.025)", backdropFilter:"blur(30px)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-[18px] border border-white/10 flex items-center justify-center"
                    style={{ background:`${card.color}15` }}>
                    <card.icon size={22} style={{ color:card.color }}/>
                  </div>
                  <h3 className="font-black text-base">{card.title}</h3>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {periods.map(p => {
                    const val = card.getValue(p.key);
                    return (
                      <div key={p.key} className="rounded-[20px] px-4 py-3 border border-white/5"
                        style={{ background:"rgba(255,255,255,0.04)" }}>
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/25 mb-1.5">{p.label}</p>
                        <p className="text-base font-black" style={{ color:card.color }}>{fmt(val)}</p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>
      </main>

      {/* ── COLLECT MODAL ───────────────────────────────── */}
      <Modal isOpen={modalOpen} onClose={()=>!collecting&&setModalOpen(false)} title="Collect Payment">
        {selectedRecord && (
          <div className="space-y-6 pt-2">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                <MdPerson className="text-white/30" size={32}/>
              </div>
              <p className="text-xl font-black">{selectedRecord.name}</p>
            </div>

            {/* Bill rows */}
            <div className="rounded-3xl border border-white/10 p-5 space-y-3"
              style={{ background:"rgba(255,255,255,0.04)", backdropFilter:"blur(20px)" }}>
              {[
                { label:"Total Billed",      val:fmt(selectedRecord.total), cls:"text-white/60" },
                { label:"Already Collected", val:fmt(selectedRecord.paid),  cls:"text-emerald-400" },
              ].map(x=>(
                <div key={x.label} className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-widest text-white/30">{x.label}</span>
                  <span className={`font-black text-sm ${x.cls}`}>{x.val}</span>
                </div>
              ))}
              <div className="h-px bg-white/10"/>
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-widest text-rose-400/80">Remaining Due</span>
                <span className="text-2xl font-black text-rose-400">{fmt(selectedRecord.due)}</span>
              </div>
              {/* Progress */}
              <div className="pt-1">
                <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-white/20 mb-1.5">
                  <span>Collected</span>
                  <span>{selectedRecord.total>0?Math.round((selectedRecord.paid/selectedRecord.total)*100):0}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    style={{ width:`${selectedRecord.total>0?(selectedRecord.paid/selectedRecord.total)*100:0}%` }}/>
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/25 px-1">Amount to Collect</p>
              <input type="number" inputMode="decimal"
                placeholder={`Max ${fmt(selectedRecord.due)}`}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white text-lg font-black outline-none focus:border-emerald-400/40 transition-colors placeholder:text-white/15 placeholder:text-base placeholder:font-normal"
                value={collectInput} min={0} max={selectedRecord.due}
                onChange={e=>setCollectInput(e.target.value)} disabled={collecting}/>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <motion.button whileTap={{scale:0.95}}
                onClick={()=>handleCollect(false)}
                disabled={collecting||!collectInput||n(collectInput)<=0}
                className="py-4 rounded-2xl border border-white/10 bg-white/5 font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-colors disabled:opacity-30">
                {collecting?"Saving…":"Partial"}
              </motion.button>
              <motion.button whileTap={{scale:0.95}}
                onClick={()=>handleCollect(true)} disabled={collecting}
                className="py-4 rounded-2xl bg-emerald-400 text-emerald-950 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-400/25 hover:shadow-emerald-400/40 transition-shadow disabled:opacity-50">
                {collecting?"Saving…":"Mark Fully Paid"}
              </motion.button>
            </div>
          </div>
        )}
      </Modal>

      <MobileNav onMenuOpen={()=>setSidebarOpen(true)}/>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────
function Eyebrow({ icon:Icon, label, color }: { icon:React.ElementType; label:string; color:string }) {
  const cls = color==="emerald"?"text-emerald-400" : color==="rose"?"text-rose-400" : "text-white/40";
  return (
    <div className="flex items-center gap-2.5">
      <Icon className={cls} size={18}/>
      <span className={`text-[9px] font-black uppercase tracking-[0.35em] ${cls}`}>{label}</span>
    </div>
  );
}

function NetProfitCard({
  title, icon:Icon, accent, accentBg, periods, getValue
}: {
  title:string; icon:React.ElementType; accent:string; accentBg:string;
  periods: { label: string; key: Period; icon: React.ElementType }[]; getValue:(p:Period)=>number;
}) {
  return (
    <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible"
      className="rounded-[40px] border border-white/8 overflow-hidden p-7"
      style={{ background:"rgba(255,255,255,0.025)", backdropFilter:"blur(30px)" }}>
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-60"
        style={{ background:accentBg }}/>
      <div className="flex items-center gap-4 mb-7">
        <div className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center"
          style={{ background:`${accent}15` }}>
          <Icon size={24} style={{ color:accent }}/>
        </div>
        <h2 className="text-xl font-black">{title} Net Profit</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {periods.map(p => {
          const val = getValue(p.key);
          const pos = val >= 0;
          return (
            <motion.div key={p.key} whileHover={{y:-2}}
              className="rounded-[24px] border border-white/5 p-4 transition-colors hover:bg-white/5"
              style={{ background:"rgba(255,255,255,0.035)" }}>
              <div className="flex items-center justify-between mb-2.5">
                <p.icon className="text-white/20" size={14}/>
                <span className="text-[8px] font-black uppercase tracking-widest text-white/25">{p.label}</span>
              </div>
              <p className="text-xl font-black tracking-tighter" style={{ color: pos ? accent : "#f87171" }}>
                {pos?"":"-"}{fmt(val)}
              </p>
              <div className="flex items-center gap-1 mt-1.5">
                {pos
                  ? <MdTrendingUp size={11} style={{color:accent}}/>
                  : <MdTrendingDown size={11} className="text-rose-400"/>}
                <span className="text-[8px] font-black uppercase tracking-widest"
                  style={{ color: pos ? `${accent}80` : "#f8717180" }}>
                  {pos?"Profit":"Loss"}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}