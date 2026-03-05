import { Logger, Module, Global } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { QuoteModule } from './quote/quote.module';
import { ConfigModule } from '@nestjs/config';
import { MailerModule, MailerService } from '@nestjs-modules/mailer';
import { EmailModule } from './email/email.module';
import { CatalogModule } from './catalog/catalog.module';
import { UsersModule } from './users/users.module';
import { GeneralModule } from './general/general.module';

const mailerLogger = new Logger('MailerModule');

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, }),
    MongooseModule.forRoot(
      process.env.MONGO_URI
    ),

    MailerModule.forRootAsync({
      useFactory: () => {
        const transportOptions = {
          host: process.env.SMTP_EMAIL_LONG,
          port: parseInt(process.env.SMTP_PORT, 10),
          // Para la mayoría de servicios como Gmail, `secure` es true en el puerto 465.
          secure: parseInt(process.env.SMTP_PORT, 10) === 465,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS_16,
          },
        };
        mailerLogger.log(`📧 Estas son las opciones de envío: { host: '${transportOptions.host}', port: ${transportOptions.port}, secure: ${transportOptions.secure}, user: '${transportOptions.auth.user}' }`);
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

/*
imports: [MongooseModule.forRoot(process.env.MONGODB), QuoteModule],
*/
