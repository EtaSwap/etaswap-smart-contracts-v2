require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomiclabs/hardhat-ethers");
//import dotenv library to access environment variables stored in .env file
require("dotenv").config();

//define hardhat task here, which can be accessed in our test file (test/exchange.js) by using hre.run('taskName')
task("init", async () => {
  const { init } = require("./scripts/init");
  return init();
});

task("deploy-oracle", async (taskArgs) => {
  const deployOracle = require("./scripts/deployOracle");
  return deployOracle(taskArgs);
});

task("get-rate-oracle", async (taskArgs) => {
  const getRateOracle = require("./scripts/getRateOracle");
  return getRateOracle(taskArgs);
});

task("get-decimals", async (taskArgs) => {
  const getDecimals = require("./scripts/getDecimals");
  return getDecimals(taskArgs);
});

task("get-balance", async (taskArgs) => {
  const getBalance = require("./scripts/getBalance");
  return getBalance(taskArgs);
});

task("get-quote", async (taskArgs) => {
  const getQuote= require("./scripts/getQuote");
  const { aggregatorId, ...cleanArgs } = taskArgs;
  return getQuote[aggregatorId](cleanArgs);
});

task("deploy-exchange", async (taskArgs) => {
  const deployExchange = require("./scripts/deployExchange");
  return deployExchange(taskArgs);
});

task("contract-view-call", async (taskArgs) => {
  const contractViewCall = require("./scripts/getRateOracle");
  return contractViewCall(taskArgs);
});

task("call-exchange", async (taskArgs) => {
  const callExchange = require("./scripts/callExchange");
  return callExchange(taskArgs);
});

task('set-adapter-fee', async (taskArgs) => {
  const setAdapterFee= require("./scripts/setAdapterFee");
  return setAdapterFee(taskArgs);
});

task('set-exchange-paused', async (taskArgs) => {
  const setExchangePaused = require("./scripts/setExchangePaused");
  return setExchangePaused(taskArgs);
});
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  mocha: {
    timeout: 3600000,
  },
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  //this specifies which network should be used when running Hardhat tasks
  defaultNetwork: "testnet",
  networks: {
    testnet: {
      url: process.env.TESTNET_ENDPOINT,
      accounts: [
        process.env.TESTNET_OPERATOR_PRIVATE_KEY_HEX,
      ],
    },
    mainnet: {
      url: process.env.MAINNET_ENDPOINT,
      accounts: [
        process.env.MAINNET_OPERATOR_PRIVATE_KEY_HEX,
      ],
    }
  },
};
