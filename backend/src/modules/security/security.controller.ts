import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SecurityService } from './security.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permission, RequirePermissions } from '../../common/types/roles';

@ApiTags('Sécurité')
@ApiBearerAuth('JWT')
@Controller('admin/security')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SecurityController {
  constructor(private readonly security: SecurityService) {}

  @Get('logs')
  @RequirePermissions(Permission.VIEW_SECURITY_LOGS)
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('risque') risque?: string,
    @Query('succes') succes?: string,
    @Query('search') search?: string,
  ) {
    return this.security.listLogs({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      risque,
      succes,
      search,
    });
  }

  @Get('logs/:id')
  @RequirePermissions(Permission.VIEW_SECURITY_LOGS)
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.security.getLogDetail(id);
  }

  @Post('sessions/:sessionId/revoke')
  @RequirePermissions(Permission.VIEW_SECURITY_LOGS)
  revokeSession(
    @Param('sessionId') sessionId: string,
    @Body() body?: { reason?: string },
  ) {
    return this.security.revokeSession(sessionId, body?.reason);
  }

  @Post('ips/block')
  @RequirePermissions(Permission.VIEW_SECURITY_LOGS)
  blockIp(@Body() body: { ip: string; minutes?: number; raison?: string }) {
    return this.security.blockIp(body.ip, body.minutes ?? 60, body.raison);
  }
}
