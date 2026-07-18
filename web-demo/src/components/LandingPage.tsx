import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface LandingPageProps {
  onSetupComplete: () => void;
}

export function LandingPage({ onSetupComplete }: LandingPageProps) {
  const [showQR, setShowQR] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-black text-white p-6 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[150%] h-[50%] bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.08)_0%,_rgba(0,0,0,0)_70%)] pointer-events-none"></div>

      {!showQR ? (
        <div className="flex flex-col items-center justify-center flex-1 w-full animate-fade-in relative z-10">
          <div className="mb-12 flex flex-col items-center">
            {/* Pulsing ring behind logo */}
            <div className="absolute w-32 h-32 bg-white/5 rounded-full blur-2xl animate-pulse"></div>
            
            <h1 className="text-[3.5rem] font-black italic tracking-tighter bg-gradient-to-br from-white via-zinc-200 to-zinc-600 bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(255,255,255,0.1)]">
              InstaPay
            </h1>
            <p className="text-zinc-500 text-sm font-medium tracking-widest uppercase mt-2">Next-Gen Wallet</p>
          </div>
          
          <div className="mt-auto w-full pb-8 space-y-4">
            <button
              onClick={() => setShowQR(true)}
              className="group relative w-full bg-white text-black font-bold py-4 rounded-2xl text-lg transition-all duration-300 active:scale-95 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
              <span className="relative z-10">Setup a wallet</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 w-full animate-slide-up bg-[#09090B] p-6 rounded-3xl shadow-2xl border border-zinc-800/60 relative z-10">
          <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          
          <h2 className="text-2xl font-bold mb-2 tracking-tight">Connect App</h2>
          <p className="text-zinc-400 text-center mb-8 text-sm leading-relaxed px-2">
            Scan this QR code with your InstaPay mobile app to sync your wallet automatically.
          </p>
          
          <div className="relative p-1 rounded-[1.25rem] bg-gradient-to-br from-zinc-700/50 to-black mb-8 shadow-[0_0_30px_rgba(255,255,255,0.05)] border border-zinc-800/80">
            <div className="bg-white p-3.5 rounded-2xl">
              <QRCodeSVG value="instapay://connect?session=123456789" size={180} />
            </div>
          </div>
          
          <div className="w-full space-y-3">
            <button
              onClick={onSetupComplete}
              className="w-full bg-white text-black font-bold py-3.5 rounded-xl text-[15px] transition-transform active:scale-95 hover:bg-zinc-100 shadow-md"
            >
              I've scanned it
            </button>
            <button
              onClick={() => setShowQR(false)}
              className="w-full bg-transparent text-zinc-400 font-semibold py-3.5 rounded-xl text-[15px] border border-zinc-800 transition-all hover:text-white hover:border-zinc-500 hover:bg-white/5 active:scale-95"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
