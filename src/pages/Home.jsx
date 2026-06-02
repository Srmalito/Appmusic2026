import { useEffect, useState } from 'react';
import { Play, Pause, Heart, Plus } from 'lucide-react';
import { tracks } from '../data';
import TrackCover from '../components/TrackCover';

function Home({ playTrack, recentlyPlayed = [], currentTrack, isPlaying, favorites = [], toggleFavorite, addToQueue }) {
  const [greeting, setGreeting] = useState('¡Hola!');

  useEffect(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting('Buenos días');
    else if (hrs < 18) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');
  }, []);

  // Filter recently played track objects
  const recentTracks = recentlyPlayed
    .map((id) => tracks.find((t) => t.id === id))
    .filter(Boolean)
    .slice(0, 6);

  return (
    <div className="home-container">
      {/* Top Welcome Section */}
      <header className="home-header">
        <div>
          <span className="subtitle-greeting">Escucha tu ritmo</span>
          <h1>{greeting}, melómano</h1>
        </div>
      </header>

      {/* Recommended Songs Grid */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>Recomendado para ti</h2>
          <p>Música seleccionada especialmente para tu día</p>
        </div>
        <div className="card-grid">
          {tracks.map((track) => {
            const isCurrent = currentTrack && currentTrack.id === track.id;
            const isPlayingCurrent = isCurrent && isPlaying;
            const isLiked = favorites.includes(track.id);
            
            return (
              <div 
                key={track.id} 
                className={`music-card ${isCurrent ? 'current-playing-card' : ''}`}
                onClick={() => playTrack(track, tracks)}
              >
                <div className="music-card-img-container">
                  <TrackCover src={track.cover} alt={track.title} className="music-card-img" />
                  
                  {/* Heart/Like Button */}
                  {toggleFavorite && (
                    <button 
                      className={`music-card-like-btn ${isLiked ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(track.id);
                      }}
                      title={isLiked ? "Quitar de favoritos" : "Añadir a favoritos"}
                    >
                      <Heart size={14} fill={isLiked ? 'var(--primary)' : 'none'} />
                    </button>
                  )}

                  {/* Play/Pause Button */}
                  <button 
                    className="music-card-play-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      playTrack(track, tracks);
                    }}
                    style={{ 
                      opacity: isCurrent ? 1 : undefined, 
                      transform: isCurrent ? 'translateY(0)' : undefined 
                    }}
                  >
                    {isPlayingCurrent ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                  </button>

                  {/* Add to Queue Button */}
                  {addToQueue && (
                    <button 
                      className="music-card-queue-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToQueue(track);
                      }}
                      title="Añadir a la cola"
                    >
                      <Plus size={16} />
                    </button>
                  )}
                </div>
                <div className="music-card-title" style={{ color: isCurrent ? 'var(--primary)' : 'white' }}>{track.title}</div>
                <div className="music-card-desc">{track.artist}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recently Played (Only if there are any) */}
      {recentTracks.length > 0 && (
        <section className="dashboard-section">
          <div className="section-header">
            <h2>Escuchado recientemente</h2>
          </div>
          <div className="recent-grid">
            {recentTracks.map((track) => (
              <div 
                key={track.id} 
                className="recent-item-card glass-panel"
                onClick={() => playTrack(track, tracks)}
              >
                <div style={{ width: '48px', height: '48px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden' }}>
                  <TrackCover src={track.cover} alt={track.title} className="recent-cover" iconSize={16} />
                </div>
                <div className="recent-info">
                  <div className="recent-title">{track.title}</div>
                  <div className="recent-artist">{track.artist}</div>
                </div>
                <button className="recent-play-button">
                  <Play size={14} fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <style>{`
        .home-container {
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
        }

        .home-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .subtitle-greeting {
          font-size: 0.8rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.15em;
          font-weight: 700;
        }

        /* Dashboard sections */
        .dashboard-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .section-header h2 {
          font-size: 1.35rem;
          font-weight: 800;
        }

        .section-header p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-top: 0.15rem;
        }

        /* Current playing card highlighted styling */
        .current-playing-card {
          border-color: var(--primary) !important;
          box-shadow: 0 0 15px rgba(168, 85, 247, 0.25);
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, var(--bg-card) 100%) !important;
        }

        /* Recently Played grid */
        .recent-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .recent-item-card {
          display: flex;
          align-items: center;
          padding: 0.5rem;
          gap: 0.75rem;
          border-radius: 12px;
          cursor: pointer;
          transition: var(--transition-fast);
          position: relative;
          overflow: hidden;
        }

        .recent-item-card:hover {
          background: var(--bg-card-hover);
        }

        .recent-cover {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .recent-info {
          flex: 1;
          min-width: 0;
        }

        .recent-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .recent-artist {
          font-size: 0.75rem;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .recent-play-button {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--primary);
          border: none;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: scale(0.9);
          transition: var(--transition-fast);
          margin-right: 0.25rem;
          box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        }

        .recent-item-card:hover .recent-play-button {
          opacity: 1;
          transform: scale(1);
        }

        .recent-play-button:hover {
          background: var(--secondary);
          transform: scale(1.1) !important;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .recent-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default Home;
