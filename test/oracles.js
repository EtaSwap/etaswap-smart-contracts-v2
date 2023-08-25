const hre = require("hardhat");
const { expect } = require("chai");
const { ORACLES } = require('./constants');

describe("Oracles", function () {
  let oracleAddresses = {};

  let client;
  let clientAccount;
  let feeAccount;
  let signers;

  before(async function () {
    const initData = await hre.run('init');
    client = initData.client;
    clientAccount = initData.clientAccount;
    feeAccount = initData.feeAccount;
    signers = initData.signers;

    for (const name in Object.keys[ORACLES]) {
      oracleAddresses[name] = hre.ethers.constants.AddressZero;
    }
  });

  it('Should be able to deploy oracles', async function () {
    for (const name of Object.keys(ORACLES)) {
      const deploy = await hre.run('deploy-oracle', { name, factory: ORACLES[name].factory });
      oracleAddresses[name] = deploy.contractAddress;
      expect(oracleAddresses[name]).not.to.equal(hre.ethers.constants.AddressZero);
    }
  });

  it('Should be able to get rate from oracles without connector', async function () {
    for (const name of Object.keys(ORACLES)) {
      const { tokenA, tokenAName, tokenB, tokenBName } = ORACLES[name].validPair;
      const { rate } = await hre.run('get-rate-oracle', {
        name,
        address: oracleAddresses[name],
        tokenA,
        tokenB,
        connector: '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF',
      });
      console.log(`Rate ${name} ${tokenAName}/${tokenBName}: ${rate}`);
      expect(rate).to.be.greaterThan(hre.ethers.BigNumber.from(0));
    }
  });

  it('Should be able to get reverse rate from oracles', async function () {
    for (const name of Object.keys(ORACLES)) {
      const { tokenA, tokenB } = ORACLES[name].validPair;
      const { rate } = await hre.run('get-rate-oracle', {
        name,
        address: oracleAddresses[name],
        tokenA,
        tokenB,
        connector: '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF',
      });
      const { rate: rateReverse } = await hre.run('get-rate-oracle', {
        name,
        address: oracleAddresses[name],
        tokenA: tokenB,
        tokenB: tokenA,
        connector: '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF',
      });

      expect(rate).to.be.greaterThan(hre.ethers.BigNumber.from(0));
      expect(rate).not.to.be.equal(rateReverse);
      const decimalsA = await hre.run('get-decimals', { address: tokenA });
      const decimalsB = await hre.run('get-decimals', { address: tokenB });
      const decimalsDiff = decimalsA - decimalsB;

      const priceA = ethers.utils.formatEther(decimalsDiff > 0 ? rate.mul(Math.pow(10, decimalsDiff)) : rate.div(Math.pow(10, Math.abs(decimalsDiff))));
      const priceB = ethers.utils.formatEther(decimalsDiff < 0 ? rateReverse.mul(Math.pow(10, decimalsDiff)) : rateReverse.div(Math.pow(10, Math.abs(decimalsDiff))));

      expect(parseFloat(priceA).toFixed(6)).to.be.equal((1 / parseFloat(priceB)).toFixed(6));
    }
  });

});
