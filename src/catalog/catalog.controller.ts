import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';

import { CatalogService } from './catalog.service';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
// import { extname } from 'path';
import { CellErrorValue, CellFormulaValue, CellHyperlinkValue, CellRichTextValue, CellSharedFormulaValue, Workbook } from 'exceljs';
// import { Stream } from 'stream';
import { Catalog } from './schemas/catalog.schema';
import * as fs from 'fs';
import { Observable, of } from 'rxjs';
import { join } from 'path';
// import path from 'path';
import { Roles } from 'src/users/roles.decorator';
import { RolesGuard } from 'src/users/roles.guard';
import { UpdateCatalogDto } from './dto/update-catalog.dto';
// import * as sharp from 'sharp'


interface ImgName { row: number, col: number, name: string }

@Controller('catalog')
export class CatalogController {
  imgNamesArray: ImgName[] = [];
  constructor(private readonly catalogService: CatalogService) { }

  @Roles('P')
  @UseGuards(RolesGuard)
  @Get('dtbase2Json')
  async dtbase2Json() {
    return await this.catalogService.dtbase2Json();
  }

  @Get()
  findAll() {
    return this.catalogService.findAll();
  }

  @Get('backupImages')
  getBkupImages() {
    const files = [];
    let apath = process.env.RAILWAY_VOLUME_MOUNT_PATH;
    if (process.env.DEV_STATUS === 'true') {
      apath = join(__dirname, process.env.DEFA_DIR);
      if (!fs.existsSync(apath)) { return; }
    }
    // const apath = join(process.env.DEFA_DIR);
    fs.readdirSync(apath).forEach(filename => {
      const name = filename.split('.').at(-2) || '';
      const ext = filename.split('.').at(-1) || '';
      const filepath = join(apath, filename);
      const stat = fs.statSync(filepath);
      const isFile = stat.isFile();
      if (isFile) files.push({ filepath, name, ext, stat });
    });

    files.sort((a, b) => {
    
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
    return files;
  }

  @Get(':imagename')
  getImageByName(@Param('imagename') imagename, @Res() res): Observable<object> {
    const upr = imagename.toUpperCase();
    let apath = process.env.RAILWAY_VOLUME_MOUNT_PATH;
    if (process.env.DEV_STATUS === 'true') {
      apath = join(__dirname, process.env.DEFA_DIR);
    }
    apath = join(apath, upr);

    if (!fs.existsSync(apath)) {
      throw new NotFoundException(`Image ${imagename} not found.`);
    }
    // res.sendFile ya maneja la respuesta, no necesita ser envuelto en 'of'
    res.sendFile(apath);
    return; // No retornar un Observable si res.sendFile ya envía la respuesta
  }
 
  @Roles('P')
  @UseGuards(RolesGuard)
  @Post('images2dtbase_')
  @UseInterceptors(AnyFilesInterceptor())
  uploadFiles(@UploadedFiles() files: Array<Express.Multer.File>) {
    let apath = process.env.RAILWAY_VOLUME_MOUNT_PATH;
    if (process.env.DEV_STATUS === 'true') {
      apath = join(__dirname, process.env.DEFA_DIR);
      if (!fs.existsSync(apath)) { fs.mkdirSync(apath); }
    }

    for (let i = 0; i < files.length; i++) {
      const upr = files[i].originalname.toUpperCase();
      const destPath = join(apath, upr);
      fs.writeFileSync(destPath, files[i].buffer as any);
    }
    return { status: 200, message: process.env.RAILWAY_VOLUME_MOUNT_PATH }
  }

  @Roles('P')
  @UseGuards(RolesGuard)
  @Post('excel2Mongodb')
  @UseInterceptors(
    FileInterceptor(
      'file', {
      storage: diskStorage({
        destination: '.catalog/',
        filename: function (_req, _file, cb) { cb(null, `catalog.xlsx`) }
      }),
    }
    )
  )
  async excel2Mongodb(@UploadedFile() file: Express.Multer.File) {
    
    const itemArray: Catalog[] = [];
    
    const workbook = new Workbook();
    await workbook.xlsx.readFile(file.path);
    const worksheetProd = workbook.getWorksheet("producto");
    const worksheetMat = workbook.getWorksheet("materiales");
      const headerRows = 2;
      const prodRowC = worksheetProd.actualRowCount; // determine the range of populated data
      const matRowC = worksheetMat.actualRowCount; // determine the range of populated data
      for (let i = headerRows; i <= prodRowC; i++) {
        const prodCodigo = worksheetProd.getRow(i).getCell(1).text || '';
        if (prodCodigo === '' )  continue;
        const materiales = this.getMaterialesArray(worksheetMat, headerRows, matRowC, prodCodigo)
        // Make a POST request with form data.
        // Imagenes
        let sm = '';
        let md = '';
        if (worksheetProd.getRow(i).getCell(8).value &&
          worksheetProd.getRow(i).getCell(8).value.toString().length > 0) {
          sm = this.getImageName(worksheetProd.getRow(i).getCell(8).value.toString());
          // pictArray.push(sm);
        }
        if (worksheetProd.getRow(i).getCell(9).value &&
          worksheetProd.getRow(i).getCell(9).value.toString().length > 0) {
          md = this.getImageName(worksheetProd.getRow(i).getCell(9).value.toString());
          // pictArray.push(sm);
        }
        const ImageData = {
          'id': 'defa',
          'imagen': { 'file_sm': sm, 'file_md': md }
        }
        // ................................................................
        const formData = {
          'familia': worksheetProd.getRow(i).getCell(1).text || '',
          'descripcion_comercial': worksheetProd.getRow(i).getCell(2).text || '',
          'descripcion_larga': worksheetProd.getRow(i).getCell(3).text || '',
          'material': worksheetProd.getRow(i).getCell(4).text || '',
          'medidas_omv': worksheetProd.getRow(i).getCell(5).text || '',
          'area_impresion': worksheetProd.getRow(i).getCell(6).text || '',
          'tecnica_marca_descripcion': worksheetProd.getRow(i).getCell(7).text || '',
          'imagen': ImageData,
          'precio': worksheetProd.getRow(i).getCell(10).text || 0,
          'existencia': worksheetProd.getRow(i).getCell(11).text || 0,
          'lista_colores': worksheetProd.getRow(i).getCell(16).text || '',
          'subcategoria_1': {
            'jerarquia': worksheetProd.getRow(i).getCell(14).text || '',
            'nombre': worksheetProd.getRow(i).getCell(15).text || '',
            'categoria': {
              'jerarquia': worksheetProd.getRow(i).getCell(12).text || '',
              'nombre': worksheetProd.getRow(i).getCell(13).text || '',
            }
          },
          'materiales': materiales
        };
        itemArray.push(formData as unknown as Catalog);
      }

    // Write to txt

    const content = JSON.stringify(itemArray);
    const apath = join(__dirname, 'databs.txt');
    fs.writeFile(apath, content, err => {
      if (err) {
        console.error(err);
      }
    });

    return await this.catalogService.excel2Mongodb(itemArray);
  }

  private getMaterialesArray(matData: any, headerRows: number, matNumRows: number, prodCodigo: string | number | boolean | Date | CellErrorValue | CellRichTextValue | CellHyperlinkValue | CellFormulaValue | CellSharedFormulaValue) {
    const result = [];

    for (let r = headerRows; r <= matNumRows; r++) {
      // console.log(matData.getRow(r).getCell(1).value);
      if (matData.getRow(r).getCell(1).text === prodCodigo) {

        const imagelist = [];
        for (let k = 6; k < 10; k++) {
          if (matData.getRow(r).getCell(k).value && matData.getRow(r).getCell(k).text.length > 0) {
            // pictArray.push(this.getImageName(matData.getRow(r).getCell(k).value.text));
            // pictArray.push(this.getImageName(matData.getRow(r).getCell(k).value.text));
            const ImageData = {
              'id': r,
              'imagen': {
                'file_md': this.getImageName(matData.getRow(r).getCell(k).text),
                'file_sm': this.getImageName(matData.getRow(r).getCell(k).text),
              }
            }
            imagelist.push(ImageData)
          }
        }

        const formData = {
          'codigo': matData.getRow(r).getCell(2).text || '',
          'color_nombre': matData.getRow(r).getCell(3).text || '',
          'inventario': matData.getRow(r).getCell(4).text || 0,
          'precio': matData.getRow(r).getCell(5).text || 0,
          'imagenes': imagelist
        }
        result.push(formData)

      }
    }
    return result;
  }

  private getImageName(img: string): string {
    return process.env.IMAGEGETFOLDER + img;
  }



  /*
  @Get(':id')
  async getImageByRoute(@Param('id') id: string) {

  }
  */

  /*
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.catalogService.findOne(+id);
  }
  */

  @Roles('P')
  @UseGuards(RolesGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateCatalogDto: UpdateCatalogDto) {
    return this.catalogService.update(id, updateCatalogDto);
  }

  @Roles('P')
  @UseGuards(RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.catalogService.remove(id);
  }

}

//nestjs download image?



/*
async excel2Mongodb(@UploadedFile() file: Express.Multer.File) {
    fs.rmSync(join(__dirname + this.IMAGEFOLDER), { recursive: true, force: true });
    const itemArray: Catalog[] = [];
    const workbook = new Workbook();
    fs.mkdirSync(join(__dirname + this.IMAGEFOLDER));
    await workbook.xlsx.readFile(file.path).then((workbook) => {
      const worksheetProd = workbook.getWorksheet("producto");
      const worksheetMat = workbook.getWorksheet("materiales");
      const headerRows = 2;
      const prodRowC = worksheetProd.actualRowCount; // determine the range of populated data
      const matRowC = worksheetMat.actualRowCount; // determine the range of populated data

      // Images
      // https://www.cronj.com/blog/upload-image-nodejs-expressjs-using-javascript/

      workbook.model.media.forEach((image) => {
        const data = Buffer.from(image.buffer);
        const filePath = join(__dirname + `${this.IMAGEFOLDER}${image.name}.${image.extension}`);
        fs.writeFileSync(filePath, data);
      });

      this.imgNamesArray = [];
      for (const image of worksheetMat.getImages()) {
        const img = workbook.model.media.find(m => m.name === 'image' + (image.imageId + 1).toString());
        const imgdata: ImgName = {
          row: Number(worksheetMat.getRow(Math.floor(image.range.tl.row) + 1)),
          col: Number(worksheetMat.getColumn(Math.floor(image.range.tl.col) + 1)),
          name: `${this.IMAGEFOLDER}${img.name}.${img.extension}`
        }

        this.imgNamesArray.push(imgdata);
      }

      // ..........................................................................................

      for (let i = headerRows; i < prodRowC; i++) {
        const prodCodigo = worksheetProd.getRow(i).getCell(1).value;
        const materiales = this.getMaterialesArray(worksheetMat, headerRows, matRowC, prodCodigo)
        // Make a POST request with form data.
        // Imagenes
        let rc = this.geRowCol(worksheetProd.getRow(i).getCell(4).value.toString());
        const sm = this.getImageName(rc.row, rc.col);
        rc = this.geRowCol(worksheetProd.getRow(i).getCell(5).value.toString());
        const md = this.getImageName(rc.row, rc.col);
        const ImageData = {
          'id': 'defa',
          'imagen': { 'file_sm': sm, 'file_md': md }
        }
        // ................................................................
        const formData = {
          'familia': worksheetProd.getRow(i).getCell(1).value,
          'descripcion_comercial': worksheetProd.getRow(i).getCell(2).value,
          'descripcion_larga': worksheetProd.getRow(i).getCell(3).value,
          'imagen': ImageData,
          'precio': worksheetProd.getRow(i).getCell(6).value,
          'existencia': worksheetProd.getRow(i).getCell(7).value,
          'subcategoria_1': {
            'jerarquia': worksheetProd.getRow(i).getCell(10).value,
            'nombre': worksheetProd.getRow(i).getCell(11).value,
            'categoria': {
              'jerarquia': worksheetProd.getRow(i).getCell(8).value,
              'nombre': worksheetProd.getRow(i).getCell(9).value,
            }
          },
          'materiales': materiales
        };
        itemArray.push(formData as unknown as Catalog);
      }
      // get worksheet, read rows, etc
    });
    return this.catalogService.excel2Mongodb(itemArray);
  }

  private geRowCol(datastr: string): { row: number, col: number } {
    const rc = datastr.split('_');
    if (rc.length === 3) {
      rc[2] = rc[2].split('.')[0];
      return { row: Number(rc[1]), col: Number(rc[2]) };
    }
    return { row: 0, col: 0 };
  }

  private getMaterialesArray(matData: any, headerRows: number, matNumRows: number, prodCodigo: string | number | boolean | Date | CellErrorValue | CellRichTextValue | CellHyperlinkValue | CellFormulaValue | CellSharedFormulaValue) {
    const result = [];

    for (let r = headerRows; r < matNumRows; r++) {
      // console.log(matData.getRow(r).getCell(1).value);
      if (matData.getRow(r).getCell(1).value === prodCodigo) {

        const imagelist = [];
        for (let k = 6; k < 10; k++) {
          if (this.getImageName(r, k).length > 0) {
            const ImageData = {
              'id': r,
              'imagen': {
                'file_md': this.getImageName(r, k),
                'file_sm': this.getImageName(r, k),
              }
            }
            imagelist.push(ImageData)
          }
        }

        const formData = {
          'codigo': matData.getRow(r).getCell(2).value,
          'color_nombre': matData.getRow(r).getCell(3).value,
          'inventario': matData.getRow(r).getCell(4).value,
          'precio': matData.getRow(r).getCell(5).value,
          'imagenes': imagelist
        }
        result.push(formData)

      }
    }

    return result;
  }

  private getImageName(row: number, col: number): string {
    col--;
    const imgNm = this.imgNamesArray.find(img => img.row === row && img.col === col);
    if (imgNm) { return imgNm.name } else { return '' }
  }
*/

/*
@Get('filelist/:dir')
  fileStructure(@Param('dir') dir, @Res() res): Observable<object> {
    const strfiles = fs.readdirSync(dir);
    return of(strfiles);
    
  }
*/
/*
  const Results: Array<string> = new Array<string>()
  fs.readdir(dir, (err, files) => {
    files.forEach(file => {
      console.log(file);
      Results.push(file);
    });
  });
  return of(Results);
  */
/*
  @Get(':imagename')
  getImageByName(@Param('imagename') imagename, @Res() res): Observable<object> {
    // console.log(join('./images', imagename));
    return of(res.sendFile(join('./images', imagename)))
  }
*/