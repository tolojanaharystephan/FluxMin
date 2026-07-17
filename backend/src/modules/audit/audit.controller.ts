import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions, Roles, Permission } from '../../common/types/roles';
import {
  QueryAuditLogsDto,
  QueryAuditSearchDto,
  CreateAuditReportDto,
  QueryAnomaliesDto,
  ResolveAnomalyDto,
} from './dto/audit.dto';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /** Journal d'audit technique (logs HTTP) */
  @Get('logs')
  @RequirePermissions(Permission.VIEW_AUDIT_LOGS)
  findLogs(@Query() query: QueryAuditLogsDto) {
    return this.auditService.findLogs(query);
  }

  /** Recherche avancée courriers (lecture seule audit) */
  @Get('search')
  @RequirePermissions(Permission.VIEW_AUDIT_LOGS)
  search(@CurrentUser('id') userId: number, @Query() query: QueryAuditSearchDto) {
    return this.auditService.searchCourriers(userId, query);
  }

  @Get('reports')
  @RequirePermissions(Permission.VIEW_AUDIT_LOGS)
  listReports() {
    return this.auditService.listReports();
  }

  @Get('reports/:id')
  @RequirePermissions(Permission.VIEW_AUDIT_LOGS)
  getReport(@Param('id') id: string) {
    return this.auditService.getReport(Number(id));
  }

  @Post('reports')
  @RequirePermissions(Permission.VIEW_AUDIT_LOGS)
  @HttpCode(HttpStatus.CREATED)
  generateReport(
    @Body() dto: CreateAuditReportDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.auditService.generateReport(dto, userId);
  }

  @Get('anomalies')
  @Roles('auditeur', 'super_admin', 'responsable', 'responsable_direction')
  listAnomalies(@Query() query: QueryAnomaliesDto) {
    return this.auditService.listAnomalies(query);
  }

  @Post('anomalies/resolve')
  @Roles('auditeur', 'super_admin', 'responsable', 'responsable_direction')
  @HttpCode(HttpStatus.OK)
  resolveAnomaly(
    @CurrentUser('id') userId: number,
    @Body() dto: ResolveAnomalyDto,
  ) {
    return this.auditService.resolveAnomaly(dto.anomalyKey, userId, dto.note);
  }
}
