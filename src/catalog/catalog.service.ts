import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
//* import { CreateCatalogDto } from './dto/create-catalog.dto';
import { UpdateCatalogDto } from './dto/update-catalog.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Catalog } from './schemas/catalog.schema';

@Injectable()
export class CatalogService {

  constructor(
    @InjectModel(Catalog.name) private catalogModel: Model<Catalog>,) { }

  async excel2Mongodb(itemArray: Catalog[]) {
    await this.catalogModel.deleteMany();
    await this.catalogModel.insertMany(itemArray).then((result: any) => {
      if (result.length > 0) {
        return { status: 200, message: 'ok' }
      }
    });
    // return await createdCatalog.save();
  }

  async findAll() {
    // return await this.catalogModel.find().exec();

    // variante
    const result = [];
    (await this.catalogModel.find()).forEach(cat => {
      result.push({
        familia: cat.familia,
        descripcion_comercial: cat.descripcion_comercial,
        descripcion_larga: cat.descripcion_larga,
        imagen: cat.imagen['imagen']['file_sm'] || '',
        existencia: cat.existencia,
        precio: cat.precio,
        subcategoria_1: cat.subcategoria_1,
        materiales: this.getMateriales(cat.materiales),
        tecnica_marca_descripcion: cat.tecnica_marca_descripcion,
        lista_colores: cat.lista_colores
      })
    });
    return { status: 200, data: result };
  }

  private getMateriales(materiales: any): any {
    const result: any = [];
    materiales.forEach(m => {
      result.push({
        codigo: m.codigo, color_nombre: m.color_nombre, inventario: m.inventario, precio: m.precio, imagenes: this.getImagenes(m.imagenes)
      })
    })
    return result;
  }

  private getImagenes(imglist: any): string[] {
    const result: string[] = [];
    imglist.forEach(img => {
      if (img.imagen.file_md) result.push(img.imagen.file_md);
    })
    return result;
  }

  findOne(id: number) {
    return `This action returns a #${id} catalog`;
  }

  update(id: string, updateCatalogDto: UpdateCatalogDto) {
    return this.catalogModel.findByIdAndUpdate(id, updateCatalogDto);
  }

  remove(id: string) {
    return this.catalogModel.findByIdAndDelete(id);
  }

  async dtbase2Json() {
    const result = [];
    (await this.catalogModel.find())
      .forEach(pr => {
        result.push({
          codigo: pr.familia,
          descripcion_comercial: pr.descripcion_comercial,
          descripcion_larga: pr.descripcion_larga,
          Material: pr.material,
          Medidas: pr.medidas_omv,
          Area_de_impresión: pr.tecnica_marca_descripcion,
          marca: pr.tecnica_marca_descripcion,
          // Marca:'string',
          imagen_sm: pr.imagen['imagen']['file_sm'] || '',
          imagen_md: pr.imagen['imagen']['file_md'] || '',
          precio: pr.precio,
          existencia: 0,
          cat_codigo: pr.subcategoria_1['categoria']['jerarquia'] || '001',
          cat_nombre: pr.subcategoria_1['categoria']['nombre'] || '',
          sub_cat_codigo: pr.subcategoria_1['jerarquia'] || '001001',
          sub_cat_nombre: pr.subcategoria_1['nombre'] || '',
          lista_colores: pr.lista_colores,
          materiales: pr.materiales
        });
      });
    // result.unshift(headResult);
    return result;
  }

  private async deleteUpdate() {
    // Elimina

    // Genera
  }

}
