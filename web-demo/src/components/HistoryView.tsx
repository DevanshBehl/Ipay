import { transactions } from '../data/mock';
import { formatSignedINR } from '../utils/format';

interface HistoryViewProps {
  open: boolean;
  onClose: () => void;
}

export function HistoryView({ open, onClose }: HistoryViewProps) {
  return (
    <div
      className={`absolute inset-0 z-[60] flex flex-col bg-[#0B0B0D] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        open ? 'translate-y-0' : 'translate-y-full pointer-events-none'
      }`}
    >
      {/* Grab handle */}
      <div className="flex justify-center pt-3 pb-1 shrink-0">
        <div className="w-10 h-1 rounded-full bg-zinc-700"></div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-2 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
            <circle cx="12" cy="12" r="9"></circle>
            <polyline points="12 7 12 12 15 14"></polyline>
          </svg>
          <h2 className="text-xl font-semibold text-white">Transaction History</h2>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-300 transition-transform active:scale-95 hover:bg-[#1B1D22]"
          aria-label="Close history"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Transaction list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-8 space-y-3">
        {transactions.map((tx, i) => (
          <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[#1B1D22]">
            <div className="flex items-center gap-3">
              <img src={tx.img} alt={tx.name} className="w-11 h-11 rounded-full object-cover" />
              <div className="flex flex-col">
                <span className="font-medium text-base text-white">{tx.name}</span>
                <span className="text-zinc-500 text-xs">{tx.time}</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className={`font-semibold text-base ${tx.positive ? 'text-[#8fb400]' : 'text-white'}`}>{formatSignedINR(tx.amount, tx.positive)}</span>
              <span className="text-zinc-500 text-xs">{tx.type}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
