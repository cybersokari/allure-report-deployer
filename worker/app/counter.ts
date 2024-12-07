import { Mutex } from 'async-mutex';
class Counter {
    private startTime: number | null = null;
    private processed = 0
    private uploaded = 0

    private mutex = new Mutex();

    async incrementFilesProcessed(): Promise<void> {
        await this.mutex.runExclusive(() => {
            this.processed++;
        });
    }

    async incrementFilesUploaded(): Promise<void> {
        await this.mutex.runExclusive(() => {
            this.uploaded++;
        });
    }

    get filesUploaded(){
        return this.uploaded
    }
    get filesProcessed(){return this.processed}

    startTimer(): void {
        this.startTime = Date.now();
    }
    getElapsedSeconds(): number {
        if (!this.startTime) {
            throw "Timer has not been started.";
        }
        const elapsed = Date.now() - this.startTime;
        return elapsed / 1000
    }
}

const counter = new Counter();
export default counter;