import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  StreamableFile,
  SetMetadata,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { createReadStream, existsSync } from 'fs';
import { MessagingService } from './messaging.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateMessageDto } from './dto/messaging.dto';
import { SKIP_AUDIT_KEY } from '../../common/interceptors/audit.interceptor';
import {
  MESSAGE_MAX_FILE_BYTES,
  MESSAGES_UPLOAD_DIR,
  ensureUploadDirs,
  isAllowedUpload,
  resolveStoredFilePath,
} from '../../common/files/storage.util';

const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);

ensureUploadDirs();

@Controller('courriers')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get(':id/messages')
  getMessages(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagingService.findByCourrier(id, userId, page ? Number(page) : 1, limit ? Number(limit) : 50);
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMessageDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.messagingService.create(id, dto, userId);
  }

  @Post(':id/messages/:messageId/attachments')
  @SkipAudit()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: MESSAGES_UPLOAD_DIR,
        filename: (req, file, cb) => {
          const uniqueName = `${uuid()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: MESSAGE_MAX_FILE_BYTES },
      fileFilter: (req, file, cb) => {
        if (!isAllowedUpload(file.originalname, file.mimetype)) {
          return cb(new BadRequestException('Format de fichier non supporté'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: number,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    return this.messagingService.addPieceJointe(messageId, userId, file);
  }

  @Get(':id/messages/:messageId/attachments/:attachmentId/download')
  @SkipAudit()
  async downloadAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @CurrentUser('id') userId: number,
  ) {
    const pj = await this.messagingService.getPieceJointe(messageId, attachmentId, userId);

    const filePath = resolveStoredFilePath(pj.cheminFichier, MESSAGES_UPLOAD_DIR);

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
}
