const hre = require('hardhat');
const { ORACLES } = require('../test/constants');
const UniswapV2QuoterAbi = require('../test/helpers/UniswapV2Quoter.json');
const SaucerSwapV2QuoterAbi = require('../test/helpers/SaucerSwapV2Quoter.json');
const axios = require('axios');
const { ethers } = require('hardhat');

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
    SaucerSwap: async ({ tokenA, tokenB, tokenC }) => {
        const path = [tokenA, tokenB];
        if (tokenC) {
            path.push(tokenC);
        }

        const amountFrom = hre.ethers.BigNumber.from(10000);
        const etaSwapFee = amountFrom.mul(feeRate * 1000).div(1000);
        const wallet = (await hre.ethers.getSigners())[0];
        const abiInterfaces = new hre.ethers.utils.Interface(UniswapV2QuoterAbi);
        const routerContract = new hre.ethers.Contract(ORACLES.SaucerSwapOracle.router, abiInterfaces.fragments, wallet);
        const result = await routerContract.getAmountsOut(amountFrom.sub(etaSwapFee), path);
        const amountTo = result[result.length - 1].mul(1000 - slippageTolerance * 1000 - feeRate * 1000).div(1000);

        return {
            amountFrom,
            amountTo,
            path: path.reduce((acc, address) => acc + address.substring(2), '0x'),
            etaSwapFee,
        };
    },
    SaucerSwapFeeOnTransfer: async ({ tokenA, tokenB, tokenC }) => {
        const path = [tokenB, tokenA];
        if (tokenC) {
            path.unshift(tokenC);
        }

        const amountTo = hre.ethers.BigNumber.from(10000);
        const wallet = (await hre.ethers.getSigners())[0];
        const abiInterfaces = new hre.ethers.utils.Interface(UniswapV2QuoterAbi);
        const routerContract = new hre.ethers.Contract(ORACLES.SaucerSwapOracle.router, abiInterfaces.fragments, wallet);
        const result = await routerContract.getAmountsIn(amountTo, path.slice().reverse());
        const etaSwapFee = result[0].mul(feeRate * 1000).div(1000);
        const amountFrom = result[0].mul(1000 + slippageTolerance * 1000 + feeRate * 1000).div(1000);

        return {
            amountFrom,
            amountTo,
            path: path.reduce((acc, address) => acc + address.substring(2), '0x'),
            etaSwapFee,
        };
    },
    SaucerSwapV2: async ({ tokenA, tokenB, tokenC, poolFee }) => {
        const abiInterface = new hre.ethers.utils.Interface(SaucerSwapV2QuoterAbi);
        const path = [
            tokenA.substring(2),
            poolFee.toString(16).padStart(6, '0'),
            tokenB.substring(2),
        ];

        if (tokenC) {
            path.push(poolFee.toString(16).padStart(6, '0'));
            path.push(tokenC.substring(2));
        }

        const encodedPath = Uint8Array.from(Buffer.from(path.join(''), 'hex'));
        const amountFrom = hre.ethers.BigNumber.from(10000);
        const etaSwapFee = amountFrom.mul(feeRate * 1000).div(1000);
        const params = [encodedPath, amountFrom.sub(etaSwapFee).toHexString()];
        const encodedData = abiInterface.encodeFunctionData(abiInterface.getFunction('quoteExactInput'), params);

        const url = `https://testnet.mirrornode.hedera.com/api/v1/contracts/call`;
        const data = {
            'block': 'latest',
            'data': encodedData,
            'to': ORACLES.SaucerSwapV2Oracle.address,
        };

        const response = await axios.post(url, data, { headers: { 'content-type': 'application/json' } });
        const result = abiInterface.decodeFunctionResult('quoteExactInput', response.data.result);
        const amountTo = result.amountOut.mul(1000 - slippageTolerance * 1000 - feeRate * 1000).div(1000);

        return {
            amountFrom,
            amountTo,
            path: '0x' + path.join(''),
            gasEstimate: result.gasEstimate,
            etaSwapFee
        };
    },
    SaucerSwapV2FeeOnTransfer: async ({ tokenA, tokenB, tokenC, poolFee }) => {
        const abiInterface = new hre.ethers.utils.Interface(SaucerSwapV2QuoterAbi);
        const path = [
            tokenB.substring(2),
            poolFee.toString(16).padStart(6, '0'),
            tokenA.substring(2),
        ];

        if (tokenC) {
            path.unshift(poolFee.toString(16).padStart(6, '0'));
            path.unshift(tokenC.substring(2));
        }

        const encodedPath = Uint8Array.from(Buffer.from(path.join(''), 'hex'));
        const amountTo = hre.ethers.BigNumber.from(10000);
        const params = [encodedPath, amountTo.toHexString()];
        const encodedData = abiInterface.encodeFunctionData(abiInterface.getFunction('quoteExactOutput'), params);

        const url = `https://testnet.mirrornode.hedera.com/api/v1/contracts/call`;
        const data = {
            'block': 'latest',
            'data': encodedData,
            'to': ORACLES.SaucerSwapV2Oracle.address,
        };

        const response = await axios.post(url, data, { headers: { 'content-type': 'application/json' } });
        const result = abiInterface.decodeFunctionResult('quoteExactOutput', response.data.result);
        const etaSwapFee = result.amountIn.mul(feeRate * 1000).div(1000);
        const amountFrom = result.amountIn.mul(1000 + slippageTolerance * 1000 + feeRate * 1000).div(1000)

        return {
            amountFrom,
            amountTo,
            path: '0x' + path.join(''),
            gasEstimate: result.gasEstimate,
            etaSwapFee
        };
    }
}
