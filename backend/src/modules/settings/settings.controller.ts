import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}
  /** Public, safe subset the apps and website need to render prices and plans. */
  @Get('public')
  async publicSettings() {
    const s = await this.settings.all();
    return {
      votePrice: s.votePrice, advancePct: s.advancePct, tipPresets: s.tipPresets, judgeWeight: s.judgeWeight, publicWeight: s.publicWeight, minWithdraw: s.minWithdraw, referralBonus: s.referralBonus,
      plans: [
        { id: 'FREE', name: 'Free', price: 0, benefits: ['Participate and vote', 'Basic profile'] },
        { id: 'PREMIUM', name: 'Premium', price: s.premiumPrice, benefits: ['No ads', 'Featured placement in Talents', `${s.premiumCommissionDiscount}% lower booking commission`] },
        { id: 'PRO', name: 'Pro', price: s.proPrice, benefits: ['Everything in Premium', 'Top placement in Talents', `${s.proCommissionDiscount}% lower booking commission`] },
      ],
    };
  }
}
