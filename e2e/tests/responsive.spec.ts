import { test, expect, embed, recover, verifyBinary, capture } from "./helpers";
test("mobile Home, Embed, Extract and About have usable navigation and no overflow",async({page},info)=>{
  for(const [route,title] of [["","StegoLab"],["embed","Embed data"],["extract","Extract data"],["about","StegoLab"]]){
    await page.goto("/#/"+route);await expect(page.getByRole("heading",{name:title,exact:true})).toBeVisible();await capture(page,info,route||"home");
  }
  await page.getByRole("link",{name:"Embed",exact:true}).click();await expect(page.getByRole("heading",{name:"Embed data",exact:true})).toBeVisible();
  await page.getByRole("switch").check();await expect(page.getByLabel("Confirm password")).toBeVisible();await capture(page,info,"protected-form");
  await page.setViewportSize({width:768,height:1024});await capture(page,info,"tablet-embed");
  await page.setViewportSize({width:320,height:720});await capture(page,info,"small-mobile-embed");
});
test("mobile encrypted PNG download, wrong password and binary recovery",async({page},info)=>{
  const output=await embed(page,info,"png",true,true);
  await page.goto("/#/extract");await page.getByLabel("StegoLab file").setInputFiles(output);await page.getByLabel("Password",{exact:true}).fill("wrong mobile password");await page.getByRole("button",{name:"Extract data",exact:true}).click();await expect(page.getByRole("alert")).toHaveText("The password is incorrect or the hidden data is damaged.");await expect(page.locator(".result-panel")).toHaveCount(0);
  await recover(page,output,true,true);await verifyBinary(page,"payload.bin");await capture(page,info,"binary-result");
});
test("mobile PDF text download and extraction",async({page},info)=>{
  const output=await embed(page,info,"pdf",true);await recover(page,output,true);await capture(page,info,"text-result");
});
