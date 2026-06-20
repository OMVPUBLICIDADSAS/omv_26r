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
        const provider = configService.get<string>('EMAIL_PROVIDER') || 'ZOHO';
        
        let transportOptions: any;

        // Si el proveedor es API-based (BREVO o RESEND), configuramos un transporte dummy
        // ya que el MailerService no se usará para el envío real en estos casos.
        if (provider === 'BREVO' || provider === 'RESEND') {
          mailerLogger.log(`📧 MailerModule configurado con transporte dummy para [${provider}] ya que se usa API.`);
          transportOptions = {
            host: 'dummy.smtp.com', // Host dummy
            port: 25,                // Puerto dummy
            secure: false,
            auth: {
              user: 'dummy',
              pass: 'dummy',
            },
          };
          return { transport: transportOptions };
        } else {
          // Para proveedores SMTP (ZOHO o cualquier otro por defecto)
          let host: string;
          let port: number;
          let user: string;
          let pass: string;

          // Si el proveedor es BREVO y se desea usar su SMTP, se configurarían aquí.
          // Pero dado que se prefiere la API, esta rama es para ZOHO o SMTP genérico.
          if (provider === 'BREVO') { // Si se desea usar BREVO SMTP en lugar de API
            host = configService.get<string>('BREVO_HOST') || 'smtp-relay.brevo.com';
            port = Number(configService.get<number>('BREVO_PORT')) || 587;
            user = configService.get<string>('BREVO_USER');
            pass = configService.get<string>('BREVO_PASS');
          } else { // Por defecto ZOHO o las variables originales de respaldo
            host = configService.get<string>('ZOHO_HOST') || configService.get<string>('SMTP_EMAIL_LONG') || 'smtp.zoho.com';
            port = Number(configService.get<number>('ZOHO_PORT') || configService.get<number>('SMTP_PORT') || 587);
            user = configService.get<string>('ZOHO_USER') || configService.get<string>('EMAIL_USER');
            pass = configService.get<string>('EMAIL_PASS_16');
          }

          // Solo validamos credenciales SMTP si el proveedor activo requiere MailerModule
          if (!user || !pass) {
            mailerLogger.error(`❌ Error de configuración: Faltan credenciales para el proveedor ${provider}.`);
            mailerLogger.warn(`Asegúrate de tener ${provider === 'BREVO' ? 'BREVO_USER y BREVO_PASS' : 'ZOHO_USER y ZOHO_PASS'} en tu .env`);
          }

          transportOptions = {
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
            debug: false,
            logger: false,
            connectionTimeout: 30000, greetingTimeout: 30000, socketTimeout: 30000,
            tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2', servername: host },
          };
          mailerLogger.log(`📧 Mailer SMTP configurado para [${provider}] en ${host}`);
          return { transport: transportOptions };
        }
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
