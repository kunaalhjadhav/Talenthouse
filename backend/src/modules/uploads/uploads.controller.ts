import { Controller, Post, UploadedFile, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as crypto from 'crypto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Local-disk image upload — replaces the "paste an image URL" workaround for
 * contest banners and audition posters. Returns a URL under /uploads/<file>
 * that main.ts serves statically.
 *
 * IMPORTANT CAVEAT: Render's free tier (and most PaaS free tiers) have an
 * EPHEMERAL filesystem — uploaded files are wiped on every redeploy or
 * restart. This works correctly for local development and for a VPS/EC2
 * deployment with a persistent disk, but on Render free tier you'll lose
 * uploaded images on the next deploy. For production on Render, swap this
 * for S3/Cloudinary (same controller shape, just change where the file is
 * written and what URL is returned).
 */
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  @Post('image')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueName = `${crypto.randomUUID()}${extname(file.originalname)}`;
        cb(null, uniqueName);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!ALLOWED_TYPES.includes(file.mimetype)) return cb(new BadRequestException('Only JPEG, PNG, or WEBP images are allowed'), false);
      cb(null, true);
    },
    limits: { fileSize: MAX_SIZE_BYTES },
  }))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`;
    return { url: `${baseUrl}/uploads/${file.filename}` };
  }
}
