import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log', 'debug', 'verbose'] });

  app.enableCors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('InterviewHub API')
    .setDescription(
      'Full-stack mock interview platform API.\n\n' +
      '**Features:** JWT Authentication, Interview Management, Real-time Chat, ' +
      'Code Execution, Video Call Signaling, Feedback System.\n\n' +
      'Use the **Authorize** button with a Bearer token from `/api/auth/login` to access protected endpoints.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Enter your JWT token' },
      'JWT',
    )
    .addTag('Auth', 'Register and login endpoints')
    .addTag('Users', 'User management (requires auth)')
    .addTag('Interviews', 'Interview CRUD and analytics (requires auth)')
    .addTag('Submissions', 'Code submission and execution (requires auth)')
    .addTag('Chat', 'Chat message history (requires auth)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'InterviewHub API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      tagsSorter: 'alpha',
    },
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
