import fs from "node:fs";
import { isWhatsAppEnabledSync } from "@/lib/notifications/settings";

export { isWhatsAppEnabled } from "@/lib/notifications/settings";

const SYSTEM_CHROME_CANDIDATES = [
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/snap/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

export function isVercelDeployment() {
  return process.env.VERCEL === "1";
}

export function isWhatsAppRuntimeAvailable() {
  if (!isWhatsAppEnabledSync()) return false;
  if (isVercelDeployment()) return false;
  return Boolean(resolvePuppeteerExecutablePath());
}

export function getWhatsAppDefaultCountryCode() {
  return process.env.WHATSAPP_DEFAULT_COUNTRY_CODE?.replace(/\D/g, "") || "91";
}

export function resolvePuppeteerExecutablePath() {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (fromEnv) {
    if (fs.existsSync(fromEnv)) return fromEnv;
    console.warn(`PUPPETEER_EXECUTABLE_PATH does not exist: ${fromEnv}`);
  }

  for (const candidate of SYSTEM_CHROME_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return undefined;
}

export function requirePuppeteerExecutablePath() {
  const executablePath = resolvePuppeteerExecutablePath();
  if (executablePath) return executablePath;

  throw new Error(
    [
      "Chrome/Chromium not found for WhatsApp.",
      "Install Google Chrome, set PUPPETEER_EXECUTABLE_PATH in .env,",
      "or run: npx puppeteer browsers install chrome",
    ].join(" "),
  );
}
