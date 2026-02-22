import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Unique email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Password (min 6 characters)', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'interviewer', enum: ['interviewer', 'candidate'], description: 'User role' })
  @IsEnum(['interviewer', 'candidate'])
  role: string;
}
