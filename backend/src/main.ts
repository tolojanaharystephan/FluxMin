import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(helmet());
  app.set('trust proxy', 1);

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const isProd = process.env.NODE_ENV === 'production';
  app.enableCors({
    origin: isProd && frontendUrl === '*' ? false : frontendUrl,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerEnabled =
    process.env.SWAGGER_ENABLED === 'true' ||
    (!isProd && process.env.SWAGGER_ENABLED !== 'false');

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('FluxMin API')
      .setDescription(
        'API de la plateforme de gestion des courriers ministériels (auth, courriers, gouvernement, stats).',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT',
      )
      .addTag('System', 'Health et ping')
      .addTag('Auth', 'Authentification JWT')
      .addTag('Courriers', 'Cycle de vie des courriers')
      .addTag('Gouvernement', 'Communications gouvernementales')
      .addTag('Admin', 'Ministères, directions, utilisateurs')
      .addTag('Stats', 'Dashboard, analytics, process mining')
      .addTag('Notifications', 'Notifications in-app')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      useGlobalPrefix: true,
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);
  console.log(`🚀 FluxMin Backend running on http://localhost:${port}/api`);
  if (swaggerEnabled) {
    console.log(`📚 Swagger UI → http://localhost:${port}/api/docs`);
  }
}
bootstrap();
