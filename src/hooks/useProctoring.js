import { useRef, useState, useCallback, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const AUDIO_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];

function getSupportedAudioMime() {
  return AUDIO_MIME_TYPES.find(mt => MediaRecorder.isTypeSupported(mt)) || 'audio/webm';
}

export default function useProctoring() {
  const [cameraActive, setCameraActive] = useState(false);
  const [audioActive, setAudioActive] = useState(false);
  const [error, setError] = useState(null);
  const [audioError, setAudioError] = useState(null);

  const webcamRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRecorderRef = useRef(null);

  const startCapture = useCallback(async () => {
    setError(null);
    setAudioError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: true,
      });
      streamRef.current = stream;
      canvasRef.current = document.createElement('canvas');
      setCameraActive(true);

      // Start audio recorder (15s chunks, each uploaded as a separate audio file)
      try {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          const audioStream = new MediaStream([audioTrack]);
          const mimeType = getSupportedAudioMime();
          const recorder = new MediaRecorder(audioStream, { mimeType });
          recorder.ondataavailable = (e) => {
            if (e.data.size < 100) return;
            const formData = new FormData();
            formData.append('audio', e.data, `audio-${Date.now()}.webm`);
            const token = localStorage.getItem('token');
            fetch(`${API_URL}/competition/upload-audio`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            }).catch((e) => {
              console.error('Audio chunk upload failed:', e);
            });
          };
          recorder.onerror = () => {
            setAudioError('Audio recorder error');
          };
          recorder.start(15000);
          audioRecorderRef.current = recorder;
          setAudioActive(true);
        }
      } catch (micErr) {
        console.error('Failed to start audio recording:', micErr);
        setAudioError('Microphone recording unavailable');
      }
    } catch (err) {
      setError('Camera/microphone access denied: ' + err.message);
    }
  }, []);

  // Set srcObject on the video element once camera becomes active
  useEffect(() => {
    if (cameraActive && streamRef.current && webcamRef.current) {
      webcamRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

  // Start snapshot interval once video has data
  useEffect(() => {
    if (!cameraActive || !webcamRef.current) return;

    const onPlaying = () => {
      if (intervalRef.current) return;

      intervalRef.current = setInterval(() => {
        const video = webcamRef.current;
        if (!video || !video.videoWidth) return;

        canvasRef.current.width = video.videoWidth;
        canvasRef.current.height = video.videoHeight;
        canvasRef.current.getContext('2d').drawImage(video, 0, 0);

        canvasRef.current.toBlob((blob) => {
          if (!blob || blob.size < 100) return;

          const formData = new FormData();
          formData.append('image', blob, `snapshot-${Date.now()}.jpg`);

          const token = localStorage.getItem('token');
          fetch(`${API_URL}/competition/upload-snapshot`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          }).catch((e) => {
            console.error('Snapshot upload failed:', e);
          });
        }, 'image/jpeg', 0.7);
      }, 3000);
    };

    const video = webcamRef.current;
    video.addEventListener('playing', onPlaying);
    if (video.readyState >= 3) onPlaying();

    return () => {
      video.removeEventListener('playing', onPlaying);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [cameraActive]);

  const stopCapture = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
      try { audioRecorderRef.current.stop(); } catch {}
      audioRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    setCameraActive(false);
    setAudioActive(false);
  }, []);

  const cleanup = useCallback(() => {
    stopCapture();
  }, [stopCapture]);

  return {
    webcamRef,
    cameraActive,
    audioActive,
    error,
    audioError,
    startCapture,
    stopCapture,
    cleanup,
  };
}
