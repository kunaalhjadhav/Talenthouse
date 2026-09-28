import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { TalentsService } from '../talents/talents.service';
import { CommissionService } from '../commission/commission.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingStatus, AvailabilityStatus } from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private talentsService: TalentsService,
    private commission: CommissionService,
    private notifications: NotificationsService,
  ) {}

  /** Creates a booking request. Advance % defaults to admin-configured global default (30%) unless overridden per-talent/service. */
  async createBooking(customerId: string, dto: {
    talentId: string; eventType?: string; eventDate: string; startTime?: string; endTime?: string;
    venueAddress?: string; latitude?: number; longitude?: number; amount: number; advancePct?: number;
  }) {
    await this.talentsService.assertSlotAvailable(dto.talentId, dto.eventDate);

    const talent = await this.prisma.talentProfile.findUniqueOrThrow({ where: { id: dto.talentId } });
    const advancePct = dto.advancePct ?? 30;
    const advanceAmount = Math.round(dto.amount * (advancePct / 100) * 100) / 100;
    const balanceAmount = Math.round((dto.amount - advanceAmount) * 100) / 100;
    const commissionPct = await this.commission.resolvePercentage('BOOKING', talent.category);

    const booking = await this.prisma.booking.create({
      data: {
        customerId,
        talentId: dto.talentId,
        eventType: dto.eventType,
        eventDate: new Date(dto.eventDate),
        startTime: dto.startTime,
        endTime: dto.endTime,
        venueAddress: dto.venueAddress,
        latitude: dto.latitude,
        longitude: dto.longitude,
        amount: dto.amount,
        advancePct,
        advanceAmount,
        balanceAmount,
        commissionPct,
        status: BookingStatus.REQUESTED,
      },
    });

    // Tentatively hold the slot so two customers can't double-book while this is pending
    await this.prisma.calendarSlot.create({
      data: {
        talentId: dto.talentId,
        date: new Date(dto.eventDate),
        startTime: dto.startTime || '00:00',
        endTime: dto.endTime || '23:59',
        status: AvailabilityStatus.TENTATIVE,
      },
    });

    await this.notifications.notify(
      talent.userId,
      'New booking request',
      `You have a new booking request for ${new Date(dto.eventDate).toLocaleDateString()}.`,
      'BOOKING_REQUESTED',
      { bookingId: booking.id },
    );

    return booking;
  }

  async talentRespond(talentUserId: string, bookingId: string, accept: boolean) {
    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { talent: true } });
    if (booking.talent.userId !== talentUserId) throw new BadRequestException('Not your booking to respond to');

    if (accept) {
      await this.prisma.calendarSlot.updateMany({
        where: { talentId: booking.talentId, date: booking.eventDate },
        data: { status: AvailabilityStatus.BOOKED },
      });
      const updated = await this.prisma.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.ACCEPTED } });
      await this.notifications.notify(booking.customerId, 'Booking accepted', 'Your booking request was accepted — pay the advance to confirm.', 'BOOKING_ACCEPTED', { bookingId });
      return updated;
    } else {
      await this.prisma.calendarSlot.updateMany({
        where: { talentId: booking.talentId, date: booking.eventDate },
        data: { status: AvailabilityStatus.AVAILABLE },
      });
      const updated = await this.prisma.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.REJECTED } });
      await this.notifications.notify(booking.customerId, 'Booking declined', 'The talent was unable to accept this booking request.', 'BOOKING_REJECTED', { bookingId });
      return updated;
    }
  }

  async myBookings(customerId: string) {
    return this.prisma.booking.findMany({ where: { customerId }, include: { talent: true }, orderBy: { eventDate: 'desc' } });
  }

  async talentBookings(talentProfileId: string) {
    return this.prisma.booking.findMany({ where: { talentId: talentProfileId }, orderBy: { eventDate: 'desc' } });
  }
}
