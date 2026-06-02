import { useState } from 'react';
import { Music } from 'lucide-react';

function TrackCover({ src, alt, className, iconSize = 20 }) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div 
        className={className} 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
          aspectRatio: '1',
          width: '100%',
          height: '100%',
          borderRadius: 'inherit',
          color: 'var(--primary)',
          border: '1px solid var(--border-glass)',
        }}
      >
        <Music size={iconSize} />
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
      onError={() => setError(true)} 
    />
  );
}

export default TrackCover;
