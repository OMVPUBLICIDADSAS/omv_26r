import { NestFactory } from '@nestjs/core';
// import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { urlencoded, json } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

// Comentarios para ver que pasa con imagenes

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule); // para servir html desde Express
  // const app = await NestFactory.create(AppModule);
  // app.setGlobalPrefix('api');
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.enableCors({
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'],
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
  

  await app.listen(process.env.PORT);
}
bootstrap();

// https://www.youtube.com/watch?v=K7TYj86Z3rY&t=3614s
// https://www.youtube.com/watch?v=xRXHQlqA3Ak&t=2s min 12 para atlas mongo

// create basic html index?

/*
SMPT_EMAIL_SHORT=gmail
SMPT_EMAIL_LONG=smtp.gmail.com
EMAIL_USER=omvpublicidadcotiza@gmail.com
EMAIL_PASS=omb_12346
EMAIL_PASS_16=hdqcevfpdefmcybx
*/