# Allure Report Deployer

![Test](https://github.com/cybersokari/allure-docker-deploy/workflows/Test/badge.svg)
![docker](https://img.shields.io/docker/pulls/sokari/allure-deployer)
![npm](https://img.shields.io/npm/dt/allure-deployer?label=npm%20downloads)

**Host your Allure test reports on the web with History, Retries, Aggregation and Slack integration—no server required.**
</br>
</br>
Example report: https://gatedaccessdev.web.app
</br>

[//]: # (![Demo]&#40;assets/demo.gif&#41;)

## Usage

This package can be used three different ways:

- 🤖 A [**GitHub Action**](https://github.com/marketplace/actions/allure-deployer-action) to deploy reports to GitHub pages or Firebase

- 🐳 A [**Docker image**](https://hub.docker.com/r/sokari/allure-deployer) to deploy reports to Firebase

- 🖥 A [**CLI**](https://www.npmjs.com/package/allure-deployer) to deploy reports to Firebase


<h2 id="quick-start">🚀 Quick Start</h2>
    

### GitHub
#### 1.	Add the [Allure Deployer GitHub Action](https://github.com/marketplace/actions/allure-deployer-action) to your workflow.

**Deploy report to GitHub Pages**
```yaml
jobs:
  gh-pages:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4.1.5
      - name: Run test
        run: #Run test and create allure results
      - name: Deploy Reports to GitHub pages with History and Retries
        uses: cybersokari/allure-deployer-action@v1.5.1
        with:
          target: 'github'
          github_token: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
          github_pages_branch: 'gh-pages'
          allure_results_path: 'allure-results'
          show_history: 'true'
          retries: 5
```
**Deploy report to Firebase Hosting**
```yaml
jobs:
  firebase:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4.1.5
      - name: Run test
        run: #Run test and create allure results
      - name: Deploy Reports to Firebase with History and Retries
        uses: cybersokari/allure-deployer-action@v1.5.1
        with:
          target: 'firebase'
          allure_results_path: 'allure-results'
          google_credentials_json: ${{ secrets.GOOGLE_APPLICATION_CREDENTIALS }}
          storage_bucket: ${{vars.STORAGE_BUCKET}} # Required for History and Retries
          show_history: 'true'
          retries: 5
```

See [GitHub Action configurations](https://github.com/marketplace/actions/allure-deployer-action#configuration-options-inputs) for the complete inputs.

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
See the Docker image [configuration section](https://hub.docker.com/r/sokari/allure-deployer#docker-image-configuration) for more info

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
See the [CLI documentation](https://www.npmjs.com/package/allure-deployer) for more info

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


<h2 id="how-it-works">🛠️ How It Works</h2>

<h3 id="hosting">🌐 Hosting</h3>

The CLI and Docker Image hosts your Reports on **Firebase Hosting** and saves your history and  
results files in Firebase/GCP storage.
While the GitHub Action supports both **Firebase Hosting** and **GitHub Pages**.


<h3 id="cloud-storage">☁️ Cloud Storage</h3>

Your files are backed up as `.zip` archives when you set `SHOW_HISTORY` or `RETRIES`.
*  `RETRIES` adds all the files in your `/allure-results` directory tp an archive
*  `SHOW_HISTORY` adds the `history` [subdirectory of your latest report](https://allurereport.org/docs/how-it-works-history-files/#history-files) to an archive named `last-history.zip`


Example of an archive when both `SHOW_HISTORY` and `RETRIES` are set
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

#### 2. History and Retries disabled
- **Problem**: Misconfigured `STORAGE_BUCKET`.
- **Solution**:
  - Verify the `STORAGE_BUCKET` matches the name of your Google Cloud Storage bucket.
  - Confirm the Google credential file has write access to the bucket.

## License

This project is licensed under the [BSD-3 License](LICENSE). See the LICENSE file for details.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests for bug fixes or new features.
