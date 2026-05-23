"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import Modal from "@/components/Modal";
import CustomSelect from "@/components/CustomSelect";
import {
  MdAdd, MdEdit, MdDelete, MdHistory,
  MdRocketLaunch, MdPhone, MdMiscellaneousServices,
  MdCheck, MdMenu, MdImage, MdPerson
} from "react-icons/md";
import {
  collection, addDoc, query, where, getDocs,
  updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
import Image from "next/image";

// ── Safe number ──────────────────────────────────────────────
const n = (v: unknown): number => {
  const x = Number(v);
  return isFinite(x) ? x : 0;
};

// ── Types ────────────────────────────────────────────────────
interface Customer {
  id: string;
  name: string;
  phone: string;
  loyaltyLevel: string;
  photoUrl?: string;
  userId: string;
}

interface ServiceLog {
  id: string;
  customerId: string;
  customerName: string;
  driverId?: string;
  driverName?: string;
  tractorId?: string;
  tractorName?: string;
  serviceId: string;
  serviceName: string;
  areaOrTime?: string;
  amount: number;
  paidAmount: number;
  paymentStatus: "unpaid" | "partial" | "paid";
  referenceNumber?: string;
  date: string;
  userId: string;
}

// ── Status helpers ────────────────────────────────────────────
const normaliseStatus = (s: string): "paid" | "partial" | "unpaid" => {
  const l = (s || "").toLowerCase();
  if (l === "paid")    return "paid";
  if (l === "partial") return "partial";
  return "unpaid";
};

const statusLabel: Record<string, string> = {
  paid: "PAID", partial: "PARTIAL", unpaid: "UNPAID",
};

const statusStyle: Record<string, string> = {
  paid:    "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  partial: "bg-amber-500/10  text-amber-400   border border-amber-500/20",
  unpaid:  "bg-white/5       text-white/30    border border-white/10",
};

// ── Avatar component (shared) ────────────────────────────────
function CustomerAvatar({
  name, photoUrl, size = "lg"
}: {
  name: string; photoUrl?: string; size?: "sm" | "md" | "lg";
}) {
  const [imgError, setImgError] = useState(false);

  const sizeMap = {
    sm: "w-10 h-10 text-base",
    md: "w-14 h-14 text-lg",
    lg: "w-20 h-20 text-2xl",
  };

  const cls = sizeMap[size];

  if (photoUrl && !imgError) {
    return (
      <div className={`${cls} rounded-full overflow-hidden flex-shrink-0 border-2 border-emerald-400/20`}>
        <img
          src={photoUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${cls} rounded-full bg-emerald-400/5 border-2 border-emerald-400/10 flex items-center justify-center flex-shrink-0`}>
      <span className="font-black text-emerald-400 uppercase">
        {name?.charAt(0) || "?"}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HISTORY ITEM
═══════════════════════════════════════════════════════════ */
function HistoryItem({
  log, onUpdate
}: {
  log: ServiceLog;
  onUpdate: () => void;
}) {
  const [addPayInput, setAddPayInput] = useState("");
  const [saving, setSaving] = useState(false);

  const status    = normaliseStatus(log.paymentStatus);
  const total     = n(log.amount);
  const paid      = n(log.paidAmount);
  const remaining = Math.max(0, total - paid);

  const handleApplyPayment = async () => {
    const input = n(addPayInput);
    if (input <= 0)        return toast.error("Enter a valid amount");
    if (input > remaining) return toast.error(`Max payable: ₹${remaining.toLocaleString("en-IN")}`);

    setSaving(true);
    try {
      const newPaid   = Math.min(paid + input, total);
      const newStatus: ServiceLog["paymentStatus"] =
        newPaid >= total ? "paid" : "partial";

      await updateDoc(doc(db, "serviceRecords", log.id), {
        paidAmount:    newPaid,
        paymentStatus: newStatus,
        totalAmount:   total,
        updatedAt:     serverTimestamp(),
      });

      toast.success(newStatus === "paid" ? "Fully paid ✓" : `₹${input.toLocaleString("en-IN")} recorded`);
      setAddPayInput("");
      onUpdate();
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#0a1a17] border border-white/5 p-5 rounded-[30px]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-black text-white tracking-tight">
          ₹{total.toLocaleString("en-IN")}
        </h2>
        <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full tracking-widest ${statusStyle[status]}`}>
          {statusLabel[status]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-y-4">
        {[
          { label: "Customer", val: log.customerName || "—" },
          { label: "Driver",   val: log.driverName   || "—" },
          { label: "Service",  val: log.serviceName  || "—" },
          { label: "Area / Time", val: log.areaOrTime || "—" },
        ].map(({ label, val }) => (
          <div key={label}>
            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.15em] mb-0.5">{label}</p>
            <p className="text-sm font-bold text-white">{val}</p>
          </div>
        ))}
        <div>
          <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.15em] mb-0.5">Paid</p>
          <p className="text-sm font-bold text-emerald-400">₹{paid.toLocaleString("en-IN")}</p>
        </div>
        <div>
          <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.15em] mb-0.5">Remaining</p>
          <p className={`text-sm font-bold ${remaining > 0 ? "text-rose-400" : "text-white/20"}`}>
            ₹{remaining.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {log.referenceNumber && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.15em] mb-0.5">Reference</p>
          <p className="text-xs font-bold text-white/50">{log.referenceNumber}</p>
        </div>
      )}

      <div className="mt-4 text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">
        {new Date(log.date).toLocaleDateString("en-GB", {
          day: "2-digit", month: "short", year: "numeric"
        }).toUpperCase()}
      </div>

      {remaining > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
          <input
            type="number"
            placeholder={`Max ₹${remaining.toLocaleString("en-IN")}`}
            value={addPayInput}
            onChange={e => setAddPayInput(e.target.value)}
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-emerald-400"
          />
          <button
            onClick={handleApplyPayment}
            disabled={saving}
            className="bg-emerald-400 text-emerald-950 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 disabled:opacity-50"
          >
            {saving ? "…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CUSTOMER CARD
═══════════════════════════════════════════════════════════ */
function CustomerCard({
  customer, onAddService, onEdit, onDelete, onHistory, refreshKey
}: {
  customer: Customer;
  onAddService: () => void;
  onEdit:       () => void;
  onDelete:     () => void;
  onHistory:    () => void;
  refreshKey:   number;
}) {
  const { user } = useAuth();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let active = true;
    if (!user) return;

    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "serviceRecords"), where("customerId", "==", customer.id))
        );
        let due = 0;
        snap.forEach(d => {
          const data   = d.data();
          const status = normaliseStatus(data.paymentStatus || "");
          if (status !== "paid") {
            const billed = n(data.totalAmount ?? data.amount);
            const paid   = Math.min(n(data.paidAmount), billed);
            due += Math.max(0, billed - paid);
          }
        });
        if (active) setPending(due);
      } catch { /* silent */ }
    })();

    return () => { active = false; };
  }, [customer.id, refreshKey, user]);

  return (
    <div className="bg-[#0a1a17]/50 p-8 relative overflow-hidden border border-white/5 rounded-[45px] backdrop-blur-xl">

      {/* Avatar + Name */}
      <div className="flex items-center gap-5 mb-6">
        <CustomerAvatar name={customer.name} photoUrl={customer.photoUrl} size="lg" />

        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-black text-white truncate mb-1 leading-none">
            {customer.name}
          </h3>
          <div className="flex items-center gap-2 text-emerald-400/50">
            <MdPhone size={14} />
            <span className="text-xs font-bold">{customer.phone}</span>
          </div>
          <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">
            {customer.loyaltyLevel} Tier
          </span>
        </div>

        {pending > 0 && (
          <button
            onClick={onHistory}
            className="absolute top-8 right-8 w-10 h-10 rounded-full bg-emerald-400 text-emerald-950 flex items-center justify-center shadow-lg active:scale-90 transition-transform"
            title="Collect payment"
          >
            <MdCheck size={22} />
          </button>
        )}
      </div>

      {/* Pending / Clear */}
      {pending > 0 ? (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-5 mb-6 text-center">
          <p className="text-[10px] font-black text-rose-300/50 uppercase tracking-[0.2em] mb-1">
            Pending Due
          </p>
          <p className="text-2xl font-black text-rose-300">
            ₹{pending.toLocaleString("en-IN")}
          </p>
        </div>
      ) : (
        <div className="bg-white/5 rounded-3xl p-5 mb-6 border border-white/5 flex items-center justify-center h-14">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
            All Clear ✓
          </span>
        </div>
      )}

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onAddService}
          className="h-16 rounded-3xl bg-emerald-400/10 text-emerald-400 flex flex-col items-center justify-center border border-emerald-400/20 hover:bg-emerald-400 hover:text-emerald-950 transition-all"
        >
          <MdMiscellaneousServices size={22} />
          <span className="text-[10px] font-black uppercase tracking-wide mt-1">Service</span>
        </button>
        <button
          onClick={onHistory}
          className="h-16 rounded-3xl bg-white/5 text-white/40 flex flex-col items-center justify-center border border-white/5 hover:bg-white/10 transition-all"
        >
          <MdHistory size={22} />
          <span className="text-[10px] font-black uppercase tracking-wide mt-1">History</span>
        </button>
        <button
          onClick={onEdit}
          className="h-12 rounded-full bg-white/5 text-white/40 flex items-center justify-center border border-white/5 hover:bg-white/10 transition-all"
        >
          <MdEdit size={18} />
        </button>
        <button
          onClick={onDelete}
          className="h-12 rounded-full bg-rose-500/5 text-rose-500/40 flex items-center justify-center border border-rose-500/10 hover:bg-rose-500/20 transition-all"
        >
          <MdDelete size={18} />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PHOTO URL INPUT COMPONENT
═══════════════════════════════════════════════════════════ */
function PhotoUrlInput({
  value, onChange, inputCls
}: {
  value: string;
  onChange: (val: string) => void;
  inputCls: string;
}) {
  const [previewError, setPreviewError] = useState(false);

  // Reset error when URL changes
  useEffect(() => setPreviewError(false), [value]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="url"
          placeholder="https://example.com/photo.jpg"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={inputCls}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 text-lg font-bold transition-colors"
          >
            ×
          </button>
        )}
      </div>

      {/* Live preview */}
      {value.trim() !== "" && (
        <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-3xl">
          {!previewError ? (
            <img
              src={value}
              alt="Preview"
              className="w-16 h-16 rounded-full object-cover border-2 border-emerald-400/30 flex-shrink-0"
              onError={() => setPreviewError(true)}
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border-2 border-rose-500/20 flex items-center justify-center flex-shrink-0">
              <MdImage className="text-rose-400" size={24} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {!previewError ? (
              <>
                <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">
                  ✓ Preview looks good
                </p>
                <p className="text-[10px] text-white/30 mt-0.5 truncate">{value}</p>
              </>
            ) : (
              <>
                <p className="text-xs font-black text-rose-400 uppercase tracking-widest">
                  ✗ Could not load image
                </p>
                <p className="text-[10px] text-white/30 mt-0.5">
                  Check the URL and try again
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════ */
const BLANK_SERVICE_FORM = {
  driverId: "", tractorId: "", serviceId: "",
  areaOrTime: "", amount: "", paymentStatus: "unpaid",
  paidAmount: "", referenceNumber: "",
};

const BLANK_CUSTOMER_FORM = {
  name: "", phone: "", loyaltyLevel: "Regular", photoUrl: "",
};

const LOYALTY_OPTIONS = [
  { id: "Regular", name: "Regular" },
  { id: "Premium", name: "Premium" },
];

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function CustomersPage() {
  const { user, loading } = useAuth();

  const [hasMounted,    setHasMounted]    = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [customers,     setCustomers]     = useState<Customer[]>([]);
  const [drivers,       setDrivers]       = useState<any[]>([]);
  const [tractors,      setTractors]      = useState<any[]>([]);
  const [services,      setServices]      = useState<any[]>([]);
  const [history,       setHistory]       = useState<ServiceLog[]>([]);
  const [refreshKey,    setRefreshKey]    = useState(0);
  const [submitting,    setSubmitting]    = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [showAdd,     setShowAdd]     = useState(false);
  const [showEdit,    setShowEdit]    = useState(false);
  const [showService, setShowService] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [customerForm, setCustomerForm] = useState(BLANK_CUSTOMER_FORM);
  const [serviceForm,  setServiceForm]  = useState(BLANK_SERVICE_FORM);

  useEffect(() => setHasMounted(true), []);

  /* ── Fetch helpers ─────────────────────────────────────── */
  const fetchCustomers = useCallback(async () => {
    if (!user) return;
    try {
      const snap = await getDocs(
        query(collection(db, "customers"), where("userId", "==", user.uid))
      );
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
    } catch { toast.error("Could not load customers"); }
  }, [user]);

  const fetchDropdowns = useCallback(async () => {
    if (!user) return;
    try {
      const [ds, ts, ss] = await Promise.all([
        getDocs(query(collection(db, "drivers"),  where("userId", "==", user.uid))),
        getDocs(query(collection(db, "tractors"), where("userId", "==", user.uid))),
        getDocs(query(collection(db, "services"), where("userId", "==", user.uid))),
      ]);
      setDrivers(ds.docs.map(d => ({ id: d.id, ...d.data() })));
      setTractors(ts.docs.map(d => ({ id: d.id, ...d.data() })));
      setServices(ss.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch { toast.error("Could not load dropdown data"); }
  }, [user]);

  useEffect(() => {
    if (user && hasMounted) {
      fetchCustomers();
      fetchDropdowns();
    }
  }, [user, hasMounted, fetchCustomers, fetchDropdowns]);

  const fetchHistory = useCallback(async (customerId: string) => {
    try {
      const snap = await getDocs(
        query(collection(db, "serviceRecords"), where("customerId", "==", customerId))
      );
      const logs = snap.docs
        .map(d => {
          const raw = d.data();
          const total = n(raw.totalAmount ?? raw.amount);
          return {
            id: d.id, ...raw,
            amount:        total,
            paidAmount:    Math.min(n(raw.paidAmount), total),
            paymentStatus: normaliseStatus(raw.paymentStatus),
          } as ServiceLog;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setHistory(logs);
      setRefreshKey(k => k + 1);
    } catch { toast.error("Could not load history"); }
  }, []);

  /* ── Add service ───────────────────────────────────────── */
  const handleAddService = useCallback(async () => {
    if (!serviceForm.serviceId) return toast.error("Service is required");
    if (!serviceForm.amount)    return toast.error("Amount is required");
    if (!selectedCustomer)      return;

    const totalBill = n(serviceForm.amount);
    if (totalBill <= 0) return toast.error("Amount must be > 0");

    let paidAmount = 0;
    if (serviceForm.paymentStatus === "paid") {
      paidAmount = totalBill;
    } else if (serviceForm.paymentStatus === "partial") {
      paidAmount = Math.min(n(serviceForm.paidAmount), totalBill);
      if (paidAmount <= 0) return toast.error("Enter amount paid");
    }

    const svc = services.find(s => s.id === serviceForm.serviceId);
    const drv = drivers.find(d  => d.id === serviceForm.driverId);
    const trc = tractors.find(t => t.id === serviceForm.tractorId);

    setSubmitting(true);
    try {
      await addDoc(collection(db, "serviceRecords"), {
        customerId:      selectedCustomer.id,
        customerName:    selectedCustomer.name,
        driverId:        serviceForm.driverId  || null,
        driverName:      drv?.name             || null,
        tractorId:       serviceForm.tractorId || null,
        tractorName:     trc?.name             || null,
        serviceId:       serviceForm.serviceId,
        serviceName:     svc?.name             || "Service",
        areaOrTime:      serviceForm.areaOrTime || null,
        totalAmount:     totalBill,
        amount:          totalBill,
        paidAmount,
        paymentStatus:   serviceForm.paymentStatus,
        referenceNumber: serviceForm.referenceNumber || null,
        date:            new Date().toISOString(),
        userId:          user!.uid,
        createdAt:       serverTimestamp(),
      });
      toast.success("Service recorded ✓");
      setShowService(false);
      setServiceForm(BLANK_SERVICE_FORM);
      setRefreshKey(k => k + 1);
    } catch { toast.error("Failed to save service"); }
    finally { setSubmitting(false); }
  }, [serviceForm, selectedCustomer, services, drivers, tractors, user]);

  /* ── Add customer ──────────────────────────────────────── */
  const handleAddCustomer = useCallback(async () => {
    if (!customerForm.name.trim())  return toast.error("Name is required");
    if (!customerForm.phone.trim()) return toast.error("Phone is required");

    setSubmitting(true);
    try {
      await addDoc(collection(db, "customers"), {
        name:         customerForm.name.trim(),
        phone:        customerForm.phone.trim(),
        loyaltyLevel: customerForm.loyaltyLevel,
        photoUrl:     customerForm.photoUrl.trim() || null,
        userId:       user!.uid,
        createdAt:    serverTimestamp(),
      });
      toast.success("Customer added ✓");
      setShowAdd(false);
      setCustomerForm(BLANK_CUSTOMER_FORM);
      fetchCustomers();
    } catch { toast.error("Failed to add customer"); }
    finally { setSubmitting(false); }
  }, [customerForm, user, fetchCustomers]);

  /* ── Edit customer ─────────────────────────────────────── */
  const handleEditCustomer = useCallback(async () => {
    if (!selectedCustomer)          return;
    if (!customerForm.name.trim())  return toast.error("Name is required");
    if (!customerForm.phone.trim()) return toast.error("Phone is required");

    setSubmitting(true);
    try {
      await updateDoc(doc(db, "customers", selectedCustomer.id), {
        name:         customerForm.name.trim(),
        phone:        customerForm.phone.trim(),
        loyaltyLevel: customerForm.loyaltyLevel,
        photoUrl:     customerForm.photoUrl.trim() || null,
        updatedAt:    serverTimestamp(),
      });
      toast.success("Customer updated ✓");
      setShowEdit(false);
      setCustomerForm(BLANK_CUSTOMER_FORM);
      setSelectedCustomer(null);
      fetchCustomers();
    } catch { toast.error("Failed to update customer"); }
    finally { setSubmitting(false); }
  }, [selectedCustomer, customerForm, fetchCustomers]);

  /* ── Delete customer ───────────────────────────────────── */
  const handleDeleteCustomer = useCallback(async (customerId: string) => {
    if (!confirm("Delete this customer and all their records?")) return;
    try {
      const snap = await getDocs(
        query(collection(db, "serviceRecords"), where("customerId", "==", customerId))
      );
      await Promise.all(snap.docs.map(d => deleteDoc(doc(db, "serviceRecords", d.id))));
      await deleteDoc(doc(db, "customers", customerId));
      toast.success("Customer deleted");
      fetchCustomers();
      setRefreshKey(k => k + 1);
    } catch { toast.error("Failed to delete customer"); }
  }, [fetchCustomers]);

  /* ── Derived ───────────────────────────────────────────── */
  const lifetimePaid = history.reduce((sum, l) => sum + n(l.paidAmount), 0);

  /* ── Guards ────────────────────────────────────────────── */
  if (!hasMounted || loading) return <div className="min-h-screen bg-[#011410]" />;
  if (!user) return null;

  /* ── Shared styles ─────────────────────────────────────── */
  const inputCls  = "w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-emerald-400/50 outline-none transition-all text-sm";
  const selectCls = "w-full bg-[#011410] border border-white/10 rounded-full px-6 py-4 text-white outline-none focus:border-emerald-400/50 transition-all text-sm";
  const labelCls  = "text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 block";

  /* ═══════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#011410]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:ml-[280px] p-4 sm:p-6 lg:p-12 pb-44">

        {/* HEADER */}
        <header className="flex items-center justify-between mb-16 px-2 pt-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-12 h-12 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center"
            >
              <MdMenu size={22} />
            </button>
            <div>
              <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-white">
                Customers
              </h1>
            </div>
          </div>

          <button
            onClick={() => {
              setCustomerForm(BLANK_CUSTOMER_FORM);
              setSelectedCustomer(null);
              setShowAdd(true);
            }}
            className="flex items-center gap-3 bg-emerald-400 px-8 py-4 rounded-full text-emerald-950 font-black text-sm shadow-[0_0_30px_rgba(52,211,153,0.25)] active:scale-95 transition-all"
          >
            <MdAdd size={20} />
            <span className="hidden sm:block">Add Customer</span>
          </button>
        </header>

        {/* CUSTOMER GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {customers.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-32 gap-4">
              <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <MdPerson className="text-white/20" size={36} />
              </div>
              <p className="text-white/20 font-black uppercase tracking-widest text-sm">
                No customers yet
              </p>
            </div>
          ) : (
            customers.map(customer => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                refreshKey={refreshKey}
                onAddService={() => {
                  setSelectedCustomer(customer);
                  setServiceForm(BLANK_SERVICE_FORM);
                  setShowService(true);
                }}
                onHistory={() => {
                  setSelectedCustomer(customer);
                  setHistory([]);
                  setShowHistory(true);
                  fetchHistory(customer.id);
                }}
                onEdit={() => {
                  setSelectedCustomer(customer);
                  setCustomerForm({
                    name:         customer.name,
                    phone:        customer.phone,
                    loyaltyLevel: customer.loyaltyLevel,
                    photoUrl:     customer.photoUrl || "",
                  });
                  setShowEdit(true);
                }}
                onDelete={() => handleDeleteCustomer(customer.id)}
              />
            ))
          )}
        </div>
      </main>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <MobileNav onMenuOpen={() => setSidebarOpen(true)} />
      </div>

      {/* ── HISTORY MODAL ──────────────────────────────────── */}
      <Modal
        isOpen={showHistory}
        onClose={() => { setShowHistory(false); setSelectedCustomer(null); setHistory([]); }}
        title={`History — ${selectedCustomer?.name || ""}`}
      >
        <div className="max-h-[75vh] flex flex-col pt-2">
          {/* Customer avatar + name inside modal */}
          {selectedCustomer && (
            <div className="flex items-center gap-4 mb-5 p-4 bg-white/5 rounded-3xl border border-white/5">
              <CustomerAvatar
                name={selectedCustomer.name}
                photoUrl={selectedCustomer.photoUrl}
                size="md"
              />
              <div>
                <p className="font-black text-white text-base">{selectedCustomer.name}</p>
                <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">
                  {selectedCustomer.phone}
                </p>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {history.length === 0 ? (
              <p className="text-center text-white/30 py-12 text-sm">No records found</p>
            ) : (
              history.map(log => (
                <HistoryItem
                  key={log.id}
                  log={log}
                  onUpdate={() => selectedCustomer && fetchHistory(selectedCustomer.id)}
                />
              ))
            )}
          </div>

          {lifetimePaid > 0 && (
            <div className="mt-4 p-6 bg-emerald-400/5 border border-emerald-400/20 rounded-[30px] text-center">
              <p className="text-[9px] font-black text-emerald-400/40 uppercase tracking-[0.2em] mb-1">
                Lifetime Paid
              </p>
              <p className="text-3xl font-black text-emerald-400 tracking-tighter">
                ₹{lifetimePaid.toLocaleString("en-IN")}
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* ── ADD SERVICE MODAL ───────────────────────────────── */}
      <Modal
        isOpen={showService}
        onClose={() => { setShowService(false); setServiceForm(BLANK_SERVICE_FORM); }}
        title={`New Service — ${selectedCustomer?.name || ""}`}
      >
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Driver (optional)</label>
            <CustomSelect
              placeholder="Select Driver"
              options={drivers}
              value={drivers.find(d => d.id === serviceForm.driverId) ?? null}
              onChange={val => setServiceForm(f => ({ ...f, driverId: val?.id ?? "" }))}
            />
          </div>
          <div>
            <label className={labelCls}>Tractor (optional)</label>
            <CustomSelect
              placeholder="Select Tractor"
              options={tractors}
              value={tractors.find(t => t.id === serviceForm.tractorId) ?? null}
              onChange={val => setServiceForm(f => ({ ...f, tractorId: val?.id ?? "" }))}
            />
          </div>
          <div>
            <label className={labelCls}>Service *</label>
            <CustomSelect
              placeholder="Select Service"
              options={services}
              value={services.find(s => s.id === serviceForm.serviceId) ?? null}
              onChange={val => setServiceForm(f => ({ ...f, serviceId: val?.id ?? "" }))}
            />
          </div>
          <div>
            <label className={labelCls}>Area / Time</label>
            <input
              type="text"
              placeholder="e.g. 2 acres or 3 hours"
              value={serviceForm.areaOrTime}
              onChange={e => setServiceForm(f => ({ ...f, areaOrTime: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Total Bill Amount *</label>
            <input
              type="number" min={0}
              placeholder="₹ 0"
              value={serviceForm.amount}
              onChange={e => setServiceForm(f => ({ ...f, amount: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Payment Status *</label>
            <select
              value={serviceForm.paymentStatus}
              onChange={e => setServiceForm(f => ({ ...f, paymentStatus: e.target.value, paidAmount: "" }))}
              className={selectCls}
            >
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial Payment</option>
              <option value="paid">Fully Paid</option>
            </select>
          </div>
          {serviceForm.paymentStatus === "partial" && (
            <div>
              <label className={labelCls}>Amount Paid *</label>
              <input
                type="number" min={0} max={n(serviceForm.amount)}
                placeholder={`Max ₹${n(serviceForm.amount).toLocaleString("en-IN")}`}
                value={serviceForm.paidAmount}
                onChange={e => setServiceForm(f => ({ ...f, paidAmount: e.target.value }))}
                className={inputCls}
              />
            </div>
          )}
          <div>
            <label className={labelCls}>Reference Number (optional)</label>
            <input
              type="text"
              placeholder="Transaction ID / Receipt No."
              value={serviceForm.referenceNumber}
              onChange={e => setServiceForm(f => ({ ...f, referenceNumber: e.target.value }))}
              className={inputCls}
            />
          </div>
          <button
            onClick={handleAddService}
            disabled={submitting}
            className="w-full py-5 rounded-full bg-emerald-400 text-emerald-950 font-black uppercase text-xs tracking-widest active:scale-95 transition-all disabled:opacity-50 mt-2"
          >
            {submitting ? "Saving…" : "Save Record"}
          </button>
        </div>
      </Modal>

      {/* ── ADD CUSTOMER MODAL ─────────────────────────────── */}
      <Modal
        isOpen={showAdd}
        onClose={() => { setShowAdd(false); setCustomerForm(BLANK_CUSTOMER_FORM); }}
        title="Add Customer"
      >
        <div className="space-y-5">

          {/* Photo URL section with preview */}
          <div>
            <label className={labelCls}>
              <span className="flex items-center gap-2">
                <MdImage size={12} />
                Profile Photo URL (optional)
              </span>
            </label>
            <PhotoUrlInput
              value={customerForm.photoUrl}
              onChange={val => setCustomerForm(f => ({ ...f, photoUrl: val }))}
              inputCls={inputCls}
            />
          </div>

          <div className="h-px bg-white/5" />

          <input
            type="text"
            placeholder="Full Name"
            value={customerForm.name}
            onChange={e => setCustomerForm(f => ({ ...f, name: e.target.value }))}
            className={inputCls}
          />
          <input
            type="tel"
            placeholder="Phone Number"
            value={customerForm.phone}
            onChange={e => setCustomerForm(f => ({ ...f, phone: e.target.value }))}
            className={inputCls}
          />
          <CustomSelect
            placeholder="Loyalty Tier"
            options={LOYALTY_OPTIONS}
            value={LOYALTY_OPTIONS.find(x => x.id === customerForm.loyaltyLevel) ?? null}
            onChange={val => setCustomerForm(f => ({ ...f, loyaltyLevel: val?.id ?? "Regular" }))}
          />
          <button
            onClick={handleAddCustomer}
            disabled={submitting}
            className="w-full py-5 rounded-full bg-emerald-400 text-emerald-950 font-black text-xs uppercase active:scale-95 transition-all disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Add Customer"}
          </button>
        </div>
      </Modal>

      {/* ── EDIT CUSTOMER MODAL ───────────────────────────── */}
      <Modal
        isOpen={showEdit}
        onClose={() => {
          setShowEdit(false);
          setCustomerForm(BLANK_CUSTOMER_FORM);
          setSelectedCustomer(null);
        }}
        title="Edit Customer"
      >
        <div className="space-y-5">

          {/* Photo URL section */}
          <div>
            <label className={labelCls}>
              <span className="flex items-center gap-2">
                <MdImage size={12} />
                Profile Photo URL (optional)
              </span>
            </label>
            <PhotoUrlInput
              value={customerForm.photoUrl}
              onChange={val => setCustomerForm(f => ({ ...f, photoUrl: val }))}
              inputCls={inputCls}
            />
          </div>

          <div className="h-px bg-white/5" />

          <input
            type="text"
            placeholder="Full Name"
            value={customerForm.name}
            onChange={e => setCustomerForm(f => ({ ...f, name: e.target.value }))}
            className={inputCls}
          />
          <input
            type="tel"
            placeholder="Phone Number"
            value={customerForm.phone}
            onChange={e => setCustomerForm(f => ({ ...f, phone: e.target.value }))}
            className={inputCls}
          />
          <CustomSelect
            placeholder="Loyalty Tier"
            options={LOYALTY_OPTIONS}
            value={LOYALTY_OPTIONS.find(x => x.id === customerForm.loyaltyLevel) ?? null}
            onChange={val => setCustomerForm(f => ({ ...f, loyaltyLevel: val?.id ?? "Regular" }))}
          />
          <button
            onClick={handleEditCustomer}
            disabled={submitting}
            className="w-full py-5 rounded-full bg-emerald-400 text-emerald-950 font-black text-xs uppercase active:scale-95 transition-all disabled:opacity-50"
          >
            {submitting ? "Updating…" : "Update Customer"}
          </button>
        </div>
      </Modal>
    </div>
  );
}