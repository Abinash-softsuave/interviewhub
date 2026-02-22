import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'john@example.com', description: 'Registered email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Account password', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
