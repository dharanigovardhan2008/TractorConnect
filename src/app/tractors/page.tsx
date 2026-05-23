"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import toast from "react-hot-toast";
import {
  MdAdd,
  MdMenu,
  MdEdit,
  MdHistory,
  MdBuild,
  MdMiscellaneousServices,
  MdAttachMoney,
  MdCheckCircle,
  MdCancel,
  MdPendingActions,
  MdAgriculture,
  MdPerson,
  MdCalendarToday,
} from "react-icons/md";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// Lazy load components
import dynamic from "next/dynamic";
const Sidebar = dynamic(() => import("@/components/Sidebar"), { 
  ssr: false,
  loading: () => null 
});
const MobileNav = dynamic(() => import("@/components/MobileNav"), { 
  ssr: false,
  loading: () => null 
});
const Modal = dynamic(() => import("@/components/Modal"), { 
  ssr: false,
  loading: () => null 
});

interface Tractor {
  id: string;
  name: string;
  boughtDate: string;
  assignedDriverId?: string | null;
  assignedDriverName?: string | null;
  details?: string | null;
  picLink?: string | null;
  userId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

interface Driver {
  id: string;
  name: string;
  userId: string;
}

interface Customer {
  id: string;
  name: string;
  userId: string;
}

interface Service {
  id: string;
  name: string;
  userId: string;
}

interface ServiceRecord {
  id: string;
  customerId: string;
  customerName: string;
  driverId: string;
  driverName: string;
  tractorId: string;
  tractorName: string;
  serviceId: string;
  serviceName: string;
  areaOrTime: string;
  amount: number;
  paidAmount: number;
  paymentStatus: "paid" | "partial" | "unpaid";
  date: string;
  userId: string;
  createdAt?: Timestamp;
}

const safeNum = (v: unknown): number => {
  const num = Number(v);
  return isFinite(num) && num >= 0 ? Math.round(num * 100) / 100 : 0;
};

const isValidUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

function TractorImage({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className: string;
}) {
  const [error, setError] = useState(false);
  const fallback =
    "https://images.unsplash.com/photo-1592965416801-70529d89953d?q=80&w=800&auto=format&fit=crop";

  const imageSrc = error || !src || !isValidUrl(src) ? fallback : src;

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}

export default function TractorsPage() {
  const { user, loading: authLoading } = useAuth();
  const isMountedRef = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tractors, setTractors] = useState<Tractor[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedTractor, setSelectedTractor] = useState<Tractor | null>(null);
  const [serviceHistory, setServiceHistory] = useState<ServiceRecord[]>([]);

  const [dataLoading, setDataLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  const [tractorForm, setTractorForm] = useState({
    name: "",
    boughtDate: "",
    assignedDriverId: "",
    details: "",
    picLink: "",
  });

  const [serviceForm, setServiceForm] = useState({
    customerId: "",
    driverId: "",
    serviceId: "",
    areaOrTime: "",
    amount: "",
    paymentStatus: "unpaid" as "paid" | "partial" | "unpaid",
    paidAmount: "",
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    description: "",
    cost: "",
  });

  // Hydration fix - Only set mounted after component is hydrated
  useEffect(() => {
    isMountedRef.current = true;
    setMounted(true);
  }, []);

  // Fetch all data
  const fetchAll = useCallback(async () => {
    if (!user?.uid || !isMountedRef.current) return;

    setDataLoading(true);
    try {
      await Promise.all([
        fetchTractors(),
        fetchDrivers(),
        fetchCustomers(),
        fetchServices(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      if (isMountedRef.current) {
        toast.error("Failed to load data. Please refresh.");
      }
    } finally {
      if (isMountedRef.current) {
        setDataLoading(false);
      }
    }
  }, [user?.uid]);

  useEffect(() => {
    if (user && mounted && isMountedRef.current) {
      fetchAll();
    }
  }, [user, mounted, fetchAll]);

  const fetchTractors = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const q = query(
        collection(db, "tractors"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const list: Tractor[] = [];

      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || "Unknown",
          boughtDate: data.boughtDate || "",
          assignedDriverId: data.assignedDriverId || null,
          assignedDriverName: data.assignedDriverName || null,
          details: data.details || null,
          picLink: data.picLink || null,
          userId: data.userId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as Tractor);
      });

      if (isMountedRef.current) {
        setTractors(list);
      }
    } catch (error) {
      console.error("Error fetching tractors:", error);
      if (isMountedRef.current) {
        toast.error("Failed to load tractors");
      }
    }
  }, [user?.uid]);

  const fetchDrivers = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const q = query(
        collection(db, "drivers"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const list: Driver[] = [];

      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || "Unknown",
          userId: data.userId,
        } as Driver);
      });

      if (isMountedRef.current) {
        setDrivers(list);
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  }, [user?.uid]);

  const fetchCustomers = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const q = query(
        collection(db, "customers"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const list: Customer[] = [];

      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || "Unknown",
          userId: data.userId,
        } as Customer);
      });

      if (isMountedRef.current) {
        setCustomers(list);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  }, [user?.uid]);

  const fetchServices = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const q = query(
        collection(db, "services"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const list: Service[] = [];

      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || "Unknown",
          userId: data.userId,
        } as Service);
      });

      if (isMountedRef.current) {
        setServices(list);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  }, [user?.uid]);

  const resetTractorForm = useCallback(() => {
    setTractorForm({
      name: "",
      boughtDate: "",
      assignedDriverId: "",
      details: "",
      picLink: "",
    });
  }, []);

  const handleAddTractor = useCallback(async () => {
    if (!user?.uid) {
      toast.error("Authentication required");
      return;
    }

    const trimmedName = tractorForm.name.trim();
    if (!trimmedName || !tractorForm.boughtDate) {
      toast.error("Name and purchase date are required");
      return;
    }

    const selectedDate = new Date(tractorForm.boughtDate);
    const today = new Date();
    if (selectedDate > today) {
      toast.error("Purchase date cannot be in the future");
      return;
    }

    if (tractorForm.picLink && !isValidUrl(tractorForm.picLink)) {
      toast.error("Invalid image URL");
      return;
    }

    setSubmitting(true);
    const driver = drivers.find((d) => d.id === tractorForm.assignedDriverId);

    try {
      await addDoc(collection(db, "tractors"), {
        name: trimmedName,
        boughtDate: tractorForm.boughtDate,
        assignedDriverId: tractorForm.assignedDriverId || null,
        assignedDriverName: driver?.name || null,
        details: tractorForm.details.trim() || null,
        picLink: tractorForm.picLink.trim() || null,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success("Tractor registered successfully");
      setShowAddModal(false);
      resetTractorForm();
      await fetchTractors();
    } catch (error) {
      console.error("Error adding tractor:", error);
      toast.error("Failed to register tractor. Try again.");
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  }, [user?.uid, tractorForm, drivers, fetchTractors, resetTractorForm]);

  const openEditModal = useCallback((tractor: Tractor) => {
    setSelectedTractor(tractor);
    setTractorForm({
      name: tractor.name || "",
      boughtDate: tractor.boughtDate || "",
      assignedDriverId: tractor.assignedDriverId || "",
      details: tractor.details || "",
      picLink: tractor.picLink || "",
    });
    setShowEditModal(true);
  }, []);

  const handleEditTractor = useCallback(async () => {
    if (!user?.uid || !selectedTractor) {
      toast.error("Authentication required");
      return;
    }

    const trimmedName = tractorForm.name.trim();
    if (!trimmedName) {
      toast.error("Name is required");
      return;
    }

    const selectedDate = new Date(tractorForm.boughtDate);
    const today = new Date();
    if (selectedDate > today) {
      toast.error("Purchase date cannot be in the future");
      return;
    }

    if (tractorForm.picLink && !isValidUrl(tractorForm.picLink)) {
      toast.error("Invalid image URL");
      return;
    }

    setSubmitting(true);
    const driver = drivers.find((d) => d.id === tractorForm.assignedDriverId);

    try {
      await updateDoc(doc(db, "tractors", selectedTractor.id), {
        name: trimmedName,
        boughtDate: tractorForm.boughtDate,
        assignedDriverId: tractorForm.assignedDriverId || null,
        assignedDriverName: driver?.name || null,
        details: tractorForm.details.trim() || null,
        picLink: tractorForm.picLink.trim() || null,
        updatedAt: serverTimestamp(),
      });

      toast.success("Tractor updated successfully");
      setShowEditModal(false);
      setSelectedTractor(null);
      resetTractorForm();
      await fetchTractors();
    } catch (error) {
      console.error("Error updating tractor:", error);
      toast.error("Failed to update tractor. Try again.");
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  }, [user?.uid, selectedTractor, tractorForm, drivers, fetchTractors, resetTractorForm]);

  const openServiceModal = useCallback((tractor: Tractor) => {
    setSelectedTractor(tractor);
    setServiceForm({
      customerId: "",
      driverId: tractor.assignedDriverId || "",
      serviceId: "",
      areaOrTime: "",
      amount: "",
      paymentStatus: "unpaid",
      paidAmount: "",
    });
    setShowServiceModal(true);
  }, []);

  const handleAddService = useCallback(async () => {
    if (!user?.uid || !selectedTractor) {
      toast.error("Authentication required");
      return;
    }

    if (
      !serviceForm.customerId ||
      !serviceForm.driverId ||
      !serviceForm.serviceId ||
      !serviceForm.amount
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    const amount = safeNum(serviceForm.amount);
    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (serviceForm.paymentStatus === "partial" && !serviceForm.paidAmount) {
      toast.error("Please enter paid amount for partial payment");
      return;
    }

    const paidAmount = safeNum(serviceForm.paidAmount);
    if (
      serviceForm.paymentStatus === "partial" &&
      (paidAmount <= 0 || paidAmount > amount)
    ) {
      toast.error("Paid amount must be between 0 and total amount");
      return;
    }

    setSubmitting(true);
    const customer = customers.find((c) => c.id === serviceForm.customerId);
    const driver = drivers.find((d) => d.id === serviceForm.driverId);
    const service = services.find((s) => s.id === serviceForm.serviceId);

    let finalPaidAmount = 0;
    if (serviceForm.paymentStatus === "paid") {
      finalPaidAmount = amount;
    } else if (serviceForm.paymentStatus === "partial") {
      finalPaidAmount = Math.min(paidAmount, amount);
    }

    try {
      await addDoc(collection(db, "serviceRecords"), {
        customerId: serviceForm.customerId,
        customerName: customer?.name || "Unknown",
        driverId: serviceForm.driverId,
        driverName: driver?.name || "Unknown",
        tractorId: selectedTractor.id,
        tractorName: selectedTractor.name,
        serviceId: serviceForm.serviceId,
        serviceName: service?.name || "Unknown",
        areaOrTime: serviceForm.areaOrTime.trim() || "N/A",
        amount,
        paidAmount: finalPaidAmount,
        paymentStatus: serviceForm.paymentStatus,
        date: new Date().toISOString(),
        userId: user.uid,
        createdAt: serverTimestamp(),
      });

      toast.success("Service recorded successfully");
      setShowServiceModal(false);
      setServiceForm({
        customerId: "",
        driverId: "",
        serviceId: "",
        areaOrTime: "",
        amount: "",
        paymentStatus: "unpaid",
        paidAmount: "",
      });
      setSelectedTractor(null);
    } catch (error) {
      console.error("Error recording service:", error);
      toast.error("Failed to record service. Try again.");
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  }, [user?.uid, selectedTractor, serviceForm, customers, drivers, services]);

  const openHistoryModal = useCallback(
    async (tractor: Tractor) => {
      if (!user?.uid) return;

      setSelectedTractor(tractor);
      setServiceHistory([]);
      setHistoryLoading(true);
      setShowHistoryModal(true);

      try {
        const q = query(
          collection(db, "serviceRecords"),
          where("userId", "==", user.uid),
          where("tractorId", "==", tractor.id),
          orderBy("date", "desc"),
          limit(50)
        );
        const snap = await getDocs(q);
        const list: ServiceRecord[] = [];

        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            customerId: data.customerId || "",
            customerName: data.customerName || "Unknown",
            driverId: data.driverId || "",
            driverName: data.driverName || "Unknown",
            tractorId: data.tractorId || "",
            tractorName: data.tractorName || "Unknown",
            serviceId: data.serviceId || "",
            serviceName: data.serviceName || "Unknown",
            areaOrTime: data.areaOrTime || "N/A",
            amount: safeNum(data.amount),
            paidAmount: safeNum(data.paidAmount),
            paymentStatus: data.paymentStatus || "unpaid",
            date: data.date || new Date().toISOString(),
            userId: data.userId,
            createdAt: data.createdAt,
          } as ServiceRecord);
        });

        if (isMountedRef.current) {
          setServiceHistory(list);
        }
      } catch (error) {
        console.error("Error loading service history:", error);
        if (isMountedRef.current) {
          toast.error("Failed to load service history");
        }
      } finally {
        if (isMountedRef.current) {
          setHistoryLoading(false);
        }
      }
    },
    [user?.uid]
  );

  const openMaintenanceModal = useCallback((tractor: Tractor) => {
    setSelectedTractor(tractor);
    setMaintenanceForm({ description: "", cost: "" });
    setShowMaintenanceModal(true);
  }, []);

  const handleAddMaintenance = useCallback(async () => {
    if (!user?.uid || !selectedTractor) {
      toast.error("Authentication required");
      return;
    }

    const trimmedDesc = maintenanceForm.description.trim();
    const cost = safeNum(maintenanceForm.cost);

    if (!trimmedDesc || cost <= 0) {
      toast.error("Description and cost are required");
      return;
    }

    setSubmitting(true);

    try {
      await addDoc(collection(db, "maintenanceRecords"), {
        tractorId: selectedTractor.id,
        tractorName: selectedTractor.name,
        description: trimmedDesc,
        cost,
        date: new Date().toISOString().split("T")[0],
        status: "completed",
        userId: user.uid,
        createdAt: serverTimestamp(),
      });

      toast.success("Maintenance recorded");
      setShowMaintenanceModal(false);
      setMaintenanceForm({ description: "", cost: "" });
      setSelectedTractor(null);
    } catch (error) {
      console.error("Error recording maintenance:", error);
      toast.error("Failed to record maintenance. Try again.");
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  }, [user?.uid, selectedTractor, maintenanceForm]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
      case "partial":
        return "text-amber-400 bg-amber-400/10 border-amber-400/20";
      case "unpaid":
        return "text-rose-400 bg-rose-400/10 border-rose-400/20";
      default:
        return "text-white/40 bg-white/5 border-white/10";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <MdCheckCircle size={14} />;
      case "partial":
        return <MdPendingActions size={14} />;
      case "unpaid":
        return <MdCancel size={14} />;
      default:
        return null;
    }
  };

  // Don't render anything until hydration is complete
  if (!mounted) {
    return null;
  }

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#011410] text-emerald-400">
        <div className="flex flex-col items-center gap-4 px-4">
          <div className="w-10 h-10 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
          <span className="font-black tracking-widest uppercase text-xs text-center">
            Loading Fleet...
          </span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const inputClass =
    "w-full bg-white/5 border border-white/10 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-emerald-400/50 outline-none transition-all text-sm";
  const selectClass =
    "w-full bg-white/5 border border-white/10 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-white outline-none focus:border-emerald-400/50 transition-all text-sm appearance-none cursor-pointer";
  const labelClass =
    "text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 block";
  const btnPrimary =
    "w-full py-3 sm:py-4 rounded-2xl bg-emerald-400 text-emerald-950 font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-400/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]";

  return (
    <div className="min-h-screen bg-[#011410] overflow-x-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:ml-[280px] p-4 sm:p-6 lg:p-12 pb-32">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 sm:mb-16">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center active:scale-95 transition-all flex-shrink-0"
              aria-label="Open menu"
            >
              <MdMenu size={22} className="text-white" />
            </button>
            <div className="min-w-0 flex-1 sm:flex-none">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-white">
                Tractors
              </h1>
            </div>
          </div>

          <button
            onClick={() => {
              resetTractorForm();
              setShowAddModal(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-400 px-4 sm:px-5 py-3 rounded-2xl text-emerald-950 font-black text-xs shadow-lg shadow-emerald-400/10 active:scale-95 transition-all min-h-[48px]"
          >
            <MdAdd size={18} />
            <span>Add Tractor</span>
          </button>
        </header>

        {/* Loading */}
        {dataLoading && (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
              <p className="text-white/40 font-black text-xs uppercase tracking-widest">
                Loading...
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!dataLoading && tractors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 px-4 sm:py-32">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 sm:mb-8">
              <MdAgriculture size={48} className="text-white/10 sm:w-16 sm:h-16" />
            </div>
            <p className="font-black text-xs uppercase tracking-[0.2em] text-white/20 text-center mb-2">
              No Fleet Registered
            </p>
            <p className="text-xs tracking-widest text-white/10 text-center mb-6 max-w-xs">
              Add your first tractor to begin managing your fleet
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 bg-emerald-400/10 border border-emerald-400/20 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl text-emerald-400 font-black text-xs hover:bg-emerald-400 hover:text-emerald-950 transition-all min-h-[48px] w-full sm:w-auto"
            >
              <MdAdd size={18} />
              <span>Add First Tractor</span>
            </button>
          </div>
        )}

        {/* Tractor Cards */}
        {!dataLoading && tractors.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tractors.map((tractor, i) => (
              <div
                key={tractor.id}
                className="bg-white/5 border border-white/5 p-5 sm:p-6 relative overflow-hidden group rounded-3xl backdrop-blur-xl flex flex-col h-full"
              >
                {/* Glow effect */}
                <div className="absolute -top-20 -right-20 w-32 h-32 bg-emerald-400/5 rounded-full blur-2xl group-hover:bg-emerald-400/8 transition-all duration-500 pointer-events-none" />

                {/* Tractor Image */}
                <div className="relative w-full h-40 sm:h-44 rounded-2xl overflow-hidden mb-4 sm:mb-6 z-10 flex-shrink-0">
                  <TractorImage
                    src={tractor.picLink}
                    alt={tractor.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-2 sm:bottom-3 left-3 sm:left-4 right-3 sm:right-4 flex flex-col gap-2">
                    <span className="text-white font-black text-base sm:text-lg tracking-tight break-words">
                      {tractor.name}
                    </span>
                    <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 w-fit">
                      <MdCalendarToday size={10} className="text-white/60 flex-shrink-0" />
                      <span className="text-[9px] font-black text-white/60 whitespace-nowrap">
                        {tractor.boughtDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Driver Info */}
                <div className="bg-white/5 rounded-2xl p-3 sm:p-4 mb-4 border border-white/5 flex items-center gap-3 z-10 relative flex-shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-400/10 flex items-center justify-center flex-shrink-0">
                    <MdPerson size={18} className="text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] sm:text-[9px] font-black text-white/20 uppercase tracking-widest mb-0.5">
                      Driver
                    </p>
                    <p className="text-xs sm:text-sm font-black text-white truncate">
                      {tractor.assignedDriverName || "Unassigned"}
                    </p>
                  </div>
                </div>

                {/* Details */}
                {tractor.details && (
                  <p className="text-xs text-white/30 font-bold mb-4 line-clamp-2 break-words z-10 relative flex-1">
                    {tractor.details}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 z-10 relative mt-auto">
                  <button
                    onClick={() => openEditModal(tractor)}
                    className="h-10 sm:h-12 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center gap-1 sm:gap-2 text-white/40 hover:text-white transition-all border border-white/5 active:scale-95 min-h-[40px] sm:min-h-[48px]"
                  >
                    <MdEdit size={14} className="sm:w-4 sm:h-4" />
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wide hidden sm:inline">
                      Edit
                    </span>
                  </button>

                  <button
                    onClick={() => openServiceModal(tractor)}
                    className="h-10 sm:h-12 rounded-xl bg-emerald-400/10 hover:bg-emerald-400 flex items-center justify-center gap-1 sm:gap-2 text-emerald-400 hover:text-emerald-950 transition-all border border-emerald-400/20 active:scale-95 min-h-[40px] sm:min-h-[48px]"
                  >
                    <MdMiscellaneousServices size={14} className="sm:w-4 sm:h-4" />
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wide hidden sm:inline">
                      Service
                    </span>
                  </button>

                  <button
                    onClick={() => openHistoryModal(tractor)}
                    className="h-10 sm:h-12 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center gap-1 sm:gap-2 text-white/40 hover:text-white transition-all border border-white/5 active:scale-95 min-h-[40px] sm:min-h-[48px]"
                  >
                    <MdHistory size={14} className="sm:w-4 sm:h-4" />
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wide hidden sm:inline">
                      History
                    </span>
                  </button>

                  <button
                    onClick={() => openMaintenanceModal(tractor)}
                    className="h-10 sm:h-12 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center gap-1 sm:gap-2 text-white/40 hover:text-white transition-all border border-white/5 active:scale-95 min-h-[40px] sm:min-h-[48px]"
                  >
                    <MdBuild size={14} className="sm:w-4 sm:h-4" />
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wide hidden sm:inline">
                      Maintain
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        <MobileNav onMenuOpen={() => setSidebarOpen(true)} />
      </div>

      {/* MODALS */}
      {mounted && (
        <>
          {/* ADD TRACTOR MODAL */}
          <Modal
            isOpen={showAddModal}
            onClose={() => {
              setShowAddModal(false);
              resetTractorForm();
            }}
            title="Register Tractor"
          >
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label className={labelClass}>Tractor Name *</label>
                <input
                  type="text"
                  placeholder="Enter tractor name"
                  value={tractorForm.name}
                  onChange={(e) =>
                    setTractorForm({ ...tractorForm, name: e.target.value })
                  }
                  className={inputClass}
                  maxLength={50}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelClass}>Date Purchased *</label>
                <input
                  type="date"
                  value={tractorForm.boughtDate}
                  onChange={(e) =>
                    setTractorForm({
                      ...tractorForm,
                      boughtDate: e.target.value,
                    })
                  }
                  className={inputClass}
                  max={new Date().toISOString().split("T")[0]}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelClass}>Assign Driver (Optional)</label>
                <select
                  value={tractorForm.assignedDriverId}
                  onChange={(e) =>
                    setTractorForm({
                      ...tractorForm,
                      assignedDriverId: e.target.value,
                    })
                  }
                  className={selectClass}
                  disabled={submitting}
                >
                  <option value="">No Driver Assigned</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Photo URL (Optional)</label>
                <input
                  type="url"
                  placeholder="Paste image URL"
                  value={tractorForm.picLink}
                  onChange={(e) =>
                    setTractorForm({
                      ...tractorForm,
                      picLink: e.target.value,
                    })
                  }
                  className={inputClass}
                  disabled={submitting}
                />
              </div>

              {tractorForm.picLink && (
                <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-3 border border-white/5">
                  <TractorImage
                    src={tractorForm.picLink}
                    alt="Preview"
                    className="w-14 h-14 rounded-xl object-cover border border-emerald-400/20 flex-shrink-0"
                  />
                  <p className="text-xs text-white/40 font-bold">
                    Image Preview
                  </p>
                </div>
              )}

              <div>
                <label className={labelClass}>
                  Additional Details (Optional)
                </label>
                <textarea
                  placeholder="Any additional notes..."
                  value={tractorForm.details}
                  onChange={(e) =>
                    setTractorForm({
                      ...tractorForm,
                      details: e.target.value,
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-emerald-400/50 outline-none transition-all h-24 resize-none text-sm disabled:opacity-50"
                  maxLength={500}
                  disabled={submitting}
                />
              </div>

              <button
                onClick={handleAddTractor}
                disabled={submitting}
                className={btnPrimary}
              >
                {submitting ? "Registering..." : "Register Fleet Unit"}
              </button>
            </div>
          </Modal>

          {/* EDIT TRACTOR MODAL */}
          <Modal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedTractor(null);
              resetTractorForm();
            }}
            title="Update Tractor"
          >
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label className={labelClass}>Tractor Name *</label>
                <input
                  type="text"
                  placeholder="Tractor name"
                  value={tractorForm.name}
                  onChange={(e) =>
                    setTractorForm({ ...tractorForm, name: e.target.value })
                  }
                  className={inputClass}
                  maxLength={50}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelClass}>Date Purchased *</label>
                <input
                  type="date"
                  value={tractorForm.boughtDate}
                  onChange={(e) =>
                    setTractorForm({
                      ...tractorForm,
                      boughtDate: e.target.value,
                    })
                  }
                  className={inputClass}
                  max={new Date().toISOString().split("T")[0]}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelClass}>Assign Driver</label>
                <select
                  value={tractorForm.assignedDriverId}
                  onChange={(e) =>
                    setTractorForm({
                      ...tractorForm,
                      assignedDriverId: e.target.value,
                    })
                  }
                  className={selectClass}
                  disabled={submitting}
                >
                  <option value="">No Driver Assigned</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Photo URL</label>
                <input
                  type="url"
                  placeholder="Photo URL"
                  value={tractorForm.picLink}
                  onChange={(e) =>
                    setTractorForm({
                      ...tractorForm,
                      picLink: e.target.value,
                    })
                  }
                  className={inputClass}
                  disabled={submitting}
                />
              </div>

              {tractorForm.picLink && (
                <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-3 border border-white/5">
                  <TractorImage
                    src={tractorForm.picLink}
                    alt="Preview"
                    className="w-14 h-14 rounded-xl object-cover border border-emerald-400/20 flex-shrink-0"
                  />
                  <p className="text-xs text-white/40 font-bold">
                    Image Preview
                  </p>
                </div>
              )}

              <div>
                <label className={labelClass}>Additional Details</label>
                <textarea
                  placeholder="Additional notes..."
                  value={tractorForm.details}
                  onChange={(e) =>
                    setTractorForm({
                      ...tractorForm,
                      details: e.target.value,
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-emerald-400/50 outline-none transition-all h-24 resize-none text-sm disabled:opacity-50"
                  maxLength={500}
                  disabled={submitting}
                />
              </div>

              <button
                onClick={handleEditTractor}
                disabled={submitting}
                className={btnPrimary}
              >
                {submitting ? "Updating..." : "Update Fleet Unit"}
              </button>
            </div>
          </Modal>

          {/* SERVICE MODAL */}
          <Modal
            isOpen={showServiceModal}
            onClose={() => {
              setShowServiceModal(false);
              setSelectedTractor(null);
            }}
            title={`Service - ${selectedTractor?.name || ""}`}
          >
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label className={labelClass}>Customer *</label>
                <select
                  value={serviceForm.customerId}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      customerId: e.target.value,
                    })
                  }
                  className={selectClass}
                  disabled={submitting}
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Driver *</label>
                <select
                  value={serviceForm.driverId}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, driverId: e.target.value })
                  }
                  className={selectClass}
                  disabled={submitting}
                >
                  <option value="">Select Driver</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Service Type *</label>
                <select
                  value={serviceForm.serviceId}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      serviceId: e.target.value,
                    })
                  }
                  className={selectClass}
                  disabled={submitting}
                >
                  <option value="">Select Service</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Area or Time</label>
                <input
                  type="text"
                  placeholder="e.g. 2 acres or 3 hours"
                  value={serviceForm.areaOrTime}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      areaOrTime: e.target.value,
                    })
                  }
                  className={inputClass}
                  maxLength={50}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelClass}>Total Amount (₹) *</label>
                <input
                  type="number"
                  placeholder="Enter total amount"
                  value={serviceForm.amount}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      amount: e.target.value,
                    })
                  }
                  className={inputClass}
                  min="0"
                  step="0.01"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelClass}>Payment Status *</label>
                <select
                  value={serviceForm.paymentStatus}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      paymentStatus: e.target.value as
                        | "paid"
                        | "partial"
                        | "unpaid",
                    })
                  }
                  className={selectClass}
                  disabled={submitting}
                >
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>

              {serviceForm.paymentStatus === "partial" && (
                <div>
                  <label className={labelClass}>Amount Paid (₹) *</label>
                  <input
                    type="number"
                    placeholder="Enter amount paid"
                    value={serviceForm.paidAmount}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        paidAmount: e.target.value,
                      })
                    }
                    className={inputClass}
                    min="0"
                    step="0.01"
                    max={serviceForm.amount || "0"}
                    disabled={submitting}
                  />
                </div>
              )}

              <button
                onClick={handleAddService}
                disabled={submitting}
                className={btnPrimary}
              >
                {submitting ? "Recording..." : "Log Service Record"}
              </button>
            </div>
          </Modal>

          {/* SERVICE HISTORY MODAL */}
          <Modal
            isOpen={showHistoryModal}
            onClose={() => {
              setShowHistoryModal(false);
              setServiceHistory([]);
              setSelectedTractor(null);
            }}
            title={`Service History - ${selectedTractor?.name || ""}`}
          >
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin mb-4" />
                <p className="text-white/20 font-black text-[10px] uppercase tracking-widest">
                  Fetching Records...
                </p>
              </div>
            ) : serviceHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/5 border border-white/5 flex items-center justify-center mb-4 sm:mb-6">
                  <MdHistory size={32} className="text-white/10" />
                </div>
                <p className="font-black text-[10px] uppercase tracking-widest text-white/20 text-center">
                  No Service Records
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {serviceHistory.map((record) => (
                  <div
                    key={record.id}
                    className="bg-white/5 border border-white/5 p-4 rounded-2xl"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-3">
                      <p className="text-base sm:text-lg font-black text-white">
                        ₹{safeNum(record.amount).toLocaleString("en-IN")}
                      </p>
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border flex items-center gap-1 whitespace-nowrap ${getStatusColor(
                          record.paymentStatus
                        )}`}
                      >
                        {getStatusIcon(record.paymentStatus)}
                        {record.paymentStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs mb-3">
                      <div className="min-w-0">
                        <p className="text-white/20 font-black uppercase tracking-widest text-[8px] mb-0.5">
                          Customer
                        </p>
                        <p className="text-white/70 font-bold text-xs truncate">
                          {record.customerName}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white/20 font-black uppercase tracking-widest text-[8px] mb-0.5">
                          Driver
                        </p>
                        <p className="text-white/70 font-bold text-xs truncate">
                          {record.driverName}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white/20 font-black uppercase tracking-widest text-[8px] mb-0.5">
                          Service
                        </p>
                        <p className="text-white/70 font-bold text-xs truncate">
                          {record.serviceName}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white/20 font-black uppercase tracking-widest text-[8px] mb-0.5">
                          Area / Time
                        </p>
                        <p className="text-white/70 font-bold text-xs truncate">
                          {record.areaOrTime || "N/A"}
                        </p>
                      </div>
                    </div>

                    <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">
                      {new Date(record.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Modal>

          {/* MAINTENANCE MODAL */}
          <Modal
            isOpen={showMaintenanceModal}
            onClose={() => {
              setShowMaintenanceModal(false);
              setSelectedTractor(null);
            }}
            title={`Maintenance - ${selectedTractor?.name || ""}`}
          >
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label className={labelClass}>Description *</label>
                <textarea
                  placeholder="Describe the maintenance work done..."
                  value={maintenanceForm.description}
                  onChange={(e) =>
                    setMaintenanceForm({
                      ...maintenanceForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-emerald-400/50 outline-none transition-all h-24 sm:h-28 resize-none text-sm disabled:opacity-50"
                  maxLength={500}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelClass}>Cost (₹) *</label>
                <input
                  type="number"
                  placeholder="Enter maintenance cost"
                  value={maintenanceForm.cost}
                  onChange={(e) =>
                    setMaintenanceForm({
                      ...maintenanceForm,
                      cost: e.target.value,
                    })
                  }
                  className={inputClass}
                  min="0"
                  step="0.01"
                  disabled={submitting}
                />
              </div>

              <button
                onClick={handleAddMaintenance}
                disabled={submitting}
                className={btnPrimary}
              >
                {submitting ? "Recording..." : "Log Maintenance"}
              </button>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}