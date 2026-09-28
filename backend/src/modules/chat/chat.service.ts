import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  /** Finds or creates the conversation between two users (order-independent), optionally scoped to a context like a booking. */
  async getOrCreateConversation(userAId: string, userBId: string, context?: string) {
    // Normalize participant order so (A,B) and (B,A) always resolve to the same row.
    const [participantAId, participantBId] = [userAId, userBId].sort();

    const existing = await this.prisma.conversation.findFirst({
      where: { participantAId, participantBId, context: context ?? null },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: { participantAId, participantBId, context: context ?? null },
    });
  }

  async myConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ participantAId: userId }, { participantBId: userId }] },
      orderBy: { lastMessageAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    // Attach the "other" participant's basic info for the conversation list UI.
    const otherIds = conversations.map((c) => (c.participantAId === userId ? c.participantBId : c.participantAId));
    const others = await this.prisma.user.findMany({
      where: { id: { in: otherIds } },
      select: { id: true, name: true, profilePhoto: true },
    });
    const byId = Object.fromEntries(others.map((u) => [u.id, u]));

    return conversations.map((c) => {
      const otherId = c.participantAId === userId ? c.participantBId : c.participantAId;
      return { ...c, otherUser: byId[otherId], lastMessage: c.messages[0] || null };
    });
  }

  async assertParticipant(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } });
    if (conversation.participantAId !== userId && conversation.participantBId !== userId) {
      throw new ForbiddenException('Not a participant in this conversation');
    }
    return conversation;
  }

  async getMessages(userId: string, conversationId: string, take = 50, skip = 0) {
    await this.assertParticipant(userId, conversationId);
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }

  async sendMessage(userId: string, conversationId: string, body: string) {
    await this.assertParticipant(userId, conversationId);

    const message = await this.prisma.message.create({
      data: { conversationId, senderId: userId, body },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }

  async markRead(userId: string, conversationId: string) {
    await this.assertParticipant(userId, conversationId);
    await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, read: false },
      data: { read: true },
    });
    return { marked: true };
  }
}
