declare module 'archiver' {
  interface EntryData {
    name: string
    date?: Date | string | undefined
    mode?: number | undefined
    prefix?: string | undefined
  }

  type EntryDataFunction = (entry: EntryData) => false | EntryData

  interface ProgressData {
    entries: {
      total: number
      processed: number
    }
    fs: {
      totalBytes: number
      processedBytes: number
    }
  }

  class ArchiverError extends Error {
    code: string
    data: unknown
  }

  interface ArchiverOptions {
    statConcurrency?: number | undefined
    highWaterMark?: number | undefined
    gzip?: boolean | undefined
    store?: boolean | undefined
    comment?: string | undefined
    forceLocalTime?: boolean | undefined
    forceZip64?: boolean | undefined
    namePrependSlash?: boolean | undefined
  }

  export class Archiver {
    abort(): this
    append(source: NodeJS.ReadableStream | Uint8Array | string, data?: EntryData): this
    directory(
      dirpath: string,
      destpath: false | string,
      data?: Partial<EntryData> | EntryDataFunction,
    ): this
    file(filename: string, data: EntryData): this
    glob(pattern: string, options?: object, data?: Partial<EntryData>): this
    finalize(): Promise<void>
    pointer(): number
    symlink(filepath: string, target: string, mode?: number): this
    on(event: 'error' | 'warning', listener: (error: ArchiverError) => void): this
    on(event: 'data', listener: (data: Uint8Array) => void): this
    on(event: 'progress', listener: (progress: ProgressData) => void): this
    on(event: 'close' | 'drain' | 'finish' | 'end', listener: () => void): this
    on(event: 'entry', listener: (entry: EntryData) => void): this
    on(event: string, listener: (...args: unknown[]) => void): this
    pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T
  }

  export class ZipArchive extends Archiver {
    constructor(options?: ArchiverOptions)
  }

  export class TarArchive extends Archiver {
    constructor(options?: ArchiverOptions)
  }

  export class JsonArchive extends Archiver {
    constructor(options?: ArchiverOptions)
  }
}
