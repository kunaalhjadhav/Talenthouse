import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { TalentsService } from '../talents/talents.service';
import { CommissionService } from '../commission/commission.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { BookingStatus, AvailabilityStatus } from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService, private talentsService: TalentsService, private commission: CommissionService, private notifications: NotificationsService, private settings: SettingsService) {}

  /** The price always comes from the talent's profile, never from the client, so a booking amount can't be tampered with. */
  async createBooking(customerId: string, dto: { talentId: string; eventType?: string; eventDate: string; startTime?: string; endTime?: string; venueAddress?: string; latitude?: number; longitude?: number }) {
    if (!dto.talentId || !dto.eventDate) throw new BadRequestException('talentId and eventDate are required');
    const eventDate = new Date(dto.eventDate);
    if (isNaN(eventDate.getTime()) || eventDate < new Date(new Date().setHours(0, 0, 0, 0))) throw new BadRequestException('Pick a date that is today or later');
    const talent = await this.prisma.talentProfile.findUniqueOrThrow({ where: { id: dto.talentId } });
    if (talent.userId === customerId) throw new BadRequestException('You cannot book yourself');
    if (!talent.verified) throw new BadRequestException('This talent is not verified yet');
    await this.talentsService.assertSlotAvailable(dto.talentId, dto.eventDate);
    const s = await this.settings.all();
    const amount = Number(talent.basePrice);
    const advancePct = s.advancePct;
    const advanceAmount = Math.round(amount * (advancePct / 100) * 100) / 100;
    const balanceAmount = Math.round((amount - advanceAmount) * 100) / 100;
    let commissionPct = await this.commission.resolvePercentage('BOOKING', talent.category);
    const sub = await this.prisma.subscription.findUnique({ where: { userId: talent.userId } });
    const subActive = sub && sub.status === 'ACTIVE' && (!sub.expiresAt || sub.expiresAt > new Date());
    if (subActive && sub!.plan === 'PRO') commissionPct = Math.max(0, commissionPct - s.proCommissionDiscount);
    else if (subActive && sub!.plan === 'PREMIUM') commissionPct = Math.max(0, commissionPct - s.premiumCommissionDiscount);
    const booking = await this.prisma.booking.create({ data: { customerId, talentId: dto.talentId, eventType: dto.eventType, eventDate, startTime: dto.startTime, endTime: dto.endTime, venueAddress: dto.venueAddress, latitude: dto.latitude, longitude: dto.longitude, amount, advancePct, advanceAmount, balanceAmount, commissionPct, status: BookingStatus.REQUESTED } });
    await this.prisma.calendarSlot.create({ data: { talentId: dto.talentId, date: eventDate, startTime: dto.startTime || '00:00', endTime: dto.endTime || '23:59', status: AvailabilityStatus.TENTATIVE } });
    await this.notifications.notify(talent.userId, 'New booking request', `You have a new booking request for ${eventDate.toLocaleDateString('en-IN')}.`, 'BOOKING_REQUESTED', { bookingId: booking.id });
    return booking;
  }

  private async ownedByTalent(talentUserId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { talent: true } });
    if (booking.talent.userId !== talentUserId) throw new ForbiddenException('Not your booking');
    return booking;
  }

  async talentRespond(talentUserId: string, bookingId: string, accept: boolean) {
    const booking = await this.ownedByTalent(talentUserId, bookingId);
    if (booking.status !== BookingStatus.REQUESTED) throw new BadRequestException(`This booking is already ${booking.status.toLowerCase()}`);
    const slotWhere = { talentId: booking.talentId, date: booking.eventDate, status: { in: [AvailabilityStatus.TENTATIVE, AvailabilityStatus.BOOKED] } };
    if (accept) {
      const clash = await this.prisma.booking.findFirst({ where: { talentId: booking.talentId, eventDate: booking.eventDate, id: { not: bookingId }, status: { in: [BookingStatus.ACCEPTED, BookingStatus.ADVANCE_PAID, BookingStatus.CONFIRMED, BookingStatus.PERFORMED] } } });
      if (clash) throw new BadRequestException('You already accepted another booking on this date');
      await this.prisma.calendarSlot.updateMany({ where: slotWhere, data: { status: AvailabilityStatus.BOOKED } });
      const updated = await this.prisma.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.ACCEPTED } });
      await this.notifications.notify(booking.customerId, 'Booking accepted', 'Your booking request was accepted. Pay the advance to confirm.', 'BOOKING_ACCEPTED', { bookingId });
      return updated;
    }
    await this.prisma.calendarSlot.deleteMany({ where: slotWhere });
    const updated = await this.prisma.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.REJECTED } });
    await this.notifications.notify(booking.customerId, 'Booking declined', 'The talent was unable to accept this booking request.', 'BOOKING_REJECTED', { bookingId });
    return updated;
  }

  /** Talent confirms the event happened. That opens the balance payment for the customer. */
  async markPerformed(talentUserId: string, bookingId: string) {
    const booking = await this.ownedByTalent(talentUserId, bookingId);
    if (booking.status !== BookingStatus.ADVANCE_PAID && booking.status !== BookingStatus.CONFIRMED) throw new BadRequestException('Only a confirmed booking (advance paid) can be marked as performed');
    const updated = await this.prisma.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.PERFORMED } });
    await this.notifications.notify(booking.customerId, 'Event completed', `Please pay the balance of ₹${Number(booking.balanceAmount).toLocaleString('en-IN')} to close this booking.`, 'BOOKING_BALANCE_DUE', { bookingId });
    return updated;
  }

  async customerCancel(customerId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { talent: true } });
    if (booking.customerId !== customerId) throw new ForbiddenException('Not your booking');
    if (booking.status !== BookingStatus.REQUESTED && booking.status !== BookingStatus.ACCEPTED) throw new BadRequestException('Only requests that have not been paid yet can be cancelled here. Raise a dispute for paid bookings.');
    await this.prisma.calendarSlot.deleteMany({ where: { talentId: booking.talentId, date: booking.eventDate, status: { in: [AvailabilityStatus.TENTATIVE, AvailabilityStatus.BOOKED] } } });
    const updated = await this.prisma.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.CANCELLED } });
    await this.notifications.notify(booking.talent.userId, 'Booking cancelled', 'The customer cancelled a booking request.', 'BOOKING_CANCELLED', { bookingId });
    return updated;
  }

  myBookings(customerId: string) { return this.prisma.booking.findMany({ where: { customerId }, include: { talent: { include: { user: { select: { name: true, profilePhoto: true } } } } }, orderBy: { eventDate: 'desc' } }); }

  async talentBookingsForUser(talentUserId: string) {
    const profile = await this.prisma.talentProfile.findUnique({ where: { userId: talentUserId } });
    if (!profile) return [];
    return this.prisma.booking.findMany({ where: { talentId: profile.id }, include: { customer: { select: { name: true, profilePhoto: true } } }, orderBy: { eventDate: 'desc' } });
  }

  allForAdmin() { return this.prisma.booking.findMany({ include: { customer: { select: { name: true, mobile: true } }, talent: { include: { user: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' }, take: 200 }); }
}
