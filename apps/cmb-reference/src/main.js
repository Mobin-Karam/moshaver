"use strict";

const { readConfig } = require("./config");
const { createApp } = require("./app");

const config = readConfig();
const { server } = createApp({ config });
server.listen(config.port, "0.0.0.0", () => {
  process.stdout.write(`${config.serviceName} listening on ${config.port}\n`);
});
