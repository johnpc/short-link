# s.jpc.io

A link shortener website available at [s.jpc.io](https://s.jpc.io)

## Install dependencies

```bash
npm install
```

## Deploying Backend Resources

Deploy necessary resources to your personal AWS account via

```bash
npx amplify sandbox
```

This will populate the `amplifyconfiguration.json` file at the root of your project, which contains all configuration necessary to interact with the deployed resources.

## Test the website

```bash
npm run dev
```

Then navigate to https://localhost:3000

## Deploy

Deploy a copy of this app to your own AWS account in one click

[![amplifybutton](https://oneclick.amplifyapp.com/button.svg)](https://console.aws.amazon.com/amplify/home#/deploy?repo=https://github.com/johnpc/short-link)
