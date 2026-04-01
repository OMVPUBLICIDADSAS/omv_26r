import { Logger, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { QuoteModule } from './quote/quote.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailModule } from './email/email.module';
import { CatalogModule } from './catalog/catalog.module';
import { UsersModule } from './users/users.module';
import { GeneralModule } from './general/general.module';
import { MarpicoModule } from './marpico/marpico.module';
//import { ScheduleModule } from '@nestjs/schedule'; // <--- Importar esto
//import { TasksModule } from './tasks/tasks.module'; // <--- Importar esto

const mailerLogger = new Logger('MailerModule');


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
    }),

    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const transportOptions = {
          host: configService.get<string>('SMTP_EMAIL_LONG'),
          port: configService.get<number>('SMTP_PORT'),
          // Para la mayoría de servicios como Gmail, `secure` es true en el puerto 465.
          secure: Number(configService.get<number>('SMTP_PORT')) === 465,
          auth: {
            user: configService.get<string>('EMAIL_USER'),
            pass: configService.get<string>('EMAIL_PASS_16'),
          },
        };
        mailerLogger.log(`📧 Mailer configurado para host: ${transportOptions.host}:${transportOptions.port}`);
        return {
          transport: transportOptions,
        };
      },
    }),
    QuoteModule,
    EmailModule,
    CatalogModule,
    UsersModule,
    GeneralModule,
    MarpicoModule,
    // ScheduleModule.forRoot(),
    // TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

/*
imports: [MongooseModule.forRoot(process.env.MONGODB), QuoteModule],
*/
