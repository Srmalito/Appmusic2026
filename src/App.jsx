import { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import MusicPlayer from './components/MusicPlayer';
import Home from './pages/Home';
import Search from './pages/Search';
import Library from './pages/Library';
import { tracks, fetchFromInvidious } from './data';
import './App.css';

function App() {
  // Navigation & Page State
  const [activeTab, setActiveTab] = useState('home');
  const [selectedGenre, setSelectedGenre] = useState(null); // For viewing tracks of a genre
  const [selectedPlaylist, setSelectedPlaylist] = useState(null); // For viewing a playlist

  // Core Playback State
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [queue, setQueue] = useState(tracks);
  const [currentTrack, setCurrentTrack] = useState(tracks[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState('off'); // 'off' | 'all' | 'one'
  const [isResolving, setIsResolving] = useState(false);

  // User Library State
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('vibeflow_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
    const saved = localStorage.getItem('vibeflow_recent');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [playlists, setPlaylists] = useState(() => {
    const saved = localStorage.getItem('vibeflow_playlists');
    return saved ? JSON.parse(saved) : [];
  });

  const audioRef = useRef(null);
  const ytPlayer = useRef(null);
  const [isYtReady, setIsYtReady] = useState(false);

  // Sync Library with LocalStorage
  useEffect(() => {
    localStorage.setItem('vibeflow_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('vibeflow_recent', JSON.stringify(recentlyPlayed));
  }, [recentlyPlayed]);

  useEffect(() => {
    localStorage.setItem('vibeflow_playlists', JSON.stringify(playlists));
  }, [playlists]);

  // Load YouTube Iframe API
  useEffect(() => {
    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    
    const initYtPlayer = () => {
      if (ytPlayer.current) return;
      try {
        ytPlayer.current = new window.YT.Player('hidden-yt-player', {
          height: '1',
          width: '1',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            origin: window.location.origin
          },
          events: {
            onReady: () => {
              setIsYtReady(true);
              console.log('YouTube hidden player ready');
              if (ytPlayer.current && ytPlayer.current.setVolume) {
                ytPlayer.current.setVolume(volume * 100);
              }
            },
            onStateChange: (event) => {
              handleYtStateChange(event.data);
            },
            onError: (event) => {
              console.error('YouTube player error:', event.data);
              setIsPlaying(false);
              alert('La canción seleccionada no puede reproducirse en este momento (Restricción de YouTube).');
            }
          }
        });
      } catch (err) {
        console.error('Failed to initialize YT Player:', err);
      }
    };

    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      
      window.onYouTubeIframeAPIReady = () => {
        initYtPlayer();
      };
    } else {
      if (window.YT && window.YT.Player) {
        initYtPlayer();
      } else {
        const oldCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (oldCallback) oldCallback();
          initYtPlayer();
        };
      }
    }
  }, []);

  const onEndedRef = useRef(null);
  useEffect(() => {
    onEndedRef.current = () => {
      if (isRepeat === 'one') {
        handleSeek(0);
        setIsPlaying(true);
        if (currentTrack?.isGlobal) {
          if (ytPlayer.current && isYtReady) {
            ytPlayer.current.playVideo();
          }
        } else {
          if (audioRef.current) {
            audioRef.current.play().catch(err => console.log(err));
          }
        }
      } else {
        playNext();
      }
    };
  });

  const handleYtStateChange = (state) => {
    if (state === 0) { // ENDED
      if (onEndedRef.current) {
        onEndedRef.current();
      }
    }
  };

  // Sync track index
  useEffect(() => {
    if (queue.length > 0) {
      const track = queue[currentTrackIndex];
      if (!track) return;

      setCurrentTrack(track);
      setCurrentTime(0);

      if (track.isGlobal) {
        // Pause local player
        if (audioRef.current) {
          audioRef.current.pause();
        }

        if (ytPlayer.current && isYtReady) {
          const parts = (track.duration || "3:30").split(':').map(Number);
          const durSeconds = parts.length === 2 ? parts[0] * 60 + parts[1] : 210;
          setDuration(durSeconds);

          if (isPlaying) {
            ytPlayer.current.loadVideoById(track.videoId);
          } else {
            ytPlayer.current.cueVideoById(track.videoId);
          }
        }
      } else {
        // Local track: Pause YouTube player
        if (ytPlayer.current && isYtReady && ytPlayer.current.pauseVideo) {
          ytPlayer.current.pauseVideo();
        }
      }
    }
  }, [currentTrackIndex, queue, isYtReady]);

  // Handle Play/Pause side-effects
  useEffect(() => {
    if (!isYtReady) return;

    if (currentTrack?.isGlobal) {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      if (ytPlayer.current) {
        if (isPlaying) {
          const state = ytPlayer.current.getPlayerState ? ytPlayer.current.getPlayerState() : -1;
          if (state !== 1 && state !== 3) {
            ytPlayer.current.playVideo();
          }
        } else {
          ytPlayer.current.pauseVideo();
        }
      }
    } else {
      if (ytPlayer.current && ytPlayer.current.pauseVideo) {
        ytPlayer.current.pauseVideo();
      }

      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.play().catch((err) => {
            console.log('Playback blocked by browser autoplay policy.', err);
            setIsPlaying(false);
          });
        } else {
          audioRef.current.pause();
        }
      }
    }
  }, [isPlaying, currentTrack, isYtReady]);

  // Media Session API (Lockscreen and System Audio Integration)
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        artwork: [
          { src: currentTrack.cover, sizes: '96x96', type: 'image/jpeg' },
          { src: currentTrack.cover, sizes: '128x128', type: 'image/jpeg' },
          { src: currentTrack.cover, sizes: '192x192', type: 'image/jpeg' },
          { src: currentTrack.cover, sizes: '256x256', type: 'image/jpeg' },
          { src: currentTrack.cover, sizes: '384x384', type: 'image/jpeg' },
          { src: currentTrack.cover, sizes: '512x512', type: 'image/jpeg' },
        ],
      });
    }
  }, [currentTrack]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  const playPrevRef = useRef(null);
  const playNextRef = useRef(null);
  useEffect(() => {
    playPrevRef.current = playPrev;
    playNextRef.current = playNext;
  });

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrevRef.current());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNextRef.current());
    }
  }, []);

  // Poll progress for YouTube Player
  useEffect(() => {
    let timer;
    if (isPlaying && currentTrack?.isGlobal && ytPlayer.current && isYtReady) {
      timer = setInterval(() => {
        if (ytPlayer.current.getCurrentTime) {
          const curr = ytPlayer.current.getCurrentTime();
          setCurrentTime(curr);
        }
        if (ytPlayer.current.getDuration) {
          const dur = ytPlayer.current.getDuration();
          if (dur > 0) {
            setDuration(dur);
          }
        }
      }, 250);
    }
    return () => clearInterval(timer);
  }, [isPlaying, currentTrack, isYtReady]);

  // Audio Event Listeners
  const onTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  const onLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
  };

  const onAudioEnded = () => {
    if (onEndedRef.current) {
      onEndedRef.current();
    }
  };

  // Playback Control Functions
  const playTrack = (track, newQueue = null) => {
    if (newQueue) {
      setQueue(newQueue);
      const index = newQueue.findIndex((t) => t.id === track.id);
      setCurrentTrackIndex(index >= 0 ? index : 0);
    } else {
      const index = queue.findIndex((t) => t.id === track.id);
      if (index >= 0) {
        setCurrentTrackIndex(index);
      } else {
        const updatedQueue = [...queue, track];
        setQueue(updatedQueue);
        setCurrentTrackIndex(updatedQueue.length - 1);
      }
    }
    
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((id) => id !== track.id);
      return [track.id, ...filtered].slice(0, 20);
    });
    
    setIsPlaying(true);
  };

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const playNext = () => {
    if (queue.length === 0) return;
    
    let nextIndex = currentTrackIndex;
    
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = (currentTrackIndex + 1) % queue.length;
      if (nextIndex === 0 && isRepeat === 'off') {
        setIsPlaying(false);
        setCurrentTrackIndex(0);
        return;
      }
    }
    
    setCurrentTrackIndex(nextIndex);
    setIsPlaying(true);
  };

  const playPrev = () => {
    if (queue.length === 0) return;
    
    let prevIndex = currentTrackIndex;
    
    if (currentTime > 3) {
      handleSeek(0);
      return;
    }

    if (isShuffle) {
      prevIndex = Math.floor(Math.random() * queue.length);
    } else {
      prevIndex = currentTrackIndex - 1;
      if (prevIndex < 0) {
        prevIndex = queue.length - 1;
      }
    }
    
    setCurrentTrackIndex(prevIndex);
    setIsPlaying(true);
  };

  const handleSeek = (time) => {
    if (currentTrack?.isGlobal) {
      if (ytPlayer.current && isYtReady && ytPlayer.current.seekTo) {
        ytPlayer.current.seekTo(time, true);
        setCurrentTime(time);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
      }
    }
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (ytPlayer.current && isYtReady && ytPlayer.current.setVolume) {
      ytPlayer.current.setVolume(newVolume * 100);
    }
  };

  const toggleMute = () => {
    const nextMutedStatus = !isMuted;
    setIsMuted(nextMutedStatus);
    const targetVol = nextMutedStatus ? 0 : volume;
    if (audioRef.current) {
      audioRef.current.volume = targetVol;
    }
    if (ytPlayer.current && isYtReady && ytPlayer.current.setVolume) {
      ytPlayer.current.setVolume(targetVol * 100);
    }
  };

  const toggleShuffle = () => {
    setIsShuffle((prev) => !prev);
  };

  const toggleRepeat = () => {
    setIsRepeat((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  // User Actions
  const toggleFavorite = (trackId) => {
    setFavorites((prev) => {
      if (prev.includes(trackId)) {
        return prev.filter((id) => id !== trackId);
      } else {
        return [...prev, trackId];
      }
    });
  };

  const createPlaylist = (name) => {
    if (!name.trim()) return;
    if (playlists.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      alert('Ya existe una lista de reproducción con ese nombre.');
      return;
    }
    setPlaylists((prev) => [...prev, { name, tracks: [] }]);
  };

  const deletePlaylist = (name) => {
    setPlaylists((prev) => prev.filter((p) => p.name !== name));
    if (selectedPlaylist && selectedPlaylist.name === name) {
      setSelectedPlaylist(null);
      setActiveTab('library');
    }
  };

  const addTrackToPlaylist = (playlistName, trackId) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.name === playlistName) {
          if (p.tracks.includes(trackId)) return p;
          return { ...p, tracks: [...p.tracks, trackId] };
        }
        return p;
      })
    );
  };

  const removeTrackFromPlaylist = (playlistName, trackId) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.name === playlistName) {
          return { ...p, tracks: p.tracks.filter((id) => id !== trackId) };
        }
        return p;
      })
    );
    
    // Update active view if viewing that playlist
    if (selectedPlaylist && selectedPlaylist.name === playlistName) {
      setSelectedPlaylist((prev) => ({
        ...prev,
        tracks: prev.tracks.filter((id) => id !== trackId)
      }));
    }
  };

  // Simple Router helper
  const navigateToGenre = (genreName) => {
    setSelectedGenre(genreName);
    setSelectedPlaylist(null);
    setActiveTab('genre');
  };

  const navigateToPlaylist = (playlist) => {
    setSelectedPlaylist(playlist);
    setSelectedGenre(null);
    setActiveTab('playlist_view');
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'home':
        return (
          <Home 
            playTrack={playTrack} 
            recentlyPlayed={recentlyPlayed} 
            navigateToGenre={navigateToGenre}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
          />
        );
      case 'search':
        return (
          <Search 
            playTrack={playTrack} 
            navigateToGenre={navigateToGenre}
            toggleFavorite={toggleFavorite}
            favorites={favorites}
            playlists={playlists}
            addTrackToPlaylist={addTrackToPlaylist}
          />
        );
      case 'library':
        return (
          <Library 
            playTrack={playTrack}
            favorites={favorites}
            recentlyPlayed={recentlyPlayed}
            playlists={playlists}
            createPlaylist={createPlaylist}
            deletePlaylist={deletePlaylist}
            navigateToPlaylist={navigateToPlaylist}
            removeTrackFromPlaylist={removeTrackFromPlaylist}
          />
        );
      case 'genre':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setActiveTab('search')}
                className="icon-button glass-panel"
                style={{ borderRadius: '50%', padding: '0.6rem' }}
              >
                ←
              </button>
              <h1>Género: {selectedGenre}</h1>
            </div>
            
            <Library 
              genreFilter={selectedGenre} 
              playTrack={playTrack}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              playlists={playlists}
              addTrackToPlaylist={addTrackToPlaylist}
            />
          </div>
        );
      case 'playlist_view':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setActiveTab('library')}
                  className="icon-button glass-panel"
                  style={{ borderRadius: '50%', padding: '0.6rem' }}
                >
                  ←
                </button>
                <div>
                  <span className="text-xs text-primary font-semibold tracking-wider uppercase">Lista de reproducción</span>
                  <h1>{selectedPlaylist?.name}</h1>
                </div>
              </div>
              <button 
                onClick={() => deletePlaylist(selectedPlaylist?.name)}
                className="px-4 py-2 bg-red-600/20 text-red-500 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-colors text-sm font-semibold"
              >
                Eliminar lista
              </button>
            </div>
            
            <Library 
              playlistFilter={selectedPlaylist?.name} 
              playTrack={playTrack}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              playlists={playlists}
              addTrackToPlaylist={addTrackToPlaylist}
              removeTrackFromPlaylist={removeTrackFromPlaylist}
            />
          </div>
        );
      default:
        return <Home playTrack={playTrack} recentlyPlayed={recentlyPlayed} navigateToGenre={navigateToGenre} />;
    }
  };

  return (
    <div className="app-container">
      {/* Navigation sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Main scrolling content area */}
      <main className="main-content">
        {renderActiveTab()}
      </main>

      {/* Persistent Audio element */}
      <audio
        ref={audioRef}
        src={currentTrack?.isGlobal ? '' : currentTrack?.src}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onAudioEnded}
        preload="auto"
      />

      {/* Hidden YouTube Player container */}
      <div id="hidden-yt-player" className="hidden-player-frame"></div>

      {/* Global music control player bar */}
      <MusicPlayer 
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        togglePlay={togglePlay}
        playNext={playNext}
        playPrev={playPrev}
        currentTime={currentTime}
        duration={duration}
        handleSeek={handleSeek}
        volume={volume}
        handleVolumeChange={handleVolumeChange}
        isMuted={isMuted}
        toggleMute={toggleMute}
        isShuffle={isShuffle}
        toggleShuffle={toggleShuffle}
        isRepeat={isRepeat}
        toggleRepeat={toggleRepeat}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        playlists={playlists}
        addTrackToPlaylist={addTrackToPlaylist}
        isResolving={false}
      />
    </div>
  );
}

export default App;
