import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreateSubmissionDto {
  @IsMongoId()
  interviewId: string;

  @IsString()
  @IsNotEmpty()
  language: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}
