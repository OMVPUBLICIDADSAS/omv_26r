import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateEmailDto } from './dto/create-email.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { UpdateQuoteDto } from 'src/quote/dto/update-quote.dto';

@Injectable()
export class EmailService {

  constructor(private mails: MailerService) { }

  async quoteEmail(updateQuoteDto: UpdateQuoteDto, pdf: Buffer) {
    const maillist = updateQuoteDto.client_email.split(';');
    return await this.mails.sendMail({
      to: [... maillist, 'gerente@omvpublicidad.com'],
      from: process.env.EMAIL_USER, // from: updateQuoteDto.agent_email,
      subject: 'OMVPUBLICIDAD. Respuesta a su solicitud de cotización.',
      // html: updateQuoteDto.htmlQuote,
      attachments: [
        { filename: `${updateQuoteDto.client_name}_cotiza.pdf`, content: pdf },
        // { filename: `${updateQuoteDto.client_name}_cotiza.html`, content: updateQuoteDto.htmlQuote }
      ],
    })
      .catch((e) => {
        console.error(e);
        throw new HttpException(`ERROR_EMAIL ${e}`, HttpStatus.INTERNAL_SERVER_ERROR);
      });
  }

  async newQuoteEmail(createdQuote: UpdateQuoteDto, maillist: string) {
    const amaillist = maillist.split(';');
    return await this.mails.sendMail({
      to: [... amaillist, 'gerente@omvpublicidad.com'],
      from: process.env.EMAIL_USER, // from: updateQuoteDto.agent_email,
      subject: `Nueva solicitud de cotización. Cliente: ${createdQuote.client_name} Correo: ${createdQuote.client_email}`,
    })
      .catch((e) => {
        console.error(e);
        throw new HttpException(`ERROR_EMAIL ${e}`, HttpStatus.INTERNAL_SERVER_ERROR);
      });
  }

  async defaultEmailHtml(emailDto: CreateEmailDto) {
    await this.mails.sendMail({
      to: [emailDto.to, 'gerente@omvpublicidad.com'],
      from: emailDto.from,
      subject: emailDto.subject,
      html: emailDto.html,
    })
    return 'ok';
  }
}
