# Setup

## Requirements
This guide has been developed in Ubuntu 18.04. It is recommended to update the system packages before starting the installation procedure (with: ```sudo apt update```)

## Steps
1. Set up the ESC core following the instructions of the repository [elastic smart contracts](https://github.com/isa-group/elastic-smart-contracts/blob/master/docs/setup.md)

3. Copy and replace if necessary all the files from this repository to the root of the elastic smart contracts repository folder except for the following:  **package.json**, **package-lock.json**.

5. Run the following command in the root directory to install the dependencies of this repository:

```
npm i express governify-commons oas-tools@2.1.4
```
