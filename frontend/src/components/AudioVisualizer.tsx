import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isListening: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ stream, isListening }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (!stream || !isListening) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    try {
      // Initialize Web Audio API components
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      sourceRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const draw = () => {
        if (!canvasRef.current) return;
        const width = canvas.width;
        const height = canvas.height;

        animationRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        // Clear canvas with a nice gradient fade
        ctx.fillStyle = '#0f172a'; // dark slate
        ctx.fillRect(0, 0, width, height);

        // Draw visualizer bars
        const barWidth = (width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const percent = dataArray[i] / 255;
          const barHeight = percent * height * 0.8;

          // Vibrant green/teal gradients for civic tech theme
          const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          gradient.addColorStop(0, '#0d89e7'); // Blue
          gradient.addColorStop(0.5, '#10b981'); // Emerald green
          gradient.addColorStop(1, '#6ee7b7'); // Light green

          ctx.fillStyle = gradient;
          
          // Draw symmetric bars from the center vertically
          const yPos = (height - barHeight) / 2;
          ctx.fillRect(x, yPos, barWidth - 2, barHeight);

          x += barWidth;
        }
      };

      draw();

    } catch (e) {
      console.error('Audio Visualizer setup failed:', e);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stream, isListening]);

  return (
    <div className="w-full flex flex-col items-center justify-center bg-slate-900 rounded-2xl p-4 overflow-hidden border border-slate-800 shadow-inner">
      <div className="flex items-center space-x-2 mb-3">
        <span className="flex h-3 w-3 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
        <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">
          🎙️ Listening... / குரல் கேட்கப்படுகிறது
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={350}
        height={80}
        className="w-full h-20 rounded-lg max-w-sm"
      />
    </div>
  );
};
