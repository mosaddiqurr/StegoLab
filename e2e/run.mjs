import { spawn } from "node:child_process";
import { server } from "./serve.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const directory = path.dirname(fileURLToPath(import.meta.url));
await new Promise((resolve,reject) => { server.once("listening",resolve); server.once("error",reject); });
const child=spawn(process.execPath,[path.join(directory,"node_modules/@playwright/test/cli.js"),"test",...process.argv.slice(2)],{cwd:directory,stdio:"inherit"});
child.once("error",()=>{server.close();process.exitCode=1;});
child.once("close",code=>{server.close();process.exitCode=code??1;});

