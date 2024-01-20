const hre = require('hardhat');
const { ORACLES } = require('../test/constants');
const SaucerSwapV2QuoterAbi = require('../test/helpers/SaucerSwapV2Quoter.json');
const axios = require('axios');

let feeRate = 0.005;
const slippageTolerance = 0.003;

module.exports = {
    Pangolin:  ({ tokenA, tokenB }) => {
        const { rate } = hre.run('get-rate-oracle', {
            name,
            address: ORACLES['PangolinOracle'].address,
            tokenA,
            tokenB,
        });
        const amountFrom = hre.ethers.BigNumber.from(10000);
        const amountTo = amountFrom.mul(rate).div(hre.ethers.BigNumber.from(10).pow(18)).mul(1000 - slippageTolerance * 1000 - feeRate * 1000).div(1000);

        const path = hre.ethers.utils.defaultAbiCoder.encode(['address', 'address'], [tokenA, tokenB]);

        return { amountFrom, amountTo, path };
    },
    SaucerSwap: ({ tokenA, tokenB }) => {
        const { rate } = hre.run('get-rate-oracle', {
            name,
            address: ORACLES['SaucerSwapOracle'].address,
            tokenA,
            tokenB,
        });
        const amountFrom = hre.ethers.BigNumber.from(10000);
        const amountTo = amountFrom.mul(rate).div(hre.ethers.BigNumber.from(10).pow(18)).mul(1000 - slippageTolerance * 1000 - feeRate * 1000).div(1000);

        const path = hre.ethers.utils.defaultAbiCoder.encode(['address', 'address'], [tokenA, tokenB]);

        return { amountFrom, amountTo, path };
    },
    SaucerSwapV2: async ({ tokenA, tokenB, poolFee }) => {
        const abiInterface = new hre.ethers.utils.Interface(SaucerSwapV2QuoterAbi);
        const path = [
            tokenA.substring(2),
            poolFee.toString(16).padStart(6, '0'),
            tokenB.substring(2),
        ];

        const encodedPath = Uint8Array.from(Buffer.from(path.join(''), 'hex'));
        const amountFrom = hre.ethers.BigNumber.from(10000);
        const etaSwapFee = amountFrom.mul(feeRate * 1000).div(1000);
        const params = [encodedPath, amountFrom.sub(etaSwapFee).toHexString()];
        const encodedData = abiInterface.encodeFunctionData(abiInterface.getFunction('quoteExactInput'), params);

        const url = `https://testnet.mirrornode.hedera.com/api/v1/contracts/call`;
        const data = {
            'block': 'latest',
            'data': encodedData,
            'to': ORACLES['SaucerSwapV2Oracle'].address,
        };

        const response = await axios.post(url, data, { headers: { 'content-type': 'application/json' } });
        const result = abiInterface.decodeFunctionResult('quoteExactInput', response.data.result);
        const amountTo = result.amountOut.mul(1000 - slippageTolerance * 1000 - feeRate * 1000).div(1000);

        return { amountFrom, amountTo, path: '0x' + path.join(''), gasEstimate: result.gasEstimate, etaSwapFee };
    }
}
