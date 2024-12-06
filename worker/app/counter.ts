class Counter {
    private startTime: number | null = null;
    private processed = 0
    private uploaded = 0

    incrementFilesProcessed() {
        this.processed ++
    }
    incrementFilesUploaded() {
        this.uploaded++
    }
    get filesUploaded(){
        return this.uploaded
    }
    get filesProcessed(){return this.processed}

    startTimer(): void {
        this.startTime = Date.now();
    }

    getElapsedTime(): string {
        if (!this.startTime) {
            return "Timer has not been started.";
        }
        const elapsed = Date.now() - this.startTime;
        return this.formatDuration(elapsed / 1000); // Convert to seconds
    }

    // Format elapsed time into a readable string
    private formatDuration(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${hours}h ${minutes}m ${remainingSeconds}s`;
    }
}

const counter = new Counter();
export default counter;