import {defineConfig} from '@playwright/test';
const baseURL=process.env.E2E_BASE_URL;
if(process.env.LEADFLOW_SYNTHETIC_ONLY!=="YES"||!baseURL||new URL(baseURL).hostname!=="127.0.0.1")throw new Error('Playwright requires the disposable loopback fixture');
export default defineConfig({testDir:'./e2e',timeout:60000,workers:1,retries:0,reporter:'list',outputDir:'test-results',use:{baseURL,timezoneId:"UTC",trace:'off',screenshot:'off',video:'off',launchOptions:{...(process.env.LEADFLOW_CHROMIUM_EXECUTABLE?{executablePath:process.env.LEADFLOW_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage']}}});
