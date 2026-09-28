import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('conversations')
  myConversations(@CurrentUser('id') userId: string) {
    return this.chatService.myConversations(userId);
  }

  /** Starts (or resumes) a conversation with another user — e.g. tapping "Message" on a talent/host profile. */
  @Post('conversations/with/:userId')
  startConversation(@CurrentUser('id') userId: string, @Param('userId') otherUserId: string, @Body('context') context?: string) {
    return this.chatService.getOrCreateConversation(userId, otherUserId, context);
  }

  @Get('conversations/:id/messages')
  getMessages(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.chatService.getMessages(userId, conversationId, Number(take) || 50, Number(skip) || 0);
  }

  @Post('conversations/:id/messages')
  sendMessage(@CurrentUser('id') userId: string, @Param('id') conversationId: string, @Body('body') body: string) {
    return this.chatService.sendMessage(userId, conversationId, body);
  }

  @Post('conversations/:id/read')
  markRead(@CurrentUser('id') userId: string, @Param('id') conversationId: string) {
    return this.chatService.markRead(userId, conversationId);
  }
}
