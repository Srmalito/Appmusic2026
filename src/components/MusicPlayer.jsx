import { useState } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, 
  Volume2, VolumeX, Heart, ChevronDown, ListPlus, Music, Loader2, Tv
} from 'lucide-react';
import Visualizer from './Visualizer';
import TrackCover from './TrackCover';

function MusicPlayer({
  currentTrack, isPlaying, togglePlay, playNext, playPrev,
  currentTime, duration, handleSeek, volume, handleVolumeChange,
  isMuted, toggleMute, isShuffle, toggleShuffle, isRepeat, toggleRepeat,
  favorites, toggleFavorite, playlists, addTrackToPlaylist,
  isResolving, showVideo, setShowVideo, hasVideo
}) {
  const [isExpanded, setIsExpanded] = useState(false); // Mobile full screen player drawer
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);

  if (!currentTrack) return null;

  const isLiked = favorites.includes(currentTrack.id);

  // Time formatter helper
  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleProgressChange = (e) => {
    handleSeek(parseFloat(e.target.value));
  };

  const percent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Bottom Player Bar (Desktop always, Mobile standard mini-bar) */}
      <div className={`bottom-player-bar glass-panel ${isExpanded ? 'mobile-hidden' : ''}`}>
        
        {/* Track details (Left) */}
        <div className="player-track-info" onClick={() => window.innerWidth <= 768 && setIsExpanded(true)}>
          <div className="player-cover-container">
            <TrackCover src={currentTrack.cover} alt={currentTrack.title} className={`player-cover ${isPlaying ? 'playing' : ''}`} iconSize={18} />
          </div>
          <div className="player-metadata">
            <div className="player-title">{currentTrack.title}</div>
            <div className="player-artist">{currentTrack.artist}</div>
          </div>
          <button 
            className={`favorite-btn icon-button ${isLiked ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(currentTrack.id);
            }}
          >
            <Heart size={18} fill={isLiked ? 'var(--primary)' : 'none'} />
          </button>
        </div>

        {/* Playback controls (Center) */}
        <div className="player-controls-container">
          <div className="player-control-buttons">
            <button 
              className={`control-btn icon-button ${isShuffle ? 'active' : ''}`} 
              onClick={toggleShuffle}
              title="Aleatorio"
            >
              <Shuffle size={16} />
            </button>
            <button className="control-btn icon-button" onClick={playPrev}>
              <SkipBack size={18} />
            </button>
            <button className="play-pause-btn" onClick={togglePlay} disabled={isResolving}>
              {isResolving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isPlaying ? (
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />
              )}
            </button>
            <button className="control-btn icon-button" onClick={playNext}>
              <SkipForward size={18} />
            </button>
            <button 
              className={`control-btn icon-button ${isRepeat !== 'off' ? 'active' : ''}`} 
              onClick={toggleRepeat}
              title={`Repetir: ${isRepeat === 'all' ? 'Todo' : isRepeat === 'one' ? 'Una' : 'Desactivado'}`}
              style={{ position: 'relative' }}
            >
              <Repeat size={16} />
              {isRepeat === 'one' && <span className="repeat-one-indicator">1</span>}
            </button>
          </div>

          <div className="player-progress-bar">
            <span className="time-text">{formatTime(currentTime)}</span>
            <div className="progress-slider-container">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleProgressChange}
                className="progress-slider"
                style={{
                  background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percent}%, rgba(255, 255, 255, 0.1) ${percent}%, rgba(255, 255, 255, 0.1) 100%)`
                }}
              />
            </div>
            <span className="time-text">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume & Extras (Right) */}
        <div className="player-extras-container">
          {hasVideo && (
            <button 
              className={`icon-button ${showVideo ? 'active' : ''}`}
              onClick={() => setShowVideo(!showVideo)}
              title={showVideo ? "Ocultar Video" : "Mostrar Video"}
              style={{ marginRight: '0.25rem' }}
            >
              <Tv size={18} />
            </button>
          )}

          <div className="playlist-adder-wrapper">
            <button className="icon-button" onClick={() => setShowPlaylistMenu(!showPlaylistMenu)} title="Agregar a lista">
              <ListPlus size={18} />
            </button>
            
            {showPlaylistMenu && (
              <div className="playlist-dropdown-menu glass-panel">
                <div className="dropdown-title">Añadir a lista</div>
                {playlists.length === 0 ? (
                  <div className="dropdown-item empty">No hay listas creadas</div>
                ) : (
                  playlists.map((pl) => (
                    <button
                      key={pl.name}
                      className="dropdown-item"
                      onClick={() => {
                        addTrackToPlaylist(pl.name, currentTrack.id);
                        setShowPlaylistMenu(false);
                      }}
                    >
                      {pl.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          
          <button className="icon-button" onClick={toggleMute}>
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="volume-slider"
            style={{
              background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.1) ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.1) 100%)`
            }}
          />
        </div>

        {/* Mobile Mini-Player Layout controls (Only visible on small screen within bottom bar) */}
        <div className="mobile-mini-controls">
          <button className="play-pause-btn mobile-only" onClick={togglePlay} disabled={isResolving}>
            {isResolving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" style={{ marginLeft: '1px' }} />
            )}
          </button>
          <button className="control-btn icon-button mobile-only" onClick={playNext}>
            <SkipForward size={18} />
          </button>
        </div>
      </div>

      {/* Mobile Expanded Full Screen Player Drawer */}
      <div className={`expanded-mobile-player glass-panel ${isExpanded ? 'active' : ''}`} style={{
        backgroundImage: `radial-gradient(circle at top, rgba(168, 85, 247, 0.15) 0%, transparent 80%), radial-gradient(circle at center, rgba(16, 185, 129, 0.05) 0%, transparent 60%)`
      }}>
        {/* Drag handler / close header */}
        <header className="expanded-player-header">
          <button className="close-drawer-btn" onClick={() => setIsExpanded(false)}>
            <ChevronDown size={28} />
          </button>
          <div className="expanded-header-title">Reproduciendo ahora</div>
          <button className="icon-button" onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}>
            <ListPlus size={22} />
          </button>
        </header>

        {/* Expanded Cover Artwork (Vinyl spin effect when playing) */}
        <div className="expanded-body">
          <div className="vinyl-wrapper">
            <div className={`vinyl-record ${isPlaying ? 'spinning' : ''}`}>
              <TrackCover src={currentTrack.cover} alt={currentTrack.title} className="vinyl-cover" iconSize={56} />
              <div className="vinyl-center-hole"></div>
            </div>
          </div>

          {/* Track details */}
          <div className="expanded-track-details">
            <div>
              <h2 className="expanded-track-title">{currentTrack.title}</h2>
              <p className="expanded-track-artist">{currentTrack.artist}</p>
            </div>
            <button 
              className={`favorite-btn icon-button ${isLiked ? 'active' : ''}`}
              onClick={() => toggleFavorite(currentTrack.id)}
              style={{ padding: '0.8rem' }}
            >
              <Heart size={26} fill={isLiked ? 'var(--primary)' : 'none'} />
            </button>
          </div>

          {/* Visualizer */}
          <div className="expanded-visualizer-container">
            <Visualizer isPlaying={isPlaying} />
          </div>

          {/* Scrub bar */}
          <div className="expanded-progress-container">
            <div className="player-progress-bar">
              <span className="time-text">{formatTime(currentTime)}</span>
              <div className="progress-slider-container">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleProgressChange}
                  className="progress-slider"
                  style={{
                    background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percent}%, rgba(255, 255, 255, 0.1) ${percent}%, rgba(255, 255, 255, 0.1) 100%)`
                  }}
                />
              </div>
              <span className="time-text">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Playback control keys */}
          <div className="expanded-controls">
            <button 
              className={`control-btn icon-button ${isShuffle ? 'active' : ''}`} 
              onClick={toggleShuffle}
            >
              <Shuffle size={20} />
            </button>
            <button className="control-btn icon-button xl" onClick={playPrev}>
              <SkipBack size={24} />
            </button>
            <button className="play-pause-btn lg" onClick={togglePlay} disabled={isResolving}>
              {isResolving ? (
                <Loader2 size={24} className="animate-spin" />
              ) : isPlaying ? (
                <Pause size={28} fill="currentColor" />
              ) : (
                <Play size={28} fill="currentColor" style={{ marginLeft: '4px' }} />
              )}
            </button>
            <button className="control-btn icon-button xl" onClick={playNext}>
              <SkipForward size={24} />
            </button>
            <button 
              className={`control-btn icon-button ${isRepeat !== 'off' ? 'active' : ''}`} 
              onClick={toggleRepeat}
              style={{ position: 'relative' }}
            >
              <Repeat size={20} />
              {isRepeat === 'one' && <span className="repeat-one-indicator" style={{ right: '-4px', bottom: '-4px' }}>1</span>}
            </button>
          </div>

          {/* Volume slider */}
          <div className="expanded-volume">
            <button className="icon-button" onClick={toggleMute}>
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="volume-slider"
              style={{
                background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.1) ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.1) 100%)`
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }

        /* Bottom Player Bar Styles */
        .bottom-player-bar {
          grid-column: 1 / 3;
          grid-row: 2 / 3;
          height: var(--player-height);
          border-radius: 0;
          border: none;
          border-top: 1px solid var(--border-glass);
          display: grid;
          grid-template-columns: 1fr 2fr 1fr;
          align-items: center;
          padding: 0 1.5rem;
          z-index: 25;
          background: rgba(8, 12, 28, 0.95);
        }

        .player-track-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 180px;
        }

        .player-cover-container {
          width: 56px;
          height: 56px;
          border-radius: 8px;
          overflow: hidden;
          background: rgba(255,255,255,0.03);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-glass);
        }

        .player-cover {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }

        .player-cover.playing {
          transform: scale(1.03);
        }

        .player-metadata {
          max-width: 150px;
        }

        .player-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .player-artist {
          font-size: 0.75rem;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .favorite-btn.active {
          color: var(--primary);
          filter: drop-shadow(0 0 6px var(--primary-glow));
        }

        /* Player Controls (Center) */
        .player-controls-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          max-width: 580px;
          justify-self: center;
        }

        .player-control-buttons {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .play-pause-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: white;
          color: black;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition-smooth);
          box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
        }

        .play-pause-btn:hover {
          transform: scale(1.08);
          background: var(--primary);
          color: white;
          box-shadow: 0 4px 15px var(--primary-glow);
        }

        .play-pause-btn:active {
          transform: scale(0.95);
        }

        .control-btn.active {
          color: var(--primary);
        }

        .repeat-one-indicator {
          position: absolute;
          right: -2px;
          bottom: -2px;
          background: var(--primary);
          color: white;
          font-size: 0.55rem;
          font-weight: 800;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .player-progress-bar {
          display: flex;
          align-items: center;
          width: 100%;
          gap: 0.75rem;
        }

        .time-text {
          font-size: 0.75rem;
          color: var(--text-muted);
          min-width: 32px;
          text-align: center;
        }

        .progress-slider-container {
          flex: 1;
          display: flex;
          align-items: center;
        }

        .progress-slider, .volume-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 2px;
          outline: none;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .progress-slider::-webkit-slider-thumb, .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          border: none;
          opacity: 0;
          transition: opacity 0.15s ease, transform 0.15s ease;
        }

        .progress-slider-container:hover .progress-slider::-webkit-slider-thumb,
        .player-extras-container:hover .volume-slider::-webkit-slider-thumb {
          opacity: 1;
        }

        .progress-slider::-webkit-slider-thumb:hover, .volume-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          background: var(--secondary);
        }

        /* Player Extras (Right) */
        .player-extras-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          justify-self: end;
          justify-content: flex-end;
          width: auto;
        }

        .volume-slider {
          width: 80px;
          transition: var(--transition-smooth);
        }

        @media (min-width: 1024px) {
          .volume-slider {
            width: 110px;
          }
        }

        .playlist-adder-wrapper {
          position: relative;
        }

        .playlist-dropdown-menu {
          position: absolute;
          bottom: calc(100% + 12px);
          right: 0;
          min-width: 180px;
          background: var(--bg-dark);
          border: 1px solid var(--border-glass);
          border-radius: 12px;
          padding: 0.5rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
          z-index: 50;
        }

        .dropdown-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          padding: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-glass);
          margin-bottom: 0.25rem;
        }

        .dropdown-item {
          width: 100%;
          text-align: left;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 0.5rem 0.75rem;
          font-size: 0.85rem;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: var(--transition-fast);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dropdown-item:hover {
          color: var(--text-primary);
          background: rgba(255,255,255,0.05);
        }

        .dropdown-item.empty {
          color: var(--text-muted);
          text-align: center;
          cursor: default;
        }

        .dropdown-item.empty:hover {
          background: transparent;
        }

        .mobile-mini-controls {
          display: none;
        }

        /* Expanded Mobile Player */
        .expanded-mobile-player {
          display: none;
        }

        /* Responsive Player Bar adjustments */
        @media (max-width: 768px) {
          .bottom-player-bar {
            grid-column: 1 / 2;
            position: fixed;
            bottom: var(--mobile-nav-height);
            left: 0;
            right: 0;
            height: 64px;
            grid-template-columns: 1fr auto;
            padding: 0 1rem;
            background: rgba(13, 18, 38, 0.95);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            border-top: 1px solid var(--border-glass);
            border-radius: 12px 12px 0 0;
            margin: 0 4px;
          }

          .player-track-info {
            width: 100%;
            cursor: pointer;
          }

          .player-cover-container {
            width: 44px;
            height: 44px;
          }

          .player-metadata {
            max-width: 180px;
          }

          .player-controls-container, .player-extras-container {
            display: none;
          }

          .mobile-mini-controls {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .mobile-mini-controls .play-pause-btn {
            width: 36px;
            height: 36px;
          }

          .mobile-hidden {
            display: none !important;
          }

          /* Mobile Full-Screen Layout */
          .expanded-mobile-player {
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--bg-darker);
            z-index: 100;
            transform: translateY(100%);
            transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            padding: 2rem 1.5rem;
            border-radius: 0;
            border: none;
          }

          .expanded-mobile-player.active {
            transform: translateY(0);
          }

          .expanded-player-header {
            display: flex;
            align-items: center;
            justify-content: justify;
            width: 100%;
            height: 40px;
            margin-bottom: 2rem;
          }

          .expanded-header-title {
            flex: 1;
            text-align: center;
            font-size: 0.85rem;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: var(--text-secondary);
          }

          .close-drawer-btn {
            background: transparent;
            border: none;
            color: var(--text-primary);
            cursor: pointer;
            padding: 0.25rem;
          }

          .expanded-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-around;
            padding: 1rem 0;
          }

          .vinyl-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            aspect-ratio: 1;
            max-height: 280px;
          }

          .vinyl-record {
            width: 250px;
            height: 250px;
            border-radius: 50%;
            background: #111;
            position: relative;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6), 0 0 0 10px rgba(255, 255, 255, 0.02);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .vinyl-cover {
            width: 140px;
            height: 140px;
            border-radius: 50%;
            object-fit: cover;
          }

          .vinyl-center-hole {
            width: 20px;
            height: 20px;
            background: var(--bg-darker);
            border-radius: 50%;
            position: absolute;
            border: 4px solid #000;
          }

          .spinning {
            animation: spin-slow 15s linear infinite;
          }

          .expanded-track-details {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin: 1.5rem 0;
          }

          .expanded-track-title {
            font-size: 1.4rem;
            font-weight: 800;
            letter-spacing: -0.02em;
          }

          .expanded-track-artist {
            font-size: 0.95rem;
            color: var(--text-secondary);
            margin-top: 0.25rem;
          }

          .expanded-visualizer-container {
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1rem;
          }

          .expanded-progress-container {
            width: 100%;
            margin-bottom: 1.5rem;
          }

          .expanded-controls {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            max-width: 320px;
            margin: 0 auto 1.5rem auto;
          }

          .play-pause-btn.lg {
            width: 68px;
            height: 68px;
            background: var(--primary);
            color: white;
            box-shadow: 0 6px 20px var(--primary-glow);
          }

          .play-pause-btn.lg:hover {
            background: var(--secondary);
            box-shadow: 0 6px 20px var(--secondary-glow);
          }

          .icon-button.xl {
            padding: 0.75rem;
            color: white;
          }

          .expanded-volume {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            width: 100%;
            max-width: 260px;
            margin: 0 auto;
          }
        }
      `}</style>
    </>
  );
}

export default MusicPlayer;
