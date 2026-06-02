import { Home, Search, Library as LibraryIcon } from 'lucide-react';

function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'search', label: 'Buscar', icon: Search },
    { id: 'library', label: 'Tu Biblioteca', icon: LibraryIcon },
  ];

  return (
    <>
      {/* Desktop Sidebar Navigation */}
      <aside className="desktop-sidebar glass-panel">
        {/* Brand/Logo Area */}
        <div className="brand-container">
          <svg viewBox="0 0 24 24" className="brand-logo" fill="none">
            <defs>
              <linearGradient id="brandGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <circle cx="12" cy="12" r="11" fill="#070a13" stroke="url(#brandGlow)" strokeWidth="1.2"/>
            <path d="M9 18V7l10-2v11" stroke="url(#brandGlow)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="6.5" cy="18" r="2.5" fill="url(#brandGlow)"/>
            <circle cx="16.5" cy="16" r="2.5" fill="url(#brandGlow)"/>
          </svg>
          <span className="brand-name">VibeFlow</span>
        </div>

        {/* Navigation Items */}
        <nav className="nav-menu">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id || 
              (item.id === 'search' && activeTab === 'genre') || 
              (item.id === 'library' && activeTab === 'playlist_view');
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <IconComponent size={22} className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Bottom Tab Bar Navigation */}
      <nav className="mobile-tabbar glass-panel">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id || 
            (item.id === 'search' && activeTab === 'genre') || 
            (item.id === 'library' && activeTab === 'playlist_view');
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`mobile-tabbar-item ${isActive ? 'active' : ''}`}
            >
              <IconComponent size={20} className="mobile-icon" />
              <span className="mobile-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <style>{`
        /* Desktop Sidebar Styles */
        .desktop-sidebar {
          grid-column: 1 / 2;
          grid-row: 1 / 3;
          height: 100vh;
          width: var(--sidebar-width);
          border-radius: 0;
          border: none;
          border-right: 1px solid var(--border-glass);
          padding: 1.5rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          z-index: 20;
          background: rgba(8, 12, 28, 0.95);
        }

        .brand-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.75rem;
        }

        .brand-logo {
          width: 32px;
          height: 32px;
        }

        .brand-name {
          font-size: 1.25rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #a855f7 0%, #3b82f6 50%, #10b981 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .nav-menu {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 0.85rem 1rem;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          text-align: left;
          transition: var(--transition-smooth);
        }

        .nav-item:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.04);
        }

        .nav-item.active {
          color: var(--text-primary);
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%);
          border: 1px solid rgba(168, 85, 247, 0.15);
          box-shadow: 0 4px 15px rgba(168, 85, 247, 0.05);
        }

        .nav-item.active .nav-icon {
          color: var(--primary);
          filter: drop-shadow(0 0 8px var(--primary-glow));
        }

        /* Mobile Tab Bar Styles */
        .mobile-tabbar {
          display: none;
        }

        /* Responsive Breakpoints */
        @media (max-width: 768px) {
          .desktop-sidebar {
            display: none;
          }

          .mobile-tabbar {
            display: flex;
            justify-content: space-around;
            align-items: center;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: var(--mobile-nav-height);
            background: rgba(8, 12, 28, 0.85);
            border-radius: 0;
            border: none;
            border-top: 1px solid var(--border-glass);
            z-index: 30;
            padding-bottom: env(safe-area-inset-bottom); /* iOS Home Indicator padding */
          }

          .mobile-tabbar-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            gap: 0.2rem;
            flex: 1;
            height: 100%;
          }

          .mobile-tabbar-item.active {
            color: var(--primary);
          }

          .mobile-icon {
            transition: var(--transition-fast);
          }

          .mobile-tabbar-item.active .mobile-icon {
            transform: scale(1.1);
            filter: drop-shadow(0 0 6px var(--primary-glow));
          }

          .mobile-label {
            font-size: 0.7rem;
            font-weight: 500;
          }
        }
      `}</style>
    </>
  );
}

export default Sidebar;
