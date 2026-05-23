"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import { 
  MdMenu, MdBuild, MdAttachMoney, MdWarning, 
  MdCheckCircle, MdHistory
} from "react-icons/md";
import { 
  collection, 
  query, 
  where, 
  onSnapshot
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ==================== TYPES ====================
interface MaintenanceRecord {
  id: string;
  tractorId: string;
  tractorName: string;
  description: string;
  cost: number;
  date: string;
  status: "pending" | "completed";
  userId: string;
}

// ==================== MAIN COMPONENT ====================
export default function MaintenancePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();

  const [records, setRecords] = useState<MaintenanceRecord[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch records
  useEffect(() => {
    if (!user || !isMounted) return;

    const unsubRecords = onSnapshot(
      query(collection(db, "maintenanceRecords"), where("userId", "==", user.uid)),
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceRecord));
        const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecords(sorted);
        setLoading(false);
      }
    );

    return () => unsubRecords();
  }, [user, isMounted]);

  const stats = {
    total: records.length,
    pending: records.filter(r => r.status === "pending").length,
    totalCost: records.reduce((sum, r) => sum + Number(r.cost), 0),
  };

  if (!isMounted || !user) return null;

  return (
    <div className="min-h-screen bg-[#010B09] text-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:ml-[280px] p-4 sm:p-8 lg:p-12 pb-32 max-w-6xl mx-auto">
        
        {/* Header */}
        <motion.header 
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4">
            <motion.button 
              onClick={() => setSidebarOpen(true)} 
              className="lg:hidden w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl border border-white/10"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <MdMenu size={20} />
            </motion.button>
            <div>
              <h1 className="text-2xl font-black">Maintenance History</h1>
              <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mt-1">
                All repair & servicing records
              </p>
            </div>
          </div>
        </motion.header>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-[30px] p-5"
          >
            <MdBuild className="text-emerald-500 mb-2" size={20} />
            <p className="text-2xl font-black">{stats.total}</p>
            <p className="text-[10px] text-white/40 uppercase font-black">Total</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 border border-white/10 rounded-[30px] p-5"
          >
            <MdWarning className="text-yellow-400 mb-2" size={20} />
            <p className="text-2xl font-black">{stats.pending}</p>
            <p className="text-[10px] text-white/40 uppercase font-black">Pending</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 border border-white/10 rounded-[30px] p-5"
          >
            <MdAttachMoney className="text-rose-400 mb-2" size={20} />
            <p className="text-2xl font-black">₹{stats.totalCost.toLocaleString()}</p>
            <p className="text-[10px] text-white/40 uppercase font-black">Spent</p>
          </motion.div>
        </div>

        {/* Records */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-[35px] p-6 sm:p-8"
        >
          <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2 mb-6">
            <MdHistory size={16} />
            All Records
          </h3>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-white/5 rounded-[25px] animate-pulse" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-6xl mb-4">🔧</p>
              <p className="text-white/20 text-xs font-bold uppercase tracking-widest">No maintenance records</p>
              <p className="text-white/10 text-[10px] mt-2">Add maintenance from the Tractors page</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record, i) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ x: 5 }}
                  className={`
                    p-5 rounded-[25px] border relative group cursor-pointer
                    ${record.status === "pending" 
                      ? 'bg-yellow-500/5 border-yellow-500/20' 
                      : 'bg-emerald-500/5 border-emerald-500/20'
                    }
                  `}
                >
                  {/* Status badge */}
                  <div className={`
                    absolute top-4 right-4 flex items-center gap-1 px-3 py-1.5 rounded-full text-[8px] font-black uppercase
                    ${record.status === "pending" 
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }
                  `}>
                    {record.status === "pending" ? <MdWarning size={10} /> : <MdCheckCircle size={10} />}
                    {record.status}
                  </div>

                  <div className="pr-24">
                    {/* Tractor name */}
                    <h4 className="text-lg font-black mb-1 group-hover:text-emerald-400 transition-colors">
                      {record.tractorName}
                    </h4>
                    
                    {/* Description */}
                    <p className="text-sm text-white/60 mb-3 line-clamp-2">
                      {record.description}
                    </p>
                    
                    {/* Meta info */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-white/40">
                        <span className="text-xs">
                          {new Date(record.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-400">
                        <MdAttachMoney size={14} />
                        <span className="text-sm font-black">
                          ₹{Number(record.cost).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* Mobile Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        <MobileNav onMenuOpen={() => setSidebarOpen(true)} />
      </div>
    </div>
  );
}