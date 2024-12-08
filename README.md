<div style="display: flex; justify-content: space-evenly; align-items: center; margin-bottom: 20px;">
    <a id="allure" href="https://allurereport.org/docs/">
        <img src="assets/allure-logo.png" alt="Allure Logo" height="100">
    </a>
    <a id="docker" href="https://docs.docker.com/">
        <img src="assets/docker-logo.png" alt="Docker Logo" height="100">
    </a>
    <a id="firebase" href="https://firebase.google.com/docs">
        <img src="assets/firebase-logo.png" alt="Firebase Logo" height="100">
    </a>
</div>



# Allure Docker Deploy


![Deployment](https://github.com/cybersokari/allure-docker-deploy/actions/workflows/deploy.yaml/badge.svg?branch=main)
![](https://img.shields.io/docker/pulls/sokari/allure-docker-deploy)

_An easy-to-use serverless Docker solution for sharing and backing up Allure test reports_

This [Docker image](https://hub.docker.com/r/sokari/allure-docker-deploy) lets you share [Allure test reports](https://allurereport.org/) seamlessly via an ephemeral URL. It also backs up all report history and retries to Firebase Cloud Storage, enabling unique URLs for each test run and previewing previous reports.

Works in both CI and local environments with minimal setup, utilizing [Firebase Hosting](https://firebase.google.com/docs/hosting). A free Firebase plan is sufficient to get started.


## Key Features

- **Cloud Storage**: Automatically backs up Allure test results and history in a Google Cloud Storage bucket.
- **Preview URLs**: Generates ephemeral Allure report URLs hosted on Firebase for easy sharing with stakeholders.
- **Slack Integration**: Notify team members with preview URLs directly in Slack after each test run.
- **Continuous Deployment**: In Watch Mode, the container detects changes, generates reports, and uploads them automatically. Suitable for testing locally.


## Use Cases

### 1. GitHub Actions
#### Sample Workflow
```yaml
name: Allure Docker Deploy
on:
  push:
    branches:
      - main
jobs:
  test-and-report:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Run Tests
      run: |
        # Run your tests and output results to a directory
        mkdir -p ./allure-results
    - name: Authenticate Docker Hub
    - uses: docker/login-action@v3
      with:
        username: ${{ secrets.DOCKERHUB_USERNAME }}
        password: ${{ secrets.DOCKERHUB_TOKEN }}
        
    - name: Deploy Allure Reports to Firebase
      run: |
        docker run --rm \
          -e GOOGLE_APPLICATION_CREDENTIALS=/credentials/gcp-key.json \  # Path to your Google Cloud credentials
          -e STORAGE_BUCKET=my-test-results-bucket \                    # Specify your Firebase Storage bucket
          -e WEBSITE_ID=my-custom-site-id \                             # Use a unique ID for the report website
          -e WEBSITE_EXPIRES=3d \                                       # Set the report expiration (e.g., 3 days)
          -e KEEP_HISTORY=true \                                        # Retain historical test data
          -e KEEP_RETRIES=true \                                        # Enable retry saving for failed tests
          -v $GITHUB_STEP_SUMMARY:/github/summary.txt \                 # Display test report URL in GitHub summary
          -v ${{ github.workspace }}/allure-results:/allure-results \  # Mount test results
          -v ${{ secrets.GCP_CREDENTIALS_FILE_PATH }}:/credentials/gcp-key.json \ # Bind GCP credentials
          sokari/allure-docker-deploy:latest
            
```

---

#### View your report details in GitHub Actions job summary

<div style="text-align: left"><img src="assets/example-github-summary.png" alt="URL preview in GitHub Actions summary"></div>

---

#### Receive build success update in Slack

<div style="text-align: left"><img src="assets/slack-bot.png" alt="URL preview in GitHub Actions summary"></div>

---

#### View your test result file on the Firebase Developer console

<div><img src="assets/storage-dashboard.png" alt="Test result files in Firebase Storage"></div>

---

#### Test report example site

<div><img src="assets/site.png" alt="Test report example site"></div>

Tips
1.	Use unique values for `WEBSITE_ID` (e.g., `${{ github.ref }}`) to avoid overwriting reports.
2.	Configure `WEBSITE_EXPIRES` to manage the duration of hosted reports.
3.	Mount `$GITHUB_STEP_SUMMARY` to display the test report URL in GitHub Actions job summaries.

### 2. Local test runs
**Step-by-Step Guide**
#### 1. Pull the Docker Image
```bash
docker pull sokari/allure-docker-deploy:latest
```
#### 2. Run the Container
```shell
docker run -d \
  -e GOOGLE_APPLICATION_CREDENTIALS=/credentials/gcp-key.json \
  -e STORAGE_BUCKET=my-test-results-bucket \
  -e WEBSITE_ID=my-custom-site-id \
  -e WEBSITE_EXPIRES=2d \
  -e WATCH_MODE=true \
  -e TTL_SECS=60 \
  -v /path/to/allure-results:/allure-results \
  -v /path/to/gcp-key.json:/credentials/gcp-key.json \
  sokari/allure-docker-deploy
```
##### 3. With `docker-compose.yaml`:
```yaml
services:  
  allure:
    image: sokari/allure-docker-deploy
    container_name: deploy-service
    volumes:
      - /path/to/allure-results:/allure-results
      - /path/to/service-account.json:/service-account.json
    environment:
      GOOGLE_APPLICATION_CREDENTIALS: /service-account.json
      STORAGE_BUCKET: your-storage-bucket
      KEEP_HISTORY: true # Default is true when STORAGE_BUCKET is provided
      KEEP_RETRIES: false # Default is false
      # Uncomment the line below to enable Hosting
      # WEBSITE_ID: your-firebase-site-id
      # WEBSITE_EXPIRES: 2d
      WATCH_MODE: true
      TTL_SECS: 60
```


#### URL preview in console
<div style="text-align: left"><img src="assets/ci-report-url-ss.png" height="300" alt="Firebase CLI console output"></div>


## Requirements
1. **Google Cloud Credentials**:
   - Create a Google Cloud [service account](https://firebase.google.com/docs/admin/setup#initialize_the_sdk_in_non-google_environments) with access to Firebase Hosting and Cloud Storage
   - Download the `service-account-file.json` JSON file.

2. **Google Cloud Storage Bucket**:
   - Create a bucket to store test results and reports. You can use the default.

3. **Website ID**:
   - Use a unique identifier for each hosted report. Example: `feature_mission-2-jupiter`).



## How it works

1. Mount test results' directory.
   - Bind your `/allure-results` directory to the container.
2. Set required environment variables:
   - `GOOGLE_APPLICATION_CREDENTIALS`: Path to your GCP credentials file.
   - `STORAGE_BUCKET`: The name of your Google Cloud Storage bucket (if using cloud storage).
   - `WEBSITE_ID`: A unique identifier for your test report site. You can use different identifiers to get a new site for every test run. Using the same `WEBSITE_ID` overwrites the previous Test Report.
3. Watch Mode:
   - When `WATCH_MODE` is set to `true`, the container will watch for updates in the `/allure-results` directory.
     - Upload results to the specified Google Cloud Storage bucket (if `STORAGE_BUCKET` is provided).
     - Host the generated Allure report on Firebase Hosting (if `WEBSITE_ID` is provided).
     - Perform both actions if both environment variables are set.
     - On every new file detected, the `TTL_SECS` restarts the countdown toward deployment/storage.
4. [Report history and retries](https://allurereport.org/docs/history-and-retries/#history-and-retries) 
   - Set `KEEP_HISTORY` to back up your `allure-report/history` after every report generation.
   - Set `KEEP_RETRIES` to back up files every file in the `/allure-results` mount directory after report generation.
   - Disabled if not `STORAGE_BUCKET` is provided

    
## Environment Variables

| Variable                         | Description                                                                                                                         | Default |
|----------------------------------|-------------------------------------------------------------------------------------------------------------------------------------|---------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to the GCP service account JSON file (required).                                                                               | None    |
| `STORAGE_BUCKET`                 | Google Cloud Storage bucket name (required if using cloud storage).                                                                 | None    |
| `WEBSITE_ID`                     | A unique identifier of your choice to identify the Test Report website.                                                             | None    |
| `WEBSITE_EXPIRES`                | Duration before the generated website is disabled. Can be between an hour to 30 days. Examples: 1h, 2d, 3w                          | 7d      |
| `KEEP_HISTORY`                   | Backup `reports/history` directory after report generation                                                                          | true    |
| `KEEP_RETRIES`                   | Backup files in the `allure-results` directory after report generation                                                              | false   |
| `WATCH_MODE`                     | Keep the container running to auto deploy new test reports and results                                                              | false   |
| `TTL_SECS`                       | Time to wait (in seconds) after last file is detected before generating and uploading the report. Only works when `WATCH_MODE=true` | 45      |
| `SLACK_TOKEN`                    | Your Slack Bot token                                                                                                                | None    |
| `SLACK_CHANNEL_ID`               | The ID of the channel or conversation you want to receive your status                                                               | None    |

**Note**: Either `STORAGE_BUCKET` or `WEBSITE_ID` must be provided. Both can be configured if you want to enable all functionalities.



## Comparison: Allure Docker Deploy vs Other tools

| Feature                                   | Allure Docker Deploy                                                                                       | Other tools                                                                            |
|-------------------------------------------|------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------|
| **Unique URLs for each deployment**       | ✅ Yes, every deployment generates a unique ephemeral URL for the test report.                              | ❌ No, reports are deployed to a single GitHub Pages URL, overwriting previous reports. |
| **Report history and retries**            | ✅ Keeps complete history and retries by saving test result files to Cloud Storage for future reports.      | ❌ Limited; only report history is retrieved from the previous GitHub Pages deployment. |
| **Cloud Storage backup**                  | ✅ Automatically backs up test result files to Google Cloud Storage.                                        | ❌ No backup functionality; relies on GitHub repositories for report storage.           |
| **Direct deployment without Git commits** | ✅ Deploys directly to Firebase Hosting without committing generated reports to Git.                        | ❌ Requires committing generated reports to GitHub Pages.                               |
| **Further analysis capabilities**         | ✅ Allows access to all saved test result files for additional analysis beyond the Allure-generated report. | ❌ No such functionality provided.                                                      |
| **Slack notifications**                   | ✅ Receive your test report URL in Slack                                                                    | ❌ Not supported.                                                                       |



## License

This project is licensed under the [BSD-3 License](https://opensource.org/license/bsd-3-clause). See the LICENSE file for details.

Contributing

Contributions are welcome! Feel free to open issues or submit pull requests for bug fixes or new features.
