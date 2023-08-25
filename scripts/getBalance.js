const { ethers } = require("hardhat");
const { AccountBalanceQuery } = require('@hashgraph/sdk');

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

    const token = await hre.ethers.getContractAt(erc20ABI, tokenAddress, wallet);
    return token.balanceOf(userAddress);
};