import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true, rawBody: true });
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use('/api/v1/payments/webhook', express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));
  app.use('/api/v1/reels/mux-webhook', express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));

  // NEW: serve uploaded images (contest banners, audition posters) statically.
  // See uploads.controller.ts for the important note about ephemeral storage on free hosting tiers.
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  const config = new DocumentBuilder().setTitle('Talent Platform API').setVersion('1.0').addBearerAuth().build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`API running on port ${port} — docs at /api/docs`);
}
bootstrap();
