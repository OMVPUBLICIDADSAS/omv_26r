import {
  Controller,
  Get,
  Post,
  Body,
  // Patch,
  Put,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { QuoteService } from './quote.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/users/roles.decorator';
import { RolesGuard } from 'src/users/roles.guard';


@ApiTags('quote')
@Controller('quote')
export class QuoteController {
  constructor(
    private readonly quoteService: QuoteService,
    
    ) {}

  @Post()
  async create(@Body() createQuoteDto: CreateQuoteDto) {
    return await this.quoteService.create(createQuoteDto);
  }

  @Roles('Q')
  @UseGuards(RolesGuard)
  @Get()
  async findAll() {
    return await this.quoteService.findAll();
  }

  @Roles('Q')
  @UseGuards(RolesGuard)
  @Get('filter/data')
  async findByFilter(@Query('status') status: number, @Query('agent_id') agent_id: string) {
    // @Param('status') status: number, @Param('agent_id') agent_id: string
    // query @Param('status') status: number, @Param('agent_id') agent_id: string
    return await this.quoteService.findByFilter(status, agent_id);
  }

  @Roles('Q')
  @UseGuards(RolesGuard)
  @Get('filter/datebetween')
  async findBydatebt(@Query('date_in') date_in: number, @Query('date_out') date_out: string) {
    // @Param('status') status: number, @Param('agent_id') agent_id: string
    // query @Param('status') status: number, @Param('agent_id') agent_id: string
    return await this.quoteService.findByDate(date_in, date_out);
  }

  @Roles('Q')
  @UseGuards(RolesGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.quoteService.findOne(id);
  }

  @Roles('Q')
  @UseGuards(RolesGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateQuoteDto: UpdateQuoteDto) {
    return await this.quoteService.update(id, updateQuoteDto);
  }

  @Roles('Q')
  @UseGuards(RolesGuard)
  @Put('resend/:id')
  async resend(@Param('id') id: string, @Body() updateQuoteDto: UpdateQuoteDto) {
    return await this.quoteService.resend(id, updateQuoteDto);
  }

  @Roles('Q')
  @UseGuards(RolesGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.quoteService.remove(id);
  }
}
