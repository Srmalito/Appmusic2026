import { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, X, Music, Loader2 } from 'lucide-react';
import { fetchFromInvidious } from '../data';
import TrackList from '../components/TrackList';

function Search({ 
  playTrack, navigateToGenre, toggleFavorite, favorites, playlists, addTrackToPlaylist, addToQueue, warmTrackCache
}) {
  const [query, setQuery] = useState('');
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

  // Fetch search suggestions (global)
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

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
  }, [query]);

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

  // Search submit handler
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setShowSuggestions(false);
    executeGlobalSearch(query);
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    executeGlobalSearch(suggestion);
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
      
      {/* Top sticky search input header */}
      <header className="search-header-bar" ref={searchBarRef}>
        <form onSubmit={handleSearchSubmit} className="search-input-wrapper glass-panel">
          <button type="submit" className="icon-button" style={{ padding: 0, color: 'inherit' }}>
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
            placeholder="Busca cualquier artista, banda o canción del mundo..."
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
        ) : (
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
                warmTrackCache={warmTrackCache}
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
        )}
      </div>

      <style>{`
        .search-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
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
