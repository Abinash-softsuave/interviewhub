import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user', description: 'Creates a new user account and returns a JWT token' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User registered successfully', schema: {
    example: {
      user: { id: '507f1f77bcf86cd799439011', name: 'John Doe', email: 'john@example.com', role: 'interviewer' },
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    },
  }})
  @ApiResponse({ status: 400, description: 'Email already registered or validation error' })
  async register(@Body() dto: RegisterDto) {
    try {
      return await this.authService.register(dto);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { message: error.message, detail: error.stack?.split('\n').slice(0, 3) },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with credentials', description: 'Authenticates user and returns a JWT token' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 201, description: 'Login successful', schema: {
    example: {
      user: { id: '507f1f77bcf86cd799439011', name: 'John Doe', email: 'john@example.com', role: 'interviewer' },
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    },
  }})
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
