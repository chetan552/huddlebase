const { chromium } = require('playwright');
const path = require('path');

const BASE = 'http://localhost:3000';
const OUT = path.join(__dirname, '..', 'public', 'screenshots');

const pages = [
  { name: 'dashboard', path: '/dashboard' },
  { name: 'teams', path: '/teams' },
  { name: 'schedule', path: '/schedule' },
  { name: 'roster', path: '/roster' },
  { name: 'chat', path: '/chat' },
  { name: 'payments', path: '/payments' },
  { name: 'analytics', path: '/analytics' },
  { name: 'practice-plan', path: '/practice-plan' },
];

(async () => {
  const fs = require('fs');
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  // Login
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'coach@huddlebase.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Capture each page
  for (const { name, path: pagePath } of pages) {
    console.log(`Capturing ${name}...`);
    await page.goto(`${BASE}${pagePath}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(OUT, `${name}.png`),
      fullPage: false,
    });
    console.log(`  ✓ ${name}.png`);
  }

  await browser.close();
  console.log('Done!');
})();
