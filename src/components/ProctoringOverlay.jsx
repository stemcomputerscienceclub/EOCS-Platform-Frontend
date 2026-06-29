import { useEffect } from 'react';

export default function ProctoringOverlay({ webcamRef, cameraActive, screenActive, isRecording, error }) {
  useEffect(() => {
    if (error) {
      console.error('Proctoring error:', error);
    }
  }, [error]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {error && (
        <div className="bg-red-600 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      )}

      {cameraActive && (
        <div className="bg-gray-900 rounded-lg overflow-hidden shadow-2xl border-2 border-blue-500/50 w-48">
          <div className="bg-gray-800 px-2 py-1 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-white text-xs font-medium">Camera</span>
          </div>
          <video
            ref={webcamRef}
            autoPlay
            muted
            playsInline
            className="w-full h-36 object-cover"
          />
        </div>
      )}

      {screenActive && (
        <div className="bg-gray-900 rounded-lg overflow-hidden shadow-2xl border-2 border-green-500/50 w-48">
          <div className="bg-gray-800 px-2 py-1 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-white text-xs font-medium">Screen</span>
          </div>
          <div className="h-20 flex items-center justify-center text-gray-400 text-xs">
            {isRecording ? 'Recording...' : 'Active'}
          </div>
        </div>
      )}
    </div>
  );
}
