import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateEmailDto } from './dto/create-email.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { UpdateQuoteDto } from 'src/quote/dto/update-quote.dto';

@Injectable()
export class EmailService {

  constructor(private mails: MailerService) { }

  async quoteEmail(updateQuoteDto: UpdateQuoteDto, pdf: Buffer): Promise<void> {
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
        console.error('EmailService: Error al enviar quoteEmail:', e);
        throw new HttpException(`ERROR_EMAIL ${e}`, HttpStatus.INTERNAL_SERVER_ERROR);
      });
  }

  async newQuoteEmail(createdQuote: UpdateQuoteDto, maillist: string): Promise<void> {
    console.log(`EmailService: Enviando notificación de nueva cotización a: ${maillist}`);
    const amaillist = maillist.split(';');
    const adminEmails = process.env.ADMIN_NOTIFY_EMAILS ? process.env.ADMIN_NOTIFY_EMAILS.split(';') : [];

    return await this.mails.sendMail({
      to: [...amaillist, ...adminEmails],
      // from: adminEmails[0] || 'noreply@omvpublicidad.com',
      from: process.env.EMAIL_USER,
      subject: `Nueva solicitud de cotización. Cliente: ${createdQuote.client_name} Correo: ${createdQuote.client_email}`,
    })
      .then(() => console.log('EmailService: Notificación de nueva cotización enviada.'))
      .catch((e) => {
        console.error('EmailService: Error al enviar newQuoteEmail:', e);
        throw new HttpException(`ERROR_EMAIL ${e}`, HttpStatus.INTERNAL_SERVER_ERROR);
      });
  }

  async defaultEmailHtml(emailDto: CreateEmailDto) {
    const adminEmails = process.env.ADMIN_NOTIFY_EMAILS ? process.env.ADMIN_NOTIFY_EMAILS.split(';') : [];

    await this.mails.sendMail({
      to: [emailDto.to, ...adminEmails],
      from: process.env.EMAIL_USER,
      subject: emailDto.subject,
      html: emailDto.html,
    })
    return 'ok';
  }
}
