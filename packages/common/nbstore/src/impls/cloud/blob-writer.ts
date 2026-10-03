import { UserFriendlyError } from '@affine/error';
import {
  abortBlobUploadMutation,
  BlobUploadMethod,
  completeBlobUploadMutation,
  createBlobUploadMutation,
  deleteBlobMutation,
  getBlobUploadPartUrlQuery,
  listBlobsQuery,
  releaseDeletedBlobsMutation,
  setBlobMutation,
  workspaceBlobQuotaQuery,
} from '@affine/graphql';

import {
  type BlobRecord,
  OverCapacityError,
  OverSizeError,
} from '../../storage';
import type { HttpConnection } from './http';

const UPLOAD_REQUEST_TIMEOUT = 0;
// number of multipart parts uploaded at the same time
const MULTIPART_UPLOAD_CONCURRENCY = 4;

type UploadProgressCallback = (
  uploadedBytes: number,
  totalBytes: number
) => void;

function toStrictArrayBuffer(
  data: ArrayBuffer | ArrayBufferLike | ArrayBufferView
): ArrayBuffer {
  if (data instanceof ArrayBuffer) {
    return data;
  }

  if (ArrayBuffer.isView(data)) {
    if (data.buffer instanceof ArrayBuffer) {
      if (data.byteOffset === 0 && data.byteLength === data.buffer.byteLength) {
        return data.buffer;
      }
      return data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength
      );
    }

    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
  }

  const bytes = new Uint8Array(data);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export class CloudBlobWriter {
  private humanReadableBlobSizeLimit: string | null = null;
  private blobSizeLimit: number | null = null;
  private blobSizeLimitTime = 0;

  constructor(
    private readonly connection: HttpConnection,
    private readonly workspaceId: string,
    private readonly serverBaseUrl: string
  ) {}

  async set(
    blob: BlobRecord,
    signal?: AbortSignal,
    onProgress?: UploadProgressCallback
  ) {
    const totalBytes = blob.data.byteLength;
    const reportProgress = (uploadedBytes: number) => {
      try {
        onProgress?.(Math.min(uploadedBytes, totalBytes), totalBytes);
      } catch (error) {
        console.error('blob upload progress callback failed', error);
      }
    };
    try {
      signal?.throwIfAborted();
      const blobSizeLimit = await this.getBlobSizeLimit(signal);
      if (blob.data.byteLength > blobSizeLimit) {
        throw new OverSizeError(this.humanReadableBlobSizeLimit);
      }

      const init = await this.connection.gql({
        query: createBlobUploadMutation,
        variables: {
          workspaceId: this.workspaceId,
          key: blob.key,
          size: blob.data.byteLength,
          mime: blob.mime,
        },
        context: { signal },
      });

      const upload = init.createBlobUpload;
      if (upload.alreadyUploaded) {
        reportProgress(totalBytes);
        return;
      }
      reportProgress(0);
      try {
        if (upload.method === BlobUploadMethod.PRESIGNED) {
          if (!upload.uploadUrl) {
            throw new Error('Missing upload URL for presigned upload.');
          }
          await this.uploadViaPresigned(
            upload.uploadUrl,
            upload.headers,
            blob.data,
            signal
          );
          await this.completeUpload(blob.key, undefined, undefined, signal);
          reportProgress(totalBytes);
          return;
        }

        if (upload.method === BlobUploadMethod.MULTIPART) {
          if (!upload.uploadId || !upload.partSize) {
            throw new Error(
              'Missing upload ID or part size for multipart upload.'
            );
          }
          const parts = await this.uploadViaMultipart(
            blob.key,
            upload.uploadId,
            upload.partSize,
            blob.data,
            upload.uploadedParts,
            signal,
            reportProgress
          );
          await this.completeUpload(blob.key, upload.uploadId, parts, signal);
          reportProgress(totalBytes);
          return;
        }
      } catch (error) {
        if (upload.method === BlobUploadMethod.MULTIPART && upload.uploadId) {
          await this.tryAbortMultipartUpload(blob.key, upload.uploadId);
        }
        signal?.throwIfAborted();
        if (UserFriendlyError.fromAny(error).is('CONTENT_TOO_LARGE')) {
          throw error;
        }
      }

      reportProgress(0);
      await this.uploadViaGraphql(blob, signal);
      reportProgress(totalBytes);
    } catch (err) {
      const userFriendlyError = UserFriendlyError.fromAny(err);
      if (userFriendlyError.is('STORAGE_QUOTA_EXCEEDED')) {
        throw new OverCapacityError();
      }
      if (userFriendlyError.is('BLOB_QUOTA_EXCEEDED')) {
        throw new OverSizeError(this.humanReadableBlobSizeLimit);
      }
      if (userFriendlyError.is('CONTENT_TOO_LARGE')) {
        throw new OverSizeError(
          null,
          'Upload stopped by network proxy: file size exceeds the set limit.'
        );
      }
      throw err;
    }
  }

  async delete(key: string, permanently: boolean) {
    await this.connection.gql({
      query: deleteBlobMutation,
      variables: { workspaceId: this.workspaceId, key, permanently },
    });
  }

  async release() {
    await this.connection.gql({
      query: releaseDeletedBlobsMutation,
      variables: { workspaceId: this.workspaceId },
    });
  }

  async listManageable() {
    const result = await this.connection.gql({
      query: listBlobsQuery,
      variables: { workspaceId: this.workspaceId },
    });
    return result.workspace.blobs.map(blob => ({
      ...blob,
      createdAt: blob.createdAt ? new Date(blob.createdAt) : undefined,
    }));
  }

  private async uploadViaGraphql(blob: BlobRecord, signal?: AbortSignal) {
    await this.connection.gql({
      query: setBlobMutation,
      variables: {
        workspaceId: this.workspaceId,
        blob: new File([toStrictArrayBuffer(blob.data)], blob.key, {
          type: blob.mime,
        }),
      },
      context: { signal },
      timeout: UPLOAD_REQUEST_TIMEOUT,
    });
  }

  private async uploadViaPresigned(
    uploadUrl: string,
    headers: Record<string, string> | null | undefined,
    data: Uint8Array,
    signal?: AbortSignal
  ) {
    const res = await this.fetchUpload(uploadUrl, {
      method: 'PUT',
      headers: headers ?? undefined,
      body: toStrictArrayBuffer(data),
      signal,
    });
    if (!res.ok) {
      throw new Error(`Presigned upload failed with status ${res.status}`);
    }
  }

  private async uploadViaMultipart(
    key: string,
    uploadId: string,
    partSize: number,
    data: Uint8Array,
    uploadedParts: { partNumber: number; etag: string }[] | null | undefined,
    signal?: AbortSignal,
    reportProgress?: (uploadedBytes: number) => void
  ) {
    const partsMap = new Map<number, string>();
    for (const part of uploadedParts ?? []) {
      partsMap.set(part.partNumber, part.etag);
    }
    const totalParts = Math.ceil(data.byteLength / partSize);
    const getPartRange = (partNumber: number) => {
      const start = (partNumber - 1) * partSize;
      return [start, Math.min(start + partSize, data.byteLength)] as const;
    };

    const pendingParts: number[] = [];
    let uploadedBytes = 0;
    for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
      if (partsMap.has(partNumber)) {
        const [start, end] = getPartRange(partNumber);
        uploadedBytes += end - start;
      } else {
        pendingParts.push(partNumber);
      }
    }
    reportProgress?.(uploadedBytes);

    const uploadPart = async (partNumber: number) => {
      const [start, end] = getPartRange(partNumber);
      const chunk = data.subarray(start, end);
      const part = await this.connection.gql({
        query: getBlobUploadPartUrlQuery,
        variables: {
          workspaceId: this.workspaceId,
          key,
          uploadId,
          partNumber,
        },
        context: { signal },
      });
      signal?.throwIfAborted();
      const res = await this.fetchUpload(
        part.workspace.blobUploadPartUrl.uploadUrl,
        {
          method: 'PUT',
          headers: part.workspace.blobUploadPartUrl.headers ?? undefined,
          body: toStrictArrayBuffer(chunk),
          signal,
        }
      );
      if (!res.ok) {
        throw new Error(
          `Multipart upload failed at part ${partNumber} with status ${res.status}`
        );
      }
      const etag = res.headers.get('etag');
      if (!etag) {
        throw new Error(`Missing ETag for part ${partNumber}.`);
      }
      partsMap.set(partNumber, etag);
      uploadedBytes += end - start;
      reportProgress?.(uploadedBytes);
    };

    let firstError: unknown = null;
    let failed = false;
    let nextIndex = 0;
    const worker = async () => {
      while (!failed && nextIndex < pendingParts.length) {
        const partNumber = pendingParts[nextIndex];
        nextIndex += 1;
        try {
          await uploadPart(partNumber);
        } catch (error) {
          // stop picking new parts, the parts already in flight finish on their own
          if (!failed) {
            failed = true;
            firstError = error;
          }
          return;
        }
      }
    };

    // wait for every in-flight part to settle before reporting the failure,
    // so the caller never aborts the multipart upload while parts are still running
    await Promise.all(
      Array.from(
        { length: Math.min(MULTIPART_UPLOAD_CONCURRENCY, pendingParts.length) },
        () => worker()
      )
    );
    if (failed) {
      throw firstError;
    }

    if (partsMap.size !== totalParts) {
      throw new Error('Multipart upload has missing parts.');
    }
    return [...partsMap.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([partNumber, etag]) => ({ partNumber, etag }));
  }

  private async completeUpload(
    key: string,
    uploadId: string | undefined,
    parts: { partNumber: number; etag: string }[] | undefined,
    signal?: AbortSignal
  ) {
    await this.connection.gql({
      query: completeBlobUploadMutation,
      variables: { workspaceId: this.workspaceId, key, uploadId, parts },
      context: { signal },
      timeout: UPLOAD_REQUEST_TIMEOUT,
    });
  }

  private async tryAbortMultipartUpload(key: string, uploadId: string) {
    try {
      await this.connection.gql({
        query: abortBlobUploadMutation,
        variables: { workspaceId: this.workspaceId, key, uploadId },
      });
    } catch {}
  }

  private async fetchUpload(input: string, init: RequestInit) {
    const res = await globalThis.fetch(
      new URL(input, this.serverBaseUrl).toString(),
      init
    );
    if (res.status === 413) {
      throw new UserFriendlyError({
        status: 413,
        code: 'CONTENT_TOO_LARGE',
        type: 'CONTENT_TOO_LARGE',
        name: 'CONTENT_TOO_LARGE',
        message: 'Content too large',
      });
    }
    return res;
  }

  private async getBlobSizeLimit(signal?: AbortSignal) {
    if (
      this.blobSizeLimit !== null &&
      Date.now() - this.blobSizeLimitTime < 120 * 1000
    ) {
      return this.blobSizeLimit;
    }
    const res = await this.connection.gql({
      query: workspaceBlobQuotaQuery,
      variables: { id: this.workspaceId },
      context: { signal },
    });
    this.humanReadableBlobSizeLimit =
      res.workspace.quota.humanReadable.blobLimit;
    this.blobSizeLimit = res.workspace.quota.blobLimit;
    this.blobSizeLimitTime = Date.now();
    return this.blobSizeLimit;
  }
}
