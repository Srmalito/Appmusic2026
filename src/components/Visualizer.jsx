function Visualizer({ isPlaying }) {
  const barCount = 18;
  const bars = Array.from({ length: barCount });

  // Array of random durations to make the animation feel organic
  const animDurations = [
    1.2, 0.8, 1.4, 0.9, 1.1, 1.3, 0.7, 1.0, 1.2, 
    0.9, 1.5, 0.8, 1.1, 1.3, 0.7, 1.2, 1.0, 1.4
  ];

  return (
    <div className="visualizer-container">
      {bars.map((_, idx) => (
        <div
          key={idx}
          className={`visualizer-bar ${isPlaying ? 'animating' : ''}`}
          style={{
            animationDuration: isPlaying ? `${animDurations[idx % animDurations.length]}s` : '0s',
            animationDelay: isPlaying ? `${idx * 0.05}s` : '0s',
            height: isPlaying ? undefined : '4px' // Rest state height
          }}
        />
      ))}

      <style>{`
        .visualizer-container {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 4px;
          height: 40px;
          width: 100%;
          padding: 0 1rem;
        }

        .visualizer-bar {
          flex: 1;
          max-width: 6px;
          background: linear-gradient(to top, var(--primary) 0%, var(--secondary) 100%);
          border-radius: 4px 4px 0 0;
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.15);
          transition: height 0.4s ease;
        }

        .visualizer-bar.animating {
          animation-name: bounce;
          animation-iteration-count: infinite;
          animation-direction: alternate;
          animation-timing-function: ease-in-out;
        }

        @keyframes bounce {
          0% {
            height: 10%;
          }
          100% {
            height: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default Visualizer;
