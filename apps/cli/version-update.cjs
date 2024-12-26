const fs = require("fs");
const packageJson = require("./package.json");

let code = fs.readFileSync("./dist/commands/version.command.js", "utf-8");
code = code.replace('const version = "1.0.0";', `const version = "${packageJson.version}";`);
fs.writeFileSync("./dist/commands/version.command.js", code);