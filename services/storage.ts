import { S3 } from 'aws-sdk';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export interface StorageService {
  uploadFile(filePath: string, key: string, contentType: string): Promise<string>;
  getPublicUrl(key: string): string;
}

class S3StorageService implements StorageService {
  private s3: S3;
  private bucketName: string;
  private cdnBaseUrl: string;

  constructor() {
    this.s3 = new S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });
    this.bucketName = process.env.AWS_BUCKET_NAME || 'jays-frames-3d-models';
    this.cdnBaseUrl = process.env.CDN_BASE_URL || `https://${this.bucketName}.s3.amazonaws.com`;
  }

  async uploadFile(filePath: string, key: string, contentType: string): Promise<string> {
    try {
      const fileContent = await fs.readFile(filePath);
      
      await this.s3
        .putObject({
          Bucket: this.bucketName,
          Key: key,
          Body: fileContent,
          ContentType: contentType,
          ACL: 'public-read',
          CacheControl: 'public, max-age=31536000', // 1 year cache
        })
        .promise();

      const url = this.getPublicUrl(key);
      logger.info(`Uploaded file to S3: ${url}`);
      return url;
    } catch (error) {
      logger.error('S3 upload error:', error);
      throw error;
    }
  }

  getPublicUrl(key: string): string {
    return `${this.cdnBaseUrl}/${key}`;
  }
}

class LocalStorageService implements StorageService {
  private storagePath: string;
  private baseUrl: string;

  constructor() {
    this.storagePath = process.env.LOCAL_STORAGE_PATH || '/app/models';
    this.baseUrl = process.env.CDN_BASE_URL || `http://localhost:${process.env.PORT || 3000}/models`;
  }

  async uploadFile(filePath: string, key: string, contentType: string): Promise<string> {
    try {
      const destPath = path.join(this.storagePath, key);
      const destDir = path.dirname(destPath);

      // Ensure directory exists
      await fs.mkdir(destDir, { recursive: true });

      // Copy file
      await fs.copyFile(filePath, destPath);

      const url = this.getPublicUrl(key);
      logger.info(`Saved file locally: ${url}`);
      return url;
    } catch (error) {
      logger.error('Local storage error:', error);
      throw error;
    }
  }

  getPublicUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }
}

// Factory function
export function createStorageService(): StorageService {
  const storageType = process.env.STORAGE_TYPE || 's3';
  
  if (storageType === 's3') {
    return new S3StorageService();
  } else {
    return new LocalStorageService();
  }
}

export const storage = createStorageService();
