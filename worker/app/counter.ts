import { Mutex } from 'async-mutex';
/**
 * Counter Class
 *
 * Provides thread-safe counters to track the number of files processed
 * and uploaded, as well as timing functionalities to measure elapsed time.
 * Utilizes a mutex for safe concurrent updates to shared counters.
 */
export class Counter {
    private startTime: number | null = null;
    private _processed = 0
    private _uploaded = 0
    private mutex = new Mutex();


    public async addFilesProcessed(count: number) {
        await this.mutex.runExclusive(() => {
            this._processed += count;
        });
    }
    public async addFilesUploaded(count: number) {
        await this.mutex.runExclusive(() => {
            this._uploaded += count;
        });
    }

    get filesUploaded(){
        return this._uploaded
    }
    get filesProcessed(){return this._processed}

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

const counter = new Counter();
export default counter;