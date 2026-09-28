import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, UserStatus } from '@prisma/client';
import { UpdateProfileDto } from './dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@CurrentUser('id') userId: string, @Body() body: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, body);
  }

  @Get(':id/public-profile')
  publicProfile(@Param('id') id: string) {
    return this.usersService.findPublicProfile(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT_ADMIN)
  @Get()
  list(@Query('role') role?: UserRole, @Query('status') status?: UserStatus, @Query('search') search?: string) {
    return this.usersService.listUsers({ role, status, search });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body('status') status: UserStatus) {
    return this.usersService.setStatus(id, status);
  }
}
