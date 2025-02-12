// @ts-ignore
import mock from "mock-fs";
import * as fs from "fs/promises";
import {jest} from "@jest/globals";
import {Order, StorageProvider} from "../src/interfaces/storage-provider.interface.js";
import {fakeArgs} from "./mocks/fake-args.js";
import {GoogleStorage, GoogleStorageConfig} from '../src/features/google-storage.js'


// Partially mock the module

// jest.mock("../src/utilities/util.js");

// jest.mock("../src/utilities/counter.js", () => ({
//     counter: {
//         addFilesUploaded: jest.fn(),
//     },
// }));
// jest.mock("p-limit", () => jest.fn(() => jest.fn((fn) => jest.fn())));

// const mockedUtils = jest.mocked(utils);
describe("Storage", () => {
    let storageInstance: GoogleStorage;
    let storageConfig: GoogleStorageConfig = {
        ARCHIVE_DIR: '/app/archive',
        RESULTS_PATHS: '/allure-results',
        REPORTS_DIR: "/app/allure-reports",
        RESULTS_STAGING_PATH: "/app/allure-results",
        fileProcessingConcurrency: 10,
        showHistory: true,
        retries: 5,
        clean: false,
    }
    const storageProviderMock: jest.Mocked<StorageProvider> = {
        bucket: undefined,
        prefix : 'string',
        upload: jest.fn<any>(), // Mock upload to resolve with no value
        download: jest.fn<any>().mockResolvedValue([]), // Mock download to resolve with an empty array
        sortFiles: jest.fn<any>().mockImplementation((files: string[], order: Order) => {
            // Example: Mock sorting logic based on Order
            if (order === Order.byOldestToNewest) {
                return files.sort((a: any, b: any) => a.timestamp - b.timestamp);
            }
            if (order === Order.byNewestToOldest) {
                return files.sort((a: any, b: any) => b.timestamp - a.timestamp);
            }
            return files;
        }),
        deleteFiles : jest.fn<any>(),
        deleteFile: jest.fn<any>(),
        getFiles: jest.fn<any>().mockResolvedValue([]),
    };
    // Use jest.mocked to get the type-safe mocks

    beforeEach(() => {
        jest.resetModules(); // Clears cached modules
        jest.clearAllMocks(); // C

        storageInstance = new GoogleStorage(storageProviderMock, storageConfig);

        // Mock file system
        mock({
            "/app": {},
        });

    });

    afterEach(() => {
        mock.restore();
        jest.resetModules()
    });

    it("should create staging directories and unzip downloaded files", async () => {

        const file1 = `${fakeArgs.ARCHIVE_DIR}/file1.zip`
        const file2 = `${fakeArgs.ARCHIVE_DIR}/file2.zip`

        storageProviderMock.download.mockResolvedValue([file1, file2]);
        jest.spyOn(storageInstance, "unzipToStaging").mockResolvedValue(true);

        await storageInstance.stageFilesFromStorage();

        // Check if directories were created
        await expect(fs.stat(fakeArgs.RESULTS_STAGING_PATH)).resolves.toBeDefined();
        await expect(fs.stat(fakeArgs.ARCHIVE_DIR)).resolves.toBeDefined();

        // Check if download and unzip methods were called
        expect(storageProviderMock.download).toHaveBeenCalledWith({
            destination: fakeArgs.ARCHIVE_DIR,
            files:[]
        });
        expect(storageInstance.unzipToStaging).toHaveBeenCalledTimes(2);
        expect(storageInstance.unzipToStaging).toHaveBeenCalledWith(file1, fakeArgs.RESULTS_STAGING_PATH);
        expect(storageInstance.unzipToStaging).toHaveBeenCalledWith(file2, fakeArgs.RESULTS_STAGING_PATH);
    });

});