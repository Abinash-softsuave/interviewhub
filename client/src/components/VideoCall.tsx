import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

interface Props {
  socket: Socket;
  interviewId: string;
  onRecordingUrl?: (url: string) => void;
  userRole?: string;
  onScreenStream?: (stream: MediaStream | null) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function VideoCall({ socket, interviewId, onRecordingUrl, userRole, onScreenStream }: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const screenPeerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const makingOfferRef = useRef(false);

  // Keep refs for callbacks so the effect doesn't depend on them
  const onScreenStreamRef = useRef(onScreenStream);
  onScreenStreamRef.current = onScreenStream;
  const userRoleRef = useRef(userRole);
  userRoleRef.current = userRole;

  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [screenShareActive, setScreenShareActive] = useState(false);

  useEffect(() => {
    let disposed = false;

    // ---- Helper: create video peer connection ----
    function createVideoPeer(): RTCPeerConnection {
      // Close existing peer if any
      if (peerRef.current) {
        peerRef.current.close();
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('webrtc-ice-candidate', { interviewId, candidate: e.candidate });
        }
      };

      pc.ontrack = (e) => {
        if (remoteVideoRef.current && e.streams[0]) {
          remoteVideoRef.current.srcObject = e.streams[0];
          setIsConnected(true);
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          setIsConnected(false);
        }
      };

      // Add local tracks if available
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      peerRef.current = pc;
      return pc;
    }

    // ---- Helper: create screen share peer connection ----
    function createScreenPeer(isInitiator: boolean): RTCPeerConnection {
      if (screenPeerRef.current) {
        screenPeerRef.current.close();
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('screen-ice-candidate', { interviewId, candidate: e.candidate });
        }
      };

      // Receiver (interviewer) gets the screen track
      if (!isInitiator) {
        pc.ontrack = (e) => {
          onScreenStreamRef.current?.(e.streams[0]);
        };
      }

      screenPeerRef.current = pc;
      return pc;
    }

    // ---- Helper: candidate starts screen sharing ----
    async function startScreenShare() {
      if (disposed) return;
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor',
          } as MediaTrackConstraints,
          audio: false,
        });

        if (disposed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        screenStreamRef.current = stream;
        setScreenShareActive(true);

        // Re-prompt if candidate stops from browser UI
        stream.getVideoTracks()[0].onended = () => {
          setScreenShareActive(false);
          screenStreamRef.current = null;
          if (screenPeerRef.current) {
            screenPeerRef.current.close();
            screenPeerRef.current = null;
          }
          onScreenStreamRef.current?.(null);
          if (!disposed) startScreenShare();
        };

        // Build screen peer and send offer
        const pc = createScreenPeer(true);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('screen-offer', { interviewId, offer });
      } catch {
        // User denied or error — retry after delay
        if (!disposed) {
          setTimeout(() => startScreenShare(), 3000);
        }
      }
    }

    // ---- 1. Get local camera/mic ----
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (disposed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch {
        console.warn('Camera/mic not available, continuing without media');
      }
    }

    // ---- 2. Set up socket listeners (once) ----

    // When the other user joins the room, we initiate the call
    async function onUserJoined() {
      if (makingOfferRef.current) return;
      makingOfferRef.current = true;
      try {
        const pc = createVideoPeer();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', { interviewId, offer });
      } finally {
        makingOfferRef.current = false;
      }

      // Candidate auto-shares screen when interviewer joins
      if (userRoleRef.current === 'candidate') {
        startScreenShare();
      }
    }

    async function onWebrtcOffer(data: { offer: RTCSessionDescriptionInit }) {
      const pc = createVideoPeer();
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc-answer', { interviewId, answer });

      // Candidate auto-shares screen when receiving an offer
      if (userRoleRef.current === 'candidate' && !screenStreamRef.current) {
        startScreenShare();
      }
    }

    async function onWebrtcAnswer(data: { answer: RTCSessionDescriptionInit }) {
      await peerRef.current?.setRemoteDescription(new RTCSessionDescription(data.answer));
    }

    async function onWebrtcIce(data: { candidate: RTCIceCandidateInit }) {
      try {
        await peerRef.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch {
        // Ignore ICE errors for candidates arriving before remote description
      }
    }

    // Screen share signaling (interviewer receives)
    async function onScreenOffer(data: { offer: RTCSessionDescriptionInit }) {
      const pc = createScreenPeer(false);
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('screen-answer', { interviewId, answer });
    }

    async function onScreenAnswer(data: { answer: RTCSessionDescriptionInit }) {
      await screenPeerRef.current?.setRemoteDescription(new RTCSessionDescription(data.answer));
    }

    async function onScreenIce(data: { candidate: RTCIceCandidateInit }) {
      try {
        await screenPeerRef.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch {
        // Ignore
      }
    }

    // Register all listeners
    socket.on('user-joined', onUserJoined);
    socket.on('webrtc-offer', onWebrtcOffer);
    socket.on('webrtc-answer', onWebrtcAnswer);
    socket.on('webrtc-ice-candidate', onWebrtcIce);
    socket.on('screen-offer', onScreenOffer);
    socket.on('screen-answer', onScreenAnswer);
    socket.on('screen-ice-candidate', onScreenIce);

    // Start camera
    init();

    // ---- Cleanup ----
    return () => {
      disposed = true;
      socket.off('user-joined', onUserJoined);
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
  }, [socket, interviewId]); // Only depend on socket & interviewId — stable values

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
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full rounded-lg bg-gray-900 aspect-video object-cover"
          />
          <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">You</span>
        </div>
        <div className="relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg bg-gray-900 aspect-video object-cover"
          />
          <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">
            {isConnected ? 'Connected' : 'Waiting...'}
          </span>
        </div>
      </div>

      {/* Candidate screen share status */}
      {userRole === 'candidate' && (
        <div className={`text-center text-xs py-1 rounded ${screenShareActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>
          {screenShareActive ? 'Screen is being shared with interviewer' : 'Screen share required — please allow when prompted'}
        </div>
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
