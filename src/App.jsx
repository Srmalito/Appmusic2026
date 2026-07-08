import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import MusicPlayer from './components/MusicPlayer';
import Home from './pages/Home';
import Search from './pages/Search';
import Library from './pages/Library';
import { tracks, fetchFromInvidious, fetchFromPiped } from './data';
import './App.css';

// Module-level constant: computed once, avoids repeated string builds on every function call
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ||
  `${window.location.protocol}//${window.location.hostname}:3001`;

function App() {
  // Navigation & Page State
  const [activeTab, setActiveTab] = useState('search');
  const [selectedGenre, setSelectedGenre] = useState(null); // For viewing tracks of a genre
  const [selectedPlaylist, setSelectedPlaylist] = useState(null); // For viewing a playlist

  // Core Playback State
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [queue, setQueue] = useState(tracks);
  const [currentTrack, setCurrentTrack] = useState(tracks[0] || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState('off'); // 'off' | 'all' | 'one'
  const [useYtFallback, setUseYtFallback] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);


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

  const [localTracks, setLocalTracks] = useState([]);

  useEffect(() => {
    const fetchLocalTracks = () => {
      fetch(`${BACKEND_URL}/api/tracks`)
        .then((res) => res.json())
        .then((data) => {
          setLocalTracks(data);
          // If queue is empty, initialize it with local tracks on load
          setQueue((prevQueue) => {
            if (prevQueue.length === 0 || prevQueue === tracks) {
              return data;
            }
            return prevQueue;
          });
          setCurrentTrack((prevTrack) => {
            if (!prevTrack && data.length > 0) {
              return data[0];
            }
            return prevTrack;
          });
        })
        .catch((err) => console.error('Failed to fetch local tracks:', err));
    };

    fetchLocalTracks();

    // Poll backend every 10 seconds for new files
    const interval = setInterval(fetchLocalTracks, 10000);
    return () => clearInterval(interval);
  }, []);

  const audioRef = useRef(null);
  const ytPlayer = useRef(null);
  const [isYtReady, setIsYtReady] = useState(false);
  const ytPlayerLoadedVideoId = useRef(null);

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

  const handleYtStateChange = (state) => {
    if (state === 0) {
      if (onEndedRef.current) {
        onEndedRef.current();
      }
    } else if (state === 1) {
      setIsPlaying(true);
      setIsBuffering(false);
    } else if (state === 2) {
      setIsPlaying(false);
    } else if (state === 3) {
      setIsBuffering(true);
    }
  };

  const handleYtStateChangeRef = useRef(null);
  useEffect(() => {
    handleYtStateChangeRef.current = handleYtStateChange;
  });

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
              if (handleYtStateChangeRef.current) {
                handleYtStateChangeRef.current(event.data);
              }
            },
            onError: (event) => {
              console.error('YouTube player error:', event.data);
              setIsPlaying(false);
              setToastMessage('⚠️ La canción seleccionada tiene restricciones de reproducción. Pasando a la siguiente...');
              setTimeout(() => {
                setToastMessage(null);
                playNext();
              }, 3000);
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

  const resolvedUrls = useRef(new Map());

  const getTrackSrc = (track) => {
    if (!track) return '';
    if (track.isGlobal) {
      return resolvedUrls.current.get(track.videoId) || '';
    }
    return track.src;
  };

  // Pre-resolve global track URL through the local Node backend resolver
  const warmTrackCache = useCallback(async (track) => {
    // No-op: playing directly via YouTube iframe player, no cache warming needed.
    return;
  }, []);

  // Warm up the cache for the next track in the background
  const preloadNextTrackAfterIndex = useCallback((currentIndex) => {
    if (queue.length <= 1) return;

    let nextIndex = (currentIndex + 1) % queue.length;
    if (isShuffle) {
      if (queue.length > 1) {
        let randIndex = Math.floor(Math.random() * queue.length);
        while (randIndex === currentIndex) {
          randIndex = Math.floor(Math.random() * queue.length);
        }
        nextIndex = randIndex;
      }
    }

    const nextTrack = queue[nextIndex];
    warmTrackCache(nextTrack);
  }, [queue, isShuffle, warmTrackCache]);

  useEffect(() => {
    preloadNextTrackAfterIndex(currentTrackIndex);
  }, [currentTrackIndex, queue, isShuffle]);

  const onEndedRef = useRef(null);
  useEffect(() => {
    onEndedRef.current = () => {
      if (isRepeat === 'one') {
        handleSeek(0);
        setIsPlaying(true);
        if (currentTrack?.isGlobal && useYtFallback) {
          if (ytPlayer.current && isYtReady) {
            ytPlayer.current.playVideo();
          }
        } else {
          if (audioRef.current) {
            audioRef.current.play().catch(err => console.log(err));
          }
        }
        return;
      }

      if (queue.length > 0) {
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

        transitionToTrack(nextIndex);
      }
    };
  });

  // Sync track index and play status
  useEffect(() => {
    if (queue.length > 0) {
      const track = queue[currentTrackIndex];
      if (!track) return;

      const playCurrentTrack = async () => {
        setCurrentTrack(track);
        setCurrentTime(0);

        if (track.isGlobal) {
          setIsBuffering(true);
          let resolvedSrc = resolvedUrls.current.get(track.videoId);

          if (!resolvedSrc) {
            try {
              const apiEndpoint = import.meta.env.DEV 
                ? `${BACKEND_URL}/api/resolve/${track.videoId}` 
                : `/api/resolve/${track.videoId}`;
              
              console.log(`[Resolve] Querying stream URL via: ${apiEndpoint}`);
              const res = await fetch(apiEndpoint);
              if (!res.ok) throw new Error('API failed to resolve stream URL');
              const data = await res.json();
              if (data.url) {
                resolvedSrc = data.url;
                resolvedUrls.current.set(track.videoId, resolvedSrc);
              }
            } catch (err) {
              console.warn('[Resolve] Failed to get direct stream URL, falling back to YouTube iframe player:', err.message);
            }
          }

          if (resolvedSrc) {
            // LAYER 1: Native HTML5 Audio (supports background playback on mobile)
            setUseYtFallback(false);
            setShowVideo(false);
            
            if (ytPlayer.current && isYtReady && ytPlayer.current.pauseVideo) {
              ytPlayer.current.pauseVideo();
            }

            if (audioRef.current) {
              if (audioRef.current.src !== resolvedSrc) {
                audioRef.current.src = resolvedSrc;
              }
              if (isPlaying) {
                audioRef.current.play().catch((err) => {
                  console.log('Playback blocked by browser autoplay policy.', err);
                  setIsPlaying(false);
                });
              }
            }
            setIsBuffering(false);
          } else {
            // LAYER 2: YouTube Iframe Player Fallback
            setUseYtFallback(true);
            setShowVideo(true);

            if (audioRef.current) {
              audioRef.current.removeAttribute('src');
              audioRef.current.load();
            }

            if (ytPlayer.current && isYtReady) {
              if (ytPlayerLoadedVideoId.current !== track.videoId) {
                if (isPlaying) {
                  ytPlayer.current.loadVideoById(track.videoId);
                } else {
                  ytPlayer.current.cueVideoById(track.videoId);
                }
                ytPlayerLoadedVideoId.current = track.videoId;
              }
            }
            setIsBuffering(isPlaying);
          }
        } else {
          // Local track playback
          setUseYtFallback(false);
          setShowVideo(false);

          if (ytPlayer.current && isYtReady && ytPlayer.current.pauseVideo) {
            ytPlayer.current.pauseVideo();
          }

          if (audioRef.current) {
            const currentSrc = audioRef.current.src || "";
            if (currentSrc !== track.src) {
              audioRef.current.src = track.src;
            }
            if (isPlaying) {
              audioRef.current.play().catch((err) => {
                console.log('Playback blocked by browser autoplay policy.', err);
                setIsPlaying(false);
              });
            }
          }
          setIsBuffering(false);
        }
      };

      playCurrentTrack();
    }
  }, [currentTrackIndex, queue, isYtReady, isPlaying]);

  // Handle Play/Pause side-effects
  useEffect(() => {
    if (currentTrack?.isGlobal && useYtFallback) {
      // YouTube Mode
      if (audioRef.current) {
        audioRef.current.pause();
      }

      if (ytPlayer.current && isYtReady) {
        if (isPlaying) {
          if (ytPlayerLoadedVideoId.current === currentTrack.videoId) {
            const state = ytPlayer.current.getPlayerState ? ytPlayer.current.getPlayerState() : -1;
            if (state !== 1 && state !== 3) {
              ytPlayer.current.playVideo();
            }
          }
        } else {
          ytPlayer.current.pauseVideo();
        }
      }
    } else {
      // Standard HTML5 Audio Mode (local or resolved global)
      if (ytPlayer.current && isYtReady && ytPlayer.current.pauseVideo) {
        ytPlayer.current.pauseVideo();
      }

      if (audioRef.current) {
        if (isPlaying) {
          if (audioRef.current.paused) {
            audioRef.current.play().catch((err) => {
              console.log('Playback blocked by browser autoplay policy.', err);
              setIsPlaying(false);
            });
          }
        } else {
          if (!audioRef.current.paused) {
            audioRef.current.pause();
          }
        }
      }
    }
  }, [isPlaying, currentTrack, useYtFallback, isYtReady]);

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

  // Update Media Session position state
  useEffect(() => {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: 1.0,
          position: Math.min(currentTime, duration)
        });
      } catch (err) {
        console.warn('Failed to set media session position state:', err);
      }
    }
  }, [currentTime, duration]);

  const playPrevRef = useRef(null);
  const playNextRef = useRef(null);
  useEffect(() => {
    playPrevRef.current = playPrev;
    playNextRef.current = playNext;
  });

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const newVol = Math.min(volume + 0.05, 1);
        handleVolumeChange(newVol);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const newVol = Math.max(volume - 0.05, 0);
        handleVolumeChange(newVol);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSeek(Math.min(currentTime + 5, duration));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(Math.max(currentTime - 5, 0));
      } else if (e.key.toLowerCase() === 'l' || e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (currentTrack) {
          toggleFavorite(currentTrack.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, currentTrack, isPlaying, volume, isYtReady]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrevRef.current());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNextRef.current());
      
      try {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.fastSeek && audioRef.current?.fastSeek) {
            audioRef.current.fastSeek(details.seekTime);
          } else {
            handleSeek(details.seekTime);
          }
        });
      } catch (err) {
        console.warn('Media Session seekto handler not supported:', err);
      }
    }
  }, []);

  // Poll progress for YouTube Player
  useEffect(() => {
    let timer;
    if (isPlaying && currentTrack?.isGlobal && useYtFallback && ytPlayer.current && isYtReady) {
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
  }, [isPlaying, currentTrack, useYtFallback, isYtReady]);

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

  const onAudioError = (e) => {
    if (currentTrack?.isGlobal) {
      // If the current track is global, we are playing it via YouTube iframe player,
      // so ignore any errors from the local HTML5 audio element.
      return;
    }
    if (!audioRef.current || !audioRef.current.src) return;
    console.warn('Audio element error, falling back to YouTube iframe player:', e);
    
    setUseYtFallback(true);
    setShowVideo(true);

    if (ytPlayer.current && isYtReady) {
      const parts = (currentTrack?.duration || "3:30").split(':').map(Number);
      const durSeconds = parts.length === 2 ? parts[0] * 60 + parts[1] : 210;
      setDuration(durSeconds);

      if (isPlaying) {
        ytPlayer.current.loadVideoById(currentTrack.videoId);
      } else {
        ytPlayer.current.cueVideoById(currentTrack.videoId);
      }
      ytPlayerLoadedVideoId.current = currentTrack.videoId;
    }
  };

  // Playback Control Functions
  const playTrack = (track, newQueue = null) => {
    let index = currentTrackIndex;
    let targetQueue = queue;
    if (newQueue) {
      targetQueue = newQueue;
      setQueue(newQueue);
      index = newQueue.findIndex((t) => t.id === track.id);
      index = index >= 0 ? index : 0;
    } else {
      index = queue.findIndex((t) => t.id === track.id);
      if (index < 0) {
        targetQueue = [...queue, track];
        setQueue(targetQueue);
        index = targetQueue.length - 1;
      }
    }
    
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((id) => id !== track.id);
      saveTrackDetails(track);
      return [track.id, ...filtered].slice(0, 20);
    });
    
    setCurrentTrackIndex(index);
    setIsPlaying(true);

    // Synchronously execute dummy play call to unlock the audio element gesture for mobile
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  const togglePlay = () => {
    setIsPlaying((prev) => {
      const nextPlayState = !prev;
      
      if (currentTrack?.isGlobal && useYtFallback) {
        if (ytPlayer.current && isYtReady) {
          if (nextPlayState) {
            ytPlayer.current.playVideo();
          } else {
            ytPlayer.current.pauseVideo();
          }
        }
      } else {
        if (audioRef.current) {
          if (nextPlayState) {
            audioRef.current.play().catch((err) => {
              console.log('Mobile toggle play gesture block:', err);
            });
          } else {
            audioRef.current.pause();
          }
        }
      }

      return nextPlayState;
    });
  };

  const transitionToTrack = (nextIndex) => {
    if (queue.length === 0) return;
    const nextTrack = queue[nextIndex];
    if (!nextTrack) return;

    setCurrentTrackIndex(nextIndex);
    setIsPlaying(true);
    setCurrentTime(0);

    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((id) => id !== nextTrack.id);
      saveTrackDetails(nextTrack);
      return [nextTrack.id, ...filtered].slice(0, 20);
    });

    // Synchronously execute dummy play call to unlock the audio element gesture for mobile
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
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
    
    transitionToTrack(nextIndex);
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
    
    transitionToTrack(prevIndex);
  };

  const handleSeek = (time) => {
    if (currentTrack?.isGlobal && useYtFallback) {
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

  const saveTrackDetails = (track) => {
    if (!track) return;
    try {
      const savedDetails = localStorage.getItem('vibeflow_track_details');
      const detailsMap = savedDetails ? JSON.parse(savedDetails) : {};
      detailsMap[track.id] = track;
      localStorage.setItem('vibeflow_track_details', JSON.stringify(detailsMap));
    } catch (err) {
      console.warn('Failed to save track details to localStorage:', err);
    }
  };

  const getTrackById = useCallback((id) => {
    // 1. Check in localTracks
    let track = localTracks.find(t => t.id === id);
    if (track) return track;
    
    // 2. Check in queue
    track = queue.find(t => t.id === id);
    if (track) return track;

    // 3. Check in localStorage
    try {
      const savedDetails = localStorage.getItem('vibeflow_track_details');
      if (savedDetails) {
        const detailsMap = JSON.parse(savedDetails);
        if (detailsMap[id]) return detailsMap[id];
      }
    } catch (e) {}

    return null;
  }, [localTracks, queue]);

  // User Actions
  const toggleFavorite = (trackId) => {
    setFavorites((prev) => {
      const track = queue.find(t => t.id === trackId) || localTracks.find(t => t.id === trackId) || getTrackById(trackId);
      const title = track ? track.title : 'Canción';
      if (prev.includes(trackId)) {
        setToastMessage(`Quitado de favoritos: ${title}`);
        setTimeout(() => setToastMessage(null), 3000);
        return prev.filter((id) => id !== trackId);
      } else {
        setToastMessage(`Añadido a favoritos: ${title}`);
        setTimeout(() => setToastMessage(null), 3000);
        if (track) {
          saveTrackDetails(track);
        }
        return [...prev, trackId];
      }
    });
  };

  const addToQueue = (track) => {
    if (queue.some((t) => t.id === track.id)) {
      setToastMessage(`"${track.title}" ya está en la cola`);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    setQueue((prev) => [...prev, track]);
    setToastMessage(`Añadido a la cola: ${track.title}`);
    setTimeout(() => setToastMessage(null), 3000);
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
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            addToQueue={addToQueue}
            warmTrackCache={warmTrackCache}
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
            addToQueue={addToQueue}
            warmTrackCache={warmTrackCache}
            localTracks={localTracks}
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
            toggleFavorite={toggleFavorite}
            addTrackToPlaylist={addTrackToPlaylist}
            addToQueue={addToQueue}
            getTrackById={getTrackById}
            localTracks={localTracks}
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
              addToQueue={addToQueue}
              getTrackById={getTrackById}
              localTracks={localTracks}
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
              addToQueue={addToQueue}
              getTrackById={getTrackById}
              localTracks={localTracks}
            />
          </div>
        );
      default:
        return <Home playTrack={playTrack} recentlyPlayed={recentlyPlayed} navigateToGenre={navigateToGenre} />;
    }
  };

  return (
    <div className="app-container">
      {toastMessage && (
        <div className={`error-toast ${toastMessage.startsWith('⚠️') ? 'toast-error' : ''}`}>
          <span className="error-toast-text">{toastMessage}</span>
        </div>
      )}
      {/* Navigation sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Main scrolling content area */}
      <main className="main-content">
        {renderActiveTab()}
      </main>

      {/* Persistent Audio element */}
      <audio
        ref={audioRef}
        src={getTrackSrc(currentTrack) || undefined}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onAudioEnded}
        onError={onAudioError}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
        preload="auto"
      />

      {/* Floating YouTube Video Player */}
      <div 
        className="floating-video-player glass-panel"
        style={{
          position: 'fixed',
          right: '20px',
          bottom: showVideo && currentTrack?.isGlobal && useYtFallback ? 'calc(var(--player-height) + 20px)' : '-300px',
          width: '280px',
          height: '157px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid var(--border-glass)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
          zIndex: 40,
          background: '#000',
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          opacity: showVideo && currentTrack?.isGlobal && useYtFallback ? 1 : 0,
          pointerEvents: showVideo && currentTrack?.isGlobal && useYtFallback ? 'auto' : 'none',
        }}
      >
        <div style={{ position: 'absolute', top: '5px', right: '5px', zIndex: 50 }}>
          <button 
            onClick={() => setShowVideo(false)}
            style={{
              background: 'rgba(0,0,0,0.6)',
              border: 'none',
              color: 'white',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
            title="Ocultar video"
          >
            ✕
          </button>
        </div>
        <div id="hidden-yt-player" style={{ width: '100%', height: '100%' }}></div>
      </div>

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
        isResolving={isBuffering}
        showVideo={showVideo}
        setShowVideo={setShowVideo}
        hasVideo={currentTrack?.isGlobal && useYtFallback}
      />
    </div>
  );
}

export default App;
