import { Body, Controller, Get, Param, Patch, Post, Delete, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  myNotifications(@CurrentUser('id') userId: string) {
    return this.notificationsService.myNotifications(userId);
  }

  @Patch(':id/read')
  markRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notificationsService.markRead(userId, id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }

  @Post('device-tokens')
  registerToken(@CurrentUser('id') userId: string, @Body('token') token: string, @Body('platform') platform: 'ios' | 'android') {
    return this.notificationsService.registerDeviceToken(userId, token, platform);
  }

  @Delete('device-tokens/:token')
  unregisterToken(@Param('token') token: string) {
    return this.notificationsService.unregisterDeviceToken(token);
  }
}
