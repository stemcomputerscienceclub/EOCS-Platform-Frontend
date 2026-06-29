import { useRef, useState, useCallback } from 'react';

const MIME_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];

function getSupportedMimeType() {
  return MIME_TYPES.find(mt => MediaRecorder.isTypeSupported(mt)) || 'video/webm';
}

export default function useProctoring() {
  const [cameraActive, setCameraActive] = useState(false);
  const [screenActive, setScreenActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);

  const webcamRef = useRef(null);
  const cameraRecorderRef = useRef(null);
  const screenRecorderRef = useRef(null);
  const cameraChunksRef = useRef([]);
  const screenChunksRef = useRef([]);
  const cameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  const startRecording = useCallback(async () => {
    setError(null);

    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      cameraStreamRef.current = camStream;
      setCameraActive(true);

      if (webcamRef.current) {
        webcamRef.current.srcObject = camStream;
      }
    } catch (err) {
      setError('Camera access denied: ' + err.message);
    }

    try {
      const dispStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1920, height: 1080 },
        audio: false,
        displaySurface: 'monitor',
      });
      screenStreamRef.current = dispStream;
      setScreenActive(true);
    } catch (err) {
      setError('Screen sharing denied: ' + err.message);
    }

    const mimeType = getSupportedMimeType();
    const camStream = cameraStreamRef.current;
    const dispStream = screenStreamRef.current;

    if (camStream) {
      cameraChunksRef.current = [];
      const camRecorder = new MediaRecorder(camStream, { mimeType });
      camRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) cameraChunksRef.current.push(e.data);
      };
      camRecorder.start(5000);
      cameraRecorderRef.current = camRecorder;
    }

    if (dispStream) {
      screenChunksRef.current = [];
      const scrRecorder = new MediaRecorder(dispStream, { mimeType });
      scrRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) screenChunksRef.current.push(e.data);
      };
      scrRecorder.start(5000);
      screenRecorderRef.current = scrRecorder;
    }

    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      let camDone = !cameraRecorderRef.current;
      let scrDone = !screenRecorderRef.current;

      const checkDone = () => {
        if (camDone && scrDone) {
          const result = {
            cameraBlob: cameraChunksRef.current.length
              ? new Blob(cameraChunksRef.current, { type: getSupportedMimeType() })
              : null,
            screenBlob: screenChunksRef.current.length
              ? new Blob(screenChunksRef.current, { type: getSupportedMimeType() })
              : null,
          };

          const camStream = cameraStreamRef.current;
          const scrStream = screenStreamRef.current;
          if (camStream) camStream.getTracks().forEach(t => t.stop());
          if (scrStream) scrStream.getTracks().forEach(t => t.stop());
          cameraStreamRef.current = null;
          screenStreamRef.current = null;

          setCameraActive(false);
          setScreenActive(false);
          setIsRecording(false);
          resolve(result);
        }
      };

      if (cameraRecorderRef.current) {
        cameraRecorderRef.current.onstop = () => { camDone = true; checkDone(); };
        cameraRecorderRef.current.stop();
      }

      if (screenRecorderRef.current) {
        screenRecorderRef.current.onstop = () => { scrDone = true; checkDone(); };
        screenRecorderRef.current.stop();
      }

      checkDone();
    });
  }, []);

  const cleanup = useCallback(() => {
    const camStream = cameraStreamRef.current;
    const scrStream = screenStreamRef.current;
    if (camStream) camStream.getTracks().forEach(t => t.stop());
    if (scrStream) scrStream.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    cameraRecorderRef.current = null;
    screenRecorderRef.current = null;
    setCameraActive(false);
    setScreenActive(false);
    setIsRecording(false);
  }, []);

  return {
    webcamRef,
    cameraActive,
    screenActive,
    isRecording,
    error,
    startRecording,
    stopRecording,
    cleanup,
  };
}
