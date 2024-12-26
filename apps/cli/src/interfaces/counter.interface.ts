import {MutexInterface} from "async-mutex";

export interface CounterInterface {
    startTime: number | undefined
    processed: number
    uploaded: number
    mutex: MutexInterface

    addFilesProcessed(count: number): Promise<void>
    addFilesUploaded(count: number): Promise<void>
    startTimer(): void
    getElapsedSeconds(): string
}