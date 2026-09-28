import { Injectable, Logger } from '@nestjs/common';
import Mux from '@mux/mux-node';
import * as crypto from 'crypto';

/**
 * Video transcoding via Mux. Handles: (1) creating a direct upload URL so the
 * mobile app can upload straight to Mux without routing large video files
 * through our own backend, and (2) processing Mux's webhook when transcoding
 * completes, at which point we know the final playback ID.
 *
 * Needs MUX_TOKEN_ID / MUX_TOKEN_SECRET / MUX_WEBHOOK_SECRET (see
 * DEPLOYMENT.md "Video pipeline"). Falls back to a clear error rather than
 * silently no-opping if credentials are missing — better to fail loud in
 * dev than to make a reel upload seem to succeed with no video.
 */
@Injectable()
export class VideoService {
  private readonly logger = new Logger('VideoService');
  private mux: Mux | null = null;

  constructor() {
    const { MUX_TOKEN_ID, MUX_TOKEN_SECRET } = process.env;
    if (MUX_TOKEN_ID && MUX_TOKEN_SECRET) {
      this.mux = new Mux({ tokenId: MUX_TOKEN_ID, tokenSecret: MUX_TOKEN_SECRET });
    } else {
      this.logger.warn('MUX_TOKEN_ID/MUX_TOKEN_SECRET not set — video upload will be disabled until configured. See DEPLOYMENT.md.');
    }
  }

  get isConfigured() {
    return this.mux !== null;
  }

  /** Returns a one-time upload URL the client uploads the raw video file to directly. */
  async createDirectUpload() {
    if (!this.mux) throw new Error('Video upload is not configured (missing Mux credentials)');

    const upload = await this.mux.video.uploads.create({
      cors_origin: '*', // tighten to your actual app domains in production
      new_asset_settings: { playback_policy: ['public'] },
    });

    return { uploadId: upload.id, uploadUrl: upload.url };
  }

  /** Looks up the asset associated with a completed direct upload, once the client reports it finished uploading. */
  async getUploadStatus(uploadId: string) {
    if (!this.mux) throw new Error('Video upload is not configured');
    const upload = await this.mux.video.uploads.retrieve(uploadId);
    return { status: upload.status, assetId: upload.asset_id };
  }

  buildPlaybackUrl(playbackId: string) {
    return `https://stream.mux.com/${playbackId}.m3u8`;
  }

  buildThumbnailUrl(playbackId: string) {
    return `https://image.mux.com/${playbackId}/thumbnail.jpg`;
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
  if (!process.env.MUX_WEBHOOK_SECRET || !signatureHeader) return false;

  // Mux's Mux-Signature header looks like: "t=1234567890,v1=abc123..."
  // Implemented directly with crypto rather than the SDK's verification
  // helper, whose method name has changed across @mux/mux-node versions —
  // this HMAC format itself is stable and documented, so it won't break
  // on a package upgrade the way the SDK call did.
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => part.split('=') as [string, string]),
  );
  const timestamp = parts['t'];
  const expectedSignature = parts['v1'];
  if (!timestamp || !expectedSignature) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const computedSignature = crypto
    .createHmac('sha256', process.env.MUX_WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(expectedSignature));
  } catch {
    return false; // length mismatch between the two buffers, e.g. a malformed header
  }
  }
}
