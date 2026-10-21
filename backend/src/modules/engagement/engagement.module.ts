import { Global, Module } from '@nestjs/common';
import { EngagementService } from './engagement.service';
import { EngagementController } from './engagement.controller';
import { NotificationsModule } from '../notifications/notifications.module';
@Global()
@Module({ imports: [NotificationsModule], providers: [EngagementService], controllers: [EngagementController], exports: [EngagementService] })
export class EngagementModule {}
