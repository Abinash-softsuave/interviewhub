import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users', description: 'Returns all users. Optionally filter by role.' })
  @ApiQuery({ name: 'role', required: false, enum: ['interviewer', 'candidate'], description: 'Filter by role' })
  @ApiResponse({ status: 200, description: 'List of users (password excluded)', schema: {
    example: [
      { _id: '507f1f77bcf86cd799439011', name: 'John Doe', email: 'john@example.com', role: 'interviewer', createdAt: '2026-01-01T00:00:00.000Z' },
    ],
  }})
  @ApiResponse({ status: 401, description: 'Unauthorized — JWT token required' })
  findAll(@Query('role') role?: string) {
    if (role) return this.usersService.findByRole(role);
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId of the user' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
