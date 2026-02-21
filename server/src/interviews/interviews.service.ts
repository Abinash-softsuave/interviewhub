import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Interview, InterviewDocument } from './interview.schema';
import { CreateInterviewDto, UpdateInterviewDto } from './dto/create-interview.dto';

@Injectable()
export class InterviewsService {
  constructor(
    @InjectModel(Interview.name) private interviewModel: Model<InterviewDocument>,
  ) {}

  async create(dto: CreateInterviewDto): Promise<InterviewDocument> {
    return this.interviewModel.create(dto);
  }

  async findAll(): Promise<InterviewDocument[]> {
    return this.interviewModel
      .find()
      .populate('candidateId', 'name email')
      .populate('interviewerId', 'name email')
      .sort({ scheduledAt: -1 });
  }

  async findByUser(userId: string): Promise<InterviewDocument[]> {
    return this.interviewModel
      .find({ $or: [{ candidateId: userId }, { interviewerId: userId }] })
      .populate('candidateId', 'name email')
      .populate('interviewerId', 'name email')
      .sort({ scheduledAt: -1 });
  }

  async findById(id: string): Promise<InterviewDocument> {
    const interview = await this.interviewModel
      .findById(id)
      .populate('candidateId', 'name email')
      .populate('interviewerId', 'name email');
    if (!interview) throw new NotFoundException('Interview not found');
    return interview;
  }

  async update(id: string, dto: UpdateInterviewDto): Promise<InterviewDocument> {
    const interview = await this.interviewModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .populate('candidateId', 'name email')
      .populate('interviewerId', 'name email');
    if (!interview) throw new NotFoundException('Interview not found');
    return interview;
  }

  async delete(id: string): Promise<void> {
    const result = await this.interviewModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Interview not found');
  }

  async getAnalytics() {
    const total = await this.interviewModel.countDocuments();
    const completed = await this.interviewModel.countDocuments({ status: 'completed' });
    const avgScoreResult = await this.interviewModel.aggregate([
      { $match: { score: { $ne: null } } },
      { $group: { _id: null, avgScore: { $avg: '$score' } } },
    ]);
    const avgScore = avgScoreResult.length > 0 ? Math.round(avgScoreResult[0].avgScore * 10) / 10 : 0;
    return { total, completed, ongoing: total - completed, avgScore };
  }
}
