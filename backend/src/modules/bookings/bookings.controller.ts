import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Post()
  create(@CurrentUser('id') customerId: string, @Body() dto: any) {
    return this.bookingsService.createBooking(customerId, dto);
  }

  @Post(':id/respond')
  respond(@CurrentUser('id') talentUserId: string, @Param('id') id: string, @Body('accept') accept: boolean) {
    return this.bookingsService.talentRespond(talentUserId, id, accept);
  }

  @Get('me')
  myBookings(@CurrentUser('id') customerId: string) {
    return this.bookingsService.myBookings(customerId);
  }
}
