import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}
  @Post() create(@CurrentUser('id') customerId: string, @Body() dto: any) { return this.bookingsService.createBooking(customerId, dto); }
  @Get('me') myBookings(@CurrentUser('id') customerId: string) { return this.bookingsService.myBookings(customerId); }
  @UseGuards(RolesGuard) @Roles(UserRole.TALENT) @Get('talent/me') talentBookings(@CurrentUser('id') userId: string) { return this.bookingsService.talentBookingsForUser(userId); }
  @Post(':id/respond') respond(@CurrentUser('id') talentUserId: string, @Param('id') id: string, @Body('accept') accept: boolean) { return this.bookingsService.talentRespond(talentUserId, id, accept); }
  @Post(':id/perform') perform(@CurrentUser('id') talentUserId: string, @Param('id') id: string) { return this.bookingsService.markPerformed(talentUserId, id); }
  @Post(':id/cancel') cancel(@CurrentUser('id') customerId: string, @Param('id') id: string) { return this.bookingsService.customerCancel(customerId, id); }
}
