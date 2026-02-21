import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { interviewId: string; userId: string; userName: string; role: string },
  ) {
    client.join(data.interviewId);
    client.to(data.interviewId).emit('user-joined', {
      userId: data.userId,
      userName: data.userName,
      role: data.role,
      socketId: client.id,
    });
    console.log(`${data.userName} (${data.role}) joined room ${data.interviewId}`);

    // If interviewer joins, notify any waiting candidates so they can re-send request
    if (data.role === 'interviewer') {
      this.server.to(data.interviewId + ':waiting').emit('interviewer-in-room');
      console.log(`Notified waiting candidates in ${data.interviewId}:waiting`);
    }
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { interviewId: string },
  ) {
    client.leave(data.interviewId);
    client.to(data.interviewId).emit('user-left', { socketId: client.id });
  }

  // ---- Join approval flow ----
  @SubscribeMessage('request-join')
  handleRequestJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { interviewId: string; userId: string; userName: string },
  ) {
    // Candidate requests to join — forward to interviewer in the room
    client.join(data.interviewId + ':waiting');
    client.to(data.interviewId).emit('join-request', {
      userId: data.userId,
      userName: data.userName,
      socketId: client.id,
    });
    console.log(`Join request from ${data.userName} for room ${data.interviewId}`);
  }

  @SubscribeMessage('approve-join')
  handleApproveJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { interviewId: string; candidateSocketId: string; candidateUserId: string },
  ) {
    // Interviewer approves — notify the candidate
    this.server.to(data.interviewId + ':waiting').emit('join-approved', {
      interviewId: data.interviewId,
    });
    console.log(`Join approved for room ${data.interviewId}`);
  }

  @SubscribeMessage('reject-join')
  handleRejectJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { interviewId: string; candidateSocketId: string },
  ) {
    this.server.to(data.interviewId + ':waiting').emit('join-rejected', {
      interviewId: data.interviewId,
    });
    console.log(`Join rejected for room ${data.interviewId}`);
  }

  // ---- Chat ----
  @SubscribeMessage('chat-message')
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { interviewId: string; senderId: string; senderName: string; message: string },
  ) {
    const saved = await this.chatService.saveMessage({
      interviewId: data.interviewId,
      senderId: data.senderId,
      message: data.message,
    });

    this.server.to(data.interviewId).emit('chat-message', {
      _id: saved._id,
      senderId: { _id: data.senderId, name: data.senderName },
      message: data.message,
      timestamp: saved.timestamp,
    });
  }

  // ---- WebRTC Signaling ----
  @SubscribeMessage('webrtc-offer')
  handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { interviewId: string; offer: RTCSessionDescriptionInit },
  ) {
    client.to(data.interviewId).emit('webrtc-offer', {
      offer: data.offer,
      socketId: client.id,
    });
  }

  @SubscribeMessage('webrtc-answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { interviewId: string; answer: RTCSessionDescriptionInit },
  ) {
    client.to(data.interviewId).emit('webrtc-answer', {
      answer: data.answer,
      socketId: client.id,
    });
  }

  @SubscribeMessage('webrtc-ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { interviewId: string; candidate: RTCIceCandidateInit },
  ) {
    client.to(data.interviewId).emit('webrtc-ice-candidate', {
      candidate: data.candidate,
      socketId: client.id,
    });
  }

  @SubscribeMessage('webrtc-ready')
  handleWebrtcReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { interviewId: string; userId: string },
  ) {
    client.to(data.interviewId).emit('webrtc-ready', {
      userId: data.userId,
      socketId: client.id,
    });
    console.log(`webrtc-ready from ${data.userId} in room ${data.interviewId}`);
  }

  // ---- Screen share signaling ----
  @SubscribeMessage('screen-offer')
  handleScreenOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { interviewId: string; offer: RTCSessionDescriptionInit },
  ) {
    client.to(data.interviewId).emit('screen-offer', {
      offer: data.offer,
      socketId: client.id,
    });
  }

  @SubscribeMessage('screen-answer')
  handleScreenAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { interviewId: string; answer: RTCSessionDescriptionInit },
  ) {
    client.to(data.interviewId).emit('screen-answer', {
      answer: data.answer,
      socketId: client.id,
    });
  }

  @SubscribeMessage('screen-ice-candidate')
  handleScreenIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { interviewId: string; candidate: RTCIceCandidateInit },
  ) {
    client.to(data.interviewId).emit('screen-ice-candidate', {
      candidate: data.candidate,
      socketId: client.id,
    });
  }

  // ---- Code editor sync ----
  @SubscribeMessage('code-change')
  handleCodeChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { interviewId: string; code: string; language: string },
  ) {
    client.to(data.interviewId).emit('code-change', {
      code: data.code,
      language: data.language,
    });
  }
}
