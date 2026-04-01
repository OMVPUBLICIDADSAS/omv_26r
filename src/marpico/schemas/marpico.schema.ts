/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MarpicoDocument = HydratedDocument<Marpico>;

@Schema()
export class Marpico {

    @Prop()
    familia: string;

    @Prop()
    descripcion_comercial: string;

    @Prop()
    descripcion_larga?: string;

    @Prop()
    material?: string;

    @Prop()
    imagen?: string;

    @Prop()
    existencia?: number;

    @Prop()
    precio?: number;

    @Prop({type: 'object'})
    subcategoria_1: object;

    @Prop({type: 'object'})
    subcategoria_2?: object;

    @Prop()
    materiales?: object[];

    @Prop()
    area_impresion?: string;

    @Prop()
    tecnica_marca_descripcion?: string;
 
}

export const MarpicoSchema = SchemaFactory.createForClass(Marpico);
