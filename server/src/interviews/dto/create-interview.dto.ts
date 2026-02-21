import { IsArray, IsDateString, IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateInterviewDto {
  @IsMongoId()
  candidateId: string;

  @IsMongoId()
  interviewerId: string;

  @IsArray()
  @IsString({ each: true })
  techStack: string[];

  @IsDateString()
  scheduledAt: string;
}

export class UpdateInterviewDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  recordingUrl?: string;

  @IsOptional()
  score?: number;

  @IsOptional()
  feedback?: {
    strengths: string;
    improvements: string;
    recommendation: string;
  };
}
