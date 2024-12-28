import {MutexInterface} from "async-mutex";

export interface ResultsStatus {
    passed: number
    broken: number
}

export interface CounterInterface {
    startTime: number | undefined
    processed: number
    uploaded: number
    mutex: MutexInterface

    countResults(resultDir: string): Promise<ResultsStatus>
    addFilesProcessed(count: number): Promise<void>
    addFilesUploaded(count: number): Promise<void>
    startTimer(): void
    getElapsedSeconds(): string
}