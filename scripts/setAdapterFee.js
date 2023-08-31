const { ethers } = require("hardhat");

module.exports = async ({ exchangeAddress, adapterName, aggregatorId, feePromille }) => {
    let wallet = (await ethers.getSigners())[0];

    const exchange = await ethers.getContractAt('Exchange', exchangeAddress, wallet);
    const adapterAddress = await exchange.adapters(aggregatorId);

    const adapter = await ethers.getContractAt(adapterName, adapterAddress, wallet);
    await adapter.setFeePromille(feePromille);

    const newFeeRate = await adapter.feePromille();

    return { newFeeRate };
};
