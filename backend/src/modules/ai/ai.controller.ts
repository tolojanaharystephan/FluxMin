import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AiService } from './ai.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions, Permission } from '../../common/types/roles';
import { AnalyzeTextDto, DraftDto, AcceptSuggestionDto } from './dto/ai.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('health')
  @RequirePermissions(Permission.USE_AI_FEATURES)
  health() {
    return this.aiService.health();
  }

  @Get('suggestions')
  @RequirePermissions(Permission.USE_AI_FEATURES)
  suggestions(@CurrentUser('id') userId: number) {
    return this.aiService.getSuggestions(userId);
  }

  @Post('analyze/text')
  @RequirePermissions(Permission.USE_AI_FEATURES)
  analyzeText(@Body() dto: AnalyzeTextDto) {
    return this.aiService.analyzeText(dto);
  }

  @Post('analyze/upload')
  @RequirePermissions(Permission.USE_AI_FEATURES)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  analyzeUpload(@UploadedFile() file: Express.Multer.File) {
    return this.aiService.analyzeUpload(file);
  }

  @Post('analyze/courriers/:courrierId/pieces-jointes/:pjId')
  @RequirePermissions(Permission.USE_AI_FEATURES)
  analyzePj(
    @Param('courrierId', ParseIntPipe) courrierId: number,
    @Param('pjId', ParseIntPipe) pjId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.aiService.analyzePieceJointe(courrierId, pjId, userId);
  }

  @Post('analyze/courriers/:courrierId/pieces-jointes')
  @RequirePermissions(Permission.USE_AI_FEATURES)
  analyzeAllPj(
    @Param('courrierId', ParseIntPipe) courrierId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.aiService.analyzeAllPiecesJointes(courrierId, userId);
  }

  @Post('draft')
  @RequirePermissions(Permission.USE_AI_FEATURES)
  draft(@Body() dto: DraftDto) {
    return this.aiService.draft(dto);
  }

  @Post('suggestions/accept')
  @RequirePermissions(Permission.USE_AI_FEATURES)
  @HttpCode(HttpStatus.OK)
  accept(
    @CurrentUser('id') userId: number,
    @Body() dto: AcceptSuggestionDto & { courrierId?: number },
  ) {
    return this.aiService.acceptSuggestion(userId, dto);
  }
}
