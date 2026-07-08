import { useState, useRef } from 'react';
import { 
  Play, Pause, Heart, MoreVertical, Plus, Trash2, Music 
} from 'lucide-react';
import TrackCover from './TrackCover';

function TrackList({
  tracks, playTrack, favorites = [], toggleFavorite, playlists = [], 
  addTrackToPlaylist, removeTrackFromPlaylist, playlistName, currentTrack, isPlaying, addToQueue,
  warmTrackCache
}) {
  const [activeMenuId, setActiveMenuId] = useState(null);
  // Timer ref for hover debounce - avoids triggering preload on fast mouse sweeps
  const hoverTimerRef = useRef(null);

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  const handleRowClick = (track) => {
    playTrack(track, tracks);
  };

  return (
    <div className="tracklist-container">
      {tracks.length === 0 ? (
        <div className="tracklist-empty">
          <Music size={40} className="empty-icon" />
          <p>No hay canciones disponibles en esta lista.</p>
        </div>
      ) : (
        <div className="tracklist-table">
          {/* Header (Desktop only) */}
          <div className="tracklist-header">
            <span className="col-index">#</span>
            <span className="col-title">Título</span>
            <span className="col-album">Álbum</span>
            <span className="col-time">Duración</span>
            <span className="col-actions"></span>
          </div>

          {/* Rows */}
          <div className="tracklist-body">
            {tracks.map((track, index) => {
              const isCurrent = currentTrack && currentTrack.id === track.id;
              const isLiked = favorites.includes(track.id);
              const showMenu = activeMenuId === track.id;

              return (
                <div 
                  key={track.id} 
                  className={`tracklist-row ${isCurrent ? 'current-playing' : ''}`}
                  onClick={() => handleRowClick(track)}
                  onMouseEnter={() => {
                    // Debounce: only preload if the user lingers 200ms on the row
                    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                    hoverTimerRef.current = setTimeout(() => {
                      if (warmTrackCache && !isCurrent) warmTrackCache(track);
                    }, 200);
                  }}
                  onMouseLeave={() => {
                    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                  }}
                >
                  {/* Number / Play Indicator */}
                  <span className="col-index" onClick={(e) => e.stopPropagation()}>
                    <span className="row-num">{index + 1}</span>
                    <button 
                      onClick={() => handleRowClick(track)}
                      className="row-play-btn"
                    >
                      {isCurrent && isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                    </button>
                    {isCurrent && isPlaying && (
                      <div className="playing-eq-bars">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    )}
                  </span>

                  {/* Title & Cover & Artist */}
                  <span className="col-title">
                    <div style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: '6px', overflow: 'hidden' }}>
                      <TrackCover src={track.cover} alt={track.title} className="row-cover" iconSize={14} />
                    </div>
                    <div className="row-metadata">
                      <div className="row-title-text">{track.title}</div>
                      <div className="row-artist-text">{track.artist}</div>
                    </div>
                  </span>

                  {/* Album Name */}
                  <span className="col-album">{track.album}</span>

                  {/* Duration */}
                  <span className="col-time">{track.duration}</span>

                  {/* Actions / Options Menu */}
                  <span className="col-actions" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className={`favorite-btn icon-button ${isLiked ? 'active' : ''}`}
                      onClick={() => toggleFavorite && toggleFavorite(track.id)}
                    >
                      <Heart size={16} fill={isLiked ? 'var(--primary)' : 'none'} />
                    </button>
                    
                    <div className="options-dropdown-container">
                      <button 
                        className="icon-button"
                        onClick={(e) => toggleMenu(e, track.id)}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {showMenu && (
                        <>
                          <div className="menu-backdrop" onClick={() => setActiveMenuId(null)} />
                          <div className="track-options-menu glass-panel">
                            {/* Option 0: Add to queue */}
                            {addToQueue && (
                              <button 
                                className="menu-item"
                                onClick={() => {
                                  addToQueue(track);
                                  setActiveMenuId(null);
                                }}
                              >
                                <Plus size={14} />
                                Añadir a la cola
                              </button>
                            )}

                            {/* Option 1: Remove from current playlist */}
                            {playlistName && removeTrackFromPlaylist && (
                              <button 
                                className="menu-item delete"
                                onClick={() => {
                                  removeTrackFromPlaylist(playlistName, track.id);
                                  setActiveMenuId(null);
                                }}
                              >
                                <Trash2 size={14} />
                                Quitar de esta lista
                              </button>
                            )}

                            {/* Option 2: Add to other user playlists */}
                            {playlists.length > 0 && (
                              <div className="menu-submenu">
                                <div className="submenu-title">Añadir a lista:</div>
                                {playlists.map((pl) => (
                                  <button
                                    key={pl.name}
                                    className="menu-item"
                                    onClick={() => {
                                      addTrackToPlaylist(pl.name, track.id);
                                      setActiveMenuId(null);
                                    }}
                                  >
                                    <Plus size={14} />
                                    {pl.name}
                                  </button>
                                ))}
                              </div>
                            )}
                            
                            {playlists.length === 0 && !playlistName && (
                              <div className="menu-item disabled">No hay listas disponibles</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .tracklist-container {
          width: 100%;
        }

        .tracklist-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 4rem 1rem;
          text-align: center;
          color: var(--text-secondary);
        }

        .empty-icon {
          color: var(--text-muted);
          animation: bounce 2s infinite alternate;
        }

        /* Table Structure */
        .tracklist-table {
          display: flex;
          flex-direction: column;
          width: 100%;
        }

        .tracklist-header {
          display: grid;
          grid-template-columns: 48px 2fr 1fr 80px 100px;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border-glass);
          color: var(--text-muted);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
        }

        .tracklist-row {
          display: grid;
          grid-template-columns: 48px 2fr 1fr 80px 100px;
          padding: 0.5rem 1rem;
          align-items: center;
          border-radius: 8px;
          cursor: pointer;
          transition: var(--transition-fast);
          border: 1px solid transparent;
        }

        .tracklist-row:hover {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.02);
        }

        .tracklist-row.current-playing {
          background: linear-gradient(90deg, rgba(168, 85, 247, 0.08) 0%, transparent 100%);
          border-left: 3px solid var(--primary);
        }

        /* Column Styles */
        .col-index {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          position: relative;
        }

        .row-play-btn {
          display: none;
          background: transparent;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          padding: 0.25rem;
        }

        .tracklist-row:hover .row-num {
          display: none;
        }

        .tracklist-row:hover .row-play-btn {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .playing-eq-bars {
          display: flex;
          align-items: flex-end;
          gap: 2px;
          height: 12px;
          position: absolute;
          left: 4px;
        }

        .current-playing:hover .playing-eq-bars {
          display: none;
        }

        .playing-eq-bars span {
          width: 2px;
          background: var(--primary);
          animation: eq-pulse 0.8s infinite alternate ease-in-out;
        }

        .playing-eq-bars span:nth-child(1) { height: 100%; animation-duration: 0.6s; }
        .playing-eq-bars span:nth-child(2) { height: 40%; animation-duration: 0.9s; animation-delay: 0.15s; }
        .playing-eq-bars span:nth-child(3) { height: 70%; animation-duration: 0.7s; animation-delay: 0.05s; }

        @keyframes eq-pulse {
          from { height: 20%; }
          to { height: 100%; }
        }

        .col-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 0; /* allows text truncation */
        }

        .row-cover {
          width: 40px;
          height: 40px;
          border-radius: 6px;
          object-fit: cover;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .row-metadata {
          min-width: 0;
        }

        .row-title-text {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .current-playing .row-title-text {
          color: var(--primary);
          text-shadow: 0 0 10px rgba(168, 85, 247, 0.2);
        }

        .row-artist-text {
          font-size: 0.75rem;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .col-album {
          color: var(--text-secondary);
          font-size: 0.85rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .col-time {
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        .col-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        /* Options Dropdown */
        .options-dropdown-container {
          position: relative;
        }

        .menu-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 100;
          cursor: default;
        }

        .track-options-menu {
          position: absolute;
          top: 100%;
          right: 0;
          min-width: 160px;
          background: var(--bg-dark);
          border: 1px solid var(--border-glass);
          border-radius: 12px;
          padding: 0.4rem;
          box-shadow: 0 10px 25px rgba(0,0,0,0.4);
          z-index: 110;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 0.5rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .menu-item:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }

        .menu-item.delete {
          color: #ef4444;
        }

        .menu-item.delete:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        .menu-item.disabled {
          color: var(--text-muted);
          cursor: not-allowed;
        }

        .menu-item.disabled:hover {
          background: transparent;
        }

        .menu-submenu {
          border-top: 1px solid var(--border-glass);
          margin-top: 0.25rem;
          padding-top: 0.25rem;
        }

        .submenu-title {
          font-size: 0.65rem;
          color: var(--text-muted);
          font-weight: 700;
          padding: 0.25rem 0.5rem;
          text-transform: uppercase;
        }

        /* Mobile Adjustments */
        @media (max-width: 768px) {
          .tracklist-header {
            display: none;
          }

          .tracklist-row {
            grid-template-columns: 32px 1fr auto;
            padding: 0.5rem 0.25rem;
          }

          .col-album, .col-time {
            display: none;
          }

          .row-cover {
            width: 44px;
            height: 44px;
          }

          .tracklist-row:hover .row-num {
            display: flex;
          }

          .tracklist-row:hover .row-play-btn {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

export default TrackList;
