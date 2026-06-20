import { Model } from 'mongoose';
import { Injectable, Inject, HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { Quote } from './schemas/quote.schema';
import { EmailService } from 'src/email/email.service';
import { GeneralService } from 'src/general/general.service';
import puppeteer from "puppeteer";
// import * as fs from 'fs';

@Injectable()
export class QuoteService {
  constructor(
    @InjectModel(Quote.name) private quoteModel: Model<Quote>,
    @Inject(EmailService) private readonly emails: EmailService,
    @Inject(GeneralService) private generalService: GeneralService
  ) { }

  async create(createQuoteDto: CreateQuoteDto): Promise<Quote> {
    console.log('QuoteService: Iniciando proceso de creación de cotización...');
    const data = await this.generalService.consecutive();
    createQuoteDto.consecutive = data.consecutive.toString().padStart(6, '0');
    const createdQuote = new this.quoteModel(createQuoteDto);
    console.log(`QuoteService: Enviando correo de notificación (newQuoteEmail) para cliente: ${createdQuote.client_name}`);
    
    try {
      await this.emails.newQuoteEmail(createdQuote, data.notifmail);
      console.log('QuoteService: Correo de notificación enviado exitosamente.');
    } catch (emailError: any) {
      console.error('QuoteService: El correo de notificación falló, pero la cotización se guardará:', emailError?.message || emailError);
    }

    return await createdQuote.save();
  }

  async findAll(): Promise<Quote[]> {
    return await this.quoteModel.find().exec();
  }

  async findByFilter(status: number, agent_id: string): Promise<Quote[]> {
    if (!status) throw new HttpException('EMPTY_DATA', 401);
    if (status == 2) return await this.quoteModel.find({ status, agent_id }).exec();
    return await this.quoteModel.find({ status }).exec();
  }

  async findByDate(date_in: number, date_out: string): Promise<Quote[]> {
    if (!date_in || !date_out) throw new HttpException('EMPTY_DATA', 401);
    return await this.quoteModel.find({ date: { $gt: date_in, $lt: date_out } }).exec();
  }

  async findOne(id: string) {
    return await this.quoteModel.findOne({ consecutive: id }).exec();
  }

  async resend(id: string, updateQuoteDto: UpdateQuoteDto): Promise<Quote> {
    console.log(`QuoteService: Iniciando re-envío de cotización ID: ${id}`);
    const pdfBuffer = await this.html2pdf(updateQuoteDto.htmlQuote);
    await this.emails.quoteEmail(updateQuoteDto, Buffer.from(pdfBuffer));
    return await this.quoteModel.findById(id).exec();
  }

  async update(id: string, updateQuoteDto: UpdateQuoteDto): Promise<Quote> {
    console.log(`QuoteService: Recibida solicitud de actualización para ID: ${id} con status: ${updateQuoteDto.status}`);
    
    // si user no es el mismo, no lo actualiza
    const prevQuote = await this.quoteModel.findById(id);
    if (!prevQuote) {
      console.error(`QuoteService: No se encontró la cotización con ID: ${id}`);
      throw new HttpException('QUOTE_NOT_FOUND', 404);
    }

    if (prevQuote.status === 4) throw new HttpException('FORBIDDEN', 403);
    if (updateQuoteDto.status === 4) {
      console.log(`QuoteService: Detectado status 4 para ID: ${id}. Iniciando generación de PDF y envío de correo.`);
      const pdfBuffer = await this.html2pdf(updateQuoteDto.htmlQuote);
      if (pdfBuffer) {
        await this.emails.quoteEmail(updateQuoteDto, Buffer.from(pdfBuffer));
      } else {
        console.error('QuoteService: Error al generar el PDF (buffer undefined). El correo no se enviará.');
        throw new HttpException('PDF_GENERATION_FAILED', 500);
      }
    }
    return await this.quoteModel.findByIdAndUpdate(id, updateQuoteDto, { new: true });
  }

  async remove(id: string) {
    return await this.quoteModel.findByIdAndDelete(id);
  }

  // https://github.com/saemhco/nestjs-html-pdf
  // https://github.com/saemhco/nestjs-html-pdf/blob/main/src/index.ts
  async html2pdf(htmlQuote: string, options = {}) {
    console.log('QuoteService: Lanzando Puppeteer para generar PDF...');
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(htmlQuote);
      const buffer = await page.pdf({
        // path: 'output-abc.pdf',
        format: 'letter',
        printBackground: true,
        margin: {
          left: '10mm',
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
        },
        ...options,
      });
      await browser.close();
      console.log('QuoteService: PDF generado con éxito.');
      // process.exit();
      return buffer;

    } catch (e) {
      console.error('QuoteService: ERROR crítico en html2pdf (Puppeteer):', e);
      if (browser) await browser.close();
      return null;
    }
  }
}
