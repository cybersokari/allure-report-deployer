import { Allure } from "../app/features/allure.js";
import { MOUNTED_PATH, REPORTS_DIR, RESULTS_STAGING_PATH } from "../app/utilities/constant.js";
// import * as fs from "fs/promises";
import mock from 'mock-fs';
import counter from "../app/utilities/counter.js";
import { countFiles } from "../app/utilities/util.js";
import {AllureService} from "../app/services/allure-service.js";
import fs from "node:fs";


jest.mock("../app/utilities/util", () => ({
    countFiles: jest.fn().mockResolvedValue(5), // Mock the countFiles function
    appLog: jest.fn(), // Mock the appLog function
}));
jest.mock("../app/utilities/counter", () => ({
    addFilesProcessed: jest.fn().mockImplementation(() => {}), // Mock the addFilesProcessed function
}));
jest.mock("fs/promises", () => ({
    lstat: jest.fn(),
    readdir: jest.fn(),
    cp: jest.fn(),
}));

describe("ReportBuilder", () => {
    let mockAllureService: AllureService;
    let reportBuilder: Allure;

    beforeEach(() => {
        jest.clearAllMocks(); // Clear mocks between tests
        mockAllureService = {
            runCommand: jest.fn(), // Mock the AllureCommandRunner interface
        };
        reportBuilder = new Allure(mockAllureService); // Use the mocked runner
        mock({
            '/allure-results' : {
                'file1.json': '{}',
                'file2.log': 'content2',
            },
            '/app/allure-results':  {}
        })
    });
    afterEach(() => mock.restore());

    test("open should call allureRunner with correct arguments", async () => {
        (mockAllureService.runCommand as jest.Mock).mockResolvedValue(0); // Mock a successful run
        await reportBuilder.open();
        expect(mockAllureService.runCommand).toHaveBeenCalledWith([
            "open",
            REPORTS_DIR,
            "--port",
            "8090",
        ]);
    });

    test("generate should throw error if allure command fails", async () => {
        (mockAllureService.runCommand as jest.Mock).mockResolvedValue(1); // Mock a failed run
        await expect(reportBuilder.generate()).rejects.toThrow("Failed to generate Allure report");
    });

    test("stageFilesFromMount should stage files correctly", async () => {

        // Mock all dependencies
        await reportBuilder.stageFilesFromMount();
        // Assertions for staging logic
        expect(fs.cp).toHaveBeenCalledWith(`${MOUNTED_PATH}/`, RESULTS_STAGING_PATH, {
            recursive: true,
            force: true,
        });
        expect(countFiles).toHaveBeenCalledWith([MOUNTED_PATH]);
        expect(counter.addFilesProcessed).toHaveBeenCalledWith(5);
    });

    test("generate should return report directory path on success", async () => {
        (mockAllureService.runCommand as jest.Mock).mockResolvedValue(0); // Mock success

        const result = await reportBuilder.generate();

        expect(result).toBe(REPORTS_DIR);
        expect(mockAllureService.runCommand).toHaveBeenCalledWith([
            "generate",
            RESULTS_STAGING_PATH,
            "--report-dir",
            REPORTS_DIR,
            "--clean",
        ]);
    });

});