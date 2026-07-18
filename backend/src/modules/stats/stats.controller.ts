import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions, Permission } from '../../common/types/roles';

@ApiTags('Stats')
@ApiBearerAuth('JWT')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('dashboard')
  @RequirePermissions(Permission.VIEW_DASHBOARD)
  getDashboard(@CurrentUser('id') userId: number) {
    return this.statsService.getDashboard(userId);
  }

  @Get('analytics')
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  getAnalytics(
    @CurrentUser('id') userId: number,
    @Query('months', new DefaultValuePipe(6), ParseIntPipe) months: number,
  ) {
    return this.statsService.getAnalytics(userId, months);
  }

  @Get('process-mining')
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  getProcessMining(@CurrentUser('id') userId: number) {
    return this.statsService.getProcessMining(userId);
  }
}
