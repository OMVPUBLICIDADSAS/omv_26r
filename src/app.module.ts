import { Logger, Module, Global } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { QuoteModule } from './quote/quote.module';
import { ConfigModule } from '@nestjs/config';
// import { MailerModule, MailerService } from '@nestjs-modules/mailer'; recuperar cuando se quiera usar el servicio real de correo
import { MailerService } from '@nestjs-modules/mailer';
import { EmailModule } from './email/email.module';
import { CatalogModule } from './catalog/catalog.module';
import { UsersModule } from './users/users.module';
import { GeneralModule } from './general/general.module';

const mailerLogger = new Logger('MailerModule');

@Global()
@Module({
  providers: [
    {
      provide: MailerService,
      useValue: {
        sendMail: (mailOptions) => {
          mailerLogger.log(`📧 [MOCK] Enviando correo a: ${mailOptions.to}`);
          return Promise.resolve(true);
        },
      },
    },
  ],
  exports: [MailerService],
})
class MockMailerModule {}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, }),
    MongooseModule.forRoot(
      process.env.MONGO_URI
    ),

    MockMailerModule,
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
