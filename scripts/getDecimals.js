const { ethers } = require("hardhat");

module.exports = async ({ address }) => {
  const wallet = (await ethers.getSigners())[0];

  const erc20ABI = [{
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "name": "",
        "type": "uint8"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }];

  const token = await hre.ethers.getContractAt(erc20ABI, address, wallet);
  return token.decimals();
};

