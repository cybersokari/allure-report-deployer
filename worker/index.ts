import * as chokidar from 'chokidar';
import {
    downloadFromRemote,
    saveResultFileToStaging,
    setFirebaseProjectIdToEnv,
    uploadToFirebaseStorage
} from "./app/util";
import ReportBuilder from "./app/report-builder";

export const HOME_DIR = process.env.WORK_DIR
// Results playground in Docker container
export const RESULTS_PATH = `${HOME_DIR}/allure-results`;

async function watchAllureResults(): Promise<void> {
    await downloadFromRemote();
    chokidar.watch('/allure-results', {
        ignored: '^(?!.*\\.(json|png|properties|log)$).*$',
        persistent: true,
        awaitWriteFinish: true
    }).on('add', async (filePath) => {
        console.log(`New file detected: ${filePath}`);
        uploadToFirebaseStorage(filePath).then()
        await saveResultFileToStaging(filePath)
        ReportBuilder.setTtl()
    });
    console.log('Watching for new Allure result files...');
}

if(require.main === module){
    setFirebaseProjectIdToEnv()
    watchAllureResults()
}