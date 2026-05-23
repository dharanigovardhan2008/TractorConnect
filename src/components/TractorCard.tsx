"use client";

import {
  MdEdit,
  MdHistory,
  MdBuild,
  MdMiscellaneousServices,
  MdPerson,
  MdCalendarToday,
} from "react-icons/md";

/* ── Types ─────────────────────────────────────────────── */
export interface Tractor {
  id: string;
  name: string;
  boughtDate: string;
  assignedDriverId?: string | null;
  assignedDriverName?: string | null;
  details?: string | null;
  picLink?: string | null;
}

/* ── Helpers ───────────────────────────────────────────── */
const isValidUrl = (url?: string | null) => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/* ── Image Component ───────────────────────────────────── */
function TractorImage({
  src,
  alt,
}: {
  src?: string | null;
  alt: string;
}) {
  const fallback =
    "https://images.unsplash.com/photo-1592965416801-70529d89953d?q=80&w=800&auto=format&fit=crop";

  const finalSrc = isValidUrl(src) ? src! : fallback;

  return (
    <img
      src={finalSrc}
      alt={alt}
      className="w-full h-full object-cover"
      loading="lazy"
    />
  );
}

/* ── Props ─────────────────────────────────────────────── */
interface TractorCardProps {
  tractor: Tractor;
  onEdit: (tractor: Tractor) => void;
  onService: (tractor: Tractor) => void;
  onHistory: (tractor: Tractor) => void;
  onMaintain: (tractor: Tractor) => void;
}

/* ════════════════════════════════════════════════════════
   TRACTOR CARD COMPONENT
════════════════════════════════════════════════════════ */
export default function TractorCard({
  tractor,
  onEdit,
  onService,
  onHistory,
  onMaintain,
}: TractorCardProps) {
  return (
    <div className="bg-white/5 border border-white/5 p-6 sm:p-8 relative overflow-hidden rounded-[40px] backdrop-blur-xl flex flex-col">

      {/* subtle glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-400/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

      {/* ── Image Section ───────────────────────── */}
      <div className="relative w-full h-44 rounded-3xl overflow-hidden mb-6 flex-shrink-0">
        <TractorImage src={tractor.picLink} alt={tractor.name} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-lg font-black text-white truncate">
            {tractor.name}
          </p>

          <div className="flex items-center gap-2 text-emerald-400/70 mt-1">
            <MdCalendarToday size={12} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {tractor.boughtDate}
            </span>
          </div>
        </div>
      </div>

      {/* ── Driver Info ───────────────────────── */}
      <div className="bg-white/5 rounded-3xl p-4 mb-6 border border-white/5 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">
            Assigned Driver
          </p>
          <p className="text-sm font-black text-white">
            {tractor.assignedDriverName || "Unassigned"}
          </p>
        </div>
        <MdPerson className="text-emerald-400/20" size={26} />
      </div>

      {/* ── Details ───────────────────────── */}
      {tractor.details && (
        <p className="text-xs text-white/30 font-bold mb-6 line-clamp-2">
          {tractor.details}
        </p>
      )}

      {/* ── Action Buttons (Driver Style) ───────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5 mt-auto">

        <button
          onClick={() => onEdit(tractor)}
          className="h-11 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 text-white/40 hover:text-white transition-all border border-white/5 text-[10px] font-black uppercase"
        >
          <MdEdit size={15} />
          <span>Edit</span>
        </button>

        <button
          onClick={() => onService(tractor)}
          className="h-11 rounded-full bg-emerald-400/10 hover:bg-emerald-400 flex items-center justify-center gap-2 text-emerald-400 hover:text-emerald-950 transition-all border border-emerald-400/20 text-[10px] font-black uppercase"
        >
          <MdMiscellaneousServices size={15} />
          <span>Service</span>
        </button>

        <button
          onClick={() => onHistory(tractor)}
          className="h-11 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 text-white/40 hover:text-white transition-all border border-white/5 text-[10px] font-black uppercase"
        >
          <MdHistory size={15} />
          <span>History</span>
        </button>

        <button
          onClick={() => onMaintain(tractor)}
          className="h-11 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 text-white/40 hover:text-white transition-all border border-white/5 text-[10px] font-black uppercase"
        >
          <MdBuild size={15} />
          <span>Maintain</span>
        </button>

      </div>
    </div>
  );
}