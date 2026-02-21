import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CodeSubmissionDocument = CodeSubmission & Document;

@Schema({ timestamps: true })
export class CodeSubmission {
  @Prop({ type: Types.ObjectId, ref: 'Interview', required: true })
  interviewId: Types.ObjectId;

  @Prop({ required: true })
  language: string;

  @Prop({ required: true })
  code: string;

  @Prop({ default: '' })
  output: string;
}

export const CodeSubmissionSchema = SchemaFactory.createForClass(CodeSubmission);
