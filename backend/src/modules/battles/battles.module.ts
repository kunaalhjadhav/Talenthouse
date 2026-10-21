import { Module } from '@nestjs/common';
import { BattlesService } from './battles.service';
import { BattlesController } from './battles.controller';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({ imports: [NotificationsModule], providers: [BattlesService], controllers: [BattlesController], exports: [BattlesService] })
export class BattlesModule {}
