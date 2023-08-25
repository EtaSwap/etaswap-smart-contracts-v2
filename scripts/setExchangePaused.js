const { ethers } = require("hardhat");

module.exports = async ({ exchangeAddress, paused }) => {
    let wallet = (await ethers.getSigners())[0];

    const exchange = await ethers.getContractAt('Exchange', exchangeAddress, wallet);
    return exchange[paused ? 'pauseSwaps' : 'unpauseSwaps']();
};
