import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { HealthService } from './health.service';
import { Public } from './common/decorators/public.decorator';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly healthService: HealthService,
  ) {}

  @Public()
  @SkipThrottle()
  @Get()
  @ApiOperation({ summary: 'Ping API' })
  getHello(): { message: string } {
    return { message: this.appService.getHello() };
  }

  @Public()
  @SkipThrottle()
  @Get('health')
  @ApiOperation({ summary: 'Health check (app + Postgres)' })
  async health() {
    const result = await this.healthService.check();
    if (result.database === 'down') {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }
}
