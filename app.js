const { setup } = require("./setup")
const { Main } = require("./main")
const fs = require("fs");

console.log("Checking if settings file exists...");
if(!fs.existsSync("settings.json")) {
    setup.start()
} else {
    m = new Main()
    m.start()
}