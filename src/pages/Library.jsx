import { useState } from 'react';
import { 
  Heart, ListMusic, History, Plus, Music, Trash2, FolderHeart, Folder 
} from 'lucide-react';
import { tracks } from '../data';
import TrackList from '../components/TrackList';

function Library({
  playTrack, favorites = [], recentlyPlayed = [], playlists = [],
  createPlaylist, deletePlaylist, navigateToPlaylist, removeTrackFromPlaylist,
  genreFilter, playlistFilter, toggleFavorite, addTrackToPlaylist
}) {
  const [activeSubTab, setActiveSubTab] = useState('playlists'); // 'playlists' | 'favorites' | 'history'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // 1. GENRE FILTER RENDER STATE
  if (genreFilter) {
    const genreTracks = tracks.filter((t) => t.category.toLowerCase() === genreFilter.toLowerCase());
    return (
      <div className="library-filtered-view">
        <TrackList
          tracks={genreTracks}
          playTrack={playTrack}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          playlists={playlists}
          addTrackToPlaylist={addTrackToPlaylist}
        />
      </div>
    );
  }

  // 2. PLAYLIST FILTER RENDER STATE
  if (playlistFilter) {
    const playlist = playlists.find((p) => p.name === playlistFilter);
    const playlistTracks = playlist
      ? playlist.tracks.map((id) => tracks.find((t) => t.id === id)).filter(Boolean)
      : [];

    return (
      <div className="library-filtered-view">
        <TrackList
          tracks={playlistTracks}
          playTrack={playTrack}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          playlists={playlists}
          addTrackToPlaylist={addTrackToPlaylist}
          removeTrackFromPlaylist={removeTrackFromPlaylist}
          playlistName={playlistFilter}
        />
      </div>
    );
  }

  // 3. LIBRARY TAB DASHBOARD
  const favoriteTracks = favorites.map((id) => tracks.find((t) => t.id === id)).filter(Boolean);
  const historyTracks = recentlyPlayed.map((id) => tracks.find((t) => t.id === id)).filter(Boolean);

  const handleCreatePlaylistSubmit = (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    createPlaylist(newPlaylistName);
    setNewPlaylistName('');
    setShowCreateModal(false);
  };

  return (
    <div className="library-container">
      {/* Top Header */}
      <header className="library-header">
        <h1>Tu Biblioteca</h1>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} />
          <span>Nueva lista</span>
        </button>
      </header>

      {/* Sub Tabs Navigation */}
      <div className="library-tabs glass-panel">
        <button
          className={`tab-btn ${activeSubTab === 'playlists' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('playlists')}
        >
          <ListMusic size={16} />
          <span>Listas de reproducción</span>
          <span className="badge">{playlists.length}</span>
        </button>
        <button
          className={`tab-btn ${activeSubTab === 'favorites' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('favorites')}
        >
          <Heart size={16} />
          <span>Favoritos</span>
          <span className="badge">{favorites.length}</span>
        </button>
        <button
          className={`tab-btn ${activeSubTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('history')}
        >
          <History size={16} />
          <span>Historial</span>
          <span className="badge">{recentlyPlayed.length}</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="library-panel-content">
        {/* PLAYLISTS PANEL */}
        {activeSubTab === 'playlists' && (
          <div className="playlists-grid">
            {/* Quick Favorites Card */}
            <div className="playlist-card favorites-quick-card" onClick={() => setActiveSubTab('favorites')}>
              <div className="favorites-quick-icon">
                <FolderHeart size={36} />
              </div>
              <div className="playlist-card-details">
                <div className="playlist-name">Canciones favoritas</div>
                <div className="playlist-track-count">{favorites.length} canciones</div>
              </div>
            </div>

            {/* Custom Playlists */}
            {playlists.map((pl) => (
              <div 
                key={pl.name} 
                className="playlist-card"
                onClick={() => navigateToPlaylist(pl)}
              >
                <div className="playlist-card-icon">
                  <Folder size={36} className="text-secondary" />
                </div>
                <div className="playlist-card-details">
                  <div className="playlist-name">{pl.name}</div>
                  <div className="playlist-track-count">{pl.tracks.length} canciones</div>
                </div>
                <button 
                  className="playlist-delete-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if(confirm(`¿Estás seguro de eliminar la lista "${pl.name}"?`)) {
                      deletePlaylist(pl.name);
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {playlists.length === 0 && (
              <div className="library-empty-state glass-panel">
                <ListMusic size={40} className="empty-icon" />
                <h3>Crea tu primera lista</h3>
                <p>Organiza tus canciones favoritas según tus estados de ánimo o actividades cotidianas.</p>
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                  Crear ahora
                </button>
              </div>
            )}
          </div>
        )}

        {/* FAVORITES PANEL */}
        {activeSubTab === 'favorites' && (
          <div className="favorites-panel">
            {favoriteTracks.length > 0 ? (
              <TrackList
                tracks={favoriteTracks}
                playTrack={playTrack}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                playlists={playlists}
                addTrackToPlaylist={addTrackToPlaylist}
              />
            ) : (
              <div className="library-empty-state glass-panel">
                <Heart size={40} className="empty-icon text-red-500" fill="currentColor" />
                <h3>Aún no tienes favoritos</h3>
                <p>Las canciones a las que les des "Me gusta" (marcando el corazón) aparecerán aquí agrupadas.</p>
              </div>
            )}
          </div>
        )}

        {/* HISTORY PANEL */}
        {activeSubTab === 'history' && (
          <div className="history-panel">
            {historyTracks.length > 0 ? (
              <TrackList
                tracks={historyTracks}
                playTrack={playTrack}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                playlists={playlists}
                addTrackToPlaylist={addTrackToPlaylist}
              />
            ) : (
              <div className="library-empty-state glass-panel">
                <History size={40} className="empty-icon" />
                <h3>Historial vacío</h3>
                <p>Las canciones que reproduzcas se guardarán en tu historial para que puedas volver a ellas rápidamente.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Playlist Modal/Dialog */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="create-playlist-modal glass-panel">
            <h2 className="modal-title">Crear lista de reproducción</h2>
            <form onSubmit={handleCreatePlaylistSubmit} className="modal-form">
              <input
                type="text"
                placeholder="Nombre de la lista (ej: Estudiar Lofi)"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="modal-input"
                autoFocus
                required
              />
              <div className="modal-buttons">
                <button
                  type="button"
                  className="modal-btn-cancel"
                  onClick={() => {
                    setNewPlaylistName('');
                    setShowCreateModal(false);
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Crear lista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .library-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .library-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        /* Tabs Styles */
        .library-tabs {
          display: flex;
          padding: 0.35rem;
          gap: 0.5rem;
          background: rgba(18, 24, 43, 0.6);
          border-radius: 12px;
          border: 1px solid var(--border-glass);
        }

        .tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 0.75rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .tab-btn:hover {
          color: var(--text-primary);
          background: rgba(255,255,255,0.03);
        }

        .tab-btn.active {
          color: white;
          background: var(--bg-card-hover);
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        }

        .tab-btn.active svg {
          color: var(--primary);
        }

        .badge {
          background: rgba(255,255,255,0.08);
          color: var(--text-secondary);
          font-size: 0.7rem;
          padding: 0.1rem 0.4rem;
          border-radius: 99px;
          font-weight: 600;
        }

        .tab-btn.active .badge {
          background: var(--primary);
          color: white;
        }

        /* Playlists Grid Styles */
        .playlists-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1.25rem;
        }

        .playlist-card {
          background: var(--bg-card);
          border: 1px solid var(--border-glass);
          border-radius: 14px;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          cursor: pointer;
          position: relative;
          transition: var(--transition-smooth);
        }

        .playlist-card:hover {
          background: var(--bg-card-hover);
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .favorites-quick-card {
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, var(--bg-card) 100%);
          border-color: rgba(168, 85, 247, 0.15);
        }

        .favorites-quick-card:hover {
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, var(--bg-card-hover) 100%);
        }

        .favorites-quick-icon {
          width: 56px;
          height: 56px;
          border-radius: 10px;
          background: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 15px var(--primary-glow);
        }

        .playlist-card-icon {
          width: 56px;
          height: 56px;
          border-radius: 10px;
          background: rgba(255,255,255,0.03);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-glass);
        }

        .playlist-card-details {
          flex: 1;
          min-width: 0;
        }

        .playlist-name {
          font-size: 0.95rem;
          font-weight: 700;
          color: white;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .playlist-track-count {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 0.15rem;
        }

        .playlist-delete-btn {
          position: absolute;
          right: 1.25rem;
          top: 50%;
          transform: translateY(-50%) scale(0.9);
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.4rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: var(--transition-fast);
        }

        .playlist-card:hover .playlist-delete-btn {
          opacity: 1;
          transform: translateY(-50%) scale(1);
        }

        .playlist-delete-btn:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.15);
        }

        /* Empty states */
        .library-empty-state {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 3rem 1.5rem;
          text-align: center;
          color: var(--text-secondary);
        }

        .library-empty-state h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: white;
        }

        .library-empty-state p {
          font-size: 0.85rem;
          max-width: 320px;
          margin-bottom: 0.5rem;
        }

        /* Modal Dialog Styles */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.6);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          backdrop-filter: blur(4px);
        }

        .create-playlist-modal {
          width: 100%;
          max-width: 400px;
          background: var(--bg-dark);
          border: 1px solid var(--border-glass);
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          animation: slide-up-modal 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slide-up-modal {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .modal-title {
          font-size: 1.2rem;
          font-weight: 800;
          margin-bottom: 1.25rem;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .modal-input {
          width: 100%;
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--border-glass);
          border-radius: 8px;
          padding: 0.75rem;
          color: white;
          font-size: 0.9rem;
          font-family: var(--font-sans);
        }

        .modal-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.15);
        }

        .modal-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }

        .modal-btn-cancel {
          background: transparent;
          border: 1px solid var(--border-glass);
          color: var(--text-secondary);
          padding: 0.75rem 1.25rem;
          border-radius: 99px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .modal-btn-cancel:hover {
          color: white;
          background: rgba(255,255,255,0.05);
        }

        /* Filtered View layout */
        .library-filtered-view {
          margin-top: 1rem;
        }

        @media (max-width: 480px) {
          .library-tabs {
            flex-direction: row;
          }
          .tab-btn {
            padding: 0.6rem 0.25rem;
            font-size: 0.75rem;
            flex-direction: column;
            gap: 0.15rem;
          }
          .tab-btn span {
            display: inline;
          }
          .playlists-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          .playlist-card {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default Library;
