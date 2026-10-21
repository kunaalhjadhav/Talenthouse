import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../config/prisma.service';
import { BattlesService } from '../battles/battles.service';

/** Moves contests through their lifecycle and closes finished battles, so nothing depends on someone clicking a button at the right minute. */
@Injectable()
export class TasksService {
  private readonly logger = new Logger('Tasks');
  constructor(private prisma: PrismaService, private battles: BattlesService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async tick() {
    const now = new Date();
    const a = await this.prisma.contest.updateMany({ where: { status: 'APPROVED', registrationOpensAt: { lte: now }, registrationClosesAt: { gt: now } }, data: { status: 'LIVE' } });
    const b = await this.prisma.contest.updateMany({ where: { status: { in: ['APPROVED', 'LIVE'] }, registrationClosesAt: { lte: now } }, data: { status: 'REGISTRATION_CLOSED' } });
    const c = await this.prisma.contest.updateMany({ where: { status: 'REGISTRATION_CLOSED', startDate: { lte: now } }, data: { status: 'ONGOING' } });
    const due = await this.prisma.battle.findMany({ where: { status: 'LIVE', endsAt: { lte: now } } });
    for (const battle of due) await this.battles.close(battle.id);
    if (a.count || b.count || c.count || due.length) this.logger.log(`Lifecycle: ${a.count} opened, ${b.count} closed, ${c.count} started, ${due.length} battles closed`);
  }
}
