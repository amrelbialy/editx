export const EDITX_ARCHIVE_LIMITS = Object.freeze({
  archiveBytes: 32 * 1024 * 1024,
  aggregateUncompressedBytes: 64 * 1024 * 1024,
  entryCompressedBytes: 32 * 1024 * 1024,
  entryUncompressedBytes: 32 * 1024 * 1024,
  documentBytes: 16 * 1024 * 1024,
  manifestBytes: 1024 * 1024,
  entryCount: 64,
  pathUtf8Bytes: 240,
} as const);

export type EditxArchiveLimitName = keyof typeof EDITX_ARCHIVE_LIMITS;
