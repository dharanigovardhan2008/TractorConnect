"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import Modal from "@/components/Modal";
import { 
  MdAdd, MdMenu, MdEdit, MdDelete, MdMiscellaneousServices,
  MdRocketLaunch, MdSettingsSuggest, MdLayers
} from "react-icons/md";
import { 
  collection, addDoc, query, where, getDocs, 
  updateDoc, deleteDoc, doc, serverTimestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

interface Service {
  id: string;
  name: string;
  userId: string;
}

export default function ServicesPage() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceName, setServiceName] = useState("");

  useEffect(() => {
    if (user) fetchServices();
  }, [user]);

  const fetchServices = async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const q = query(
        collection(db, "services"),
        where("userId", "==", user.uid)
      );
      const snap = await getDocs(q);
      const list: Service[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Service));
      setServices(list);
    } catch (e) {
      console.error("Error fetching services:", e);
      toast.error("Telemetry failed to load");
    } finally {
      setDataLoading(false);
    }
  };

  const handleAddService = async () => {
    if (!serviceName.trim()) return toast.error("Service name required");
    try {
      await addDoc(collection(db, "services"), {
        name: serviceName.trim(),
        userId: user?.uid,
        createdAt: serverTimestamp(),
      });
      toast.success("Service Module Initialized");
      setShowAddModal(false);
      setServiceName("");
      fetchServices();
    } catch (e) {
      toast.error("Initialization failed");
    }
  };

  const openEditModal = (service: Service) => {
    setSelectedService(service);
    setServiceName(service.name);
    setShowEditModal(true);
  };

  const handleEditService = async () => {
    if (!selectedService || !serviceName.trim()) return toast.error("Service name required");
    try {
      await updateDoc(doc(db, "services", selectedService.id), {
        name: serviceName.trim(),
      });
      toast.success("Module Updated");
      setShowEditModal(false);
      setSelectedService(null);
      setServiceName("");
      fetchServices();
    } catch (e) {
      toast.error("Update sequence failed");
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("Are you sure you want to decommission this service module? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "services", id));
      toast.success("Module Decommissioned");
      fetchServices();
    } catch (e) {
      toast.error("Purge failed");
    }
  };

  if (loading) return <div className="h-screen bg-[#011410]" />;

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-emerald-neon/50 outline-none transition-all text-sm";

  return (
    <div className="min-h-screen">
      <Sidebar isOpen={sidebarOpen} />

      <main className="lg:ml-[280px] p-6 lg:p-12 pb-32">
        {/* Header */}
        <header className="flex items-center justify-between mb-16 px-2">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-14 h-14 glass-deck pill-capsule flex items-center justify-center border border-white/10"
            >
              <MdMenu size={24} className="text-white" />
            </button>
            <div className="flex flex-col">
              
              <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-white leading-tight">
                Services
              </h1>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setServiceName("");
              setShowAddModal(true);
            }}
            className="flex items-center gap-3 bg-emerald-neon px-8 py-4 rounded-full text-emerald-950 font-black text-sm shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all"
          >
            <MdAdd size={20} />
            <span className="hidden sm:block">Create Service</span>
          </motion.button>
        </header>

        {/* Loading Spinner */}
        {dataLoading && (
          <div className="flex items-center justify-center py-32">
            <div className="w-12 h-12 border-2 border-emerald-neon/20 border-t-emerald-neon rounded-full animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!dataLoading && services.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 opacity-20 text-white"
          >
            <MdSettingsSuggest size={80} className="mb-6" />
            <p className="font-black text-sm uppercase tracking-[0.3em]">No Service Modules Found</p>
            <p className="text-xs mt-2 tracking-widest uppercase">Initialize your first service offering</p>
          </motion.div>
        )}

        {/* Services List - Premium Large Pill Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {services.map((service, i) => (
              <motion.div
                key={service.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5, filter: "blur(20px)" }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 100 }}
                className="glass-deck p-6 flex items-center justify-between group relative overflow-hidden border border-white/5"
              >
                {/* Background Flair */}
                <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-neon/5 rounded-full -ml-12 -mt-12 blur-2xl group-hover:bg-emerald-neon/10 transition-all duration-700" />

                <div className="flex items-center gap-5 relative z-10">
                  <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-emerald-neon transition-all group-hover:bg-emerald-neon group-hover:text-emerald-950">
                    <MdMiscellaneousServices size={26} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight leading-none group-hover:text-emerald-neon transition-colors">
                      {service.name}
                    </h3>
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mt-2">Active Offering</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 relative z-10">
                  {/* Edit Button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => openEditModal(service)}
                    className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-emerald-neon hover:bg-white/10 transition-all"
                  >
                    <MdEdit size={18} />
                  </motion.button>

                  {/* Delete Button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDeleteService(service.id)}
                    className="w-11 h-11 rounded-full bg-rose-500/5 border border-rose-500/10 flex items-center justify-center text-rose-500/40 hover:text-rose-400 hover:bg-rose-500/20 transition-all"
                  >
                    <MdDelete size={18} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Service Analysis Module */}
        {!dataLoading && services.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-16 glass-deck p-10 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-neon/5 rounded-full -mr-32 -mt-32 blur-[80px]" />
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 rounded-3xl bg-emerald-neon/10 flex items-center justify-center text-emerald-neon">
                <MdLayers size={32} />
              </div>
              <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mb-1">Fleet Capability</p>
                <h2 className="text-2xl font-black text-white tracking-tight">{services.length} Active Services</h2>
              </div>
            </div>
            <div className="bg-white/5 px-8 py-5 rounded-[30px] border border-white/5 relative z-10">
              <p className="text-[9px] font-black text-white/40 uppercase tracking-widest text-center mb-1">Status Report</p>
              <p className="text-xs font-bold text-emerald-neon tracking-tight uppercase tracking-widest text-nowrap">All Modules Operational</p>
            </div>
          </motion.div>
        )}
      </main>

      {/* ADD SERVICE MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Initialize Service"
      >
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3 block">Module Identity Name</label>
            <input
              type="text"
              placeholder="e.g. Heavy Ploughing, Paddy Harvesting"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className={inputClass}
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleAddService}
            className="w-full py-5 rounded-full bg-emerald-neon text-emerald-950 font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-neon/20 transition-all"
          >
            Boot Service Module
          </motion.button>
        </div>
      </Modal>

      {/* EDIT SERVICE MODAL */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Update System Configuration"
      >
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3 block">Module Identity Name</label>
            <input
              type="text"
              placeholder="Enter service name"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className={inputClass}
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleEditService}
            className="w-full py-5 rounded-full bg-emerald-neon text-emerald-950 font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-neon/20 transition-all"
          >
            Overwrite Configuration
          </motion.button>
        </div>
      </Modal>

      <MobileNav onMenuOpen={() => setSidebarOpen(true)} />
    </div>
  );
}