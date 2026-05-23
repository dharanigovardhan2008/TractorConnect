"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import Modal from "@/components/Modal";
import {
  MdAdd, MdMenu, MdPhone, MdEdit, MdPayment,
  MdHistory, MdAccountBalanceWallet,
  MdRocketLaunch, MdPerson, MdMiscellaneousServices,
  MdCheckCircle, MdCancel, MdPendingActions, MdImage
} from "react-icons/md";
import {
  collection, addDoc, query, where, getDocs,
  updateDoc, doc, serverTimestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

/* ── safe number ─────────────────────────────────────────── */
const safeNum = (v: unknown): number => {
  const x = Number(v);
  return isFinite(x) ? x : 0;
};

/* ── normalise status ────────────────────────────────────── */
const normaliseStatus = (s: string): "paid" | "partial" | "unpaid" => {
  const l = (s || "").toLowerCase().trim();
  if (l === "paid")    return "paid";
  if (l === "partial") return "partial";
  return "unpaid";
};

/* ── types ───────────────────────────────────────────────── */
interface Driver {
  id: string;
  name: string;
  phone: string;
  yearlySalary: number;
  picLink?: string;
  userId: string;
}
interface Payment {
  id: string;
  amount: number;
  mode: string;
  reason: string;
  details?: string;
  date: string;
  driverId: string;
  userId: string;
}
interface ServiceRecord {
  id: string;
  customerName: string;
  tractorName: string;
  serviceName: string;
  areaOrTime: string;
  totalAmount?: number;
  amount: number;
  paidAmount: number;
  paymentStatus: string;
  date: string;
  driverId: string;
  userId: string;
}

/* ── status badge ────────────────────────────────────────── */
const statusStyle: Record<string, string> = {
  paid:    "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  partial: "text-amber-400  bg-amber-400/10   border-amber-400/20",
  unpaid:  "text-rose-400   bg-rose-400/10    border-rose-400/20",
};

function StatusBadge({ raw }: { raw: string }) {
  const s = normaliseStatus(raw);
  const Icon = s === "paid" ? MdCheckCircle : s === "partial" ? MdPendingActions : MdCancel;
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border flex items-center gap-1 ${statusStyle[s]}`}>
      <Icon size={12} />{s}
    </span>
  );
}

/* ── driver avatar ───────────────────────────────────────── */
function DriverAvatar({ name, picLink }: { name: string; picLink?: string }) {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [picLink]);

  if (picLink && !err) {
    return (
      <div className="w-20 h-20 rounded-full border-2 border-emerald-400/20 overflow-hidden flex-shrink-0">
        <img src={picLink} alt={name} className="w-full h-full object-cover" onError={() => setErr(true)} />
      </div>
    );
  }
  return (
    <div className="w-20 h-20 rounded-full bg-emerald-400/10 border-2 border-emerald-400/20 flex items-center justify-center flex-shrink-0">
      <span className="text-2xl font-black text-emerald-400 uppercase">{name?.charAt(0) || "?"}</span>
    </div>
  );
}

/* ── photo url input with preview ────────────────────────── */
function PhotoUrlInput({ value, onChange, inputCls }: { value: string; onChange: (v: string) => void; inputCls: string }) {
  const [previewErr, setPreviewErr] = useState(false);
  useEffect(() => setPreviewErr(false), [value]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <input type="url" placeholder="https://example.com/photo.jpg" value={value}
          onChange={e => onChange(e.target.value)} className={inputCls} />
        {value && (
          <button type="button" onClick={() => onChange("")}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 text-xl font-bold">×</button>
        )}
      </div>
      {value.trim() && (
        <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-3xl">
          {!previewErr ? (
            <img src={value} alt="Preview"
              className="w-14 h-14 rounded-full object-cover border-2 border-emerald-400/30 flex-shrink-0"
              onError={() => setPreviewErr(true)} />
          ) : (
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border-2 border-rose-500/20 flex items-center justify-center flex-shrink-0">
              <MdImage className="text-rose-400" size={22} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {!previewErr
              ? <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">✓ Preview OK</p>
              : <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">✗ Cannot load image</p>
            }
          </div>
        </div>
      )}
    </div>
  );
}

/* ── loading spinner ─────────────────────────────────────── */
function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-10 h-10 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
      <p className="text-white/20 font-black text-xs uppercase tracking-widest">Loading…</p>
    </div>
  );
}

/* ── blank forms ─────────────────────────────────────────── */
const BLANK_DRIVER  = { name: "", phone: "", yearlySalary: "", picLink: "" };
const BLANK_PAYMENT = { amount: "", mode: "Cash", reason: "", details: "" };

/* ════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════ */
export default function DriversPage() {
  const { user, loading } = useAuth();

  // ✅ FIX 1: isMounted prevents hydration mismatch
  const [isMounted,     setIsMounted]     = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [submitting,    setSubmitting]    = useState(false);

  const [drivers,        setDrivers]        = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [payHistory,     setPayHistory]     = useState<Payment[]>([]);
  const [svcHistory,     setSvcHistory]     = useState<ServiceRecord[]>([]);
  const [payLoading,     setPayLoading]     = useState(false);
  const [svcLoading,     setSvcLoading]     = useState(false);

  const [showAdd,     setShowAdd]     = useState(false);
  const [showEdit,    setShowEdit]    = useState(false);
  const [showPay,     setShowPay]     = useState(false);
  const [showPayHist, setShowPayHist] = useState(false);
  const [showSvcHist, setShowSvcHist] = useState(false);

  const [driverForm,  setDriverForm]  = useState(BLANK_DRIVER);
  const [paymentForm, setPaymentForm] = useState(BLANK_PAYMENT);

  // ✅ FIX 1: Mount guard
  useEffect(() => setIsMounted(true), []);

  /* ── fetch drivers ─────────────────────────────────────── */
  const fetchDrivers = useCallback(async () => {
    if (!user) return;
    try {
      const snap = await getDocs(
        query(collection(db, "drivers"), where("userId", "==", user.uid))
      );
      setDrivers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Driver)));
    } catch { toast.error("Failed to load drivers"); }
  }, [user]);

  useEffect(() => {
    // ✅ FIX 2: use user?.uid not user object to prevent re-subscription loop
    if (user?.uid && isMounted) fetchDrivers();
  }, [user?.uid, isMounted, fetchDrivers]);

  /* ── add driver ────────────────────────────────────────── */
  const handleAddDriver = async () => {
    if (!driverForm.name.trim())  return toast.error("Name is required");
    if (!driverForm.phone.trim()) return toast.error("Phone is required");
    setSubmitting(true);
    try {
      await addDoc(collection(db, "drivers"), {
        name:         driverForm.name.trim(),
        phone:        driverForm.phone.trim(),
        yearlySalary: safeNum(driverForm.yearlySalary),
        picLink:      driverForm.picLink.trim() || null,
        userId:       user!.uid,
        createdAt:    serverTimestamp(),
      });
      toast.success("Driver registered ✓");
      setShowAdd(false);
      setDriverForm(BLANK_DRIVER);
      fetchDrivers();
    } catch { toast.error("Failed to add driver"); }
    finally { setSubmitting(false); }
  };

  /* ── edit driver ───────────────────────────────────────── */
  const handleEditDriver = async () => {
    if (!selectedDriver)          return;
    if (!driverForm.name.trim())  return toast.error("Name is required");
    if (!driverForm.phone.trim()) return toast.error("Phone is required");
    setSubmitting(true);
    try {
      await updateDoc(doc(db, "drivers", selectedDriver.id), {
        name:         driverForm.name.trim(),
        phone:        driverForm.phone.trim(),
        yearlySalary: safeNum(driverForm.yearlySalary),
        picLink:      driverForm.picLink.trim() || null,
        updatedAt:    serverTimestamp(),
      });
      toast.success("Driver updated ✓");
      setShowEdit(false);
      setSelectedDriver(null);
      setDriverForm(BLANK_DRIVER);
      fetchDrivers();
    } catch { toast.error("Failed to update driver"); }
    finally { setSubmitting(false); }
  };

  /* ── add payment ───────────────────────────────────────── */
  const handleAddPayment = async () => {
    const amt = safeNum(paymentForm.amount);
    if (amt <= 0)                   return toast.error("Enter a valid amount");
    if (!paymentForm.reason.trim()) return toast.error("Reason is required");
    if (!selectedDriver)            return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "driverPayments"), {
        amount:     amt,
        mode:       paymentForm.mode,
        reason:     paymentForm.reason.trim(),
        details:    paymentForm.details.trim() || null,
        driverId:   selectedDriver.id,
        driverName: selectedDriver.name,
        userId:     user!.uid,
        date:       new Date().toISOString(),
        createdAt:  serverTimestamp(),
      });
      toast.success("Payment recorded ✓");
      setShowPay(false);
      setPaymentForm(BLANK_PAYMENT);
    } catch { toast.error("Failed to record payment"); }
    finally { setSubmitting(false); }
  };

  /* ── payment history ───────────────────────────────────── */
  const openPayHistory = async (driver: Driver) => {
    setSelectedDriver(driver);
    setPayHistory([]);
    setPayLoading(true);
    setShowPayHist(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "driverPayments"),
          where("driverId", "==", driver.id),
          where("userId",   "==", user!.uid)
        )
      );
      setPayHistory(
        snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
    } catch { toast.error("Failed to load payment history"); }
    finally { setPayLoading(false); }
  };

  /* ── service history ───────────────────────────────────── */
  const openSvcHistory = async (driver: Driver) => {
    setSelectedDriver(driver);
    setSvcHistory([]);
    setSvcLoading(true);
    setShowSvcHist(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "serviceRecords"),
          where("driverId", "==", driver.id),
          where("userId",   "==", user!.uid)
        )
      );
      setSvcHistory(
        snap.docs.map(d => {
          const raw  = d.data();
          const bill = safeNum(raw.totalAmount ?? raw.amount);
          return {
            id: d.id, ...raw,
            amount:        bill,
            paidAmount:    Math.min(safeNum(raw.paidAmount), bill),
            paymentStatus: raw.paymentStatus || "unpaid",
          } as ServiceRecord;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
    } catch { toast.error("Failed to load service history"); }
    finally { setSvcLoading(false); }
  };

  /* ── derived ───────────────────────────────────────────── */
  const payTotalPaid    = payHistory.reduce((s, p) => s + safeNum(p.amount), 0);
  const svcTotalRevenue = svcHistory.reduce((s, r) => s + r.amount, 0);

  /* ── guards ────────────────────────────────────────────── */
  // ✅ FIX 3: Return null (not loading spinner) until mounted — prevents hydration mismatch
  if (!isMounted) return null;
  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#010B09] text-emerald-400 font-black tracking-widest uppercase text-xs">
      Loading…
    </div>
  );
  if (!user) return null;

  /* ── shared styles ─────────────────────────────────────── */
  const inputCls  = "w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-emerald-400/50 outline-none transition-all text-sm";
  const selectCls = "w-full bg-[#010B09] border border-white/10 rounded-full px-6 py-4 text-white outline-none focus:border-emerald-400/50 transition-all text-sm";
  const labelCls  = "text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 block";
  const btnPrimary = "w-full py-4 rounded-full bg-emerald-400 text-emerald-950 font-black uppercase tracking-widest text-xs active:scale-95 transition-all disabled:opacity-50";

  /* ══════════════════════════════════════════════════════════
     RENDER — ✅ NO motion.div on list items, NO AnimatePresence
     This eliminates all removeChild + hydration errors
  ══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#010B09] text-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:ml-[280px] p-4 sm:p-6 lg:p-12 pb-36">

        {/* ── HEADER ─────────────────────────────────────── */}
        <header className="flex items-center justify-between mb-12 px-1 pt-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-11 h-11 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
            >
              <MdMenu size={20} />
            </button>
            <div>
              <h1 className="text-3xl lg:text-5xl font-black tracking-tighter">Drivers</h1>
            </div>
          </div>

          {/* ✅ Mobile: icon only. Desktop: icon + text. No glow. */}
          <button
            onClick={() => { setDriverForm(BLANK_DRIVER); setShowAdd(true); }}
            className="flex items-center gap-2 bg-emerald-400 pl-3 pr-3 sm:pr-5 py-3 rounded-full text-emerald-950 font-black text-sm active:scale-95 transition-all"
          >
            <MdAdd size={20} />
            <span className="hidden sm:block text-xs tracking-wide">Register Driver</span>
          </button>
        </header>

        {/* ── EMPTY STATE ────────────────────────────────── */}
        {drivers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-white/10">
            <MdPerson size={72} className="mb-5" />
            <p className="font-black text-sm uppercase tracking-[0.3em]">No Personnel Registered</p>
            <p className="text-xs mt-2 tracking-widest text-white/5">Tap Register Driver to begin</p>
          </div>
        )}

        {/* ── DRIVER CARDS ───────────────────────────────── */}
        {/* ✅ FIX 4: Plain div grid — no motion, no AnimatePresence */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {drivers.map(driver => (
            <div
              key={driver.id}
              className="bg-white/5 border border-white/5 p-6 sm:p-8 relative overflow-hidden rounded-[40px] backdrop-blur-xl"
            >
              {/* subtle bg glow — CSS only, no motion */}
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
                  <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-0.5">Annual Package</p>
                  <p className="text-lg font-black text-white">
                    ₹{safeNum(driver.yearlySalary).toLocaleString("en-IN")}
                  </p>
                </div>
                <MdAccountBalanceWallet className="text-emerald-400/15" size={28} />
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    setSelectedDriver(driver);
                    setDriverForm({ name: driver.name, phone: driver.phone, yearlySalary: driver.yearlySalary?.toString() || "", picLink: driver.picLink || "" });
                    setShowEdit(true);
                  }}
                  className="h-11 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 text-white/40 hover:text-white transition-all border border-white/5 text-[10px] font-black uppercase"
                >
                  <MdEdit size={15} /><span>Edit</span>
                </button>

                <button
                  onClick={() => { setSelectedDriver(driver); setPaymentForm(BLANK_PAYMENT); setShowPay(true); }}
                  className="h-11 rounded-full bg-emerald-400/10 hover:bg-emerald-400 flex items-center justify-center gap-2 text-emerald-400 hover:text-emerald-950 transition-all border border-emerald-400/20 text-[10px] font-black uppercase"
                >
                  <MdPayment size={15} /><span>Pay</span>
                </button>

                <button
                  onClick={() => openPayHistory(driver)}
                  className="h-11 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 text-white/40 hover:text-white transition-all border border-white/5 text-[10px] font-black uppercase"
                >
                  <MdHistory size={15} /><span>Payments</span>
                </button>

                <button
                  onClick={() => openSvcHistory(driver)}
                  className="h-11 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 text-white/40 hover:text-white transition-all border border-white/5 text-[10px] font-black uppercase"
                >
                  <MdMiscellaneousServices size={15} /><span>Services</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <MobileNav onMenuOpen={() => setSidebarOpen(true)} />
      </div>

      {/* ── ADD DRIVER ─────────────────────────────────────── */}
      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setDriverForm(BLANK_DRIVER); }} title="Register Driver">
        <div className="space-y-5">
          <div>
            <label className={labelCls}>Profile Photo URL (optional)</label>
            <PhotoUrlInput value={driverForm.picLink} onChange={v => setDriverForm(f => ({ ...f, picLink: v }))} inputCls={inputCls} />
          </div>
          <div className="h-px bg-white/5" />
          <input type="text"   placeholder="Full Name *"              value={driverForm.name}         onChange={e => setDriverForm(f => ({ ...f, name: e.target.value }))}         className={inputCls} />
          <input type="tel"    placeholder="Phone Number *"           value={driverForm.phone}        onChange={e => setDriverForm(f => ({ ...f, phone: e.target.value }))}        className={inputCls} />
          <input type="number" placeholder="Yearly Salary (optional)" value={driverForm.yearlySalary} onChange={e => setDriverForm(f => ({ ...f, yearlySalary: e.target.value }))} className={inputCls} />
          <button onClick={handleAddDriver} disabled={submitting} className={btnPrimary}>
            {submitting ? "Registering…" : "Register Driver"}
          </button>
        </div>
      </Modal>

      {/* ── EDIT DRIVER ────────────────────────────────────── */}
      <Modal isOpen={showEdit} onClose={() => { setShowEdit(false); setSelectedDriver(null); setDriverForm(BLANK_DRIVER); }} title="Update Driver">
        <div className="space-y-5">
          <div>
            <label className={labelCls}>Profile Photo URL</label>
            <PhotoUrlInput value={driverForm.picLink} onChange={v => setDriverForm(f => ({ ...f, picLink: v }))} inputCls={inputCls} />
          </div>
          <div className="h-px bg-white/5" />
          <input type="text"   placeholder="Full Name *"    value={driverForm.name}         onChange={e => setDriverForm(f => ({ ...f, name: e.target.value }))}         className={inputCls} />
          <input type="tel"    placeholder="Phone Number *" value={driverForm.phone}        onChange={e => setDriverForm(f => ({ ...f, phone: e.target.value }))}        className={inputCls} />
          <input type="number" placeholder="Yearly Salary"  value={driverForm.yearlySalary} onChange={e => setDriverForm(f => ({ ...f, yearlySalary: e.target.value }))} className={inputCls} />
          <button onClick={handleEditDriver} disabled={submitting} className={btnPrimary}>
            {submitting ? "Updating…" : "Update Driver"}
          </button>
        </div>
      </Modal>

      {/* ── ADD PAYMENT ────────────────────────────────────── */}
      <Modal isOpen={showPay} onClose={() => { setShowPay(false); setPaymentForm(BLANK_PAYMENT); }} title={`Pay — ${selectedDriver?.name || ""}`}>
        <div className="space-y-4">
          <input type="number" placeholder="Amount (₹) *" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} className={inputCls} />
          <div>
            <label className={labelCls}>Payment Mode</label>
            <select value={paymentForm.mode} onChange={e => setPaymentForm(f => ({ ...f, mode: e.target.value }))} className={selectCls}>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
          <input type="text" placeholder="Reason (e.g. Monthly Salary) *" value={paymentForm.reason} onChange={e => setPaymentForm(f => ({ ...f, reason: e.target.value }))} className={inputCls} />
          <textarea placeholder="Additional Details (optional)" value={paymentForm.details} onChange={e => setPaymentForm(f => ({ ...f, details: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-[28px] px-6 py-4 text-white placeholder:text-white/20 focus:bg-white/10 outline-none transition-all h-24 resize-none text-sm" />
          <button onClick={handleAddPayment} disabled={submitting} className={btnPrimary}>
            {submitting ? "Recording…" : "Record Payment"}
          </button>
        </div>
      </Modal>

      {/* ── PAYMENT HISTORY ────────────────────────────────── */}
      <Modal isOpen={showPayHist} onClose={() => { setShowPayHist(false); setPayHistory([]); setSelectedDriver(null); }} title={`Payment Log — ${selectedDriver?.name || ""}`}>
        {payLoading ? <Spinner /> : payHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-white/10">
            <MdHistory size={56} className="mb-4" />
            <p className="font-black text-xs uppercase tracking-widest">No Transactions Found</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-[26px] p-5 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-emerald-400/40 uppercase tracking-widest mb-1">Total Paid</p>
                <p className="text-2xl font-black text-emerald-400">₹{payTotalPaid.toLocaleString("en-IN")}</p>
              </div>
              <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                {payHistory.length} {payHistory.length === 1 ? "record" : "records"}
              </p>
            </div>
            {payHistory.map(log => (
              <div key={log.id} className="bg-white/5 border border-white/5 p-5 rounded-[28px]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xl font-black text-white">₹{safeNum(log.amount).toLocaleString("en-IN")}</p>
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-4 py-1.5 rounded-full border border-emerald-400/20">
                    {log.mode}
                  </span>
                </div>
                <p className="text-sm text-white/60 font-bold mb-1">{log.reason}</p>
                {log.details && <p className="text-xs text-white/30 mb-2">{log.details}</p>}
                <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">
                  {new Date(log.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ── SERVICE HISTORY ────────────────────────────────── */}
      <Modal isOpen={showSvcHist} onClose={() => { setShowSvcHist(false); setSvcHistory([]); setSelectedDriver(null); }} title={`Services — ${selectedDriver?.name || ""}`}>
        {svcLoading ? <Spinner /> : svcHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-white/10">
            <MdMiscellaneousServices size={56} className="mb-4" />
            <p className="font-black text-xs uppercase tracking-widest">No Services Found</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="bg-emerald-400/5 border border-emerald-400/20 p-5 rounded-[26px]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-black text-emerald-400/40 uppercase tracking-widest mb-1">Total Services</p>
                  <p className="text-2xl font-black text-emerald-400">{svcHistory.length}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-emerald-400/40 uppercase tracking-widest mb-1">Total Revenue</p>
                  <p className="text-2xl font-black text-emerald-400">₹{svcTotalRevenue.toLocaleString("en-IN")}</p>
                </div>
              </div>
            </div>
            {/* ✅ FIX 5: plain divs, no motion inside modal — prevents removeChild */}
            {svcHistory.map(record => {
              const status    = normaliseStatus(record.paymentStatus);
              const remaining = Math.max(0, record.amount - record.paidAmount);
              return (
                <div key={record.id} className="bg-white/5 border border-white/5 p-5 rounded-[28px]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-lg font-black text-white">₹{record.amount.toLocaleString("en-IN")}</p>
                    <StatusBadge raw={record.paymentStatus} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    {[
                      { label: "Customer",    val: record.customerName || "—" },
                      { label: "Tractor",     val: record.tractorName  || "—" },
                      { label: "Service",     val: record.serviceName  || "—" },
                      { label: "Area / Time", val: record.areaOrTime   || "—" },
                    ].map(({ label, val }) => (
                      <div key={label}>
                        <p className="text-white/20 font-black uppercase tracking-widest text-[8px] mb-0.5">{label}</p>
                        <p className="text-white/70 font-bold">{val}</p>
                      </div>
                    ))}
                  </div>
                  {status !== "paid" && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Paid</p>
                        <p className="text-sm font-bold text-emerald-400">₹{record.paidAmount.toLocaleString("en-IN")}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Remaining</p>
                        <p className="text-sm font-bold text-rose-400">₹{remaining.toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  )}
                  <p className="text-[9px] text-white/20 font-black uppercase tracking-widest mt-3">
                    {new Date(record.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}