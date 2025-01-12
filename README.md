# Allure Report Deployer

![Deploy](https://github.com/cybersokari/allure-docker-deploy/actions/workflows/deploy.yaml/badge.svg?branch=main)
![Deploy](https://github.com/cybersokari/allure-docker-deploy/workflows/Test/badge.svg)
![docker](https://img.shields.io/docker/pulls/sokari/allure-deployer)
![npm](https://img.shields.io/npm/dt/allure-deployer?label=npm%20downloads)

**Host your Allure test reports on the web with history, retries, and Slack integration—no server required.**
</br>
</br>
Example report: https://gatedaccessdev.web.app
</br>

![Demo](assets/demo.gif)

## Usage

This package can be used three different ways:

- 🤖 A [**GitHub Action**](https://github.com/marketplace/actions/allure-deployer-action) as part of your CI/CD process

- 🐳 A [**Docker image**](https://hub.docker.com/r/sokari/allure-deployer) that you can run anywhere

- 🖥 A [**CLI**](https://www.npmjs.com/package/allure-deployer) that you run in your terminal and CI


<h2 id="quick-start">🚀 Quick Start</h2>

### Prerequisites
1. **Firebase/GCP Credentials**:
    - Create a Firebase/GCP [service account](https://firebase.google.com/docs/admin/setup#initialize_the_sdk_in_non-google_environments).
    - Download the `service-account-file.json` JSON file.

2. **Firebase/Google Cloud Storage Bucket**:
    - Create a bucket to store test results and reports. You can use the default.

    

### GitHub
#### 1.	Add the [Allure Deployer GitHub Action](https://github.com/marketplace/actions/allure-deployer-action) to your workflow.

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
        uses: cybersokari/allure-deployer-action@v1.1.10
        env:
          SLACK_TOKEN: ${{secrets.SLACK_TOKEN}}
          GOOGLE_CREDENTIALS_JSON: ${{ secrets.GOOGLE_APPLICATION_CREDENTIALS }}
        with:
          allure_results_path: 'path/to/allure-results'
          report_name: 'Notification module Q2'
          storage_bucket: ${{vars.storage-bucket}}
          slack_channel: ${{vars.SLACK_CHANNEL}}
          show_history: 'true' 
          retries: 5
```
See [configurations](#configuration-github) for complete options and environment variables
___
 
#### 2.	Check your Pull request or GitHub Actions summary:
Pull request comment [example](https://github.com/cybersokari/allure-report-deployer/pull/6#issuecomment-2564403881)
```markdown
📊 Your Test Report is ready

Test Report: https://your-example-url.web.app
File Storage: https://console.firebase.google.com/project/${project-id}/storage/${storage-bucket}/files

| ✅ Passed | ⚠️ Broken |
|----------|-----------|
| 15       | 2         |
```
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
  REPORT_NAME: Notification module Q2

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
      -e REPORT_NAME=$REPORT_NAME \
      -e SHOW_HISTORY=true \
      -e RETRIES=5 \
      -v ${CI_PROJECT_DIR}/allure-results:/allure-results \
      -v ${GCP_CREDENTIALS_FILE_PATH}:/credentials/key.json \
      sokari/allure-deployer:latest
  only:
    - main
  dependencies:
    - test
```
See the Docker [configuration section](#docker-image-configuration) for more info

### **Codemagic**

Use the [CLI](https://www.npmjs.com/package/allure-deployer) in your Codemagic workflow.

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
          npm i -g allure-deployer
          cd appium && echo $ALLURE_GOOGLE_KEY >> service-key.json
          allure-deployer deploy path/to/allure-results my-report-name \
          --gcp-json /credentials/key.json \
          --show-history \
          --retries 6 \
          --slack-token $SLACK_TOKEN \
          --slack-channel $SLACK_CHANNEL
    artifacts:
      - android/app/build/outputs/**/*.apk

```

### **Local test runs**
#### 1. Install the CLI

```shell
npm install -g allure-deployer
```

#### 2. Set your Firebase credentials
```shell
allure-deployer gcp-json:set ./gcp-key.json
```

#### 3. Set your Firebase storage bucket
```shell
allure-deployer bucket:set <my-bucket-name>
```

#### 4. Set Slack credentials (Optional)

```shell
allure-deployer slack:set <channel> <token>
```

#### 5. Generate and host your reports
```shell
allure-deployer deploy path/to/allure-results my-report-name \
          --show-history \
          --retries 10
```


<h2 id="configuration">Configurations</h2>

<h3 id="configuration-github">GitHub Action</h2>

https://github.com/marketplace/actions/allure-deployer-action

#### Inputs

| Input                 | Description                                                                                                      | Required | Default           |
|-----------------------|------------------------------------------------------------------------------------------------------------------|----------|-------------------|
| `allure_results_path` | Path to the directory containing Allure results files.                                                           | Yes      | `/allure-results` |
| `report_name`         | The name/title of your report.                                                                                   | No       | `Allure Report`   |
| `storage_bucket`      | Name of the Google Cloud Storage bucket for backup and history storage.                                          | No       | None              |
| `slack_channel`       | ID of the Slack channel to send notifications about report links.                                                | No       | None              |
| `show_history`        | Display history from previous test runs.                                                                         | No       | `true`            |
| `retries`             | Number of previous test runs to show as retries in the upcoming report when Storage `storage_bucket` is provided | No       | 0                 |
| `prefix`              | Path prefix in the Cloud Storage bucket for archiving files.                                                     | No       | None              |
| `update_pr`           | Add test report info as pr comment or actions summary (`comment`/`summary`)                                      | No       | `summary`         |

---

<h4 id="environment-variables-github">Environment Variables</h3>


| Variable                  | Description                                                                   | Example                                      | Required | Default |
|---------------------------|-------------------------------------------------------------------------------|----------------------------------------------|----------|---------|
| `GOOGLE_CREDENTIALS_JSON` | Content of the Google Cloud service account credentials file.                 | `${{ secrets.GCP_APPLICATION_CREDENTIALS }}` | Yes      | None    |
| `SLACK_TOKEN`             | Token for Slack App to send notifications with report URLs.                   | `xoxb-XXXXXXXXXX-XXXXXXXX`                   | No       | None    |
| `GITHUB_TOKEN`            | Github auth token for pull request updates if `update_pr` is set to `comment` | `ghp_*****`                                  | No       | None    |
**Notes**:
- `GOOGLE_CREDENTIALS_JSON` must be set with a service account that has access to Firebase Hosting and Cloud Storage.
- Ensure `SLACK_TOKEN` and `SLACK_CHANNEL` are configured to enable Slack integration.



<h3 id="configuration-docker">🐳 Docker</h2>

```shell
docker pull sokari/allure-deployer:latest
```

<h4 id="environment-variables-docker">Environment Variables</h3>


| Variable         | Description                                                                                                      | Example                        | Default        |
|------------------|------------------------------------------------------------------------------------------------------------------|--------------------------------|----------------|
| `STORAGE_BUCKET` | Google Cloud Storage bucket name                                                                                 | project-id.firebasestorage.app | None           |
| `PREFIX`         | A path in your Storage bucket. Optional.                                                                         | project-123                    | None           |
| `REPORT_NAME`    | The name/title of your report                                                                                    | Space ship report              | `Alure Report` |
| `SHOW_HISTORY`   | Show history in the current report by pulling the history from the last Cloud Storage backup                     | true                           | true           |
| `RETRIES`        | Number of previous test runs to show as retries in the upcoming report when Storage `STORAGE_BUCKET` is provided | 5                              | 0              |
| `SLACK_TOKEN`    | Your Slack App token                                                                                             | xoxb-XXXXXXXXXX-XXXXXXXX       | None           |
| `SLACK_CHANNEL`  | The Slack channel ID or conversation to notify with Allure report details                                        | DC56JYGT8                      | None           |

---

<h4 id="mount-volumes">Mount Volumes</h3>

| Host                        | Container               | Description                                                                                                                          |
|-----------------------------|-------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| `/path/to/allure-results`   | `/allure-results`       | Allure test results directory.                                                                                                       |
| `/path/to/credentials.json` | `/credentials/key.json` | Google Cloud service account JSON file.                                                                                              |
**Notes**:
- Ensure that the directories and files exist on your local machine or CI environment.
- Use absolute paths to avoid errors with relative paths in Docker commands.

---

<h2 id="how-it-works">🛠️ How It Works</h2>

<h3 id="hosting">🌐 Firebase Hosting</h3>

Allure Report Deployer hosts your Reports on Firebase Hosting and saves your history and  
results files in Firebase/GCP storage.
A **secure URL** will be generated and displayed in the console logs.
If configured, the URL will also appear in **GitHub Summary** and **Slack notifications**.

For more information, check the [Configuration](#configuration) section.

<h3 id="cloud-storage">☁️ Cloud Storage</h3>

Your files are backed up as `.zip` archives when you set `SHOW_HISTORY` or `RETRIES`.
*  `RETRIES` adds all the files in your `/allure-results` directory tp an archive
*  `SHOW_HISTORY` adds the `history` [subdirectory of your latest report](https://allurereport.org/docs/how-it-works-history-files/#history-files) to an archive named `last-history.zip`


Example of an archive when both `RETRIES` and `RETRIES` are set
```text
last-history.zip/
            ├── categories-trend.json
            ├── duration-trend.json
            ├── history-trend.json
            ├── history.json
            └── retry-trend.json
1784839939391.zip/
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

This feature uses history and result files saved in Cloud Storage and requires a `STORAGE_BUCKET`.

#### History

Set `SHOW_HISTORY` to `true` to enable history in your incoming test report. 
This is enabled by default when `STORAGE_BUCKET` is provided.
See how [Allure History works](https://allurereport.org/docs/history-and-retries/#tests-history)

#### Retries

Set `RETRIES` to the number to previous test runs you want to show as retries in the new test report.
This feature combines all the result files from previous test run saved in Cloud Storage before generating the new report.
See how [Allure Retries](https://allurereport.org/docs/history-and-retries/#how-to-keep-retries) work

<h3 id="slack-integration">🛠️ Slack Integration</h2>

To notify stakeholders with secure test report links after each test run,
create a [simple Slack app](https://youtu.be/SbUv1nCS7a0?si=8rjWDQh6wfeAztxu&t=266) and set `SLACK_TOKEN`
and `SLACK_CHANNEL` environment variable when you run the Docker image.

<div style="text-align: left"><img src="assets/slack-bot.png" alt="Slack app notification example"></div>


<h2 id="troubleshooting-and-faqs">🛠️ Troubleshooting and FAQs</h2>

### 🛠️️ Troubleshooting
#### 1. Allure Report Website Deployment Fails
- **Problem**: Issues with Google Cloud credentials or permissions.
- **Solution**:
   - Verify the path to your Google credentials is mounted to `/credentials/key.json` on the docker container.
   - Ensure the credential file belongs to a service account with the required permissions for Firebase Hosting and Cloud Storage.
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

#### Q1: Can I use this tool without Google Cloud Storage bucket?
- **A**: Yes, you can generate and share reports without using cloud storage. However, enabling `STORAGE_BUCKET` allows you to enable test report History and Retries.

---

#### Q2: What is the maximum number of live report URLs?
- **A**: 36, due to Firebase [limitation](https://firebase.google.com/docs/hosting/multisites):
---

#### Q3: Can I deploy reports to multiple Firebase sites?
- **A**: Yes, each deployment creates a new report site. This allows you to manage separate URLs for different test runs or environments.

---

#### Q4: Do I need a paid Firebase plan?
- **A**: No, the free Firebase plan is sufficient to host your reports. However, you will need to enable billing to use cloud storage for History and Retries.
Firebase Storage is free for the first [5GB of storage](https://firebase.google.com/pricing)

---

#### Q5: What happens if I don’t set REPORT_NAME?
- **A**: If `REPORT_NAME` is not set, `Allure Report` will be used as your report id.

---

#### Q6: How do I configure Slack notifications?
- **A**: Set the following environment variables:
  - `SLACK_TOKEN`: Your Slack Bot's token.
  - `SLACK_CHANNEL`: The ID of the channel where you want to send notifications.
  - Test the bot by sending a manual message before integrating with the container.

---

#### Q7: Can I merge results from multiple directories?
- **A**: Not directly. You will need to merge allure-results directories manually before generating a report.

---

## License

This project is licensed under the [BSD-3 License](LICENSE). See the LICENSE file for details.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests for bug fixes or new features.
