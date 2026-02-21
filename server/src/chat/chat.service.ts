import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './message.schema';

@Injectable()
export class ChatService {
  constructor(@InjectModel(Message.name) private messageModel: Model<MessageDocument>) {}

  async saveMessage(data: { interviewId: string; senderId: string; message: string }): Promise<MessageDocument> {
    return this.messageModel.create(data);
  }

  async getMessages(interviewId: string): Promise<MessageDocument[]> {
    return this.messageModel
      .find({ interviewId })
      .populate('senderId', 'name email')
      .sort({ timestamp: 1 });
  }
}
