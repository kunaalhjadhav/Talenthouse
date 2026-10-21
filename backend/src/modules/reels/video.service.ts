import { Injectable, Logger } from '@nestjs/common';
import Mux from '@mux/mux-node';
import * as crypto from 'crypto';
@Injectable()
export class VideoService {
  private readonly logger = new Logger('VideoService');
  private mux: Mux | null = null;
  constructor() {
    const { MUX_TOKEN_ID, MUX_TOKEN_SECRET } = process.env;
    if (MUX_TOKEN_ID && MUX_TOKEN_SECRET) this.mux = new Mux({ tokenId: MUX_TOKEN_ID, tokenSecret: MUX_TOKEN_SECRET });
    else this.logger.warn('MUX_TOKEN_ID/MUX_TOKEN_SECRET not set — video upload disabled until configured.');
  }
  get isConfigured() { return this.mux !== null; }
  async createDirectUpload() { if (!this.mux) throw new Error('Video upload is not configured'); const upload = await this.mux.video.uploads.create({ cors_origin: '*', new_asset_settings: { playback_policy: ['public'] } }); return { uploadId: upload.id, uploadUrl: upload.url }; }
  async getUploadStatus(uploadId: string) { if (!this.mux) throw new Error('Video upload is not configured'); const upload = await this.mux.video.uploads.retrieve(uploadId); return { status: upload.status, assetId: upload.asset_id }; }
  buildPlaybackUrl(playbackId: string) { return `https://stream.mux.com/${playbackId}.m3u8`; }
  buildThumbnailUrl(playbackId: string) { return `https://image.mux.com/${playbackId}/thumbnail.jpg`; }
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    if (!process.env.MUX_WEBHOOK_SECRET || !signatureHeader) return false;
    const parts = Object.fromEntries(signatureHeader.split(',').map((p) => p.split('=') as [string, string]));
    const timestamp = parts['t']; const expectedSignature = parts['v1'];
    if (!timestamp || !expectedSignature) return false;
    const computedSignature = crypto.createHmac('sha256', process.env.MUX_WEBHOOK_SECRET).update(`${timestamp}.${rawBody}`).digest('hex');
    try { return crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(expectedSignature)); } catch { return false; }
  }
}
