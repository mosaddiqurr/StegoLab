import { test, expect, embed, recover, verifyBinary, fixture, message, password, capture } from "./helpers";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("production has no application service, database or upload endpoint", async ({ request }) => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  await expect(fs.access(path.join(root,"backend"))).rejects.toThrow();
  const response = await request.get("/"); expect(response.status()).toBe(200);
  expect((await response.text()).replaceAll("&#39;", "'")).toContain("connect-src 'none'");
  expect((await request.get("/api/v1/health")).status()).toBe(404);
  expect((await request.post("/upload",{data:"synthetic rejection probe"})).status()).toBe(405);
});

test("Home, navigation, current screenshots, refresh and project subpath", async ({ page }, info) => {
  await page.goto("/"); await expect(page.getByRole("heading",{name:"Hide data in plain sight.",exact:true})).toBeVisible();
  await expect(page.getByRole("navigation",{name:"Primary"}).getByRole("link")).toHaveCount(3);
  await capture(page,info,"home");
  for (const [route,title] of [["embed","Embed data"],["extract","Extract data"],["about","StegoLab"]]) {
    await page.goto("/#/"+route);await expect(page.getByRole("heading",{name:title,exact:true})).toBeVisible();await capture(page,info,route);
    await page.reload();await expect(page.getByRole("heading",{name:title,exact:true})).toBeVisible();
  }
  await expect(page.getByRole("link",{name:/Mosaddiqur Rahman/})).toHaveAttribute("rel","noopener noreferrer");
  await page.goto("/StegoLab/#/embed"); await expect(page.getByRole("heading",{name:"Embed data",exact:true})).toBeVisible();
  expect(await page.locator(".brand img").evaluate((image: HTMLImageElement)=>image.complete&&image.naturalWidth>0)).toBe(true);
  await page.getByLabel("Carrier",{exact:true}).setInputFiles(fixture("clean.png"));await page.getByRole("textbox",{name:"Text to hide"}).fill(message);
  await expect(page.getByRole("button",{name:"Embed data",exact:true})).toBeEnabled();await page.getByRole("button",{name:"Embed data",exact:true}).click();await expect(page.getByText("Ready",{exact:true})).toBeVisible();
});

for (const format of ["png","jpg","jpeg","bmp","webp","pdf"]) {
  for (const encrypted of [false,true]) for (const binary of [false,true]) {
    test(format + " · " + (encrypted ? "encrypted" : "plain") + " · " + (binary ? "binary hash" : "exact text"), async ({ page },info) => {
      const output=await embed(page,info,format,encrypted,binary);
      expect(path.extname(output)).toBe("."+(format==="jpeg"?"jpg":format));
      await recover(page,output,encrypted,binary);if(binary)await verifyBinary(page,"payload.bin");
      expect(await page.evaluate(()=>localStorage.length)).toBe(0);
      expect(await page.evaluate(()=>sessionStorage.length)).toBe(0);
      expect(await page.evaluate(async()=>"databases" in indexedDB?(await indexedDB.databases()).length:0)).toBe(0);
    });
  }
}
test("wrong password returns no partial plaintext; correct retry works", async ({ page },info) => {
  const output=await embed(page,info,"png",true);await page.goto("/#/extract");await page.getByLabel("StegoLab file").setInputFiles(output);
  await page.getByLabel("Password",{exact:true}).fill("wrong synthetic password");await page.getByRole("button",{name:"Extract data",exact:true}).click();
  await expect(page.getByRole("alert")).toHaveText("The password is incorrect or the hidden data is damaged.");await expect(page.locator(".recovered-text")).toHaveCount(0);
  await page.getByLabel("Password",{exact:true}).fill(password);await page.getByRole("button",{name:"Extract data",exact:true}).click();await expect(page.locator(".recovered-text")).toHaveText(message);
});
test("rejects oversized payload, unsupported carrier and missing payload", async ({ page }) => {
  await page.goto("/#/embed");await page.getByLabel("Carrier",{exact:true}).setInputFiles(fixture("clean.png"));await page.getByRole("button",{name:"File",exact:true}).click();await page.getByLabel("File to hide").setInputFiles(fixture("large.bin"));
  await expect(page.getByText("The payload is too large for this carrier.",{exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"Embed data",exact:true})).toBeDisabled();
  await page.getByLabel("Carrier",{exact:true}).setInputFiles({name:"unsupported.txt",mimeType:"text/plain",buffer:Buffer.from("synthetic carrier")});await expect(page.getByRole("alert")).toHaveText("Unsupported file format.");
  await page.goto("/#/extract");await page.getByLabel("StegoLab file").setInputFiles(fixture("clean.png"));await expect(page.getByRole("alert")).toHaveText("No StegoLab payload was found.");await expect(page.getByRole("button",{name:"Extract data",exact:true})).toBeDisabled();
});
test("corrupted encrypted payload is reported as damaged during discovery", async ({ page },info) => {
  const output=await embed(page,info,"jpg",true);const bytes=await fs.readFile(output);const start=bytes.indexOf("SLP2");expect(start).toBeGreaterThan(0);bytes[start+48]^=1;
  await page.goto("/#/extract");await page.getByLabel("StegoLab file").setInputFiles({name:"modified.jpg",mimeType:"image/jpeg",buffer:bytes});
  await expect(page.getByRole("alert")).toHaveText("The file appears to be damaged.");await expect(page.locator(".recovered-text")).toHaveCount(0);
});
test("large JPEG payload survives multiple application segments", async ({ page },info) => {
  const output=await embed(page,info,"jpg",true,true,"large.bin");await recover(page,output,true,true);await verifyBinary(page,"large.bin");
});
test("translucent PNG pixels and 32-bit BMP are supported safely", async ({ page },info) => {
  for (const name of ["transparent.png","rgba.bmp"]) {
    await page.goto("/#/embed");await page.getByLabel("Carrier",{exact:true}).setInputFiles(fixture(name));await page.getByRole("textbox",{name:"Text to hide"}).fill(message);await expect(page.getByRole("button",{name:"Embed data",exact:true})).toBeEnabled();await page.getByRole("button",{name:"Embed data",exact:true}).click();await expect(page.getByText("Ready",{exact:true})).toBeVisible();
    const event=page.waitForEvent("download");await page.getByRole("link",{name:"Download",exact:true}).click();const out=info.outputPath(name);await (await event).saveAs(out);await recover(page,out);
  }
});
test("refresh clears payloads and passwords; empty and mismatched input errors are safe", async ({ page }) => {
  await page.goto("/#/embed");await page.getByLabel("Carrier",{exact:true}).setInputFiles(fixture("clean.png"));await expect(page.getByRole("button",{name:"Embed data",exact:true})).toBeEnabled();await page.getByRole("button",{name:"Embed data",exact:true}).click();await expect(page.getByRole("alert")).toHaveText("Enter some text to embed.");
  await page.getByRole("textbox",{name:"Text to hide"}).fill(message);await page.getByRole("switch").check();await page.getByLabel("Password",{exact:true}).fill(password);await page.getByLabel("Confirm password").fill("different");await page.getByRole("button",{name:"Embed data",exact:true}).click();await expect(page.getByRole("alert")).toHaveText("The passwords do not match.");
  await page.reload();await expect(page.getByRole("textbox",{name:"Text to hide"})).toHaveValue("");await expect(page.getByRole("switch")).not.toBeChecked();await expect(page.getByLabel("Password",{exact:true})).toHaveCount(0);
});
test("damaged PDF and BMP do not expose parser internals", async ({ page }) => {
  for(const [name,data] of [["broken.pdf","%PDF-1.7\ninvalid"],["broken.bmp","BMinvalid"]]){
    await page.goto("/#/embed");await page.getByLabel("Carrier",{exact:true}).setInputFiles({name,mimeType:"application/octet-stream",buffer:Buffer.from(data)});
    await expect(page.getByRole("alert")).toHaveText(name.endsWith("pdf")?"The PDF could not be processed.":"The file appears to be damaged.");
  }
});
