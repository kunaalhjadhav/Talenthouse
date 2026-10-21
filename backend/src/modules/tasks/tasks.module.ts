import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { BattlesModule } from '../battles/battles.module';
@Module({ imports: [BattlesModule], providers: [TasksService] })
export class TasksModule {}
