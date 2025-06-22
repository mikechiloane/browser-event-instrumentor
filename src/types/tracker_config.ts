type TrackerConfig = {
    endpoint: string;
    flushInterval?: number;
    maxBatchSize?: number;
    sessionTimeout?: number;
    debug?: boolean;
    userId?: string;
}

export type { TrackerConfig };