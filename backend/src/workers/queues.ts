import Bull from "bull";
import { logger } from "../utils/logger";
import { config } from "../config";

const redisUrl = new URL(config.redisUrl);
const redisConfig = {
    host: redisUrl.hostname,
    port: parseInt(redisUrl.port),
};

const defaultQueueSettings: Bull.QueueOptions["settings"] = {
    stalledInterval: 30000,
    lockDuration: 30000,
    maxStalledCount: 1,
};

const defaultJobOptions: Bull.JobOptions = {
    removeOnComplete: 100,
    removeOnFail: 50,
};

export const scanQueue = new Bull("library-scan", {
    redis: redisConfig,
    settings: defaultQueueSettings,
    defaultJobOptions,
});

export const discoverQueue = new Bull("discover-weekly", {
    redis: redisConfig,
    settings: defaultQueueSettings,
    defaultJobOptions,
});

export const queues = [scanQueue, discoverQueue];

queues.forEach((queue) => {
    queue.on("error", (error) => {
        logger.error(`Bull queue error (${queue.name}):`, {
            message: error.message,
            stack: error.stack,
        });
    });

    queue.on("stalled", (job) => {
        logger.warn(`Bull job stalled (${queue.name}):`, {
            jobId: job.id,
        });
    });
});

logger.debug("Bull queues initialized with stability settings");
