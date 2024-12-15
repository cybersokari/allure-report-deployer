import {Mutex} from "async-mutex";

export interface CounterInterface {
    startTime: number | null
    processed: number
    uploaded: number
    mutex: Mutex

    addFilesProcessed(count: number): Promise<void>
    addFilesUploaded(count: number): Promise<void>
    startTimer(): void
    getElapsedSeconds(): string

}