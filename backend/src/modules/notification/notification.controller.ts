import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  findAll(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationService.findAll(userId, Number(page) || 1, Number(limit) || 20, {
      type,
      unreadOnly: unreadOnly === '1' || unreadOnly === 'true',
    });
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser('id') userId: number) {
    return this.notificationService.getUnreadCount(userId);
  }

  // Place read-all BEFORE :id/read to avoid route ambiguity
  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  markAllAsRead(@CurrentUser('id') userId: number) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  markAsRead(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.notificationService.markAsRead(id, userId);
  }
}
