import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger('NotificationsService');
  private firebaseApp: admin.app.App | null = null;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
      this.logger.warn('Firebase credentials not set — push notifications will be logged locally instead of sent. See DEPLOYMENT.md §9.');
      return;
    }
      try {
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } catch (e) {
      // A malformed or placeholder key should disable push, not take the whole API down.
      this.firebaseApp = null;
      this.logger.warn(`Firebase credentials are invalid, so push notifications are disabled: ${(e as Error).message}`);
    }
  }

  async registerDeviceToken(userId: string, token: string, platform: 'ios' | 'android') {
    return this.prisma.deviceToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform, updatedAt: new Date() },
    });
  }

  async unregisterDeviceToken(token: string) {
    await this.prisma.deviceToken.deleteMany({ where: { token } });
    return { removed: true };
  }

  /**
   * Creates the in-app Notification record AND attempts an FCM push to every
   * device the user is registered on. The DB write always happens (so the
   * in-app notification bell/list works even if push delivery fails or
   * Firebase isn't configured yet); the push is best-effort.
   */
  async notify(userId: string, title: string, body: string, type: string, data?: Record<string, any>) {
    const notification = await this.prisma.notification.create({
      data: { userId, title, body, type, data },
    });

    await this.sendPush(userId, title, body, data);

    return notification;
  }

  async notifyMany(userIds: string[], title: string, body: string, type: string, data?: Record<string, any>) {
    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({ userId, title, body, type, data })),
    });
    await Promise.all(userIds.map((userId) => this.sendPush(userId, title, body, data)));
  }

  private async sendPush(userId: string, title: string, body: string, data?: Record<string, any>) {
    const tokens = await this.prisma.deviceToken.findMany({ where: { userId } });
    if (tokens.length === 0) return;

    if (!this.firebaseApp) {
      this.logger.debug(`[push not sent — Firebase not configured] ${userId}: ${title} — ${body}`);
      return;
    }

    const stringData = data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : undefined;

    try {
      const response = await admin.messaging(this.firebaseApp).sendEachForMulticast({
        tokens: tokens.map((t) => t.token),
        notification: { title, body },
        data: stringData,
      });

      // Clean up tokens Firebase reports as no-longer-valid (uninstalled app, expired token, etc.)
      const staleTokens = response.responses
        .map((r, i) => (!r.success && r.error?.code === 'messaging/registration-token-not-registered' ? tokens[i].token : null))
        .filter((t): t is string => !!t);
      if (staleTokens.length > 0) {
        await this.prisma.deviceToken.deleteMany({ where: { token: { in: staleTokens } } });
      }
    } catch (e) {
      this.logger.error(`Push send failed for user ${userId}`, e as Error);
    }
  }

  async myNotifications(userId: string, take = 50, skip = 0) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }

  async markRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  }
}
