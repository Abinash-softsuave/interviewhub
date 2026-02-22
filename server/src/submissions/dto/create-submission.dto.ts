import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubmissionDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Interview ID' })
  @IsMongoId()
  interviewId: string;

  @ApiProperty({ example: 'javascript', enum: ['javascript', 'python', 'java', 'cpp'], description: 'Programming language' })
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiProperty({ example: 'console.log("Hello, World!");', description: 'Source code to execute' })
  @IsString()
  @IsNotEmpty()
  code: string;
}
