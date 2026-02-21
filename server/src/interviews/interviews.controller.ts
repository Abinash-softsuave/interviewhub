import {
  Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards,
} from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { CreateInterviewDto, UpdateInterviewDto } from './dto/create-interview.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('interviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InterviewsController {
  constructor(private interviewsService: InterviewsService) {}

  @Post()
  @Roles('interviewer')
  create(@Body() dto: CreateInterviewDto) {
    return this.interviewsService.create(dto);
  }

  @Get()
  findAll() {
    return this.interviewsService.findAll();
  }

  @Get('my')
  findMy(@Req() req: any) {
    return this.interviewsService.findByUser(req.user.userId);
  }

  @Get('analytics')
  getAnalytics() {
    return this.interviewsService.getAnalytics();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.interviewsService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInterviewDto) {
    return this.interviewsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('interviewer')
  delete(@Param('id') id: string) {
    return this.interviewsService.delete(id);
  }
}
