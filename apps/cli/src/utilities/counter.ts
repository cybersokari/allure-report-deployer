import {Mutex, MutexInterface} from 'async-mutex';
import {CounterInterface, ResultsStatus} from "../interfaces/counter.interface.js";
import fs from "fs/promises";
import {readJsonFile} from "./file-util.js";
import path from "node:path";
import pLimit from "p-limit";
/**
 * Counter Class
 *
 * Provides thread-safe counters to track the number of files processed
 * and uploaded, as well as timing functionalities to measure elapsed time.
 * Utilizes a mutex for safe concurrent updates to shared counters.
 */
class Counter implements CounterInterface{
    public startTime: number | undefined = undefined;
    public processed = 0
    public uploaded = 0
    public mutex: MutexInterface;

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

    async countResults(resultDir: string): Promise<ResultsStatus> {
        let passed = 0
        const entries = await fs.readdir(resultDir, {withFileTypes: true});
        const resultFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('result.json'));

        const promises = [];
        const limit = pLimit(10);
        for (const file of resultFiles) {
            promises.push(limit(async () => {
                try {
                    const result = await readJsonFile(path.join(resultDir, path.basename(file.name)));
                    if (result.status === 'passed') passed++
                }catch (e) {}
            }))
        }
        await Promise.all(promises);
        return {passed: passed, failed: resultFiles.length - passed}
    }
}
export const counter = new Counter()