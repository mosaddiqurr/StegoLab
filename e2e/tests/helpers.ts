import { expect, test as base, type Page, type TestInfo } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
export { expect };
export const test = base.extend<{ privacyGuard: void }>({
  privacyGuard: [async ({ page, baseURL }, use) => {
    const unexpected: string[] = [], errors: string[] = [];
    page.on("request", request => { const url = new URL(request.url()); if (!["blob:","data:"].includes(url.protocol) && (url.origin !== new URL(baseURL!).origin || !["GET","HEAD"].includes(request.method()) || /\/api\//.test(url.pathname))) unexpected.push(request.method() + " " + url.pathname); });
    page.on("pageerror",error=>errors.push(error.message));
    page.on("console",message=>{ if (message.type()==="error" && /Content Security Policy/i.test(message.text())) errors.push("CSP violation: "+message.text().slice(0,160)); });
    await use(); expect(unexpected, "No network upload or API request").toEqual([]); expect(errors, "No browser errors").toEqual([]);
  }, { auto: true }],
});
export const fixture = (name: string) => path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.fixtures", name);
export const message = "Exact recovery: café · বাংলা · 🧩\nLine two <script> stays text.";
export const password = "Synthetic browser test password 🔐";
export async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(name+".png"),fullPage:true});
}
export async function embed(page: Page, info: TestInfo, format: string, encrypted = false, binary = false, payloadName = "payload.bin") {
  await page.goto("/#/embed"); await page.getByLabel("Carrier", { exact:true }).setInputFiles(fixture("clean."+format));
  await expect(page.getByRole("button",{name:"Embed data",exact:true})).toBeEnabled();
  if (binary) { await page.getByRole("button",{name:"File",exact:true}).click(); await page.getByLabel("File to hide").setInputFiles(fixture(payloadName)); }
  else await page.getByRole("textbox",{name:"Text to hide"}).fill(message);
  if (encrypted) { await page.getByRole("switch",{name:"Protect with password"}).check(); await page.getByLabel("Password",{exact:true}).fill(password); await page.getByLabel("Confirm password").fill(password); }
  await page.getByRole("button",{name:"Embed data",exact:true}).click(); await expect(page.getByText("Ready",{exact:true})).toBeVisible();
  const event = page.waitForEvent("download"); await page.getByRole("link",{name:"Download",exact:true}).click(); const download=await event;
  const output=info.outputPath(download.suggestedFilename()); await download.saveAs(output); return output;
}
export async function recover(page: Page, output: string, encrypted = false, binary = false) {
  await page.goto("/#/extract"); await page.getByLabel("StegoLab file").setInputFiles(output);
  if (encrypted) await page.getByLabel("Password",{exact:true}).fill(password);
  await expect(page.getByRole("button",{name:"Extract data",exact:true})).toBeEnabled();
  await page.getByRole("button",{name:"Extract data",exact:true}).click();
  await expect(page.getByRole("heading",{name:binary?"Recovered file":"Hidden text",exact:true})).toBeVisible();
  if (!binary) await expect(page.locator(".recovered-text")).toHaveText(message);
}
export async function verifyBinary(page: Page, expected: string) {
  const event=page.waitForEvent("download");await page.getByRole("link",{name:"Download file"}).click();const result=await event;
  const actual=await fs.readFile((await result.path())!);const original=await fs.readFile(fixture(expected));
  expect(createHash("sha256").update(actual).digest("hex")).toBe(createHash("sha256").update(original).digest("hex"));
}
