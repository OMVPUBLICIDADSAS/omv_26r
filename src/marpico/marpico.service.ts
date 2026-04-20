import { Inject, Injectable, HttpException, Logger } from '@nestjs/common';
import { CreateMarpicoDto } from './dto/create-marpico.dto';
import { UpdateMarpicoDto } from './dto/update-marpico.dto';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { GeneralService } from 'src/general/general.service';
import { Marpico } from './schemas/marpico.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MarpicoService {
  private readonly logger = new Logger(MarpicoService.name);

  constructor(
    @InjectModel(Marpico.name) private marpicoModel: Model<Marpico>,
    private readonly httpService: HttpService,
    @Inject(GeneralService) private generalService: GeneralService,
    private readonly configService: ConfigService,
  ) { }

  @Cron('0 */12 * * *')
  async handleCron() {
    this.logger.log('Iniciando actualización programada de Marpico...');
    const result = await this.updateFromMarpico();
    this.logger.log(`Sincronización finalizada. Registros: ${result.count}`);
  }

  create(createMarpicoDto: CreateMarpicoDto) {
    return 'This action adds a new marpico';
  }

  async updateFromMarpico() {
    try {
      const headersRequest = {
        'Content-Type': 'application/json',
        'Authorization': 'Api-Key ' + this.configService.get<string>('API_KEY')
      }

      const response = await lastValueFrom(
        this.httpService.get(this.configService.get<string>('MARPICO_URL'), { headers: headersRequest })
      );

      if (!response || !response.data) {
        throw new HttpException('ERROR_IN_MARPICO_CONNECTION', 510);
      }

      // Procesamos datos antes de borrar la DB local para asegurar disponibilidad
      const tableData = await this.data2Schema(response.data);

      // Usamos una sesión para asegurar que si algo falla, no perdamos los datos viejos
      // O al menos validamos que tableData tenga contenido antes de borrar
      if (tableData.length > 0) {
        await this.marpicoModel.deleteMany({});
        const result = await this.marpicoModel.insertMany(tableData);
        return { status: 200, message: 'Updated successfully', count: result.length };
      } else {
        throw new Error('No data received from Marpico to update');
      }
    } catch (error: unknown) {
      const isError = error instanceof Error;
      const message = isError ? error.message : 'INTERNAL_SERVER_ERROR';
      const stack = isError ? error.stack : undefined;
      const status = (error as any)?.status || 500;

      this.logger.error('Fallo en la actualización de Marpico', stack);
      throw new HttpException(message, status);
    }
  }

  private async data2Schema(data: any) {
    const gen: any = await this.generalService.consecutive();
    const marpicoCatTitleList = gen.catagMARPICO as { key: string, value: string }[];
    
    // Optimizamos búsqueda de categorías con un Map
    const categoryMap = new Map(marpicoCatTitleList.map(cat => [cat.key, cat.value]));

    // Usamos filter y map para mayor claridad y eficiencia
    return data.results
      .filter((item: any) => item.subcategoria_1 && item.subcategoria_1.categoria)
      .map((item: any) => {
        let existenciaTotal = 0;
        
        item.materiales.forEach((mat: any) => {
          item.precio = item.precio || mat.precio;
          let inventarioMat = 0;
          mat.inventario_almacen.forEach((alm: any) => inventarioMat += (alm.cantidad || 0));
          mat.inventario = inventarioMat;
          existenciaTotal += inventarioMat;
        });

        item.existencia = existenciaTotal;

        const catValue = categoryMap.get(item.subcategoria_1.categoria) || item.subcategoria_1.categoria;

        return {
          ...item,
          subcategoria_1: {
            jerarquia: item.subcategoria_1.jerarquia,
            nombre: item.subcategoria_1.nombre,
            categoria: { jerarquia: catValue, nombre: catValue }
          }
        };
      });
  }


  findAll() {
    return this.marpicoModel.find().exec();
  }

  findOne(id: number) {
    return `This action returns a #${id} marpico`;
  }

  update(id: number, updateMarpicoDto: UpdateMarpicoDto) {
    return `This action updates a #${id} marpico`;
  }

  remove(id: number) {
    return `This action removes a #${id} marpico`;
  }
}
