import { useEffect, useState } from 'react';
import { Play, Flame, Music, Sparkles } from 'lucide-react';
import { tracks, genres } from '../data';

function Home({ playTrack, recentlyPlayed = [], navigateToGenre, currentTrack, isPlaying }) {
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

  // Pick a featured track (first track by default or any)
  const featuredTrack = tracks[0];

  const handlePlayFeatured = () => {
    if (featuredTrack) {
      playTrack(featuredTrack, tracks);
    }
  };

  return (
    <div className="home-container">
      {/* Top Welcome Section */}
      <header className="home-header">
        <div>
          <span className="subtitle-greeting">Escucha tu ritmo</span>
          <h1>{greeting}, melómano</h1>
        </div>
        <div className="status-badge glass-panel">
          <Flame size={16} className="text-secondary" />
          <span>Lanzamiento PWA</span>
        </div>
      </header>

      {/* Featured Banner Hero */}
      <section className="featured-banner-section">
        <div className="featured-banner glass-panel" style={{
          backgroundImage: `linear-gradient(135deg, rgba(168, 85, 247, 0.4) 0%, rgba(59, 130, 246, 0.2) 100%), url(${featuredTrack?.cover})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}>
          <div className="banner-content">
            <div className="banner-badge">
              <Sparkles size={14} />
              Recomendado para hoy
            </div>
            <h2 className="banner-title">{featuredTrack?.title}</h2>
            <p className="banner-subtitle">
              Sintoniza tu día con {featuredTrack?.artist}. Sonido inmersivo sin interrupciones publicitarias.
            </p>
            <div className="banner-buttons">
              <button className="btn-primary" onClick={handlePlayFeatured}>
                <Play size={18} fill="currentColor" />
                {currentTrack?.id === featuredTrack?.id && isPlaying ? 'Pausar' : 'Escuchar ahora'}
              </button>
            </div>
          </div>
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
                <img src={track.cover} alt={track.title} className="recent-cover" />
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

      {/* Genre Recommendations */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>Explorar por géneros</h2>
          <p>Encuentra el ritmo perfecto para cada momento</p>
        </div>
        <div className="card-grid">
          {genres.map((genre) => (
            <div
              key={genre.id}
              className="genre-card"
              onClick={() => navigateToGenre(genre.name)}
            >
              <div className="genre-card-overlay bg-glass"></div>
              <img src={genre.image} alt={genre.name} className="genre-card-bg" />
              <div className="genre-card-content">
                <span className="genre-name">{genre.name}</span>
                <span className="genre-action">Explorar →</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* User Benefits Info (Lightweight & Ad-free statement) */}
      <section className="benefits-section glass-panel">
        <div className="benefit-item">
          <div className="benefit-icon-wrapper">
            <Music size={24} className="text-primary" />
          </div>
          <div className="benefit-text">
            <h3>Sin anuncios molestos</h3>
            <p>Disfruta de música continua sin interrupciones publicitarias de ningún tipo.</p>
          </div>
        </div>
        <div className="benefit-item">
          <div className="benefit-icon-wrapper">
            <Sparkles size={24} className="text-secondary" />
          </div>
          <div className="benefit-text">
            <h3>Ultraligera y veloz</h3>
            <p>Diseñada con tecnologías web nativas para consumir el mínimo de batería y datos.</p>
          </div>
        </div>
      </section>

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

        .status-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.85rem;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        /* Banner styles */
        .featured-banner-section {
          width: 100%;
        }

        .featured-banner {
          border: 1px solid var(--border-glass);
          border-radius: 20px;
          min-height: 280px;
          display: flex;
          align-items: flex-end;
          padding: 2.5rem;
          position: relative;
          overflow: hidden;
        }

        .banner-content {
          max-width: 480px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .banner-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: rgba(255,255,255,0.1);
          color: white;
          padding: 0.35rem 0.75rem;
          border-radius: 99px;
          font-size: 0.7rem;
          font-weight: 700;
          width: fit-content;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .banner-title {
          font-size: 2.25rem;
          font-weight: 800;
          line-height: 1.1;
          color: white;
        }

        .banner-subtitle {
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .banner-buttons {
          margin-top: 0.5rem;
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
          width: 48px;
          height: 48px;
          border-radius: 8px;
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

        /* Genre cards */
        .genre-card {
          position: relative;
          aspect-ratio: 16/9;
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
          border: 1px solid var(--border-glass);
          transition: var(--transition-smooth);
        }

        .genre-card:hover {
          transform: scale(1.03);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .genre-card-bg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          position: absolute;
          top: 0;
          left: 0;
          z-index: 1;
          filter: brightness(0.6) contrast(1.1);
          transition: var(--transition-smooth);
        }

        .genre-card:hover .genre-card-bg {
          transform: scale(1.08);
          filter: brightness(0.7) contrast(1.1);
        }

        .genre-card-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2;
          background: linear-gradient(135deg, rgba(8, 12, 28, 0.8) 0%, rgba(8, 12, 28, 0.3) 100%);
        }

        .genre-card-content {
          position: absolute;
          z-index: 3;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .genre-name {
          font-size: 1.15rem;
          font-weight: 800;
          color: white;
          text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }

        .genre-action {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 600;
          transition: var(--transition-fast);
        }

        .genre-card:hover .genre-action {
          color: var(--primary);
          transform: translateX(4px);
        }

        /* Benefits Info */
        .benefits-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          padding: 1.5rem;
          gap: 2rem;
          margin-top: 1rem;
        }

        .benefit-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .benefit-icon-wrapper {
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          border: 1px solid var(--border-glass);
        }

        .benefit-text h3 {
          font-size: 0.95rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .benefit-text p {
          font-size: 0.8rem;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .featured-banner {
            padding: 1.5rem;
            min-height: 220px;
          }
          .banner-title {
            font-size: 1.75rem;
          }
          .recent-grid {
            grid-template-columns: 1fr;
          }
          .benefits-section {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}

export default Home;
