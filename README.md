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

_An easy-to-use serverless Docker solution for sharing and backing up [Allure test reports](https://allurereport.org/)_


## 📚 **Table of Contents**

1. [Quick Start](#quick-start)
2. [Key Features](#key-features)
3. [Use Cases](#use-cases)
    - [GitHub Actions](#github-actions-integration)
    - [Local Test Runs](#local-test-runs)
4. [How It Works](#how-it-works)
5. [Docker Image Configuration](#docker-image-configuration)
   - [Environment Variables](#environment-variables)
   - [Mount Volumes](#mount-volumes)
6. [Comparison with Other Tools](#comparison-with-other-open-source-tools)
7. [Troubleshooting and FAQs](#troubleshooting-and-faqs)
8. [License](#license)
9. [Contributing](#contributing)


<h2 id="quick-start">🚀 Quick Start</h2>

To get started with **Allure Docker Deploy**, follow these steps:

### Prerequisites
1. **Google Cloud Credentials**:
    - Create a Google Cloud [service account](https://firebase.google.com/docs/admin/setup#initialize_the_sdk_in_non-google_environments) with access to Firebase Hosting and Cloud Storage.
    - Download the `service-account-file.json` JSON file.

2. **Google Cloud Storage Bucket**:
    - Create a bucket to store test results and reports. You can use the default.

3. **Docker Installed**:
    - Ensure you have Docker installed. [Download Docker](https://docs.docker.com/get-docker/)


### **For GitHub Actions:**
#### 1.	Add a Workflow File:
Copy and paste the following into `.github/workflows/allure-docker-deploy.yml`:

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
          -e STORAGE_BUCKET=my-test-results-bucket \                    # Specify your Firebase Storage bucket
          -e WEBSITE_ID=my-custom-site-id \                             # Use a unique ID for the report website
          -e WEBSITE_EXPIRES=3d \                                       # Set the report expiration (e.g., 3 days)
          -e KEEP_HISTORY=true \                                        # Retain historical test data
          -e KEEP_RESULTS=true \                                        # Enable retry saving for failed tests
          -v $GITHUB_STEP_SUMMARY:/github/summary.txt \                 # Display test report URL in GitHub summary
          -v ${{ github.workspace }}/allure-results:/allure-results \  # Mount test results
          -v ${{ secrets.GCP_CREDENTIALS_FILE_PATH }}:/credentials/key.json \ # Bind GCP credentials
          sokari/allure-docker-deploy:latest
            
```
___

#### 2. Generate Allure results
      Add a step that outputs Allure result files to `/allure-results` path in the workflow.

___

#### 3.	Run the Workflow:
      Push your changes to the main branch and let GitHub Actions do the rest!
___

#### 4.	View Report information:
      Check the job summary in GitHub Actions for the report URL.

<div style="text-align: left"><img src="assets/example-github-summary.png" alt="URL preview in GitHub Actions summary"></div>

___

#### 5. Get notified in Slack 
      Add SLACK_TOKEN and SLACK_CHANNEL_ID as environment variable in the docker run command to receipt job
      completion notifications in Slack.

<div style="text-align: left"><img src="assets/slack-bot.png" alt="URL preview in GitHub Actions summary"></div>

___

#### 6. View your test result files on the Firebase Developer console

<div><img src="assets/storage-dashboard.png" alt="Test result files in Firebase Storage"></div>

---

#### 7. Test report example site
      The final URLs are randomized, so only people you share the link with can view your report.

<div><img src="assets/site.png" alt="Test report example site"></div>

Tips
1.	Use unique values for `WEBSITE_ID` (e.g., `${{ github.ref }}`) to avoid overwriting reports.
2.	Configure `WEBSITE_EXPIRES` to manage the duration of hosted reports.
3.	Mount `$GITHUB_STEP_SUMMARY` to display the test report URL in GitHub Actions job summaries.

___

### 2. For local test runs
#### 1. Pull the Docker Image
```shell
docker pull sokari/allure-docker-deploy:latest
```
___

#### 2. Run the Container
```shell
docker run -d \
  -e STORAGE_BUCKET=my-test-results-bucket \
  -e WEBSITE_ID=my-custom-site-id \
  -e WEBSITE_EXPIRES=2d \
  -e WATCH_MODE=true \
  -e TTL_SECS=60 \
  -v /path/to/allure-results:/allure-results \
  -v /path/to/gcp-key.json:/credentials/key.json \
  sokari/allure-docker-deploy
```
___

##### 3. You can also use `docker-compose.yaml`:
```yaml
services:  
  allure:
    image: sokari/allure-docker-deploy
    container_name: allure-deploy-service
    volumes:
      - /path/to/allure-results:/allure-results
      - /path/to/service-account.json:/credentials/key.json
    environment:
      STORAGE_BUCKET: your-storage-bucket
      KEEP_HISTORY: true # Default is true when STORAGE_BUCKET is provided
      KEEP_RESULTS: false # Default is false
      # Uncomment the line below to enable Hosting
      # WEBSITE_ID: your-firebase-site-id
      # WEBSITE_EXPIRES: 2d
      WATCH_MODE: true
      TTL_SECS: 60
```
___

#### 4. View test report URL in console
<div style="text-align: left"><img src="assets/clean-console-add.png" height="300" alt="Firebase CLI console output"></div>

___

<h2 id="key-features">🔑 Key Features</h2>

* **Cloud Storage**: Automatically backs up test results to Google Cloud Storage.
* **Preview URLs:** Generates unique, ephemeral URLs for easy sharing.
* **Slack Integration:** Notify your team with report links after each test run.
* **Continuous Deployment:** Automatically detects changes and uploads updated reports.

<h2 id="use-cases">📊 Use Cases</h2>

<h3 id="github-actions-integration">🧪 GitHub Actions Integration</h2>

Integrate Allure Docker Deploy into your CI/CD pipelines with GitHub Actions.
Follow the [GitHub action](#for-github-actions) steps to set it up.

<h3 id="local-test-runs">🖥️ Local Test Runs</h2>

Run and preview your test reports locally using the Docker container.
See the [Local test run](#local-test-runs) section for detailed instructions.

<h2 id="how-it-works">🛠️ How It Works</h2>

* **Generate Reports:** Collect Allure results from your tests.
* **Deploy Reports:** Host the reports on Firebase with unique URLs.
* **Backup Results:** Store Allure report history and result files in Google Cloud Storage.


<h2 id="docker-image-configuration">🐳 Docker Image Configuration</h2>

<h3 id="environment-variables">Environment Variables</h3>


| Variable           | Description                                                                                                                         | Example                        | Default |
|--------------------|-------------------------------------------------------------------------------------------------------------------------------------|--------------------------------|---------|
| `STORAGE_BUCKET`   | Google Cloud Storage bucket name                                                                                                    | project-id.firebasestorage.app | None    |
| `WEBSITE_ID`       | Unique identifier for hosted reports                                                                                                | test-report-id                 | None    |
| `WEBSITE_EXPIRES`  | Expiration duration for reports. Examples: 1h, 2d, 3w                                                                               | 29d                            | 7d      |
| `KEEP_HISTORY`     | Backup `reports/history` directory after report generation.                                                                         | true                           | true    |
| `KEEP_RESULTS`     | Backup `/allure-results` directory after report generation..                                                                        | false                          | false   |
| `WATCH_MODE`       | Keep the container running to auto deploy new test reports and results                                                              | false                          | false   |
| `TTL_SECS`         | Time to wait (in seconds) after last file is detected before generating and uploading the report. Only works when `WATCH_MODE=true` | 60                             | 45      |
| `SLACK_TOKEN`      | Your Slack Bot token                                                                                                                | xoxb-XXXXXXXXXX-XXXXXXXX       | None    |
| `SLACK_CHANNEL_ID` | The ID of the channel or conversation you want to receive your status                                                               | DC56JYGT8                      | None    |

**Note**: Either `STORAGE_BUCKET` or `WEBSITE_ID` must be provided. Both can be configured if you want to enable all functionalities.

---

<h3 id="mount-volumes">Mount Volumes</h3>

| Host                        | Container               | Description                                                                                                                          |
|-----------------------------|-------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| `/path/to/allure-results`   | `/allure-results`       | Allure test results.                                                                                                                 |
| `/path/to/credentials.json` | `/credentials/key.json` | Google Cloud service account JSON file.                                                                                              |
| `$GITHUB_STEP_SUMMARY`      | `/github/summary.txt`   | [GitHub Actions summary](https://github.blog/news-insights/product-news/supercharging-github-actions-with-job-summaries/) (optional) |

**Notes**:
- Ensure that the directories and files exist on your local machine or CI environment.
- Use absolute paths to avoid errors with relative paths in Docker commands.

---


<h2 id="comparison-with-other-open-source-tools">🔄 Comparison with Other Open Source Tools</h2>

| Feature                  | Allure Docker Deploy                                                          | Other tools                                                             |
|--------------------------|-------------------------------------------------------------------------------|-------------------------------------------------------------------------|
| **Serverless**           | ✅ No server required                                                          | ❌ No, you need to pay for a server                                      |
| **Ephemeral URLs**       | ✅ Yes, every deployment generates a unique ephemeral URL for the test report. | ❌ No, reports are deployed to a single GitHub Pages URL, or not at all. |
| **Slack notifications**  | ✅ Receive your test report URL in Slack                                       | ❌ Not supported.                                                        |
| **No Git commits**       | ✅ You don't need to commit files to Git.                                      | ❌ Requires committing generated reports to Git.                         |


<h2 id="troubleshooting-and-faqs">🛠️ Troubleshooting and FAQs</h2>

### 🛠️️ Troubleshooting
#### 1. Allure Report Website Deployment Fails
- **Problem**: Issues with Google Cloud credentials or permissions.
- **Solution**:
   - Verify the path to your Google credentials is mounted to `/credentials/key.json` on the docker container.
   - Ensure the credentials file belongs to a service account with the required permissions for Firebase Hosting and Cloud Storage.
   - Run the following commands to test credentials:
```shell
gcloud auth activate-service-account --key-file=/path/to/credentials.json
gcloud firebase hosting:list
```

#### 2. Files Not Uploaded to Firebase
- **Problem**: Misconfigured `STORAGE_BUCKET`.
- **Solution**:
  - Verify the `STORAGE_BUCKET` environment variable matches the name of your Google Cloud Storage bucket.
  - Confirm the Google credential file has write access to the bucket.

### ❓ FAQs

#### Q1: Can I use this tool without Google Cloud Storage?
- **A**: Yes, you can generate and share reports without using cloud storage. However, enabling `STORAGE_BUCKET` allows you back up results and history files.

---

#### Q2: What is the maximum expiration time for reports?
- **A**: The `WEBSITE_EXPIRES` variable can be set for a maximum of 30 days (30d). For example:
```shell
-e WEBSITE_EXPIRES=30d
```
---

#### Q3: Can I deploy reports to multiple Firebase sites?**
- **A**: Yes, use different values for `WEBSITE_ID` for each site. This allows you to manage separate URLs for different test runs or environments.

---

#### Q4: Do I need a paid Firebase plan?
- **A**: No, the free Firebase plan is sufficient to host reports. However, you will need to enable billing to use cloud storage, which has free 5GB of storage

---

#### Q5: What happens if I don’t set WEBSITE_ID?
- **A**: If WEBSITE_ID is not set, Allure reports will not be generated, only your result files will be backed up to Storage. You must provide an identifier for the hosted site.

---

#### Q6: How do I configure Slack notifications?
- **A**: Set the following environment variables:
  - `SLACK_TOKEN`: Your Slack Bot's token.
  - `SLACK_CHANNEL_ID`: The ID of the channel where you want to send notifications.
  - Test the bot by sending a manual message before integrating with the container.

---

#### Q7: Can I merge results from multiple directories?
- **A**: Not directly. You will need to merge allure-results directories manually before running the container.

---

#### Q8: Is Docker required to use this tool?
- **A**: Yes, Docker is a core dependency for this project. Ensure Docker is installed and properly configured on your system.

## License

This project is licensed under the [BSD-3 License](https://opensource.org/license/bsd-3-clause). See the LICENSE file for details.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests for bug fixes or new features.
