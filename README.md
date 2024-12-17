# Allure Report Deployer

![Docker](https://github.com/cybersokari/allure-docker-deploy/actions/workflows/deploy-docker.yaml/badge.svg?branch=main)
![GitHub Action](https://github.com/cybersokari/allure-docker-deploy/actions/workflows/deploy-docker-action.yaml/badge.svg?branch=main)

![](https://img.shields.io/docker/pulls/sokari/allure-deployer-action)

**Host your Allure test reports on a website. No server required.**

![Demo](assets/demo.gif)

## 📚 **Table of Contents**

1. [Quick Start](#quick-start)
2. [How it works](#how-it-works)
    - [Firebase Hosting](#hosting)
    - [Cloud Storage](#cloud-storage)
    - [History and Retries](#history-and-retries)
    - [Slack Integration](#slack-integration)
3. [Use Cases](#use-cases)
    - [CI Pipelines](#ci-pipelines)
      - [GitHub Action](#github)
      - [Gitlab](#gitlab)
      - [Codemagic](#codemagic-integration)
      - [Bitrise]()
    - [Local Test Runs](#local-test-runs)
4. [Configurations](#configuration)
    - [GitHub Action](#configuration-github)
      - [Inputs](#inputs)
      - [Environment variables](#environment-variables-github)
    - [Docker](#configuration-docker)
      - [Environment Variables](#environment-variables-docker)
      - [Mount Volumes](#mount-volumes)
5. [Troubleshooting and FAQs](#troubleshooting-and-faqs)
6. [License](#license)
7. [Contributing](#contributing)


<h2 id="quick-start">🚀 Quick Start</h2>

### Prerequisites
1. **Firebase Credentials**:
    - Create a Firebase [service account](https://firebase.google.com/docs/admin/setup#initialize_the_sdk_in_non-google_environments).
    - Download the `service-account-file.json` JSON file.

2. **Firebase/Google Cloud Storage Bucket**:
    - Create a bucket to store test results and reports. You can use the default.

    

### GitHub
#### 1.	Add the [Allure Deployer GitHub Action](https://github.com/marketplace/actions/allure-deployer-action) to your workflow and run it.
     

```yaml
name: Your awesome workflow
on:
  push:
jobs:
  test-action:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4.1.5
      - name: Run your tests and create Allure results
        run: |
          echo ' Nothing here for now, waiting for results'
          
      - name: Allure Deployer Action
        uses: cybersokari/allure-deployer-action@v1.0.1
        env:
          SLACK_TOKEN: ${{secrets.SLACK_TOKEN}}
          GOOGLE_CREDENTIALS_JSON: ${{ secrets.GOOGLE_APPLICATION_CREDENTIALS }}
        with:
          allure_results_path: '/assets/allure-results'
          website_id: 'custom-website-id'
          website_expires: '14d'
          storage_bucket: ${{vars.storage-bucket}}
          slack_channel_id: ${{vars.SLACK_CHANNEL_ID}}
          keep_history: 'true'
          show_history: 'true' # Requires keep_history to be enabled
          keep_results: 'true'
          show_retries: 'true' # Requires keep_results to be enabled
```
___

#### 2.	Check your GitHub Actions [summary](https://github.com/cybersokari/allure-report-deployer/actions/runs/12376413839):
Live report website example: https://gatedaccessdev--example-site-readme-1c8flvtu.web.app
```markdown
📊 Your Test Report is ready

Test Report: https://your-example-url.web.app
File Storage: https://console.firebase.google.com/project/${project-id}/storage/${storage-bucket}/files

| 📂 Files Uploaded | 🔍 Files Processed | ⏱ Duration |
|-------------------|--------------------|------------|
| 5                 | 49                 | 8 seconds  |
```

Tips
1.	Use unique values for `WEBSITE_ID` (e.g., `${{ github.ref }}`) to avoid overwriting reports.
2.	Configure `WEBSITE_EXPIRES` to manage the duration of hosted reports.
___

### Gitlab
#### Add the [docker image](https://hub.docker.com/r/sokari/allure-deployer) to your Gitlab workflow and run it.
    sokari/allure-deployer:latest

```yaml
stages:
  - test
  - deploy

variables:
  DOCKER_IMAGE: sokari/allure-deployer:latest
  STORAGE_BUCKET: my-test-results-bucket
  PREFIX: project-123
  WEBSITE_ID: my-custom-site-id
  WEBSITE_EXPIRES: 3d
  KEEP_HISTORY: "true"
  KEEP_RESULTS: "true"

before_script:
  - mkdir -p ./allure-results

test:
  stage: test
  script:
    - echo "Running tests..."
    # Simulate test execution and output results
    - mkdir -p allure-results
    # Add real test commands here
  artifacts:
    paths:
      - allure-results/
    expire_in: 1 day

deploy:
  stage: deploy
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - echo "Logging in to Docker Hub"
    - docker login -u "$DOCKERHUB_USERNAME" -p "$DOCKERHUB_TOKEN"
  script:
    - echo "Deploying Allure Reports..."
    - docker run --rm \
      -e STORAGE_BUCKET=$STORAGE_BUCKET \
      -e PREFIX=$PREFIX \
      -e WEBSITE_ID=$WEBSITE_ID \
      -e WEBSITE_EXPIRES=$WEBSITE_EXPIRES \
      -e KEEP_HISTORY=$KEEP_HISTORY \
      -e KEEP_RESULTS=$KEEP_RESULTS \
      -v ${CI_PROJECT_DIR}/allure-results:/allure-results \
      -v ${GCP_CREDENTIALS_FILE_PATH}:/credentials/key.json \
      sokari/allure-deployer:latest
  only:
    - main
  dependencies:
    - test
```
See the Docker [configuration section](#docker-image-configuration) for more info

### Local test runs
#### 1. Pull the Docker Image
```shell
docker pull sokari/allure-deployer:latest
```
___

#### 2. Run the Container
```shell
docker run -d \
  -e WEBSITE_ID=my-custom-site-id \
  -e WEBSITE_EXPIRES=2d \
  -e STORAGE_BUCKET=my-test-results-bucket \
  -v /path/to/allure-results:/allure-results \
  -v /path/to/gcp-key.json:/credentials/key.json \
  sokari/allure-deployer
```
___

##### 3. You can also use `docker-compose.yaml`:
```yaml
services:  
  allure:
    image: sokari/allure-deployer
    volumes:
      - /path/to/allure-results:/allure-results
      - /path/to/service-account.json:/credentials/key.json
    environment:
      WEBSITE_ID: your-site-id # Assign an ID to your Allure report website
      WEBSITE_EXPIRES: 2d # Duration of availability. 1-30 days
      STORAGE_BUCKET: your-storage-bucket # Google Cloud storage bucket
      PREFIX: project-123 # A path in your storage bucket (Optional)
      KEEP_HISTORY: true # Default is true when STORAGE_BUCKET is provided
      KEEP_RESULTS: false # Default is false
```
___


<h2 id="configuration">Configurations</h2>

<h3 id="configuration-github">GitHub Actions</h2>

#### Inputs

| Input                 | Description                                                                               | Required | Default           |
|-----------------------|-------------------------------------------------------------------------------------------|----------|-------------------|
| `allure_results_path` | Path to the directory containing Allure results files.                                    | ✅ Yes    | `/allure-results` |
| `website_id`          | Unique identifier for the Allure report website. Ensures no overwriting of other reports. | ✅ Yes    | None              |
| `website_expires`     | Duration for which the hosted website remains active. Examples: `1h`, `2d`, `3w`.         | ❌ No     | `7d`              |
| `storage_bucket`      | Name of the Google Cloud Storage bucket for backup and history storage.                   | ❌ No     | None              |
| `slack_channel_id`    | ID of the Slack channel to send notifications about report links.                         | ❌ No     | None              |
| `keep_history`        | Whether to enable history backup in reports.                                              | ❌ No     | `true`            |
| `show_history`        | Display history from previous test runs. Requires `keep_history` to be enabled.           | ❌ No     | `true`            |
| `keep_results`        | Backup all the `/allure-results` files into cloud storage for retries and archives.       | ❌ No     | `false`           |
| `show_retries`        | Include retries from previous test runs. Requires `keep_results` to be enabled.           | ❌ No     | `true`            |
| `prefix`              | Path prefix in the Cloud Storage bucket for archiving files.                              | ❌ No     | None              |

---

<h4 id="environment-variables-github">Environment Variables</h3>


| Variable               | Description                                                   | Example                                      | Required | Default |
|------------------------|---------------------------------------------------------------|----------------------------------------------|----------|---------|
| `SLACK_TOKEN`          | Token for Slack App to send notifications with report URLs.   | `xoxb-XXXXXXXXXX-XXXXXXXX`                   | ❌ No     | None    |
| `GCP_CREDENTIALS_JSON` | Content of the Google Cloud service account credentials file. | `${{ secrets.GCP_APPLICATION_CREDENTIALS }}` | ✅ Yes    | None    |
**Notes**:
- `GCP_CREDENTIALS_JSON` must be set with a service account that has access to Firebase Hosting and Cloud Storage.
- Ensure `SLACK_TOKEN` and `SLACK_CHANNEL_ID` are configured to enable Slack integration.



<h3 id="configuration-docker">🐳 Docker</h2>

<h4 id="environment-variables-docker">Environment Variables</h3>


| Variable           | Description                                                                                   | Example                        | Default |
|--------------------|-----------------------------------------------------------------------------------------------|--------------------------------|---------|
| `STORAGE_BUCKET`   | Google Cloud Storage bucket name                                                              | project-id.firebasestorage.app | None    |
| `PREFIX`           | A path in your Storage bucket. Optional.                                                      | project-123                    | None    |
| `WEBSITE_ID`       | Unique identifier for hosted reports                                                          | test-report-id                 | None    |
| `WEBSITE_EXPIRES`  | Expiration duration for reports. Examples: 1h, 2d, 3w                                         | 29d                            | 7d      |
| `KEEP_HISTORY`     | Backup `allure-reports/history` directory after every report generation.                      | true                           | true    |
| `KEEP_RESULTS`     | Backup `/allure-results` directory after report generation..                                  | false                          | true    |
| `SHOW_HISTORY`     | Show history in the current report by pulling the history from the last Cloud Storage backup  | true                           | true    |
| `SHOW_RETRIES`     | Show retries in the current report by pulling result files from all archives in Cloud Storage | true                           | true    |
| `SLACK_TOKEN`      | Your Slack App token                                                                          | xoxb-XXXXXXXXXX-XXXXXXXX       | None    |
| `SLACK_CHANNEL_ID` | The Slack channel or conversation to notify with Allure report details                        | DC56JYGT8                      | None    |

**Note**: Either `STORAGE_BUCKET` or `WEBSITE_ID` must be provided. Both can be configured if you want to enable all functionalities.

---

<h4 id="mount-volumes">Mount Volumes</h3>

| Host                        | Container               | Description                                                                                                                          |
|-----------------------------|-------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| `/path/to/allure-results`   | `/allure-results`       | Allure test results directory.                                                                                                       |
| `/path/to/credentials.json` | `/credentials/key.json` | Google Cloud service account JSON file.                                                                                              |
| `$GITHUB_STEP_SUMMARY`      | `/github/summary.txt`   | [GitHub Actions summary](https://github.blog/news-insights/product-news/supercharging-github-actions-with-job-summaries/) (optional) |

**Notes**:
- Ensure that the directories and files exist on your local machine or CI environment.
- Use absolute paths to avoid errors with relative paths in Docker commands.

---

<h2 id="how-it-works">🛠️ How It Works</h2>

<h3 id="hosting">🌐 Firebase Hosting</h3>

Allure Report Deployer hosts your Reports on Firebase Hosting and saves your history and  
results files in Firebase/GCP storage.
A **secure, randomized URL** will be generated and displayed in the console logs.
If configured, the URL will also appear in **GitHub Summary** and **Slack notifications**.

#### Key Features

- **Auto-Expire Hosting**: No need for cleaning up outdated reports, the website is hosted using Firebase's Preview Channels, which has a maximum life of 30 days.
- **Customizable URL**: Use the `WEBSITE_ID` environment variable to control your report's hosting:
    - Using the **same `WEBSITE_ID`** overwrites the previous report at the same URL.
    - Using a **new `WEBSITE_ID`** generates a unique URL for each report.

For more information, check the [Configuration](#configuration) section.

<h3 id="cloud-storage">☁️ Cloud Storage</h3>

Your files are backed up as a `.zip` archive when you set `KEEP_HISTORY` or `KEEP_RESULTS`.
*  `KEEP_RESULTS` adds all the files in your `/allure-results` mount directory to the archive
*  `KEEP_HISTORY` adds the `history` [subdirectory of your latest report](https://allurereport.org/docs/how-it-works-history-files/#history-files) to the archive


Example of an archive when both `KEEP_RESULTS` and `KEEP_HISTORY` are enabled
```text
2024-12-12T06:46:28.zip/
            ├── history/
            │   ├── categories-trend.json
            │   ├── duration-trend.json
            │   ├── history-trend.json
            │   ├── history.json
            │   └── retry-trend.json
            ├── 01f49176-82b1-462d-aa15-bd0369600617-result.json
            ├── 2f10bad1-2f73-46ab-b2ef-28fc010f4473-container.json
            ├── 3abc8f5d-8292-45fa-9c0c-d0e1bfc8d173-container.json
            ├── 4cb007b9-e103-4518-a3b0-5ef98e178367-attachment.webm
            ├── 4dd05185-1dd4-4981-a860-9db6cd66532a-attachment.webm
            ├── 4f4d3f28-f6a2-4e0b-8f72-cf37763a4cd0-attachment.webm
            ├── 7a71a49f-4b80-4cde-a3d2-37813e6a51f3-attachment.webm
            ├── 7b1f36ef-ce18-4cfe-af8d-17af3a42995d-result.json
            ├── 7fbde46e-3030-4836-8399-7d537d568b6a-result.json
            ├── 07febc1-46d1-4fc6-8175-9e167e2ad760-attachment.webm
            ├── 8d25f178-46dc-4779-87c5-3f82e44e3630-container.json
            ├── 8fde3b8a-7632-4c87-9c28-4c66b1b99383-attachment.webm
            ├── 9a6c98c8-3773-4a1e-b1d7-267fc2b7887b-result.json
            ├── 9c0689aa-3a6c-4580-9f00-427f941ba2ac-container.json
            ├── 21f27bd5-d1c6-40e1-bc79-9747b3dbe93f-result.json
            └── 39aea642-05b4-4b01-8944-d8e02f184e30-container.json
```
___

Zipped archives examples in the Firebase Developer console

<div><img src="assets/storage-dashboard.png" alt="Test result files in Firebase Storage"></div>


<h3 id="history-and-retries">🕗🔄 History and Retries</h3>

#### History
Set `SHOW_HISTORY` to `true` to enable history in your incoming test report.
This feature uses the history of your last archive in Cloud Storage, which means that 
you will need to enable `KEEP_HISTORY` so that your history file will be uploaded to storage 
for subsequent `SHOW_HISTORY` usage. 
This is enabled by default.
See how [Allure History works](https://allurereport.org/docs/history-and-retries/#tests-history)
#### Retries
Set `SHOW_RETRIES` to true to show retries in the incoming test report.
This feature combines all the test result files from Cloud Storage before running the new report
Enable `KEEP_RESULTS` so that all your test result files will be uploaded to Cloud Storage for
subsequent test report generation.
See how [Allure Retries](https://allurereport.org/docs/history-and-retries/#how-to-keep-retries) work

<h3 id="slack-integration">🛠️ Slack Integration</h2>

To notify stakeholders with secure test report links after each test run,
create a [simple Slack app](https://youtu.be/SbUv1nCS7a0?si=8rjWDQh6wfeAztxu&t=266) and set `SLACK_TOKEN`
and `SLACK_CHANNEL_ID` environment variable when you run the Docker image.

<div style="text-align: left"><img src="assets/slack-bot.png" alt="Slack app notification example"></div>

<h2 id="use-cases">📊 Use Cases</h2>
<h3 id="ci-pipelines">🏗️ CI Pipelines</h2>
<h4 id="github-actions-integration">GitHub Actions Integration</h2>

Follow the [GitHub action](#for-github-actions) steps to set it up.

#### **Codemagic integration**

Use the [docker image](https://hub.docker.com/r/sokari/allure-deployer) in your Codemagic workflow.

```yaml
workflows:
  android-allure:
    name: Android Allure Report
    max_build_duration: 30
    instance_type: linux_x2
    scripts:
      - name: Build Android apk                                          # 1. Build apk
        script:

      - name: Git clone Appium project                                   # 2. Clone Appium project if required
        script: |
          git clone https://github.com/my-appium-project
      - name: Install Appium Deps                                        # 3. Install Appium dependencies
        script: |
          cd appium && npm install --force
      - name: Launch Android Emulator                                    # 4. Start Codemagic Android Emulator
        script: |
          FIRST_AVD=$(emulator -list-avds | head -n 1) \
          && emulator -avd "$FIRST_AVD" & adb wait-for-device
      - name: Run Appium test                                            # 5. Run test and generate Allure results
        script: |
          cd appium && npm run android
      - name: Run Allure Report Deployer                                 # 6. Generate and deploy reports
        script: |
          cd appium && echo $ALLURE_GOOGLE_KEY >> service-key.json \
          && docker run --rm \
          -e STORAGE_BUCKET=$STORAGE_BUCKET \
          -e WEBSITE_ID=website-allure \
          -e KEEP_RETRIES=true \
          -e KEEP_HISTORY=true \
          -e SLACK_TOKEN=***
          -e SLACK_CHANNEL_ID=****
          -v service-key.json:/credentials/key.json
          -v reports/android/allure-results:/allure-results \
          sokari/allure-deployer:latest
    artifacts:
      - android/app/build/outputs/**/*.apk

```

<h3 id="local-test-runs">🖥️ Local Test Runs</h2>

See the [Local test run](#local-test-runs) section for detailed instructions.


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

#### Q3: Can I deploy reports to multiple Firebase sites?
- **A**: Yes, use different values for `WEBSITE_ID` for each site. This allows you to manage separate URLs for different test runs or environments.

---

#### Q4: Do I need a paid Firebase plan?
- **A**: No, the free Firebase plan is sufficient to host your reports. However, you will need to enable billing to use cloud storage, which has [free 5GB of storage](https://firebase.google.com/pricing)

---

#### Q5: What happens if I don’t set WEBSITE_ID?
- **A**: If `WEBSITE_ID` is not set, Allure reports will not be generated, only your result files will be backed up to Storage. You must provide an identifier for the hosted site.

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

This project is licensed under the [MIT License](https://opensource.org/license/mit). See the LICENSE file for details.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests for bug fixes or new features.
