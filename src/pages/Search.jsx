import { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, X, Music, Loader2 } from 'lucide-react';
import { tracks, genres, fetchFromInvidious } from '../data';
import TrackList from '../components/TrackList';

function Search({ 
  playTrack, navigateToGenre, toggleFavorite, favorites, playlists, addTrackToPlaylist, addToQueue 
}) {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState('local'); // 'local' | 'global'
  const [globalResults, setGlobalResults] = useState([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const searchBarRef = useRef(null);

  const handleClear = () => {
    setQuery('');
    setGlobalResults([]);
    setSuggestions([]);
  };

  const handleModeChange = (mode) => {
    setSearchMode(mode);
    setQuery('');
    setGlobalResults([]);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search suggestions (local or global)
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    if (searchMode === 'local') {
      const q = query.toLowerCase();
      const localMatches = tracks
        .filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q))
        .map(t => `${t.title} - ${t.artist}`)
        .slice(0, 6);
      setSuggestions(localMatches);
    } else {
      // Global suggestions using JSONP
      const delayDebounceFn = setTimeout(() => {
        const scriptId = 'yt-suggest-script';
        const oldScript = document.getElementById(scriptId);
        if (oldScript) oldScript.remove();

        window.ytSuggestCallback = (data) => {
          if (data && Array.isArray(data[1])) {
            const formatted = data[1].map(item => item[0]);
            setSuggestions(formatted.slice(0, 6));
          }
        };

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}&jsonp=ytSuggestCallback`;
        document.body.appendChild(script);
      }, 250); // 250ms debounce for suggestions

      return () => clearTimeout(delayDebounceFn);
    }
  }, [query, searchMode]);

  // Local filtering helper
  const filteredTracks = tracks.filter((track) => {
    const q = query.toLowerCase();
    return (
      track.title.toLowerCase().includes(q) ||
      track.artist.toLowerCase().includes(q) ||
      track.album.toLowerCase().includes(q) ||
      track.category.toLowerCase().includes(q)
    );
  });

  // Execute global search
  const executeGlobalSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    setIsLoadingGlobal(true);
    try {
      const items = await fetchFromInvidious(`/api/v1/search?q=${encodeURIComponent(searchQuery)}&type=video`);
      const mapped = (items || [])
        .filter(item => item.type === 'video')
        .map(item => {
          const coverImg = item.videoThumbnails && item.videoThumbnails.length > 0
            ? (item.videoThumbnails.find(t => t.quality === 'medium' || t.quality === 'high' || t.quality === 'default')?.url || item.videoThumbnails[0].url)
            : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300';
          
          return {
            id: `global-${item.videoId}`,
            title: item.title,
            artist: item.author,
            album: 'YouTube Music Stream',
            duration: formatDuration(item.lengthSeconds),
            src: '',
            cover: coverImg,
            category: 'Global',
            isGlobal: true,
            videoId: item.videoId
          };
        });
      setGlobalResults(mapped);
    } catch (err) {
      console.error('Global search error:', err);
      alert('Los servidores globales están saturados. Reintentando conexión...');
    } finally {
      setIsLoadingGlobal(false);
    }
  };

  // Global search submit handler
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setShowSuggestions(false);
    if (searchMode === 'global') {
      executeGlobalSearch(query);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    let cleanQuery = suggestion;
    if (searchMode === 'local' && suggestion.includes(' - ')) {
      // For local, search using only the song title part
      cleanQuery = suggestion.split(' - ')[0];
    }
    
    setQuery(cleanQuery);
    setShowSuggestions(false);
    if (searchMode === 'global') {
      executeGlobalSearch(cleanQuery);
    }
  };

  const formatDuration = (sec) => {
    if (!sec) return '3:30';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Render loading skeletal rows
  const renderLoadingSkeleton = () => (
    <div className="skeleton-container">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="skeleton-row">
          <div className="skeleton-box skeleton-num"></div>
          <div className="skeleton-box skeleton-cover"></div>
          <div className="skeleton-details">
            <div className="skeleton-box skeleton-line title"></div>
            <div className="skeleton-box skeleton-line artist"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="search-container">
      
      {/* Toggle switch between local and global search */}
      <div className="search-mode-toggle">
        <button 
          className={`mode-toggle-btn ${searchMode === 'local' ? 'active' : ''}`}
          onClick={() => handleModeChange('local')}
        >
          Colección Local
        </button>
        <button 
          className={`mode-toggle-btn ${searchMode === 'global' ? 'active' : ''}`}
          onClick={() => handleModeChange('global')}
        >
          Buscador Global (Artistas Mundiales)
        </button>
      </div>

      {/* Top sticky search input header */}
      <header className="search-header-bar" ref={searchBarRef}>
        <form onSubmit={handleSearchSubmit} className="search-input-wrapper glass-panel">
          <button type="submit" className="icon-button" style={{ padding: 0, color: 'inherit' }} disabled={searchMode === 'local'}>
            <SearchIcon size={20} className="search-icon-field" />
          </button>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder={
              searchMode === 'local' 
                ? "Buscar en colección local (Estudiar, Lofi...)" 
                : "Busca cualquier artista, banda o canción del mundo..."
            }
            className="search-field-input"
            autoFocus
          />
          {query && (
            <button type="button" className="clear-search-btn" onClick={handleClear}>
              <X size={16} />
            </button>
          )}
        </form>

        {/* Autocomplete suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="suggestions-dropdown glass-panel">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                className="suggestion-item"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <SearchIcon size={14} className="suggestion-icon" />
                <span className="suggestion-text">{suggestion}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Dynamic Results Area */}
      <div className="search-body">
        {isLoadingGlobal ? (
          renderLoadingSkeleton()
        ) : searchMode === 'global' ? (
          // GLOBAL SEARCH MODE RESULTS
          query && globalResults.length > 0 ? (
            <section className="search-results-section">
              <h2 className="search-results-title">Canciones del mundo para "{query}"</h2>
              <TrackList 
                tracks={globalResults} 
                playTrack={playTrack} 
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                playlists={playlists}
                addTrackToPlaylist={addTrackToPlaylist}
                addToQueue={addToQueue}
              />
            </section>
          ) : query ? (
            <div className="no-results-state">
              <Music size={48} className="text-muted bounce-slow" />
              <h3>Presiona Enter para buscar</h3>
              <p>Buscaremos en la red global de música para traerte los mejores resultados de este artista.</p>
            </div>
          ) : (
            <div className="no-results-state">
              <SearchIcon size={48} className="text-muted bounce-slow" />
              <h3>Busca cualquier canción</h3>
              <p>Escribe el nombre de un artista o pista mundial y presiona enter para buscar.</p>
            </div>
          )
        ) : (
          // LOCAL SEARCH MODE RESULTS
          query ? (
            <section className="search-results-section">
              <h2 className="search-results-title">Resultados de búsqueda locales</h2>
              {filteredTracks.length > 0 ? (
                <TrackList 
                  tracks={filteredTracks} 
                  playTrack={playTrack} 
                  favorites={favorites}
                  toggleFavorite={toggleFavorite}
                  playlists={playlists}
                  addTrackToPlaylist={addTrackToPlaylist}
                  addToQueue={addToQueue}
                />
              ) : (
                <div className="no-results-state">
                  <Music size={48} className="text-muted bounce-slow" />
                  <h3>No encontramos "{query}" localmente</h3>
                  <p>¿Por qué no intentas buscar usando la pestaña de "Buscador Global"?</p>
                </div>
              )}
            </section>
          ) : (
            <section className="explore-all-section">
              <h2 className="explore-section-title">Explorar todo</h2>
              <div className="explore-genres-grid">
                {genres.map((genre) => (
                  <div
                    key={genre.id}
                    className={`genre-explore-card bg-gradient-to-r ${genre.color}`}
                    onClick={() => navigateToGenre(genre.name)}
                  >
                    <span className="genre-explore-title">{genre.name}</span>
                    <div className="genre-explore-image-wrapper">
                      <img 
                        src={genre.image} 
                        alt={genre.name} 
                        className="genre-explore-thumbnail" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        )}
      </div>

      <style>{`
        .search-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .search-mode-toggle {
          display: flex;
          gap: 0.5rem;
          padding: 0 0.25rem;
        }

        .mode-toggle-btn {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-glass);
          color: var(--text-secondary);
          padding: 0.5rem 1.25rem;
          border-radius: 99px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .mode-toggle-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }

        .mode-toggle-btn.active {
          background: var(--primary);
          color: white;
          border-color: transparent;
          box-shadow: 0 4px 12px var(--primary-glow);
        }

        .search-header-bar {
          position: sticky;
          top: 0;
          z-index: 10;
          background: transparent;
        }

        .search-input-wrapper {
          display: flex;
          align-items: center;
          padding: 0.6rem 1rem;
          gap: 0.75rem;
          border-radius: 99px;
          background: rgba(18, 24, 43, 0.85);
          border: 1px solid var(--border-glass);
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }

        .search-icon-field {
          color: var(--text-secondary);
        }

        .search-field-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: white;
          font-size: 1rem;
          font-weight: 500;
          font-family: var(--font-sans);
        }

        .search-field-input::placeholder {
          color: var(--text-muted);
        }

        .clear-search-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }

        .clear-search-btn:hover {
          color: white;
          background: rgba(255,255,255,0.05);
        }

        /* Search Results Styles */
        .search-results-title, .explore-section-title {
          font-size: 1.25rem;
          font-weight: 800;
          margin-bottom: 1.25rem;
        }

        .no-results-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 4.5rem 1rem;
          text-align: center;
          color: var(--text-secondary);
        }

        .no-results-state h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: white;
        }

        .no-results-state p {
          font-size: 0.85rem;
          max-width: 320px;
        }

        .bounce-slow {
          animation: slow-bounce 2s infinite alternate;
        }

        @keyframes slow-bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-8px); }
        }

        /* Explore Genres Grid Styles */
        .explore-genres-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1.25rem;
        }

        .genre-explore-card {
          height: 120px;
          border-radius: 12px;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 15px rgba(0,0,0,0.15);
          transition: var(--transition-smooth);
        }

        .genre-explore-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
        }

        .genre-explore-title {
          font-size: 1.2rem;
          font-weight: 800;
          color: white;
          word-break: break-word;
          line-height: 1.2;
          z-index: 5;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .genre-explore-image-wrapper {
          position: absolute;
          bottom: -15px;
          right: -15px;
          width: 80px;
          height: 80px;
          transform: rotate(25deg);
          border-radius: 8px;
          overflow: hidden;
          box-shadow: -2px 4px 10px rgba(0,0,0,0.3);
          z-index: 2;
        }

        .genre-explore-thumbnail {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* Gradients mapping */
        .bg-gradient-to-r.from-purple-600.to-indigo-600 {
          background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
        }
        .bg-gradient-to-r.from-blue-600.to-cyan-600 {
          background: linear-gradient(135deg, #2563eb 0%, #0891b2 100%);
        }
        .bg-gradient-to-r.from-pink-600.to-rose-600 {
          background: linear-gradient(135deg, #db2777 0%, #e11d48 100%);
        }
        .bg-gradient-to-r.from-amber-600.to-orange-600 {
          background: linear-gradient(135deg, #d97706 0%, #ea580c 100%);
        }
        .bg-gradient-to-r.from-emerald-600.to-teal-600 {
          background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
        }

        /* Skeleton loading animation */
        .skeleton-row {
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          gap: 1rem;
          border-bottom: 1px solid var(--border-glass);
          animation: skeleton-glow 1.5s infinite alternate ease-in-out;
        }

        .skeleton-box {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }

        .skeleton-num {
          width: 24px;
          height: 16px;
        }

        .skeleton-cover {
          width: 40px;
          height: 40px;
          border-radius: 6px;
        }

        .skeleton-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .skeleton-line {
          height: 12px;
        }

        .skeleton-line.title {
          width: 40%;
        }

        .skeleton-line.artist {
          width: 20%;
        }

        @keyframes skeleton-glow {
          from { opacity: 0.4; }
          to { opacity: 0.8; }
        }

        @media (max-width: 480px) {
          .explore-genres-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.8rem;
          }
          .genre-explore-card {
            height: 100px;
            padding: 0.75rem;
          }
          .genre-explore-title {
            font-size: 1rem;
          }
          .genre-explore-image-wrapper {
            width: 60px;
            height: 60px;
            bottom: -10px;
            right: -10px;
          }
          .search-mode-toggle {
            flex-direction: column;
            gap: 0.35rem;
          }
          .mode-toggle-btn {
            width: 100%;
            text-align: center;
          }
        }

        /* Suggestions dropdown styles */
        .suggestions-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 0.5rem;
          background: rgba(18, 24, 43, 0.95);
          backdrop-filter: blur(12px);
          border: 1px solid var(--border-glass);
          border-radius: 14px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
          overflow: hidden;
          z-index: 100;
          display: flex;
          flex-direction: column;
          padding: 0.25rem 0;
        }

        .suggestion-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.25rem;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 500;
          font-family: var(--font-sans);
          cursor: pointer;
          transition: var(--transition-fast);
          text-align: left;
          width: 100%;
        }

        .suggestion-item:hover {
          background: rgba(255, 255, 255, 0.06);
          color: white;
        }

        .suggestion-icon {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .suggestion-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </div>
  );
}

export default Search;
