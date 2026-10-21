import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { BattlesModule } from '../battles/battles.module';
@Module({ imports: [BattlesModule], controllers: [PublicController] })
export class PublicModule {}
