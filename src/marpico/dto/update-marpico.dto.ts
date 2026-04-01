import { PartialType } from '@nestjs/swagger';
import { CreateMarpicoDto } from './create-marpico.dto';

export class UpdateMarpicoDto extends PartialType(CreateMarpicoDto) {}
