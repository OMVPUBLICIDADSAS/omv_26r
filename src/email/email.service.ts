import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { CreateEmailDto } from './dto/create-email.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { UpdateQuoteDto } from 'src/quote/dto/update-quote.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private mails: MailerService,
    private readonly httpService: HttpService,
  ) { }

  private async sendViaResend(payload: any) {
    const apiKey = process.env.RESEND_API_KEY;
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

  async quoteEmail(updateQuoteDto: UpdateQuoteDto, pdf: Buffer): Promise<void> {
    // Interruptor de proveedor
    if (process.env.EMAIL_PROVIDER === 'RESEND') {
      return this.quoteEmailResend(updateQuoteDto, pdf);
    }

    console.log(`EmailService: Preparando envío de cotización PDF a: ${updateQuoteDto.client_email}`);
    const maillist = updateQuoteDto.client_email.split(';');
    // Sugerencia: Usar una variable específica para notificaciones, no la de login
    const adminEmails = process.env.ADMIN_NOTIFY_EMAILS ? process.env.ADMIN_NOTIFY_EMAILS.split(';') : [];

    return await this.mails.sendMail({
      to: [...maillist, ...adminEmails],
      from: process.env.EMAIL_USER,
      subject: 'OMVPUBLICIDAD. Respuesta a su solicitud de cotización.',
      // html: updateQuoteDto.htmlQuote,
      attachments: [
        { filename: `${updateQuoteDto.client_name}_cotiza.pdf`, content: pdf },
        // { filename: `${updateQuoteDto.client_name}_cotiza.html`, content: updateQuoteDto.htmlQuote }
      ],
    })
      .then(() => console.log('EmailService: Correo enviado exitosamente.'))
      .catch((e) => {
        console.error('EmailService: Error SMTP (quoteEmail). Detalle:', { message: e.message, code: e.code, command: e.command });
        throw new HttpException(`ERROR_EMAIL ${e}`, HttpStatus.INTERNAL_SERVER_ERROR);
      });
  }

  async quoteEmailResend(updateQuoteDto: UpdateQuoteDto, pdf: Buffer): Promise<void> {
    this.logger.log(`EmailService (API): Enviando cotización a: ${updateQuoteDto.client_email}`);
    const maillist = updateQuoteDto.client_email.split(';');
    const adminEmails = process.env.ADMIN_NOTIFY_EMAILS ? process.env.ADMIN_NOTIFY_EMAILS.split(';') : [];

    await this.sendViaResend({
      from: process.env.EMAIL_USER || 'onboarding@resend.dev',
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
    console.log('EmailService (API): Correo enviado exitosamente.');
  }

  async newQuoteEmail(createdQuote: UpdateQuoteDto, maillist: string): Promise<void> {
    // Interruptor de proveedor
    if (process.env.EMAIL_PROVIDER === 'RESEND') {
      return this.newQuoteEmailResend(createdQuote, maillist);
    }

    console.log(`EmailService: Iniciando newQuoteEmail. Destinatarios: ${maillist}`);
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS_16) {
      console.error('EmailService: ERROR - Faltan credenciales (EMAIL_USER o EMAIL_PASS_16) en el entorno.');
      throw new Error('Configuración de email faltante');
    }
    console.log(`EmailService: Usando cuenta: ${process.env.EMAIL_USER}. (Pass len: ${process.env.EMAIL_PASS_16.length})`);

    const amaillist = maillist.split(';');
    const adminEmails = process.env.ADMIN_NOTIFY_EMAILS ? process.env.ADMIN_NOTIFY_EMAILS.split(';') : [];

    return await this.mails.sendMail({
      to: [...amaillist, ...adminEmails],
      from: process.env.EMAIL_USER,
      subject: `Nueva solicitud de cotización. Cliente: ${createdQuote.client_name} Correo: ${createdQuote.client_email}`,
    })
      .then(() => console.log('EmailService: Notificación de nueva cotización enviada.'))
      .catch((e) => {
        console.error('EmailService: Error SMTP (newQuoteEmail). Detalle:', { message: e.message, code: e.code, command: e.command });
        throw new HttpException(`ERROR_EMAIL ${e}`, HttpStatus.INTERNAL_SERVER_ERROR);
      });
  }

  async newQuoteEmailResend(createdQuote: UpdateQuoteDto, maillist: string): Promise<void> {
    this.logger.log(`EmailService (API): Notificando nueva cotización.`);

    const amaillist = maillist.split(';');
    const adminEmails = process.env.ADMIN_NOTIFY_EMAILS ? process.env.ADMIN_NOTIFY_EMAILS.split(';') : [];

    await this.sendViaResend({
      from: process.env.EMAIL_USER || 'onboarding@resend.dev',
      to: [...amaillist, ...adminEmails],
      subject: `Nueva solicitud de cotización. Cliente: ${createdQuote.client_name} Correo: ${createdQuote.client_email}`,
      text: `Se ha recibido una nueva solicitud de ${createdQuote.client_name} (${createdQuote.client_email}).`,
    });
  }

  async defaultEmailHtml(emailDto: CreateEmailDto) {
    // Interruptor de proveedor
    if (process.env.EMAIL_PROVIDER === 'RESEND') {
      return this.defaultEmailHtmlResend(emailDto);
    }

    const adminEmails = process.env.ADMIN_NOTIFY_EMAILS ? process.env.ADMIN_NOTIFY_EMAILS.split(';') : [];

    await this.mails.sendMail({
      to: [emailDto.to, ...adminEmails],
      from: process.env.EMAIL_USER,
      subject: emailDto.subject,
      html: emailDto.html,
    })
    return 'ok';
  }

  async defaultEmailHtmlResend(emailDto: CreateEmailDto) {
    const adminEmails = process.env.ADMIN_NOTIFY_EMAILS ? process.env.ADMIN_NOTIFY_EMAILS.split(';') : [];

    await this.sendViaResend({
      from: process.env.EMAIL_USER || 'onboarding@resend.dev',
      to: [emailDto.to, ...adminEmails],
      subject: emailDto.subject,
      html: emailDto.html,
    });
    return 'ok';
  }
}
