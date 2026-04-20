import { NestFactory } from '@nestjs/core';
// import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { urlencoded, json } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

// Comentarios para ver que pasa con imagenes

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule); // para servir html desde Express
  const configService = app.get(ConfigService);

  // app.setGlobalPrefix('api');
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  const logger = new Logger('Bootstrap');

  const corsOrigins = configService.get<string>('CORS_ORIGINS');
  const allowedOrigins = corsOrigins 
    ? corsOrigins.split(',').map(origin => origin.trim()) 
    : ['http://localhost:4201'];

  logger.log(`✅ Orígenes permitidos cargados: ${JSON.stringify(allowedOrigins)}`);

  app.enableCors({
    origin: (origin, callback) => {
      logger.log(`🔍 Origen entrante: ${origin}`);
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.error(`⛔ Bloqueado por CORS. Origen: ${origin}. Permitidos: ${JSON.stringify(allowedOrigins)}`);
        callback(new Error('Not allowed by CORS_ORIGINS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true
  });

  const config = new DocumentBuilder()
    .setTitle('omv API documentation')
    .setDescription('Documentación para acceder a las APIs de omv')
    .setVersion('1.0')
    .addTag('quote')
    .addTag('email')
    .addTag('users')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('documentation', app, document);
  app.useGlobalPipes(new ValidationPipe());

  
  // para servir html desde Express
  // https://stackoverflow.com/questions/54680459/serving-static-content-alongisde-angular-app
  app.useStaticAssets(join(__dirname, '..', 'page'), { prefix: "/page/" });
  app.useStaticAssets(join(__dirname, '..', 'app'), { prefix: "/app/" });
  app.useStaticAssets(join(__dirname, '..', 'page'), { prefix: "/" });
  // app.useStaticAssets(join(__dirname, '..', 'page'), { prefix: "*" });
  
  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
}
bootstrap();