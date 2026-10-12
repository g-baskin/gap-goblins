#!/usr/bin/env node
import { chromium } from "playwright";

function readArgs(argv) {
  const args = {
    url: argv[0],
    out: "",
    viewport: "1280x800",
    fullPage: false,
    selector: "",
    waitForSelector: "",
    waitMs: 0,
    waitForAnimations: false,
  };

  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--out":
        args.out = argv[++index] ?? "";
        break;
      case "--viewport":
        args.viewport = argv[++index] ?? args.viewport;
        break;
      case "--full-page":
        args.fullPage = true;
        break;
      case "--selector":
        args.selector = argv[++index] ?? "";
        break;
      case "--wait-for-selector":
        args.waitForSelector = argv[++index] ?? "";
        break;
      case "--wait-ms":
        args.waitMs = Number(argv[++index] ?? 0);
        break;
      case "--wait-for-animations":
        args.waitForAnimations = true;
        break;
      default:
        throw new Error(`unknown arg: ${arg}`);
    }
  }

  if (!args.url || !args.out) {
    throw new Error("usage: screenshot.mjs <url> --out <path> [--viewport WxH]");
  }

  return args;
}

function parseViewport(viewport) {
  const match = /^(\d+)x(\d+)$/.exec(viewport);
  if (!match) throw new Error(`invalid viewport: ${viewport}`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

async function waitForAnimations(page) {
  await page.evaluate(async () => {
    const animations = document.getAnimations?.({ subtree: true }) ?? [];
    await Promise.race([
      Promise.allSettled(animations.map((animation) => animation.finished)),
      new Promise((resolve) => setTimeout(resolve, 8000)),
    ]);
  });
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: parseViewport(args.viewport) });
    await page.goto(args.url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("load", { timeout: 15000 }).catch(() => undefined);

    if (args.waitForSelector) {
      await page.waitForSelector(args.waitForSelector, { timeout: 15000 });
    }

    if (args.waitMs > 0) {
      await page.waitForTimeout(args.waitMs);
    }

    if (args.waitForAnimations) {
      await waitForAnimations(page);
    }

    const target = args.selector ? page.locator(args.selector).first() : page;
    await target.screenshot({
      path: args.out,
      fullPage: args.selector ? undefined : args.fullPage,
    });
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
