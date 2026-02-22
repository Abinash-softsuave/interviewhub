import { IsArray, IsDateString, IsMongoId, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInterviewDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'MongoDB ObjectId of the candidate' })
  @IsMongoId()
  candidateId: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012', description: 'MongoDB ObjectId of the interviewer' })
  @IsMongoId()
  interviewerId: string;

  @ApiProperty({ example: ['JavaScript', 'React', 'Node.js'], description: 'Tech stack for the interview' })
  @IsArray()
  @IsString({ each: true })
  techStack: string[];

  @ApiProperty({ example: '2026-03-01T10:00:00.000Z', description: 'Scheduled date/time (ISO 8601)' })
  @IsDateString()
  scheduledAt: string;
}

class FeedbackDto {
  @ApiPropertyOptional({ example: 'Strong problem-solving skills' })
  @IsOptional()
  @IsString()
  strengths?: string;

  @ApiPropertyOptional({ example: 'Could improve communication' })
  @IsOptional()
  @IsString()
  improvements?: string;

  @ApiPropertyOptional({ example: 'Hire', enum: ['Strong Hire', 'Hire', 'No Hire', 'Strong No Hire'] })
  @IsOptional()
  @IsString()
  recommendation?: string;
}

export class UpdateInterviewDto {
  @ApiPropertyOptional({ example: 'completed', enum: ['scheduled', 'ongoing', 'completed'], description: 'Interview status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'https://example.com/recording.webm', description: 'Recording URL' })
  @IsOptional()
  @IsString()
  recordingUrl?: string;

  @ApiPropertyOptional({ example: 8, description: 'Score from 1-10', minimum: 1, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  score?: number;

  @ApiPropertyOptional({ type: FeedbackDto, description: 'Interviewer feedback' })
  @IsOptional()
  feedback?: FeedbackDto;
}
