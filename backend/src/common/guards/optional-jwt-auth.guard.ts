import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthGuard, but never throws — if no token (or an invalid one) is
 * present, req.user is simply left undefined instead of a 401. Use this on
 * routes that should work for anonymous users but personalize when logged in
 * (e.g. the reels feed's FOLLOWING variant).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    return user || null;
  }
}
