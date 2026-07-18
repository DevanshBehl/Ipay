import React from 'react';
import { 
  ArrowRight, ShieldCheck, Zap, 
  Smartphone, Wallet, Send, PieChart,
  CheckCircle2
} from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-[#000000] text-white selection:bg-[#00E676] selection:text-black">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00E676] to-[#00A355] flex items-center justify-center">
              <Zap className="w-6 h-6 text-black" fill="currentColor" />
            </div>
            <span className="text-2xl font-black italic tracking-tighter text-white">InstaPay</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
          </div>

          <button className="px-6 py-2.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
            Get the App
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 overflow-hidden min-h-screen flex items-center">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00E676] opacity-10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#0A2265] opacity-20 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-16 items-center">
          <div className="animate-fade-in z-10 flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00E676]/30 bg-[#00E676]/10 text-[#00E676] text-xs font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse"></span>
              The Future of UPI is Here
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
              Fast, Secure & <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E676] to-[#00A355]">
                Simple UPI.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 mb-10 max-w-lg leading-relaxed">
              Experience the next generation of digital payments. Send money, track expenses, and manage your finances with military-grade security.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <button className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#00E676] text-black font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#00C853] transition-all active:scale-95 shadow-[0_0_30px_rgba(0,230,118,0.3)]">
                Download Now <ArrowRight className="w-5 h-5" />
              </button>
              <button className="w-full sm:w-auto px-8 py-4 rounded-full border border-zinc-700 bg-zinc-900/50 text-white font-bold text-lg hover:bg-zinc-800 transition-all active:scale-95">
                View Web Wallet
              </button>
            </div>
          </div>

          {/* Hero Image / App Mockup */}
          <div className="relative z-10 mx-auto w-full max-w-[320px] lg:max-w-none animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="relative rounded-[40px] border-[8px] border-zinc-900 bg-black overflow-hidden shadow-2xl shadow-black/50 aspect-[9/19]">
              {/* Fake status bar */}
              <div className="h-6 bg-black flex justify-between items-center px-6 pt-2">
                 <span className="text-[10px] font-medium">9:41</span>
                 <div className="flex gap-1">
                   <div className="w-3 h-2.5 border border-white rounded-[2px]"></div>
                 </div>
              </div>
              
              {/* App Content Mockup */}
              <div className="p-5 flex flex-col h-full bg-black">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-full bg-zinc-800"></div>
                  <div className="flex flex-col">
                    <span className="text-zinc-400 text-[10px]">Good Morning</span>
                    <span className="font-semibold text-sm">Sajibur Rahman</span>
                  </div>
                </div>

                <div className="instapay-card w-full p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between mb-6 shadow-xl" style={{ minHeight: '180px', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
                  <div className="flex items-center justify-between z-10">
                    <div className="text-xl font-black italic tracking-tighter text-[#0A2265]">VISA</div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 mb-2 z-10 text-black/80 font-mono text-xs">
                    <span>****</span><span>****</span><span>****</span><span className="font-bold">5466</span>
                  </div>
                  <div className="flex flex-col z-10 mt-auto">
                    <span className="text-black/60 text-[10px] font-medium mb-1">Balance</span>
                    <span className="text-xl font-bold text-black tracking-tight leading-none">$786,898,67.00</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-6">
                  {[Wallet, Send, Zap, PieChart].map((Icon, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-[18px] bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-700/60 flex items-center justify-center text-zinc-100 shadow-md">
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex-1 bg-[#1B1D22] rounded-2xl p-4">
                  <span className="text-sm font-medium mb-3 block">Transactions</span>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-zinc-700"></div>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">Henry James</span>
                          <span className="text-[9px] text-zinc-500">10:30 AM</span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold">+$450.00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-zinc-950 relative border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything you need.</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Manage all your finances in one beautifully designed, lightning-fast application.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Lightning Fast UPI', desc: 'Scan, pay, and transfer money instantly without any server delays.', icon: Zap },
              { title: 'Bank-Grade Security', desc: 'Your money is protected by state-of-the-art encryption and biometric locks.', icon: ShieldCheck },
              { title: 'Seamless Web Wallet', desc: 'Access your funds and transaction history from any browser, anywhere.', icon: Smartphone },
            ].map((feat, i) => (
              <div key={i} className="glass p-8 rounded-3xl hover:bg-zinc-900/80 transition-colors border-zinc-800">
                <div className="w-12 h-12 rounded-2xl bg-[#00E676]/10 text-[#00E676] flex items-center justify-center mb-6">
                  <feat.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feat.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-900 bg-black">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00E676] to-[#00A355] flex items-center justify-center">
              <Zap className="w-4 h-4 text-black" fill="currentColor" />
            </div>
            <span className="text-xl font-black italic tracking-tighter">InstaPay</span>
          </div>
          <div className="text-zinc-500 text-sm">
            &copy; {new Date().getFullYear()} InstaPay. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm font-medium text-zinc-400">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
