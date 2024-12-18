// interfaces/unzipper-provider.interface.ts
import { Entry } from "unzipper";
import { Writable } from "stream";

export interface UnzipperProvider {
    Parse(): Writable; // Simulates unzipper.Parse
}

export interface UnzipperEntry extends Entry {}