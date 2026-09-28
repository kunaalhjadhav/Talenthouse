import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, DisputeType, DisputeStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('disputes')
export class DisputesController {
  constructor(private disputesService: DisputesService) {}

  @Post()
  raise(
    @CurrentUser('id') userId: string,
    @Body('type') type: DisputeType,
    @Body('referenceId') referenceId: string,
    @Body('description') description: string,
    @Body('evidenceUrls') evidenceUrls?: string[],
  ) {
    return this.disputesService.raise(userId, type, referenceId, description, evidenceUrls);
  }

  @Get('me')
  myDisputes(@CurrentUser('id') userId: string) {
    return this.disputesService.myDisputes(userId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT_ADMIN)
  @Get('admin/pending')
  pending() {
    return this.disputesService.pending();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT_ADMIN)
  @Patch('admin/:id/under-review')
  markUnderReview(@Param('id') id: string) {
    return this.disputesService.markUnderReview(id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT_ADMIN)
  @Patch('admin/:id/resolve')
  resolve(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body('outcome') outcome: DisputeStatus,
    @Body('resolutionNote') resolutionNote: string,
    @Body('refundUserId') refundUserId?: string,
    @Body('refundAmount') refundAmount?: number,
  ) {
    const refund = refundUserId && refundAmount ? { userId: refundUserId, amount: Number(refundAmount) } : undefined;
    return this.disputesService.resolve(id, adminId, outcome, resolutionNote, refund);
  }
}
