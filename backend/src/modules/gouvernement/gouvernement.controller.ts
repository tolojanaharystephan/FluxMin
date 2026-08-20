import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  StreamableFile,
  SetMetadata,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { GouvernementService } from './gouvernement.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/types/roles';
import {
  AccuseReceptionDto,
  CreatePublicationDto,
  PublicationMessageDto,
  UpdatePublicationDto,
} from './dto/gouvernement.dto';
import { SKIP_AUDIT_KEY } from '../../common/interceptors/audit.interceptor';
import {
  COURRIER_MAX_FILE_BYTES,
  PUBLICATIONS_UPLOAD_DIR,
  ensureUploadDirs,
  isAllowedUpload,
} from '../../common/files/storage.util';

const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);

const publicationMulterOptions = {
  storage: diskStorage({
    destination: PUBLICATIONS_UPLOAD_DIR,
    filename: (_req: any, file: Express.Multer.File, cb: any) => {
      cb(null, `${uuid()}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: COURRIER_MAX_FILE_BYTES },
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    if (!isAllowedUpload(file.originalname, file.mimetype)) {
      return cb(new BadRequestException('Format de fichier non supporté'), false);
    }
    cb(null, true);
  },
};

ensureUploadDirs();

@ApiTags('Gouvernement')
@ApiBearerAuth('JWT')
@Controller('gouvernement')
export class GouvernementController {
  constructor(
    private readonly service: GouvernementService,
    private readonly storage: StorageService,
  ) {}

  @Get('publications')
  list(
    @CurrentUser('id') userId: number,
    @Query('portee') portee?: string,
    @Query('statut') statut?: string,
  ) {
    return this.service.list(userId, { portee, statut });
  }

  @Get('publications/:id')
  getOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.getOne(id, userId);
  }

  @Post('publications')
  @Roles('gouvernement')
  create(@Body() dto: CreatePublicationDto, @CurrentUser('id') userId: number) {
    return this.service.create(dto, userId);
  }

  @Patch('publications/:id')
  @Roles('gouvernement')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePublicationDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.update(id, dto, userId);
  }

  @Post('publications/:id/publish')
  @Roles('gouvernement')
  publish(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.publish(id, userId);
  }

  @Post('publications/:id/archive')
  @Roles('gouvernement')
  archive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.archive(id, userId);
  }

  @Post('publications/:id/pieces-jointes')
  @Roles('gouvernement')
  @SkipAudit()
  @UseInterceptors(FileInterceptor('file', publicationMulterOptions))
  uploadPj(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: number,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier fourni');
    return this.service.addPieceJointe(id, userId, file);
  }

  @Post('publications/:id/pieces-jointes/batch')
  @Roles('gouvernement')
  @SkipAudit()
  @UseInterceptors(FilesInterceptor('files', 20, publicationMulterOptions))
  uploadPjBatch(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser('id') userId: number,
  ) {
    if (!files?.length) throw new BadRequestException('Aucun fichier fourni');
    return this.service.addPiecesJointes(id, userId, files);
  }

  @Get('publications/:id/pieces-jointes/:pjId/download')
  @SkipAudit()
  async downloadPj(
    @Param('id', ParseIntPipe) id: number,
    @Param('pjId', ParseIntPipe) pjId: number,
    @CurrentUser('id') userId: number,
  ) {
    const pj = await this.service.getPieceJointe(id, pjId, userId);
    try {
      const { stream } = await this.storage.openReadStream(pj.cheminFichier);
      const filename = pj.nomFichier || 'document';
      return new StreamableFile(stream, {
        type: pj.typeMime || 'application/octet-stream',
        disposition: `attachment; filename="${encodeURIComponent(filename)}"`,
      });
    } catch {
      throw new NotFoundException('Fichier non trouvé');
    }
  }

  @Post('publications/:id/accuse-reception')
  @Roles('directeur_ministere', 'admin_ministere')
  accuse(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AccuseReceptionDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.accuseReception(id, userId, dto);
  }

  @Post('publications/:id/messages')
  addMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PublicationMessageDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.addMessage(id, userId, dto);
  }

  @Post('publications/:id/lu')
  markRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.markRead(id, userId);
  }
}
