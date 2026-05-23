"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import Modal from "@/components/Modal";
import {
  MdAdd, MdMenu, MdLandscape, MdMap, MdPerson,
  MdSquareFoot, MdTrendingUp, MdTrendingDown,
  MdHistory, MdBuild, MdAttachMoney, MdDelete,
  MdGrass, MdScale, MdEco, MdEdit
} from "react-icons/md";
import {
  collection, addDoc, query, where, onSnapshot,
  deleteDoc, doc, serverTimestamp, updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

// ==================== TYPES ====================
interface Field {
  id: string;
  name: string;
  area: string;
  location: string;
  ownerName: string;
  cropType: string;
}

interface Transaction {
  id: string;
  fieldId: string;
  description: string;
  amount: number;
  yieldAmount?: number;
  yieldUnit?: string;
  date: string;
  type: "income" | "expense" | "yield_only";
}

export default function FieldsPage() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  const [fields, setFields] = useState<Field[]>([]);
  const [maintenance, setMaintenance] = useState<Transaction[]>([]);
  const [income, setIncome] = useState<Transaction[]>([]);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState<{open: boolean, type: "income" | "expense" | "yield_only" | null}>({open: false, type: null});
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedField, setSelectedField] = useState<Field | null>(null);

  // Form States
  const [fieldForm, setFieldForm] = useState({ name: "", area: "", location: "", ownerName: "", cropType: "" });
  const [financeForm, setFinanceForm] = useState({ 
    description: "", amount: "", yieldAmount: "", yieldUnit: "Quintals", date: "" 
  });

  useEffect(() => {
    setIsMounted(true);
    setFinanceForm(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }));
  }, []);

  // ==================== DATA READ ====================
  useEffect(() => {
    if (!user || !isMounted) return;

    const unsubFields = onSnapshot(query(collection(db, "fields"), where("userId", "==", user.uid)), (snap) => {
      setFields(snap.docs.map(d => ({ id: d.id, ...d.data() } as Field)));
    });

    const unsubMaint = onSnapshot(query(collection(db, "fieldMaintenance"), where("userId", "==", user.uid)), (snap) => {
      setMaintenance(snap.docs.map(d => ({ id: d.id, type: "expense", ...d.data() } as any)));
    });

    const unsubIncome = onSnapshot(query(collection(db, "fieldIncome"), where("userId", "==", user.uid)), (snap) => {
      setIncome(snap.docs.map(d => ({ id: d.id, type: d.data().amount > 0 ? "income" : "yield_only", ...d.data() } as any)));
    });

    return () => { unsubFields(); unsubMaint(); unsubIncome(); };
  }, [user, isMounted]);

  // ==================== CALCULATIONS ====================
  const allTransactions = useMemo(() => [...maintenance, ...income], [maintenance, income]);

  const fieldStats = useMemo(() => {
    const res: Record<string, any> = {};
    fields.forEach(f => {
      const fTrans = allTransactions.filter(t => t.fieldId === f.id);
      const inc = fTrans.filter(t => t.type === "income").reduce((a, b) => a + (Number(b.amount) || 0), 0);
      const exp = fTrans.filter(t => t.type === "expense").reduce((a, b) => a + (Number(b.amount) || 0), 0);
      const yld = fTrans.reduce((a, b) => a + (Number(b.yieldAmount) || 0), 0);
      res[f.id] = { income: inc, expense: exp, profit: inc - exp, totalYield: yld };
    });
    return res;
  }, [fields, allTransactions]);

  // ==================== HANDLERS ====================
  const handleAddField = async () => {
    if (!fieldForm.name || !fieldForm.cropType) return toast.error("Name and Crop are required");
    try {
      await addDoc(collection(db, "fields"), { ...fieldForm, userId: user?.uid, createdAt: serverTimestamp() });
      toast.success("Field Registered");
      setShowAddModal(false);
      setFieldForm({ name: "", area: "", location: "", ownerName: "", cropType: "" });
    } catch (e) { toast.error("Error saving"); }
  };

  const handleUpdateField = async () => {
    if (!selectedField) return;
    try {
      await updateDoc(doc(db, "fields", selectedField.id), fieldForm);
      toast.success("Updated");
      setShowEditModal(false);
    } catch (e) { toast.error("Failed"); }
  };

  const handleDeleteField = async (id: string) => {
    if (!confirm("Delete this field and all records?")) return;
    try {
      await deleteDoc(doc(db, "fields", id));
      toast.success("Deleted");
    } catch (e) { toast.error("Failed"); }
  };

  const handleAddFinance = async () => {
    const isIncome = showFinanceModal.type === "income";
    const isYield = showFinanceModal.type === "yield_only";
    const col = (isIncome || isYield) ? "fieldIncome" : "fieldMaintenance";
    try {
      await addDoc(collection(db, col), {
        fieldId: selectedField?.id,
        description: financeForm.description,
        amount: Number(financeForm.amount) || 0,
        yieldAmount: Number(financeForm.yieldAmount) || 0,
        yieldUnit: financeForm.yieldUnit,
        date: financeForm.date,
        userId: user?.uid,
        createdAt: serverTimestamp()
      });
      toast.success("Logged Successfully");
      setShowFinanceModal({ open: false, type: null });
      setFinanceForm(prev => ({ ...prev, description: "", amount: "", yieldAmount: "" }));
    } catch (e) { toast.error("Failed"); }
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#010B09] text-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:ml-[280px] p-4 sm:p-10 pb-32 max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-12 px-2">
          <div>
            <h1 className="text-3xl font-black">Fields</h1>
            <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-1">Management Hub</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="bg-[#10b981] text-black px-6 py-3 rounded-full font-black text-xs shadow-lg">
            <MdAdd size={20} className="inline mr-1"/> NEW FIELD
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fields.map(f => {
            const fStat = fieldStats[f.id] || { income: 0, expense: 0, profit: 0, totalYield: 0 };
            return (
              <motion.div key={f.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[40px] relative group overflow-hidden">
                
                {/* Floating Edit/Delete */}
                <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => { setSelectedField(f); setFieldForm({...f}); setShowEditModal(true); }} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#10b981] transition-all"><MdEdit size={16}/></button>
                  <button onClick={() => handleDeleteField(f.id)} className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><MdDelete size={16}/></button>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#10b9811a] flex items-center justify-center text-[#10b981] border border-[#10b98133]"><MdEco size={24}/></div>
                  <div>
                    <h3 className="text-xl font-black truncate max-w-[150px]">{f.name}</h3>
                    <p className="text-[10px] text-[#10b981] font-black uppercase tracking-widest">{f.cropType}</p>
                  </div>
                </div>

                <div className="flex gap-4 text-[10px] font-bold text-white/30 uppercase mb-6">
                  <span className="flex items-center gap-1"><MdSquareFoot size={14}/> {f.area}</span>
                  <span className="flex items-center gap-1"><MdPerson size={14}/> {f.ownerName}</span>
                </div>

                {/* 3-Part Stat Grid */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                    <p className="text-[8px] opacity-30 uppercase font-black">Expenses</p>
                    <p className="text-xs font-black text-red-400">₹{fStat.expense}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                    <p className="text-[8px] opacity-30 uppercase font-black">Income</p>
                    <p className="text-xs font-black text-emerald-400">₹{fStat.income}</p>
                  </div>
                  <div className="bg-cyan-500/5 p-3 rounded-2xl border border-cyan-500/10 text-center">
                    <p className="text-[8px] opacity-30 uppercase font-black text-cyan-400">Harvest</p>
                    <p className="text-xs font-black text-cyan-400">{fStat.totalYield} Qtl</p>
                  </div>
                </div>

                {/* Profit Bar */}
                <div className={`p-4 rounded-2xl flex justify-between items-center mb-6 ${fStat.profit >= 0 ? 'bg-[#10b9811a] text-[#10b981]' : 'bg-red-500/10 text-red-400'}`}>
                  <span className="text-[10px] font-black uppercase tracking-widest">Net Profit</span>
                  <span className="text-base font-black">₹{fStat.profit}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { setSelectedField(f); setShowFinanceModal({open: true, type: "expense"}); }} className="h-12 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-white/10">EXPENSE</button>
                    <button onClick={() => { setSelectedField(f); setShowFinanceModal({open: true, type: "yield_only"}); }} className="h-12 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-cyan-500">HARVEST</button>
                  </div>
                  <button onClick={() => { setSelectedField(f); setShowFinanceModal({open: true, type: "income"}); }} className="h-12 bg-[#10b9811a] border border-[#10b98133] text-[#10b981] rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-[#10b981] hover:text-black">LOG INCOME</button>
                  <button onClick={() => { setSelectedField(f); setShowHistoryModal(true); }} className="text-[9px] font-black text-white/20 uppercase py-2 hover:text-white flex items-center justify-center gap-1 transition-all">
                    <MdHistory size={14}/> VIEW HISTORY
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* MODALS */}
      <Modal isOpen={showAddModal || showEditModal} onClose={() => { setShowAddModal(false); setShowEditModal(false); }} title={showAddModal ? "New Field" : "Edit Field"}>
        <div className="space-y-4 pt-4">
          <input className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-sm" placeholder="Field Name" value={fieldForm.name} onChange={e => setFieldForm({...fieldForm, name: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <input className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-sm" placeholder="Crop (Fasal)" value={fieldForm.cropType} onChange={e => setFieldForm({...fieldForm, cropType: e.target.value})} />
            <input className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-sm" placeholder="Area" value={fieldForm.area} onChange={e => setFieldForm({...fieldForm, area: e.target.value})} />
          </div>
          <input className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-sm" placeholder="Owner Name" value={fieldForm.ownerName} onChange={e => setFieldForm({...fieldForm, ownerName: e.target.value})} />
          <button onClick={showAddModal ? handleAddField : handleUpdateField} className="w-full bg-[#10b981] text-black py-4 rounded-full font-black uppercase text-xs mt-4">
            {showAddModal ? "REGISTER FIELD" : "SAVE CHANGES"}
          </button>
        </div>
      </Modal>

      <Modal isOpen={showFinanceModal.open} onClose={() => setShowFinanceModal({open: false, type: null})} title={`Log ${showFinanceModal.type?.toUpperCase()}`}>
        <div className="space-y-4 pt-4">
          <textarea className="w-full bg-white/5 border border-white/10 rounded-[30px] px-6 py-4 text-sm h-28 resize-none" placeholder="Description..." value={financeForm.description} onChange={e => setFinanceForm({...financeForm, description: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <input type="number" disabled={showFinanceModal.type === 'yield_only'} className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-sm disabled:opacity-20" placeholder="Amount (₹)" value={showFinanceModal.type === 'yield_only' ? '0' : financeForm.amount} onChange={e => setFinanceForm({...financeForm, amount: e.target.value})} />
            <input type="date" className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-sm" value={financeForm.date} onChange={e => setFinanceForm({...financeForm, date: e.target.value})} />
          </div>
          {(showFinanceModal.type === 'income' || showFinanceModal.type === 'yield_only') && (
            <div className="bg-white/5 p-5 rounded-[30px] border border-white/10 grid grid-cols-2 gap-4">
              <input type="number" className="w-full bg-white/10 border border-white/10 rounded-full px-6 py-4 text-sm" placeholder="Weight (Yield)" value={financeForm.yieldAmount} onChange={e => setFinanceForm({...financeForm, yieldAmount: e.target.value})} />
              <select className="bg-black border border-white/10 rounded-full px-4 text-xs" value={financeForm.yieldUnit} onChange={e => setFinanceForm({...financeForm, yieldUnit: e.target.value})}>
                <option value="Quintals">Quintals</option>
                <option value="Kg">Kg</option>
                <option value="Tons">Tons</option>
              </select>
            </div>
          )}
          <button onClick={handleAddFinance} className={`w-full py-5 rounded-full font-black uppercase text-xs mt-4 ${showFinanceModal.type === 'expense' ? 'bg-red-500' : 'bg-[#10b981]'} text-black`}>SAVE DATA</button>
        </div>
      </Modal>

      <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="History Ledger">
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 mt-4">
          {allTransactions.filter(t => t.fieldId === selectedField?.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
            <div key={t.id} className="bg-white/5 border border-white/10 p-5 rounded-[30px] flex justify-between items-center">
              <div>
                <p className="text-sm font-bold truncate max-w-[140px]">{t.description}</p>
                <p className="text-[9px] font-black text-white/30 uppercase">{t.date} {t.yieldAmount ? `• ${t.yieldAmount} ${t.yieldUnit}` : ''}</p>
              </div>
              <p className={`text-lg font-black ${t.type === 'expense' ? 'text-red-400' : 'text-[#10b981]'}`}>
                {t.type === 'expense' ? '-' : '+'} ₹{t.amount.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </Modal>

      <MobileNav onMenuOpen={() => setSidebarOpen(true)} />
    </div>
  );
}