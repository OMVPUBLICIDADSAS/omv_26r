import { Module } from '@nestjs/common';
import { MarpicoService } from './marpico.service';
import { MarpicoController } from './marpico.controller';
import { HttpModule } from '@nestjs/axios';
import { GeneralModule } from 'src/general/general.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Marpico, MarpicoSchema } from './schemas/marpico.schema';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Marpico.name, schema: MarpicoSchema }]),
    ConfigModule.forRoot(),
    HttpModule, GeneralModule],
  controllers: [MarpicoController],
  providers: [MarpicoService]
})
export class MarpicoModule {}
