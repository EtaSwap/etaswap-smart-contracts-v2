const { ethers } = require("hardhat");

module.exports = async ({ name, factory }) => {
  let wallet = (await ethers.getSigners())[0];

  const Oracle = await ethers.getContractFactory(name, wallet);
  const oracle = await Oracle.deploy(factory, { gasLimit: 110000 });
  const oracleAddress = (await oracle.deployTransaction.wait()).contractAddress;
  console.log(`${name} oracle deployed to: ${oracleAddress}`);

  return { contractAddress: oracleAddress };
};
