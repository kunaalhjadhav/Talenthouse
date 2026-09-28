import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { KycService } from './kyc.service';
import { SubmitKycDto } from './kyc.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(
    private walletService: WalletService,
    private kycService: KycService,
  ) {}

  @Get('me')
  getMyWallet(@CurrentUser('id') userId: string) {
    return this.walletService.getOrCreateWallet(userId);
  }

  @Get('me/transactions')
  getMyTransactions(
    @CurrentUser('id') userId: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.walletService.getTransactionHistory(userId, Number(take) || 50, Number(skip) || 0);
  }

  // ---- KYC ----

  @Post('kyc')
  submitKyc(@CurrentUser('id') userId: string, @Body() dto: SubmitKycDto) {
    return this.kycService.submit(userId, dto);
  }

  @Get('kyc/me')
  myKyc(@CurrentUser('id') userId: string) {
    return this.kycService.myKyc(userId);
  }

  // ---- Withdrawals ----

  @Post('withdrawals')
  async requestWithdrawal(@CurrentUser('id') userId: string, @Body('amount') amount: number) {
    await this.kycService.assertApproved(userId);
    return this.walletService.requestWithdrawal(userId, Number(amount));
  }

  @Get('withdrawals/me')
  myWithdrawals(@CurrentUser('id') userId: string) {
    return this.walletService.myWithdrawals(userId);
  }

  // ---- Admin ----

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN)
  @Get('admin/kyc/pending')
  pendingKyc() {
    return this.kycService.pending();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN)
  @Patch('admin/kyc/:id/approve')
  approveKyc(@Param('id') id: string) {
    return this.kycService.approve(id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN)
  @Patch('admin/kyc/:id/reject')
  rejectKyc(@Param('id') id: string, @Body('reason') reason: string) {
    return this.kycService.reject(id, reason);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN)
  @Get('admin/withdrawals/pending')
  pendingWithdrawals() {
    return this.walletService.pendingWithdrawals();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN)
  @Patch('admin/withdrawals/:id/process')
  processWithdrawal(
    @Param('id') id: string,
    @Body('status') status: 'PAID' | 'FAILED' | 'REJECTED',
    @Body('payoutReference') payoutReference?: string,
    @Body('rejectionNote') rejectionNote?: string,
  ) {
    return this.walletService.markWithdrawalProcessed(id, status, payoutReference, rejectionNote);
  }
}
