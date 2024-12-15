import { Mutex } from 'async-mutex';
import {CounterInterface} from "../interfaces/counter.interface";
/**
 * Counter Class
 *
 * Provides thread-safe counters to track the number of files processed
 * and uploaded, as well as timing functionalities to measure elapsed time.
 * Utilizes a mutex for safe concurrent updates to shared counters.
 */
class Counter implements CounterInterface{
    public startTime: number | null = null;
    public processed = 0
    public uploaded = 0
    public mutex: Mutex

    constructor(){
        this.mutex = new Mutex()
    }

    public async addFilesProcessed(count: number) {
        await this.mutex.runExclusive(() => {
            this.processed += count;
        });
    }
    public async addFilesUploaded(count: number) {
        await this.mutex.runExclusive(() => {
            this.uploaded += count;
        });
    }

    startTimer(): void {
        if(!this.startTime){
            this.startTime = Date.now();
        }
    }
    getElapsedSeconds(): string {
        if (!this.startTime) {
            throw "Timer has not been started.";
        }
        const elapsed = Date.now() - this.startTime;
        return (elapsed / 1000).toFixed()
    }
}
export const counter = new Counter()