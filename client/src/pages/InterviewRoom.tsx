import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getInterview, updateInterview } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import VideoCall from '../components/VideoCall';
import CodeEditor from '../components/CodeEditor';
import ChatPanel from '../components/ChatPanel';
import { Interview } from '../types';
import { Socket } from 'socket.io-client';

export default function InterviewRoom() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(true);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  // Join approval state
  const [admitted, setAdmitted] = useState(false);
  const [waitingApproval, setWaitingApproval] = useState(false);
  const [joinRejected, setJoinRejected] = useState(false);
  const [joinRequest, setJoinRequest] = useState<{ userId: string; userName: string; socketId: string } | null>(null);

  useEffect(() => {
    if (!id || !user) return;

    const loadInterview = async () => {
      try {
        const { data } = await getInterview(id);
        setInterview(data);

        if (data.status === 'scheduled') {
          await updateInterview(id, { status: 'ongoing' });
        }
      } catch {
        navigate('/dashboard');
        return;
      } finally {
        setLoading(false);
      }
    };

    loadInterview();

    const s = connectSocket();
    setSocket(s);

    if (user.role === 'interviewer') {
      // Interviewer joins directly
      s.emit('join-room', {
        interviewId: id,
        userId: user.id || user._id,
        userName: user.name,
        role: user.role,
      });
      setAdmitted(true);

      // Listen for candidate join requests
      s.on('join-request', (data: { userId: string; userName: string; socketId: string }) => {
        setJoinRequest(data);
      });
    } else {
      // Candidate requests to join — waits for approval
      setWaitingApproval(true);
      s.emit('request-join', {
        interviewId: id,
        userId: user.id || user._id,
        userName: user.name,
      });

      s.on('join-approved', () => {
        setWaitingApproval(false);
        setAdmitted(true);
        // Now actually join the room
        s.emit('join-room', {
          interviewId: id,
          userId: user.id || user._id,
          userName: user.name,
          role: user.role,
        });
      });

      s.on('join-rejected', () => {
        setWaitingApproval(false);
        setJoinRejected(true);
      });
    }

    return () => {
      s.emit('leave-room', { interviewId: id });
      s.off('join-request');
      s.off('join-approved');
      s.off('join-rejected');
      disconnectSocket();
    };
  }, [id, user, navigate]);

  const handleApprove = () => {
    if (socket && id && joinRequest) {
      socket.emit('approve-join', {
        interviewId: id,
        candidateSocketId: joinRequest.socketId,
        candidateUserId: joinRequest.userId,
      });
      setJoinRequest(null);
    }
  };

  const handleReject = () => {
    if (socket && id && joinRequest) {
      socket.emit('reject-join', {
        interviewId: id,
        candidateSocketId: joinRequest.socketId,
      });
      setJoinRequest(null);
    }
  };

  const handleScreenStream = useCallback((stream: MediaStream | null) => {
    setScreenStream(stream);
  }, []);

  useEffect(() => {
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  const handleRecordingUrl = async (url: string) => {
    if (id) {
      await updateInterview(id, { recordingUrl: url });
    }
  };

  // Loading state
  if (loading || !socket || !id) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Candidate: rejected
  if (joinRejected) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Join Request Declined</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">The interviewer has declined your request to join this interview.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Candidate: waiting for approval
  if (waitingApproval && !admitted) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Waiting for Approval</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">The interviewer will let you in shortly. Please wait...</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-sm"
          >
            Cancel and go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Top bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Interview Room</h1>
          {interview && (
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{interview.candidateId?.name}</span>
              <span>with</span>
              <span>{interview.interviewerId?.name}</span>
              <div className="flex gap-1 ml-2">
                {interview.techStack.map((t) => (
                  <span key={t} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Join request notification for interviewer */}
      {joinRequest && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-3 flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
              {joinRequest.userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {joinRequest.userName} wants to join the interview
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Candidate is waiting for your approval</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleReject}
              className="px-4 py-1.5 text-sm font-medium text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              Decline
            </button>
            <button
              onClick={handleApprove}
              className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              Admit
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel - Video */}
        <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-3 flex-shrink-0">
            <VideoCall socket={socket} interviewId={id} userId={user?.id || user?._id} onRecordingUrl={handleRecordingUrl} userRole={user?.role} onScreenStream={handleScreenStream} />
          </div>
          {/* Chat below video */}
          <div className="flex-1 min-h-0 p-3 pt-0">
            <ChatPanel socket={socket} interviewId={id} />
          </div>
        </div>

        {/* Right panel - Screen Share + Code Editor */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Candidate screen share visible to interviewer */}
          {user?.role === 'interviewer' && (
            <div className="flex-shrink-0 p-3 pb-0">
              <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                {screenStream ? (
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    playsInline
                    className="w-full max-h-64 object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Waiting for candidate's screen...
                  </div>
                )}
                <span className="absolute top-2 left-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">
                  Candidate's Screen
                </span>
              </div>
            </div>
          )}
          <div className="flex-1 min-h-0 p-3">
            <CodeEditor socket={socket} interviewId={id} />
          </div>
        </div>
      </div>
    </div>
  );
}
