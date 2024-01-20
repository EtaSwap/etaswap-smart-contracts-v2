const { ethers } = require("hardhat");
const { AccountBalanceQuery } = require('@hashgraph/sdk');
const { ORACLES } = require('../test/constants');

module.exports = async ({ userAddress, tokenAddress }) => {
    const erc20ABI = [{
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "name": "balance",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }];

    const wallet = (await ethers.getSigners())[0];

    const whbarsAddresses = [

    ];

    if (Object.values(ORACLES).map(oracle => oracle.whbarToken).includes(tokenAddress)) {
        return (await ethers.provider.getBalance(userAddress)).div('10000000000');
    }

    const token = await hre.ethers.getContractAt(erc20ABI, tokenAddress, wallet);
    return token.balanceOf(userAddress);
};