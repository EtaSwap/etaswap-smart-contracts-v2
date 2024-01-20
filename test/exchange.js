const hre = require("hardhat");
const { expect } = require("chai");
const { ORACLES } = require('./constants');
const { AccountId } = require('@hashgraph/sdk');

const GAS_LIMITS = {
    exactTokenToToken: 940000, //877969    875079
    exactHBARToToken: 260000, //221207     203366
    exactTokenToHBAR: 1690000, //1629306   1623679
    tokenToExactToken: 940000, //894071    891182
    HBARToExactToken: 260000, //211040     218135
    tokenToExactHBAR: 1690000, //1645353   1639941
}

describe.only("Exchange", function () {
    let adapterAddresses = {};
    let exchangeAddress;

    let client;
    let clientAccount;
    let feeAccount;
    let signers;
    let gasApiPrice;

    const getGas = async (gasLimit) => {
        if (!gasApiPrice) {
            gasApiPrice = await axios.get('https://mainnet-public.mirrornode.hedera.com/api/v1/network/exchangerate');
        }
        const rate = gasApiPrice.data.current_rate.hbar_equivalent / gasApiPrice.data.current_rate.cent_equivalent * 100;
        const approxCost1Gas = 0.000000082;
        return rate * gasLimit * approxCost1Gas;
    }

    before(async function () {
        const initData = await hre.run('init');
        client = initData.client;
        clientAccount = initData.clientAccount;
        feeAccount = initData.feeAccount;
        signers = initData.signers;

        for (const name in Object.keys[ORACLES]) {
            adapterAddresses[name] = hre.ethers.constants.AddressZero;
        }
    });

    it.only("should be able to deploy exchange and attach Uniswap adapter", async function () {
        const exchange = await hre.run("deploy-exchange", {
            client,
            clientAccount,
            feeAccount,
            adapters: Object.values(ORACLES).map(oracle => ({
                router: oracle.router,
                contractName: oracle.adapterContract,
                aggregatorId: oracle.aggregatorId,
                tokensToAssociate: oracle.tokensToAssociate,
                whbarToken: oracle.whbarToken,
                whbarContract: oracle.whbarContract,
            }))
        });
        exchangeAddress = exchange.contractAddress;
        expect(exchangeAddress).not.to.equal(hre.ethers.constants.AddressZero);
    });

    it("should be able to exchange exact tokens to tokens", async function () {
        for (const name of Object.keys(ORACLES)) {
            if (!ORACLES[name].validPair) {
                console.warn(`Missing token pair for ${name}`);
                continue;
            }
            const { tokenA, tokenB, poolFee} = ORACLES[name].validPair;
            const [tokenABalanceBefore, tokenBBalanceBefore, tokenABalanceFeeBefore] = await Promise.all([
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenA
                }),
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenB
                }),
                hre.run('get-balance', {
                    userAddress: feeAccount.id.toSolidityAddress(),
                    tokenAddress: tokenA
                }),
            ]);

            const { amountFrom, amountTo, path, etaSwapFee } = await hre.run('get-quote', {
                aggregatorId: [ORACLES[name].aggregatorId],
                tokenA,
                tokenB,
                poolFee,
            });
            await hre.run("call-exchange", {
                client,
                clientAccount,
                exchangeAddress,
                tokenFrom: tokenA,
                path,
                amountFrom,
                amountTo,
                aggregatorId: ORACLES[name].aggregatorId,
                feeOnTransfer: false,
                gasLimit: GAS_LIMITS.exactTokenToToken,
                isTokenFromHBAR: false,
            });

            const [tokenABalanceAfter, tokenBBalanceAfter, tokenABalanceFeeAfter] = await Promise.all([
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenA
                }),
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenB
                }),
                hre.run('get-balance', {
                    userAddress: feeAccount.id.toSolidityAddress(),
                    tokenAddress: tokenA
                }),
            ]);

            expect(tokenABalanceAfter).to.be.equal(tokenABalanceBefore.sub(amountFrom));
            expect(tokenBBalanceAfter).to.be.greaterThan(tokenBBalanceBefore.add(amountTo));
            expect(tokenABalanceFeeAfter.sub(tokenABalanceFeeBefore.add(etaSwapFee)).abs()).to.be.lessThanOrEqual(100);
        }
    });

    it("should be able to exchange exact HBAR to tokens", async function () {
        for (const name of Object.keys(ORACLES)) {
            const { tokenA, tokenB, poolFee } = ORACLES[name].validPairHbar;

            const [tokenABalanceBefore, tokenBBalanceBefore, tokenABalanceFeeBefore] = await Promise.all([
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenA
                }),
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenB
                }),
                hre.run('get-balance', {
                    userAddress: feeAccount.id.toSolidityAddress(),
                    tokenAddress: tokenA
                }),
            ]);

            const { amountFrom, amountTo, path, etaSwapFee } = await hre.run('get-quote', {
                aggregatorId: [ORACLES[name].aggregatorId],
                tokenA,
                tokenB,
                poolFee,
            });
            await hre.run("call-exchange", {
                client,
                clientAccount,
                exchangeAddress,
                tokenFrom: tokenA,
                path,
                amountFrom,
                amountTo,
                aggregatorId: ORACLES[name].aggregatorId,
                feeOnTransfer: false,
                gasLimit: GAS_LIMITS.exactHBARToToken,
                isTokenFromHBAR: true,
            });


            const [tokenABalanceAfter, tokenBBalanceAfter, tokenABalanceFeeAfter] = await Promise.all([
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenA
                }),
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenB
                }),
                hre.run('get-balance', {
                    userAddress: feeAccount.id.toSolidityAddress(),
                    tokenAddress: tokenA
                }),
            ]);

            expect(tokenABalanceAfter).not.to.be.equal(tokenABalanceBefore);
            expect(tokenBBalanceAfter).to.be.greaterThan(tokenBBalanceBefore.add(amountTo));
            expect(tokenABalanceFeeAfter.sub(tokenABalanceFeeBefore.add(etaSwapFee).abs())).to.be.lessThanOrEqual(100);
        }
    });

    it.only("should be able to exchange exact tokens to HBAR", async function () {
        for (const name of Object.keys(ORACLES)) {
            const { tokenA, tokenB, poolFee } = ORACLES[name].validPairHbar;

            const [tokenABalanceBefore, tokenBBalanceBefore, tokenBBalanceFeeBefore] = await Promise.all([
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenA
                }),
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenB
                }),
                hre.run('get-balance', {
                    userAddress: feeAccount.id.toSolidityAddress(),
                    tokenAddress: tokenB
                }),
            ]);

            const { amountFrom, amountTo, path } = await hre.run('get-quote', {
                aggregatorId: [ORACLES[name].aggregatorId],
                tokenA: tokenB,
                tokenB: tokenA,
                poolFee,
            });
            await hre.run("call-exchange", {
                client,
                clientAccount,
                exchangeAddress,
                tokenFrom: tokenB,
                path,
                amountFrom,
                amountTo,
                aggregatorId: ORACLES[name].aggregatorId,
                feeOnTransfer: false,
                gasLimit: GAS_LIMITS.exactTokenToHBAR,
                isTokenFromHBAR: false,
            });

            const [tokenABalanceAfter, tokenBBalanceAfter, tokenBBalanceFeeAfter] = await Promise.all([
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenA
                }),
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenB
                }),
                hre.run('get-balance', {
                    userAddress: feeAccount.id.toSolidityAddress(),
                    tokenAddress: tokenB
                }),
            ]);

            const gas = await getGas(GAS_LIMITS.exactTokenToHBAR);
            expect(tokenBBalanceAfter).to.be.equal(tokenBBalanceBefore.sub(amountFrom));
            expect(tokenABalanceAfter).to.be.greaterThan(tokenABalanceBefore.add(amountTo).sub(gas));
            expect(tokenBBalanceFeeAfter.sub(tokenBBalanceFeeBefore.add(amountFrom.mul(feeRate * 1000).div(1000))).abs()).to.be.lessThanOrEqual(100);
        }
    });

    it("should be able to change fee as admin", async function () {
        const oldFeeRate = feeRate;
        feeRate = 0.003;
        for (const name of Object.keys(ORACLES)) {
            const { newFeeRate } = await hre.run('set-adapter-fee', {
                exchangeAddress,
                aggregatorId: ORACLES[name].aggregatorId,
                adapterName: ORACLES[name].adapterContract,
                feePromille: feeRate * 1000,
            });

            expect(newFeeRate).not.to.be.equal(hre.ethers.BigNumber.from(oldFeeRate * 1000));
            expect(newFeeRate).to.be.equal(hre.ethers.BigNumber.from(feeRate * 1000));
        }
    });

    it("should be able to exchange tokens to exact tokens", async function () {
        for (const name of Object.keys(ORACLES)) {
            if (!ORACLES[name].validPair) {
                console.warn(`Missing token pair for ${name}`);
                continue;
            }
            const { tokenA, tokenB, poolFee } = ORACLES[name].validPair;

            const [tokenABalanceBefore, tokenBBalanceBefore, tokenABalanceFeeBefore, { rate }] = await Promise.all([
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenA
                }),
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenB
                }),
                hre.run('get-balance', {
                    userAddress: feeAccount.id.toSolidityAddress(),
                    tokenAddress: tokenA
                }),
                hre.run('get-rate-oracle', {
                    name,
                    address: ORACLES[name].address,
                    tokenA: tokenB,
                    tokenB: tokenA,
                }),
            ]);

            const { amountFrom, amountTo, path } = await hre.run('get-quote', {
                aggregatorId: [ORACLES[name].aggregatorId],
                tokenA,
                tokenB,
                poolFee,
            });
            await hre.run("call-exchange", {
                client,
                clientAccount,
                exchangeAddress,
                tokenFrom: tokenA,
                path,
                amountFrom,
                amountTo,
                aggregatorId: ORACLES[name].aggregatorId,
                feeOnTransfer: true,
                gasLimit: GAS_LIMITS.tokenToExactToken,
                isTokenFromHBAR: false,
            });


            const [tokenABalanceAfter, tokenBBalanceAfter, tokenABalanceFeeAfter] = await Promise.all([
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenA
                }),
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenB
                }),
                hre.run('get-balance', {
                    userAddress: feeAccount.id.toSolidityAddress(),
                    tokenAddress: tokenA
                }),
            ]);

            expect(tokenABalanceAfter).to.be.greaterThan(tokenABalanceBefore.sub(amountFrom));
            expect(tokenABalanceAfter).to.be.lessThanOrEqual(tokenABalanceBefore.sub(amountTo.mul(rate).div(hre.ethers.BigNumber.from(10).pow(18)).mul(1000 + feeRate * 1000).div(1000)));
            expect(tokenBBalanceAfter).to.be.equal(tokenBBalanceBefore.add(amountTo));
            expect(tokenABalanceFeeAfter.sub(tokenABalanceFeeBefore.add(amountFrom.mul(feeRate * 1000).div(1000))).abs()).to.be.lessThanOrEqual(100);
        }
    });

    it("should be able to exchange HBAR to exact tokens", async function () {
        for (const name of Object.keys(ORACLES)) {
            const { tokenA, tokenB, poolFee } = ORACLES[name].validPairHbar;

            const [tokenABalanceBefore, tokenBBalanceBefore, tokenABalanceFeeBefore, { rate }] = await Promise.all([
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenA
                }),
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenB
                }),
                hre.run('get-balance', {
                    userAddress: feeAccount.id.toSolidityAddress(),
                    tokenAddress: tokenA
                }),
                hre.run('get-rate-oracle', {
                    name,
                    address: ORACLES[name].address,
                    tokenA,
                    tokenB,
                }),
            ]);

            const { amountFrom, amountTo, path } = await hre.run('get-quote', {
                aggregatorId: [ORACLES[name].aggregatorId],
                tokenA,
                tokenB,
                poolFee,
            });
            await hre.run("call-exchange", {
                client,
                clientAccount,
                exchangeAddress,
                tokenFrom: tokenA,
                path,
                amountFrom: amountFrom,
                amountTo,
                aggregatorId: ORACLES[name].aggregatorId,
                feeOnTransfer: true,
                gasLimit: GAS_LIMITS.HBARToExactToken,
                isTokenFromHBAR: true,
            });

            const [tokenABalanceAfter, tokenBBalanceAfter, tokenABalanceFeeAfter] = await Promise.all([
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenA
                }),
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenB
                }),
                hre.run('get-balance', {
                    userAddress: feeAccount.id.toSolidityAddress(),
                    tokenAddress: tokenA
                }),
            ]);

            expect(tokenABalanceAfter).to.be.lessThanOrEqual(tokenABalanceBefore.sub(amountTo.mul(rate).div(hre.ethers.BigNumber.from(10).pow(18)).mul(1000 + feeRate * 1000).div(1000)));
            expect(tokenBBalanceAfter).to.be.equal(tokenBBalanceBefore.add(amountTo));
            expect(tokenABalanceFeeAfter.sub(tokenABalanceFeeBefore.add(amountFrom.mul(feeRate * 1000).div(1000))).abs()).to.be.lessThanOrEqual(100);
        }
    });

    it("should be able to exchange tokens to exact HBAR", async function () {
        for (const name of Object.keys(ORACLES)) {
            const { tokenA, tokenB, poolFee } = ORACLES[name].validPairHbar;

            const [tokenABalanceBefore, tokenBBalanceBefore, tokenBBalanceFeeBefore, { rate }] = await Promise.all([
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenA
                }),
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenB
                }),
                hre.run('get-balance', {
                    userAddress: feeAccount.id.toSolidityAddress(),
                    tokenAddress: tokenB
                }),
                hre.run('get-rate-oracle', {
                    name,
                    address: ORACLES[name].address,
                    tokenA,
                    tokenB,
                }),
            ]);

            const { amountFrom, amountTo, path } = await hre.run('get-quote', {
                aggregatorId: [ORACLES[name].aggregatorId],
                tokenA: tokenB,
                tokenB: tokenA,
                poolFee,
            });
            await hre.run("call-exchange", {
                client,
                clientAccount,
                exchangeAddress,
                tokenFrom: tokenB,
                path,
                amountFrom,
                amountTo,
                aggregatorId: ORACLES[name].aggregatorId,
                feeOnTransfer: true,
                gasLimit: GAS_LIMITS.tokenToExactHBAR,
                isTokenFromHBAR: false,
            });


            const [tokenABalanceAfter, tokenBBalanceAfter, tokenBBalanceFeeAfter] = await Promise.all([
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenA
                }),
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenB
                }),
                hre.run('get-balance', {
                    userAddress: feeAccount.id.toSolidityAddress(),
                    tokenAddress: tokenB
                }),
            ]);

            expect(tokenBBalanceAfter).to.be.greaterThan(tokenBBalanceBefore.sub(amountFrom));
            expect(tokenBBalanceAfter).to.be.lessThanOrEqual(tokenBBalanceBefore.sub(amountTo.mul(rate).div(hre.ethers.BigNumber.from(10).pow(18)).mul(1000 + feeRate * 1000).div(1000)));
            //TODO: -fee
            // expect(tokenBBalanceAfter).to.be.equal(tokenBBalanceBefore.sub(amountTo));
            expect(tokenBBalanceFeeAfter.sub(tokenBBalanceFeeBefore.add(amountFrom.mul(feeRate * 1000).div(1000))).abs()).to.be.lessThanOrEqual(100);
        }
    });

    it('should be able to pause and unpause swaps by admin', async function () {
        for (const name of Object.keys(ORACLES)) {
            const { tokenA, tokenB, poolFee } = ORACLES[name].validPairHbar;
            const tokenABalanceBefore = await hre.run('get-balance', {
                userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                tokenAddress: tokenA
            });

            await hre.run('set-exchange-paused', { exchangeAddress, paused: true });

            const { amountFrom, amountTo, path } = await hre.run('get-quote', {
                aggregatorId: [ORACLES[name].aggregatorId],
                tokenA,
                tokenB,
                poolFee,
            });
            try {
                await hre.run("call-exchange", {
                    client,
                    clientAccount,
                    exchangeAddress,
                    tokenFrom: tokenA,
                    path,
                    amountFrom,
                    amountTo,
                    aggregatorId: ORACLES[name].aggregatorId,
                    feeOnTransfer: false,
                    gasLimit: GAS_LIMITS.exactTokenToToken,
                    isTokenFromHBAR: true,
                });
                expect(true).to.be.equal(false);
            } catch (err) {
                expect(err.reason).to.be.equal('transaction failed');
            }

            const tokenABalancePaused = await hre.run('get-balance', {
                userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                tokenAddress: tokenA
            });

            expect(tokenABalancePaused).to.be.equal(tokenABalanceBefore);

            await hre.run('set-exchange-paused', { exchangeAddress, paused: false });

            await hre.run("call-exchange", {
                client,
                clientAccount,
                exchangeAddress,
                tokenFrom: tokenA,
                path,
                amountFrom,
                amountTo,
                aggregatorId: ORACLES[name].aggregatorId,
                feeOnTransfer: false,
                gasLimit: GAS_LIMITS.exactTokenToToken,
                isTokenFromHBAR: true,
            });

            const tokenABalanceAfter = await hre.run('get-balance', {
                userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                tokenAddress: tokenA
            });

            expect(tokenABalanceAfter).to.be.equal(tokenABalanceBefore.sub(amountFrom));
        }
    });
});
