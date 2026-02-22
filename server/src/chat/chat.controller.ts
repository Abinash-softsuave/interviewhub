import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Chat')
@ApiBearerAuth('JWT')
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get(':interviewId')
  @ApiOperation({ summary: 'Get chat history', description: 'Returns all chat messages for an interview, with sender details populated' })
  @ApiParam({ name: 'interviewId', description: 'Interview ObjectId' })
  @ApiResponse({ status: 200, description: 'List of chat messages', schema: {
    example: [
      {
        _id: '507f1f77bcf86cd799439011',
        interviewId: '507f1f77bcf86cd799439012',
        senderId: { _id: '507f1f77bcf86cd799439013', name: 'John Doe' },
        message: 'Hello, ready to start?',
        timestamp: '2026-03-01T10:05:00.000Z',
      },
    ],
  }})
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMessages(@Param('interviewId') interviewId: string) {
    return this.chatService.getMessages(interviewId);
  }
}
