const { ethers } = require("hardhat");
const { Client, TokenAssociateTransaction, PrivateKey } = require('@hashgraph/sdk');

module.exports = async ({ name, address, tokenA, tokenB }) => {
  const wallet = (await ethers.getSigners())[0];

  const oracle = await ethers.getContractAt(name, address, wallet);
  return oracle.getRate(tokenA, tokenB);
};

