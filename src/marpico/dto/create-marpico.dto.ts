import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateMarpicoDto {
    @IsNotEmpty()
    @IsString()
    familia: string;

    @IsNotEmpty()
    @IsString()
    descripcion_comercial: string;

    @IsString()
    descripcion_larga: string;

    @IsOptional()
    @IsString()
    material?: string;

    @IsNotEmpty()
    imagen: string;

    @IsNumber()
    existencia: number;

    @IsNumber()
    precio: number;

    @IsNotEmpty()
    subcategoria_1: object;

    @IsOptional()
    subcategoria_2: object;

    @IsNotEmpty()
    materiales: object[];

    @IsString()
    @IsOptional()
    area_impresion?: string;

    @IsString()
    @IsOptional()
    tecnica_marca_descripcion: string

}
