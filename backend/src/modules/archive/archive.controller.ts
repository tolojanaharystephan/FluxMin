import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ArchiveService } from './archive.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/types/roles';
import { Permission } from '../../common/types/roles';
import { ArchiveCourrierDto, QueryArchiveDto } from './dto/archive.dto';

@Controller('archives')
export class ArchiveController {
  constructor(private readonly archiveService: ArchiveService) {}

  @Get()
  @RequirePermissions(Permission.READ_COURRIER)
  findAll(@CurrentUser('id') userId: number, @Query() query: QueryArchiveDto) {
    return this.archiveService.findAll(userId, query);
  }

  @Get('by-courrier/:courrierId')
  @RequirePermissions(Permission.READ_COURRIER)
  findByCourrier(
    @Param('courrierId', ParseIntPipe) courrierId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.archiveService.findByCourrierId(courrierId, userId);
  }

  @Get(':id')
  @RequirePermissions(Permission.READ_COURRIER)
  findById(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.archiveService.findById(id, userId);
  }

  @Post(':id/desarchiver')
  @RequirePermissions(Permission.ARCHIVE_COURRIER)
  @HttpCode(HttpStatus.OK)
  desarchiver(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.archiveService.desarchiver(id, userId);
  }
}
