Feature: Cloud Storage
  Background:
    Given I set a valid Google Credential
    And I set a valid Storage Bucket

  Scenario: Saves history to Storage
    Given I set keepHistory to true
    When I run the app in CI mode
