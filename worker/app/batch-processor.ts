import {cloudStorage, fileProcessingConcurrency, websiteId} from "../index";
import ReportBuilder from "./report-builder";
/**
 * BatchProcessor Class
 *
 * This class is designed to manage and process a queue of file paths in batched operations.
 * It supports debouncing and optional chunked processing with a configurable maximum batch size.
 * The main purpose is to ensure efficient handling of frequent events (e.g., file additions)
 * by aggregating them into manageable batches, avoiding redundant processing.
 *
 * Key Features:
 * - Debounce mechanism to delay processing until no new events are detected for a specified time.
 * - Optional `maxQueueSize` to trigger immediate processing when the queue reaches a threshold.
 * - Supports asynchronous processing of files with error handling.
 * - Allows a callback (`onBatchProcessed`) to be triggered after a batch is successfully processed.
 *
 * Constructor Parameters:
 * - `debounceDelay` (number): The delay in milliseconds before processing begins after the last event.
 * - `maxQueueSize` (number): The maximum number of files that can trigger immediate processing.
 *    If set, files will be processed in chunks of this size.
 * - `onBatchProcessed` (callback): Optional function to be called with the processed batch of files.
 *
 * Methods:
 * - `add(filePath: string)`: Adds a file path to the queue. If the queue size reaches `maxQueueSize`,
 *    triggers immediate processing; otherwise, initiates debouncing.
 * - `processBatch()`: Processes the current batch of files from the queue. If more files remain,
 *    it continues processing until the queue is empty.
 * - `debounceBatchProcessing()`: Handles the debouncing logic to ensure batch processing is delayed
 *    until no new events are detected within the `debounceDelay`.
 *
 * Usage Example:
 * const batchProcessor = new BatchProcessor(1000, 5, (files) => {
 *     console.log(`Processed batch of ${files.length} files.`);
 * });
 *
 * batchProcessor.add('/path/to/file1');
 * batchProcessor.add('/path/to/file2');
 *
 * // Files will be processed in a batch after a 1-second debounce delay or immediately if 5 files are added.
 */
export class BatchProcessor {
    private fileQueue: string[] = [];
    private processing = false;
    private timer: NodeJS.Timeout | null = null;

    constructor(
        private debounceDelay: number = 1000,
        private maxQueueSize: number = fileProcessingConcurrency,
        private onBatchProcessed?: (files: string[]) => void
    ) {}

    public add(filePath: string): void {
        this.fileQueue.push(filePath);

        if (this.fileQueue.length >= this.maxQueueSize) {
            if (this.timer) {
                clearTimeout(this.timer); // Clear existing timer
                this.timer = null;
            }
            void this.processBatch(); // Immediate processing
        } else {
            this.debounceBatchProcessing();
        }
    }

    private async processBatch() {
        if (this.processing || this.fileQueue.length === 0) return;

        this.processing = true;

        // Process only up to `maxQueueSize` files in each batch
        const filesToProcess = this.fileQueue.splice(0, this.maxQueueSize);

        console.log(`Processing ${filesToProcess.length} files...`);

        try {
            const promises: Promise<any>[] = [];
            if (websiteId) {
                // Stage files then set ttl
                promises.push(ReportBuilder.stageFiles(filesToProcess)
                    .then(() => ReportBuilder.setTtl()))
            }
            if (cloudStorage) {
                promises.push(cloudStorage.uploadFiles(filesToProcess, {concurrency : fileProcessingConcurrency}))
            }
            await Promise.all(promises);

            this.onBatchProcessed?.(filesToProcess); // Notify on completion
        } catch (error) {
            console.error("Error processing files:", error);
        } finally {
            this.processing = false;

            // If there are remaining files, trigger another batch
            if (this.fileQueue.length > 0) {
                void this.processBatch();
            }
        }
    }

    private debounceBatchProcessing() {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            void this.processBatch();
        }, this.debounceDelay);
    }
}