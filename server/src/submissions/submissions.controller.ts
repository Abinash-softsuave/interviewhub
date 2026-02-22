import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Submissions')
@ApiBearerAuth('JWT')
@Controller('submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private submissionsService: SubmissionsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit and execute code', description: 'Submits code for execution via Judge0 API. Returns output or fallback message.' })
  @ApiResponse({ status: 201, description: 'Code submitted and executed', schema: {
    example: {
      _id: '507f1f77bcf86cd799439011',
      interviewId: '507f1f77bcf86cd799439012',
      language: 'javascript',
      code: 'console.log("Hello")',
      output: 'Hello\n',
    },
  }})
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() dto: CreateSubmissionDto) {
    return this.submissionsService.create(dto);
  }

  @Get('interview/:interviewId')
  @ApiOperation({ summary: 'Get submissions for interview', description: 'Returns all code submissions for a given interview' })
  @ApiParam({ name: 'interviewId', description: 'Interview ObjectId' })
  @ApiResponse({ status: 200, description: 'List of submissions' })
  findByInterview(@Param('interviewId') interviewId: string) {
    return this.submissionsService.findByInterview(interviewId);
  }
}
