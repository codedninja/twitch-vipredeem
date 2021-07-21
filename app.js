const { setup } = require("./setup")
const { Main } = require("./main")
const yargs = require("yargs");

const argv = yargs
    .option("setup", {
        description: "Inital setup for settings.",
        type: "boolean",
    })
    .help()
    .alias("help", "h")
    .argv;

if (argv.setup) {
    setup.start()
} else {
    m = new Main()
    m.start()
}

