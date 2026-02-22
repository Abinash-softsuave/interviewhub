import {
  Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { InterviewsService } from './interviews.service';
import { CreateInterviewDto, UpdateInterviewDto } from './dto/create-interview.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Interviews')
@ApiBearerAuth('JWT')
@Controller('interviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InterviewsController {
  constructor(private interviewsService: InterviewsService) {}

  @Post()
  @Roles('interviewer')
  @ApiOperation({ summary: 'Create interview', description: 'Schedule a new interview (interviewer role only)' })
  @ApiResponse({ status: 201, description: 'Interview created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — interviewer role required' })
  create(@Body() dto: CreateInterviewDto) {
    return this.interviewsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all interviews', description: 'Returns all interviews with populated user details' })
  @ApiResponse({ status: 200, description: 'List of interviews' })
  findAll() {
    return this.interviewsService.findAll();
  }

  @Get('my')
  @ApiOperation({ summary: 'List my interviews', description: 'Returns interviews for the authenticated user (as candidate or interviewer)' })
  @ApiResponse({ status: 200, description: 'User\'s interviews' })
  findMy(@Req() req: any) {
    return this.interviewsService.findByUser(req.user.userId);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get analytics', description: 'Returns total interviews, completed count, and average score' })
  @ApiResponse({ status: 200, description: 'Analytics data', schema: {
    example: { total: 25, completed: 18, averageScore: 7.2 },
  }})
  getAnalytics() {
    return this.interviewsService.getAnalytics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get interview by ID' })
  @ApiParam({ name: 'id', description: 'Interview ObjectId' })
  @ApiResponse({ status: 200, description: 'Interview details with populated candidate/interviewer' })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  findOne(@Param('id') id: string) {
    return this.interviewsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update interview', description: 'Update status, score, feedback, or recording URL' })
  @ApiParam({ name: 'id', description: 'Interview ObjectId' })
  @ApiResponse({ status: 200, description: 'Interview updated' })
  update(@Param('id') id: string, @Body() dto: UpdateInterviewDto) {
    return this.interviewsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('interviewer')
  @ApiOperation({ summary: 'Delete interview', description: 'Permanently delete an interview (interviewer role only)' })
  @ApiParam({ name: 'id', description: 'Interview ObjectId' })
  @ApiResponse({ status: 200, description: 'Interview deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden — interviewer role required' })
  delete(@Param('id') id: string) {
    return this.interviewsService.delete(id);
  }
}
