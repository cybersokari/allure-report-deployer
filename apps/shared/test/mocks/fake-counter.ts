import {CounterInterface, ReportStatistic} from "../../src/interfaces/counter.interface.js";
import {Mutex} from "async-mutex";

export class FakeCounter implements CounterInterface{
    mutex: Mutex;
    processed: number;
    startTime: number | undefined;
    uploaded: number;

    constructor(processed: number, uploaded: number, startTime?: Date) {
        this.processed = processed;
        this.uploaded = uploaded;
        this.mutex = new Mutex();
        this.startTime = startTime?.getTime();
    }

    addFilesProcessed(count: number): Promise<void> {
        return Promise.resolve(undefined);
    }

    addFilesUploaded(count: number): Promise<void> {
        return Promise.resolve(undefined);
    }

    getElapsedSeconds(): string {
        return "9";
    }

    startTimer(): void {
    }

    countResults(resultDir: string): Promise<ReportStatistic> {
        return Promise.resolve(undefined);
    }

}