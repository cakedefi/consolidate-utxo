#!/usr/bin/env node

const arg = require("arg");
const yesno = require("yesno");
const Client = require("bitcoin-core");

const { construct, broadcast } = require("./cutxo");

const parseArgs = () => {
    const args = arg(
        {
            "--help": Boolean,
            "--host": String,
            "--username": String,
            "--password": String,
            "--port": Number,
            "--limit": Number,
            "--amount": Number,
            "--fee": Number,
        },
        { argv: process.argv.slice(2) }
    );

    if (args["--help"]) {
        console.log("HELP");
        process.exit();
    }

    const options = {
        host: args["--host"] || "localhost",
        port: args["--port"] || 8332,
        username: args["--username"],
        password: args["--password"],
        maximumAmount: args["--amount"] || 0.0001,
        limit: args["--limit"],
        feeRate: args["--fee"] || 1,
    };

    if (!options.username) {
        console.error("Username is missing");
        process.exit(1);
    }

    return options;
};

(async () => {
    const options = parseArgs();
    const client = new Client({
        port: options.port,
        username: options.username,
        password: options.password,
    });

    try {
        await client.ping();
    } catch (e) {
        console.error("Connection error");
        console.error(e.toString());
        process.exit(1);
    }

    let tx;
    try {
        tx = await construct({
            client,
            maximumAmount: options.maximumAmount,
            limit: options.limit,
            feeRate: options.feeRate,
        });
    } catch (e) {
        console.error("Constructing transaction error");
        console.error(e.toString());
        process.exit(1);
    }

    console.info();
    console.info("Number of inputs:", tx.inputsUsed);
    console.info("Inputs total amount:", tx.amount);
    console.info("Output amount:", tx.amount - tx.fee);
    console.info("Fee:", tx.fee);
    console.info("Output address:", tx.address);
    console.info();

    const ok = await yesno({
        question: "Are you sure you want to broadcast the transaction?",
    });
    if (!ok) process.exit(0);

    try {
        const txid = await broadcast({ client, hex: tx.hex });
        console.info(txid);
    } catch (e) {
        console.error("Broadcasting transaction error");
        console.error(e.toString());
        process.exit(1);
    }
})();