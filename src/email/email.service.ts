import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { CreateEmailDto } from './dto/create-email.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { UpdateQuoteDto } from 'src/quote/dto/update-quote.dto';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { BrevoClient, Brevo } from '@getbrevo/brevo';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private brevoClient: BrevoClient;

  constructor(
    private mails: MailerService,
    private readonly httpService: HttpService, // Usado para Resend
    private readonly configService: ConfigService,
  ) {
    // Inicializa el cliente de la API de Brevo
    const brevoApiKey = this.configService.get<string>('BREVO_API_KEY');
    if (!brevoApiKey) {
      this.logger.warn('BREVO_API_KEY no está configurada. Los servicios de Brevo no estarán disponibles.');
      return;
    }

    if (!brevoApiKey.startsWith('xkeysib-')) {
      this.logger.error('BREVO_API_KEY parece ser una SMTP Key (xsmtpsib). Se requiere una API Key (xkeysib) para el SDK.');
      return;
    }

    this.brevoClient = new BrevoClient({ apiKey: brevoApiKey });
  }

  /**
   * Retorna el email del remitente (from) basándose en el proveedor activo.
   */
  private getFromEmail(): string {
    // Priorizamos EMAIL_USER, luego ZOHO_USER, y finalmente un fallback
    return (
      this.configService.get<string>('EMAIL_USER') ||
      this.configService.get<string>('ZOHO_USER') ||
      'no-reply@omvpublicidad.com'
    );
  }

  /**
   * Limpia y formatea una cadena de emails separados por punto y coma.
   */
  private parseMailList(emails: string): string[] {
    if (!emails) return [];
    return emails.split(';').map(e => e.trim()).filter(e => !!e);
  }

  private async sendViaResend(payload: any) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      throw new Error('Falta RESEND_API_KEY en las variables de entorno');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post('https://api.resend.com/emails', payload, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );
      return response.data;
    } catch (e: any) {
      const errorData = e.response?.data || e.message;
      this.logger.error('Error en API de Resend:', errorData);
      throw new HttpException(`ERROR_API_EMAIL: ${JSON.stringify(errorData)}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async sendViaBrevo(sendSmtpEmail: Brevo.SendTransacEmailRequest) {
    if (!this.brevoClient) {
      throw new Error('El cliente de Brevo API no está inicializado. Verifique BREVO_API_KEY.');
    }
    try {
      const response = await this.brevoClient.transactionalEmails.sendTransacEmail(sendSmtpEmail);
      return response;
    } catch (e: any) {
      const errorData = e.response?.body || e.message;
      this.logger.error('Error en API de Brevo:', errorData);
      throw new HttpException(`ERROR_API_EMAIL: ${JSON.stringify(errorData)}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async quoteEmail(updateQuoteDto: UpdateQuoteDto, pdf: Buffer): Promise<void> {
    // Interruptor de proveedor
    const provider = this.configService.get<string>('EMAIL_PROVIDER');
    if (provider === 'RESEND') {
      return this.quoteEmailResend(updateQuoteDto, pdf);
    } else if (provider === 'BREVO') {
      return this.quoteEmailBrevo(updateQuoteDto, pdf);
    }

    this.logger.log(`Preparando envío de cotización SMTP a: ${updateQuoteDto.client_email}`);
    const maillist = this.parseMailList(updateQuoteDto.client_email);
    const adminEmails = this.parseMailList(this.configService.get<string>('ADMIN_NOTIFY_EMAILS') || '');

    return await this.mails.sendMail({
      to: [...maillist, ...adminEmails],
      from: this.getFromEmail(),
      subject: 'OMVPUBLICIDAD. Respuesta a su solicitud de cotización.',
      attachments: [{ filename: `${updateQuoteDto.client_name}_cotiza.pdf`, content: pdf }],
    })
      .then(() => this.logger.log('Correo enviado exitosamente (SMTP).'))
      .catch((e) => {
        this.logger.error('Error SMTP (quoteEmail).', e.message);
        throw new HttpException(`ERROR_EMAIL ${e}`, HttpStatus.INTERNAL_SERVER_ERROR);
      });
  }

  async quoteEmailResend(updateQuoteDto: UpdateQuoteDto, pdf: Buffer): Promise<void> {
    this.logger.log(`EmailService (API): Enviando cotización a: ${updateQuoteDto.client_email}`);
    const maillist = this.parseMailList(updateQuoteDto.client_email);
    const adminEmails = this.parseMailList(this.configService.get<string>('ADMIN_NOTIFY_EMAILS') || '');

    await this.sendViaResend({
      from: this.getFromEmail() || 'onboarding@resend.dev',
      to: [...maillist, ...adminEmails],
      subject: 'OMVPUBLICIDAD. Respuesta a su solicitud de cotización.',
      html: '<p>Adjunto encontrará su cotización en formato PDF.</p>',
      attachments: [
        { 
          filename: `${updateQuoteDto.client_name}_cotiza.pdf`, 
          content: pdf.toString('base64') 
        },
      ],
    });
    this.logger.log('EmailService (Resend): Correo enviado exitosamente.');
  }

  async quoteEmailBrevo(updateQuoteDto: UpdateQuoteDto, pdf: Buffer): Promise<void> {
    this.logger.log(`EmailService (Brevo): Enviando cotización a: ${updateQuoteDto.client_email}`);
    const maillist = this.parseMailList(updateQuoteDto.client_email);
    const adminEmails = this.parseMailList(this.configService.get<string>('ADMIN_NOTIFY_EMAILS') || '');

    const sendSmtpEmail: Brevo.SendTransacEmailRequest = {
      sender: { email: this.getFromEmail() || 'onboarding@brevo.com' },
      to: [...maillist, ...adminEmails].map(email => ({ email })),
      subject: 'OMVPUBLICIDAD. Respuesta a su solicitud de cotización.',
      htmlContent: '<p>Adjunto encontrará su cotización en formato PDF.</p>',
      attachment: [
        {
          name: `${updateQuoteDto.client_name}_cotiza.pdf`,
          content: pdf.toString('base64'),
        },
      ],
    };

    await this.sendViaBrevo(sendSmtpEmail);
    this.logger.log('EmailService (Brevo): Correo enviado exitosamente.');
  }

  async newQuoteEmail(createdQuote: UpdateQuoteDto, maillist: string): Promise<void> {
    // Interruptor de proveedor
    const provider = this.configService.get<string>('EMAIL_PROVIDER');
    if (provider === 'RESEND') {
      return this.newQuoteEmailResend(createdQuote, maillist);
    } else if (provider === 'BREVO') {
      return this.newQuoteEmailBrevo(createdQuote, maillist);
    }

    this.logger.log(`Iniciando newQuoteEmail (SMTP). Destinatarios: ${maillist}`);
    
    if (!this.getFromEmail()) {
      this.logger.error('Configuración de email remitente faltante.');
      throw new Error('Configuración de email faltante');
    }

    const amaillist = this.parseMailList(maillist);
    const adminEmails = this.parseMailList(this.configService.get<string>('ADMIN_NOTIFY_EMAILS') || '');

    return await this.mails.sendMail({
      to: [...amaillist, ...adminEmails],
      from: this.getFromEmail(),
      subject: `Nueva solicitud de cotización. Cliente: ${createdQuote.client_name} Correo: ${createdQuote.client_email}`,
    })
      .then(() => this.logger.log('Notificación de nueva cotización enviada (SMTP).'))
      .catch((e) => {
        this.logger.error('Error SMTP (newQuoteEmail).', e.message);
        throw new HttpException(`ERROR_EMAIL ${e}`, HttpStatus.INTERNAL_SERVER_ERROR);
      });
  }

  async newQuoteEmailResend(createdQuote: UpdateQuoteDto, maillist: string): Promise<void> {
    this.logger.log(`EmailService (API): Notificando nueva cotización.`);

    const amaillist = this.parseMailList(maillist);
    const adminEmails = this.parseMailList(this.configService.get<string>('ADMIN_NOTIFY_EMAILS') || '');

    await this.sendViaResend({
      from: this.getFromEmail() || 'onboarding@resend.dev',
      to: [...amaillist, ...adminEmails],
      subject: `Nueva solicitud de cotización. Cliente: ${createdQuote.client_name} Correo: ${createdQuote.client_email}`,
      text: `Se ha recibido una nueva solicitud de ${createdQuote.client_name} (${createdQuote.client_email}).`,
    });
  }

  async newQuoteEmailBrevo(createdQuote: UpdateQuoteDto, maillist: string): Promise<void> {
    this.logger.log(`EmailService (Brevo): Notificando nueva cotización.`);

    const amaillist = this.parseMailList(maillist);
    const adminEmails = this.parseMailList(this.configService.get<string>('ADMIN_NOTIFY_EMAILS') || '');

    const sendSmtpEmail: Brevo.SendTransacEmailRequest = {
      sender: { email: this.getFromEmail() || 'onboarding@brevo.com' },
      to: [...amaillist, ...adminEmails].map(email => ({ email })),
      subject: `Nueva solicitud de cotización. Cliente: ${createdQuote.client_name} Correo: ${createdQuote.client_email}`,
      htmlContent: `Se ha recibido una nueva solicitud de ${createdQuote.client_name} (${createdQuote.client_email}).`,
    };

    await this.sendViaBrevo(sendSmtpEmail);
    this.logger.log('EmailService (Brevo): Notificación de nueva cotización enviada.');
  }

  async defaultEmailHtml(emailDto: CreateEmailDto) {
    // Interruptor de proveedor
    const provider = this.configService.get<string>('EMAIL_PROVIDER');
    if (provider === 'RESEND') {
      return this.defaultEmailHtmlResend(emailDto);
    } else if (provider === 'BREVO') {
      return this.defaultEmailHtmlBrevo(emailDto);
    }

    const adminEmails = this.parseMailList(this.configService.get<string>('ADMIN_NOTIFY_EMAILS') || '');

    await this.mails.sendMail({
      to: [emailDto.to, ...adminEmails],
      from: this.getFromEmail(),
      subject: emailDto.subject,
      html: emailDto.html,
    })
    return 'ok';
  }

  async defaultEmailHtmlResend(emailDto: CreateEmailDto) {
    const adminEmails = this.parseMailList(this.configService.get<string>('ADMIN_NOTIFY_EMAILS') || '');

    await this.sendViaResend({
      from: this.getFromEmail() || 'onboarding@resend.dev',
      to: [emailDto.to, ...adminEmails],
      subject: emailDto.subject,
      html: emailDto.html,
    });
    return 'ok';
  }

  async defaultEmailHtmlBrevo(emailDto: CreateEmailDto) {
    this.logger.log(`EmailService (Brevo): Enviando email por defecto a: ${emailDto.to}`);
    const adminEmails = this.parseMailList(this.configService.get<string>('ADMIN_NOTIFY_EMAILS') || '');

    const sendSmtpEmail: Brevo.SendTransacEmailRequest = {
      sender: { email: this.getFromEmail() || 'onboarding@brevo.com' },
      to: [emailDto.to, ...adminEmails].map(email => ({ email })),
      subject: emailDto.subject,
      htmlContent: emailDto.html,
    };

    await this.sendViaBrevo(sendSmtpEmail);
    this.logger.log('EmailService (Brevo): Email por defecto enviado exitosamente.');
    return 'ok';
  }
}
