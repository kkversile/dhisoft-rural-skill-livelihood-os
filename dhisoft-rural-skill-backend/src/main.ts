import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser = require('cookie-parser');
const helmet = require('helmet') as unknown as (options?: Record<string, unknown>) => unknown;
const pinoHttp = require('pino-http') as unknown as (options?: Record<string, unknown>) => unknown;
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.use(pinoHttp({ redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'] }));
  const frontend = process.env.FRONTEND_URL || 'http://localhost:7000';
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => { if (!origin || origin === frontend) callback(null, true); else callback(new Error('Origin not allowed'), false); },
    credentials: true, methods: ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','X-CSRF-Token','Authorization'],
  });
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
  const config = new DocumentBuilder().setTitle('DHISOFT Rural Skill and Livelihood API').setVersion('1.0').addCookieAuth('access_token').addCookieAuth('refresh_token').build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  await app.listen(Number(process.env.PORT || 7006), '0.0.0.0');
}
bootstrap();
