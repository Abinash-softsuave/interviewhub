export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'interviewer' | 'candidate';
}

export interface Interview {
  _id: string;
  candidateId: User;
  interviewerId: User;
  techStack: string[];
  scheduledAt: string;
  status: 'scheduled' | 'ongoing' | 'completed';
  recordingUrl: string;
  score: number | null;
  feedback: {
    strengths: string;
    improvements: string;
    recommendation: string;
  };
  createdAt: string;
}

export interface CodeSubmission {
  _id: string;
  interviewId: string;
  language: string;
  code: string;
  output: string;
  createdAt: string;
}

export interface ChatMessage {
  _id: string;
  senderId: { _id: string; name: string };
  message: string;
  timestamp: string;
}

export interface Analytics {
  total: number;
  completed: number;
  ongoing: number;
  avgScore: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}
