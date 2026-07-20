export type TabId = 'home' | 'statistic' | 'history' | 'menu';

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  historyOpen?: boolean;
}

const paths: Record<TabId, React.ReactNode> = {
  home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
  statistic: <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>,
  history: <><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></>,
  menu: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
};

const labels: Record<TabId, string> = { home: 'Home', statistic: 'Stats', history: 'History', menu: 'Menu' };

export function BottomNav({ activeTab, onTabChange, historyOpen = false }: BottomNavProps) {
  const tabs: TabId[] = ['home', 'statistic', 'history', 'menu'];
  return (
    <div className="w-full bg-[#0a0a0c] border-t border-white/[0.08] shrink-0 pb-safe z-50">
      <div className="flex items-center justify-around px-4 py-3">
        {tabs.map((id) => {
          const active = id === 'history' ? historyOpen : activeTab === id && !historyOpen;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`press relative flex flex-col items-center justify-center gap-1 min-w-[64px] transition-colors ${active ? 'text-white' : 'text-[var(--text-3)] hover:text-white'}`}
              aria-label={labels[id]}
            >
              <div className={`flex items-center justify-center w-[32px] h-[32px] rounded-full transition-colors ${active ? 'bg-white/10' : 'bg-transparent'}`}>
                <svg
                  width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={id === 'history' ? { transform: historyOpen ? 'rotate(360deg)' : 'rotate(0deg)', transition: 'transform 0.6s cubic-bezier(0.16,1,0.3,1)' } : undefined}
                >
                  {paths[id]}
                </svg>
              </div>
              <span className="text-[10px] font-semibold">{labels[id]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
