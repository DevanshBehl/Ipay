export type TabId = 'home' | 'statistic' | 'history' | 'menu';

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  historyOpen?: boolean;
}

export function BottomNav({ activeTab, onTabChange, historyOpen = false }: BottomNavProps) {
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: 'home',
      label: 'Home',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      )
    },
    {
      id: 'statistic',
      label: 'Statistic',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
      )
    },
    {
      id: 'history',
      label: 'History',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9"></circle>
          <polyline points="12 7 12 12 15 14"></polyline>
        </svg>
      )
    },
    {
      id: 'menu',
      label: 'Menu',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      )
    }
  ];

  return (
    <div className="absolute bottom-0 w-full h-[80px] bg-[#000000] border-t border-[#262626] flex items-center justify-between px-6 z-50">
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        
        // History is a prominent clock button in the center. The clock spins
        // clockwise as the history panel opens and unwinds anticlockwise on close.
        if (tab.id === 'history') {
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center gap-1 -mt-6"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 bg-[#FFFFFF] text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: historyOpen ? 'rotate(360deg)' : 'rotate(0deg)',
                    transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <circle cx="12" cy="12" r="9"></circle>
                  <polyline points="12 7 12 12 15 14"></polyline>
                </svg>
              </div>
              <span className={`text-[10px] font-medium ${historyOpen ? 'text-white' : 'text-zinc-500'}`}>
                History
              </span>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex flex-col items-center justify-center gap-1.5 transition-transform active:scale-95"
          >
            <div className={`transition-colors ${isActive ? 'text-white' : 'text-zinc-500'}`}>
              {tab.icon}
            </div>
            <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-white' : 'text-zinc-500'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
