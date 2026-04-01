import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MarpicoService } from './marpico.service';
import { CreateMarpicoDto } from './dto/create-marpico.dto';
import { UpdateMarpicoDto } from './dto/update-marpico.dto';

@Controller('marpico')
export class MarpicoController {
  constructor(private readonly marpicoService: MarpicoService) {}

  @Post()
  create(@Body() createMarpicoDto: CreateMarpicoDto) {
    return this.marpicoService.create(createMarpicoDto);
  }

  @Get('update')
  async updateFromMarpico() {
    return await this.marpicoService.updateFromMarpico();
  }

  @Get()
  findAll() {
    return this.marpicoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.marpicoService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMarpicoDto: UpdateMarpicoDto) {
    return this.marpicoService.update(+id, updateMarpicoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.marpicoService.remove(+id);
  }
}
