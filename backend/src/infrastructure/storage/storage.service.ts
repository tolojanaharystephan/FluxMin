import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { createReadStream, existsSync, promises as fs } from 'fs';
import { Readable } from 'stream';
import {
  isDiskStoredPath,
  resolveStoredFilePath,
  safeUnlink,
  UPLOADS_ROOT,
  MESSAGES_UPLOAD_DIR,
  PUBLICATIONS_UPLOAD_DIR,
} from '../../common/files/storage.util';

export type StorageFolder = 'courriers' | 'messages' | 'publications';

export interface StoredObjectRef {
  /** Valeur persistée en base (clé objet MinIO ou chemin disque legacy) */
  storedPath: string;
  backend: 'minio' | 'disk';
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: S3Client | null = null;
  private bucket = '';
  private enabled = false;

  async onModuleInit() {
    const endpointHost = process.env.MINIO_ENDPOINT || 'localhost';
    const port = process.env.MINIO_PORT || '9000';
    const useSsl = process.env.MINIO_USE_SSL === 'true';
    const accessKey = process.env.MINIO_ROOT_USER || process.env.MINIO_ACCESS_KEY || 'minioadmin';
    const secretKey =
      process.env.MINIO_ROOT_PASSWORD || process.env.MINIO_SECRET_KEY || 'minioadmin';
    this.bucket = process.env.MINIO_BUCKET || 'fluxmin-bucket';

    if (process.env.MINIO_DISABLED === 'true') {
      this.logger.warn('MinIO désactivé (MINIO_DISABLED=true) — stockage disque uniquement');
      return;
    }

    const endpoint = `${useSsl ? 'https' : 'http'}://${endpointHost}:${port}`;
    this.client = new S3Client({
      region: process.env.MINIO_REGION || 'us-east-1',
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });

    try {
      await this.ensureBucket();
      this.enabled = true;
      this.logger.log(`MinIO OK → ${endpoint} bucket=${this.bucket}`);
    } catch (err: any) {
      this.enabled = false;
      this.logger.warn(
        `MinIO indisponible (${err?.message || err}) — fallback disque local`,
      );
    }
  }

  isMinioEnabled() {
    return this.enabled;
  }

  private async ensureBucket() {
    if (!this.client) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket MinIO créé : ${this.bucket}`);
    }
  }

  /**
   * Persiste un fichier Multer : MinIO prioritaire, sinon chemin disque.
   * En succès MinIO, le fichier temporaire local est supprimé.
   */
  async persistMulterFile(
    file: Express.Multer.File,
    folder: StorageFolder,
  ): Promise<StoredObjectRef> {
    const objectKey = `${folder}/${file.filename}`;

    if (this.enabled && this.client) {
      try {
        const body = createReadStream(file.path);
        await this.client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: objectKey,
            Body: body,
            ContentType: file.mimetype || 'application/octet-stream',
            ContentLength: file.size,
          }),
        );
        safeUnlink(file.path);
        return { storedPath: objectKey, backend: 'minio' };
      } catch (err: any) {
        this.logger.warn(`Upload MinIO échoué, garde disque : ${err?.message || err}`);
      }
    }

    // Fallback : garder le fichier déjà écrit par Multer sous uploads/
    const diskPath =
      folder === 'messages'
        ? `uploads/messages/${file.filename}`
        : folder === 'publications'
          ? `uploads/publications/${file.filename}`
          : `uploads/${file.filename}`;
    return { storedPath: diskPath, backend: 'disk' };
  }

  async openReadStream(storedPath: string | null | undefined): Promise<{
    stream: Readable;
    from: 'minio' | 'disk';
  }> {
    if (!storedPath) {
      throw new Error('Chemin fichier vide');
    }

    if (isDiskStoredPath(storedPath)) {
      const fallback =
        storedPath.includes('/messages/') || storedPath.includes('\\messages\\')
          ? MESSAGES_UPLOAD_DIR
          : storedPath.includes('/publications/') || storedPath.includes('\\publications\\')
            ? PUBLICATIONS_UPLOAD_DIR
            : UPLOADS_ROOT;
      const filePath = resolveStoredFilePath(storedPath, fallback);
      if (!filePath || !existsSync(filePath)) {
        throw new Error(`Fichier disque introuvable (${storedPath})`);
      }
      return { stream: createReadStream(filePath), from: 'disk' };
    }

    if (!this.enabled || !this.client) {
      throw new Error(`MinIO indisponible pour lire ${storedPath}`);
    }

    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: storedPath }),
    );
    if (!res.Body) throw new Error(`Objet MinIO vide (${storedPath})`);
    return { stream: res.Body as Readable, from: 'minio' };
  }

  /** Lit le contenu en Buffer (ex. envoi IA). */
  async readBuffer(storedPath: string | null | undefined): Promise<Buffer> {
    const { stream } = await this.openReadStream(storedPath);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async remove(storedPath: string | null | undefined): Promise<void> {
    if (!storedPath) return;

    if (isDiskStoredPath(storedPath)) {
      const fallback =
        storedPath.includes('messages')
          ? MESSAGES_UPLOAD_DIR
          : storedPath.includes('publications')
            ? PUBLICATIONS_UPLOAD_DIR
            : UPLOADS_ROOT;
      safeUnlink(resolveStoredFilePath(storedPath, fallback));
      return;
    }

    if (this.enabled && this.client) {
      try {
        await this.client.send(
          new DeleteObjectCommand({ Bucket: this.bucket, Key: storedPath }),
        );
      } catch (err: any) {
        this.logger.warn(`Delete MinIO ${storedPath}: ${err?.message || err}`);
      }
    }

    // Nettoyage éventuel d'un résidu disque homonyme
    try {
      await fs.unlink(`${process.cwd()}/uploads/${storedPath.split('/').pop()}`);
    } catch {
      /* ignore */
    }
  }
}
