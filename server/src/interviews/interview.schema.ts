import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InterviewDocument = Interview & Document;

@Schema({ timestamps: true })
export class Interview {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  candidateId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  interviewerId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  techStack: string[];

  @Prop({ required: true })
  scheduledAt: Date;

  @Prop({ enum: ['scheduled', 'ongoing', 'completed'], default: 'scheduled' })
  status: string;

  @Prop({ default: '' })
  recordingUrl: string;

  @Prop({ type: Number, min: 1, max: 10, default: null })
  score: number;

  @Prop({
    type: {
      strengths: { type: String, default: '' },
      improvements: { type: String, default: '' },
      recommendation: { type: String, default: '' },
    },
    default: {},
  })
  feedback: {
    strengths: string;
    improvements: string;
    recommendation: string;
  };
}

export const InterviewSchema = SchemaFactory.createForClass(Interview);
