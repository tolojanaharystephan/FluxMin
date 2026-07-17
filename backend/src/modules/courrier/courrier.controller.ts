import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { createReadStream, existsSync } from 'fs';
import { CourrierService } from './courrier.service';
import { ArchiveService } from '../archive/archive.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/types/roles';
import { Permission } from '../../common/types/roles';
import { SKIP_AUDIT_KEY } from '../../common/interceptors/audit.interceptor';
import { SetMetadata } from '@nestjs/common';
import {
  CreateCourrierDto,
  UpdateCourrierDto,
  TransmettreCourrierDto,
  QueryCourrierDto,
} from './dto/courrier.dto';
import { ArchiveCourrierDto } from '../archive/dto/archive.dto';
import {
  COURRIER_MAX_FILE_BYTES,
  UPLOADS_ROOT,
  ensureUploadDirs,
  isAllowedUpload,
  relativeUploadPath,
  resolveStoredFilePath,
} from '../../common/files/storage.util';

const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);

ensureUploadDirs();

@Controller('courriers')
export class CourrierController {
  constructor(
    private readonly courrierService: CourrierService,
    private readonly archiveService: ArchiveService,
  ) {}

  @Post()
  @RequirePermissions(Permission.CREATE_COURRIER)
  create(@Body() dto: CreateCourrierDto, @CurrentUser('id') userId: number) {
    return this.courrierService.create(dto, userId);
  }

  @Get()
  @RequirePermissions(Permission.READ_COURRIER)
  findAll(@CurrentUser('id') userId: number, @Query() query: QueryCourrierDto) {
    return this.courrierService.findAll(userId, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.READ_COURRIER)
  findById(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.courrierService.findById(id, userId);
  }

  @Put(':id')
  @RequirePermissions(Permission.UPDATE_COURRIER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourrierDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.courrierService.update(id, dto, userId);
  }

  @Post(':id/envoyer')
  @RequirePermissions(Permission.UPDATE_COURRIER)
  envoyer(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.courrierService.envoyer(id, userId);
  }

  @Post(':id/transmettre')
  @RequirePermissions(Permission.FORWARD_COURRIER)
  transmettre(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransmettreCourrierDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.courrierService.transmettre(id, dto, userId);
  }

  @Post(':id/recevoir')
  @RequirePermissions(Permission.UPDATE_COURRIER)
  recevoir(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.courrierService.recevoir(id, userId);
  }

  @Post(':id/pieces-jointes')
  @RequirePermissions(Permission.UPDATE_COURRIER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_ROOT,
        filename: (req, file, cb) => {
          const uniqueName = `${uuid()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: COURRIER_MAX_FILE_BYTES },
      fileFilter: (req, file, cb) => {
        if (!isAllowedUpload(file.originalname, file.mimetype)) {
          return cb(new BadRequestException('Format de fichier non supporté'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadPieceJointe(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: number,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    return this.courrierService.addPieceJointe(id, userId, {
      nomFichier: file.originalname,
      typeMime: file.mimetype,
      tailleBytes: file.size,
      cheminMinio: relativeUploadPath(file.filename, 'root'),
    });
  }

  @Get(':id/pieces-jointes/:pjId/download')
  @RequirePermissions(Permission.READ_COURRIER)
  @SkipAudit()
  async downloadPieceJointe(
    @Param('id', ParseIntPipe) id: number,
    @Param('pjId', ParseIntPipe) pjId: number,
    @CurrentUser('id') userId: number,
  ) {
    const pj = await this.courrierService.getPieceJointe(id, pjId, userId);

    const filePath = resolveStoredFilePath(pj.cheminMinio, UPLOADS_ROOT);

    if (!filePath || !existsSync(filePath)) {
      throw new NotFoundException('Fichier non trouvé sur le serveur');
    }

    const fileStream = createReadStream(filePath);
    const filename = pj.nomFichier || 'document';
    const encodedFilename = encodeURIComponent(filename);

    return new StreamableFile(fileStream, {
      type: pj.typeMime || 'application/octet-stream',
      disposition: `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
    });
  }

  @Delete(':id/pieces-jointes/:pjId')
  @RequirePermissions(Permission.UPDATE_COURRIER)
  @HttpCode(HttpStatus.OK)
  deletePieceJointe(
    @Param('id', ParseIntPipe) id: number,
    @Param('pjId', ParseIntPipe) pjId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.courrierService.deletePieceJointe(id, pjId, userId);
  }

  @Post(':id/archiver')
  @RequirePermissions(Permission.ARCHIVE_COURRIER)
  archiver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ArchiveCourrierDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.archiveService.archiver(id, dto, userId);
  }

  @Delete(':id')
  @RequirePermissions(Permission.DELETE_COURRIER)
  @HttpCode(HttpStatus.OK)
  delete(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.courrierService.delete(id, userId);
  }
}
