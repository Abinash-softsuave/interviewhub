import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

interface Props {
  socket: Socket;
  interviewId: string;
  userId?: string;
  onRecordingUrl?: (url: string) => void;
  userRole?: string;
  onScreenStream?: (stream: MediaStream | null) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

export default function VideoCall({ socket, interviewId, userId, onRecordingUrl, userRole, onScreenStream }: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const screenPeerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const pendingIceCandidates = useRef<RTCIceCandidateInit[]>([]);
  const pendingScreenIceCandidates = useRef<RTCIceCandidateInit[]>([]);

  const onScreenStreamRef = useRef(onScreenStream);
  onScreenStreamRef.current = onScreenStream;
  const userRoleRef = useRef(userRole);
  userRoleRef.current = userRole;

  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(userRole === 'interviewer');
  const [screenShareActive, setScreenShareActive] = useState(false);
  const [screenShareError, setScreenShareError] = useState('');

  useEffect(() => {
    let disposed = false;
    const log = (msg: string, ...args: unknown[]) => console.log(`[WebRTC] ${msg}`, ...args);

    // ---- 1. Get camera/mic ----
    let resolveMedia: () => void;
    const mediaReady = new Promise<void>((r) => { resolveMedia = r; });

    (async () => {
      try {
        log('Requesting camera/mic...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (disposed) { stream.getTracks().forEach((t) => t.stop()); resolveMedia!(); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // Interviewer: camera off by default
        if (userRoleRef.current === 'interviewer') {
          stream.getVideoTracks().forEach((t) => (t.enabled = false));
          log('Camera/mic acquired (camera OFF by default for interviewer)');
        } else {
          log('Camera/mic acquired');
        }
      } catch (err) {
        log('Camera/mic failed:', err);
      }
      resolveMedia!();
    })();

    // ---- Helpers ----
    function createVideoPeer(): RTCPeerConnection {
      if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
      pendingIceCandidates.current = [];
      const pc = new RTCPeerConnection(ICE_SERVERS);

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('webrtc-ice-candidate', { interviewId, candidate: e.candidate });
      };
      pc.ontrack = (e) => {
        log('Received remote track:', e.track.kind);
        if (remoteVideoRef.current && e.streams[0]) {
          remoteVideoRef.current.srcObject = e.streams[0];
          setIsConnected(true);
        }
      };
      pc.oniceconnectionstatechange = () => {
        log('ICE state:', pc.iceConnectionState);
        const s = pc.iceConnectionState;
        if (s === 'connected' || s === 'completed') setIsConnected(true);
        if (s === 'disconnected' || s === 'failed') setIsConnected(false);
      };
      pc.onconnectionstatechange = () => log('Connection state:', pc.connectionState);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
        log('Added local tracks:', localStreamRef.current.getTracks().length);
      } else {
        log('WARNING: No local stream when creating peer');
      }
      peerRef.current = pc;
      return pc;
    }

    function createScreenPeer(isInitiator: boolean): RTCPeerConnection {
      if (screenPeerRef.current) { screenPeerRef.current.close(); screenPeerRef.current = null; }
      pendingScreenIceCandidates.current = [];
      const pc = new RTCPeerConnection(ICE_SERVERS);

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('screen-ice-candidate', { interviewId, candidate: e.candidate });
      };
      if (!isInitiator) {
        pc.ontrack = (e) => {
          log('Received screen share track');
          onScreenStreamRef.current?.(e.streams[0]);
        };
      }
      pc.oniceconnectionstatechange = () => log('Screen ICE state:', pc.iceConnectionState);
      screenPeerRef.current = pc;
      return pc;
    }

    async function flushIceCandidates() {
      if (peerRef.current?.remoteDescription && pendingIceCandidates.current.length > 0) {
        log('Flushing', pendingIceCandidates.current.length, 'ICE candidates');
        for (const c of pendingIceCandidates.current) {
          try { await peerRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
        }
        pendingIceCandidates.current = [];
      }
    }

    async function flushScreenIceCandidates() {
      if (screenPeerRef.current?.remoteDescription && pendingScreenIceCandidates.current.length > 0) {
        log('Flushing', pendingScreenIceCandidates.current.length, 'screen ICE candidates');
        for (const c of pendingScreenIceCandidates.current) {
          try { await screenPeerRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
        }
        pendingScreenIceCandidates.current = [];
      }
    }

    // ---- Screen share: always create a fresh peer and send offer ----
    async function startOrRestartScreenShare() {
      if (disposed || userRoleRef.current !== 'candidate') return;
      log('Starting/restarting screen share...');

      // If we already have a screen stream, reuse it; otherwise prompt
      let stream = screenStreamRef.current;
      if (!stream || stream.getVideoTracks().every((t) => t.readyState === 'ended')) {
        try {
          setScreenShareError('');
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: { displaySurface: 'monitor' } as MediaTrackConstraints,
            audio: false,
          });
          if (disposed) { stream.getTracks().forEach((t) => t.stop()); return; }

          // ENFORCE entire screen only — reject window/tab selections
          const videoTrack = stream.getVideoTracks()[0];
          const settings = videoTrack.getSettings() as MediaTrackSettings & { displaySurface?: string };
          const surface = settings.displaySurface;
          if (surface && surface !== 'monitor') {
            log('Rejected screen share: selected', surface, '(must be entire screen)');
            stream.getTracks().forEach((t) => t.stop());
            setScreenShareError('You must share your Entire Screen. Window and tab sharing are not allowed.');
            if (!disposed) setTimeout(() => startOrRestartScreenShare(), 2500);
            return;
          }

          screenStreamRef.current = stream;
          setScreenShareActive(true);
          setScreenShareError('');

          videoTrack.onended = () => {
            log('Screen share ended by user');
            setScreenShareActive(false);
            screenStreamRef.current = null;
            if (screenPeerRef.current) { screenPeerRef.current.close(); screenPeerRef.current = null; }
            onScreenStreamRef.current?.(null);
            if (!disposed) startOrRestartScreenShare();
          };
        } catch (err) {
          log('Screen share denied:', err);
          if (!disposed) setTimeout(() => startOrRestartScreenShare(), 3000);
          return;
        }
      }

      // Create fresh screen peer and send offer
      const pc = createScreenPeer(true);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream!));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      log('Sending screen-offer');
      socket.emit('screen-offer', { interviewId, offer });
    }

    // ---- 2. Socket event handlers ----

    async function onWebrtcReady() {
      log('Received webrtc-ready, initiating call...');
      await mediaReady;
      if (disposed) return;

      const pc = createVideoPeer();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      log('Sending webrtc-offer');
      socket.emit('webrtc-offer', { interviewId, offer });

      // Candidate: start screen share when we initiate the call
      if (userRoleRef.current === 'candidate') {
        setTimeout(() => startOrRestartScreenShare(), 500);
      }
    }

    async function onWebrtcOffer(data: { offer: RTCSessionDescriptionInit }) {
      log('Received webrtc-offer, creating answer...');
      await mediaReady;
      if (disposed) return;

      const pc = createVideoPeer();
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      await flushIceCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      log('Sending webrtc-answer');
      socket.emit('webrtc-answer', { interviewId, answer });

      // Candidate: start screen share when we answer a call
      if (userRoleRef.current === 'candidate') {
        setTimeout(() => startOrRestartScreenShare(), 500);
      }
    }

    async function onWebrtcAnswer(data: { answer: RTCSessionDescriptionInit }) {
      log('Received webrtc-answer');
      if (peerRef.current) {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        await flushIceCandidates();
      }
    }

    async function onWebrtcIce(data: { candidate: RTCIceCandidateInit }) {
      if (peerRef.current?.remoteDescription) {
        try { await peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch { /* ignore */ }
      } else {
        pendingIceCandidates.current.push(data.candidate);
      }
    }

    async function onScreenOffer(data: { offer: RTCSessionDescriptionInit }) {
      log('Received screen-offer, creating answer...');
      if (disposed) return;
      const pc = createScreenPeer(false);
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      await flushScreenIceCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      log('Sending screen-answer');
      socket.emit('screen-answer', { interviewId, answer });
    }

    async function onScreenAnswer(data: { answer: RTCSessionDescriptionInit }) {
      log('Received screen-answer');
      if (screenPeerRef.current) {
        await screenPeerRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        await flushScreenIceCandidates();
      }
    }

    async function onScreenIce(data: { candidate: RTCIceCandidateInit }) {
      if (screenPeerRef.current?.remoteDescription) {
        try { await screenPeerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch { /* ignore */ }
      } else {
        pendingScreenIceCandidates.current.push(data.candidate);
      }
    }

    // ---- 3. Register listeners, then signal readiness ----
    socket.on('webrtc-ready', onWebrtcReady);
    socket.on('webrtc-offer', onWebrtcOffer);
    socket.on('webrtc-answer', onWebrtcAnswer);
    socket.on('webrtc-ice-candidate', onWebrtcIce);
    socket.on('screen-offer', onScreenOffer);
    socket.on('screen-answer', onScreenAnswer);
    socket.on('screen-ice-candidate', onScreenIce);

    log('All listeners registered');

    mediaReady.then(() => {
      if (disposed) return;
      log('Media ready, emitting webrtc-ready');
      socket.emit('webrtc-ready', { interviewId, userId });
    });

    return () => {
      disposed = true;
      socket.off('webrtc-ready', onWebrtcReady);
      socket.off('webrtc-offer', onWebrtcOffer);
      socket.off('webrtc-answer', onWebrtcAnswer);
      socket.off('webrtc-ice-candidate', onWebrtcIce);
      socket.off('screen-offer', onScreenOffer);
      socket.off('screen-answer', onScreenAnswer);
      socket.off('screen-ice-candidate', onScreenIce);
      peerRef.current?.close();
      screenPeerRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [socket, interviewId, userId]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
      setIsVideoOff(!isVideoOff);
    }
  };

  const startRecording = () => {
    if (!localStreamRef.current) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(localStreamRef.current, { mimeType: 'video/webm' });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      onRecordingUrl?.(url);
    };
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full rounded-lg bg-gray-900 aspect-video object-cover" />
          <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">You</span>
        </div>
        <div className="relative">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full rounded-lg bg-gray-900 aspect-video object-cover" />
          <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">
            {isConnected ? 'Connected' : 'Waiting...'}
          </span>
        </div>
      </div>

      {userRole === 'candidate' && (
        <>
          <div className={`text-center text-xs py-1 rounded ${screenShareActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>
            {screenShareActive ? 'Screen is being shared with interviewer' : 'Screen share required — please allow when prompted'}
          </div>
          {screenShareError && (
            <div className="text-center text-xs py-1.5 px-2 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium">
              {screenShareError}
            </div>
          )}
        </>
      )}

      <div className="flex items-center justify-center space-x-2">
        <button
          onClick={toggleMute}
          className={`p-2 rounded-full ${isMuted ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMuted ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4-8a3 3 0 016 0v3a3 3 0 01-6 0v-3z" />
            )}
          </svg>
        </button>
        {userRole === 'interviewer' && (
          <button
            onClick={toggleVideo}
            className={`p-2 rounded-full ${isVideoOff ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        )}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-3 py-1.5 rounded-full text-xs font-medium ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
        >
          {isRecording ? 'Stop Rec' : 'Record'}
        </button>
      </div>
    </div>
  );
}
