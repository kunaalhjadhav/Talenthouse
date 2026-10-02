import { Module } from '@nestjs/common';
import { JudgesService } from './judges.service';
import { JudgesController } from './judges.controller';
@Module({ providers: [JudgesService], controllers: [JudgesController], exports: [JudgesService] })
export class JudgesModule {}
