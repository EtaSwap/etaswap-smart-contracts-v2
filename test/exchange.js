const hre = require("hardhat");
const { expect } = require("chai");
const { ORACLES } = require('./constants');
const { AccountId } = require('@hashgraph/sdk');

const GAS_LIMITS = {
    exactTokenToToken: 940000, //877969    875079
    exactHBARToToken: 275000, //221207     203366
    exactTokenToHBAR: 1730000, //1629306   1623679
    tokenToExactToken: 940000, //894071    891182
    HBARToExactToken: 290000, //211040     218135
    tokenToExactHBAR: 1750000, //1645353   1639941
}

describe("Exchange", function () {
    let adapterAddresses = {};
    let exchangeAddress;

    let client;
    let clientAccount;
    let feeAccount;
    let signers;
    let gasApiPrice;

    //To be sure last balance changes are synced from main node to mirror node
    const syncMirrorNode = () => new Promise(resolve => setTimeout(resolve, 5000));

    const getGas = async (gasLimit, includeApprovalAmount = 0) => {
        if (!gasApiPrice) {
            gasApiPrice = await (await fetch('https://mainnet-public.mirrornode.hedera.com/api/v1/network/exchangerate')).json();
        }
        const rate = gasApiPrice.current_rate.hbar_equivalent / gasApiPrice.current_rate.cent_equivalent * 100;
        const approxCost1Gas = 0.000000082;
        let cost = rate * gasLimit * approxCost1Gas * 100000000;
        if (includeApprovalAmount) {
            cost = cost + rate * 0.05 * 100000000 * includeApprovalAmount;
        }
        return hre.ethers.BigNumber.from((cost).toFixed(0).toString());
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

    it("should be able to deploy exchange and attach adapters", async function () {
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
            await syncMirrorNode();
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
                feeOnTransfer: false,
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
            await syncMirrorNode();
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
                feeOnTransfer: false,
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

    it("should be able to exchange exact tokens to HBAR", async function () {
        for (const name of Object.keys(ORACLES)) {
            await syncMirrorNode();
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

            const { amountFrom, amountTo, path, etaSwapFee } = await hre.run('get-quote', {
                aggregatorId: [ORACLES[name].aggregatorId],
                feeOnTransfer: false,
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

            const gas = await getGas(GAS_LIMITS.exactTokenToHBAR, 3);
            expect(tokenBBalanceAfter).to.be.equal(tokenBBalanceBefore.sub(amountFrom));
            expect(tokenABalanceAfter).to.be.greaterThan(tokenABalanceBefore.add(amountTo).sub(gas));
            expect(tokenBBalanceFeeAfter.sub(tokenBBalanceFeeBefore.add(etaSwapFee)).abs()).to.be.lessThanOrEqual(100);
        }
    });

    it("should be able to exchange exact tokens to tokens (indirect swap)", async function () {
        for (const name of Object.keys(ORACLES)) {
            await syncMirrorNode();
            if (!ORACLES[name].validTriple) {
                console.warn(`Missing token triple for ${name}`);
                continue;
            }
            const { tokenA, tokenB, tokenC, poolFee} = ORACLES[name].validTriple;
            const [tokenABalanceBefore, tokenBBalanceBefore, tokenCBalanceBefore, tokenABalanceFeeBefore] = await Promise.all([
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenA
                }),
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenB
                }),
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenC
                }),
                hre.run('get-balance', {
                    userAddress: feeAccount.id.toSolidityAddress(),
                    tokenAddress: tokenA
                }),
            ]);

            const { amountFrom, amountTo, path, etaSwapFee } = await hre.run('get-quote', {
                aggregatorId: [ORACLES[name].aggregatorId],
                feeOnTransfer: false,
                tokenA,
                tokenB,
                tokenC,
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
                gasLimit: GAS_LIMITS.exactTokenToToken + 75000,
                isTokenFromHBAR: false,
            });

            const [tokenABalanceAfter, tokenBBalanceAfter, tokenCBalanceAfter, tokenABalanceFeeAfter] = await Promise.all([
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenA
                }),
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenB
                }),
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenC
                }),
                hre.run('get-balance', {
                    userAddress: feeAccount.id.toSolidityAddress(),
                    tokenAddress: tokenA
                }),
            ]);

            const gas = await getGas(GAS_LIMITS.HBARToExactToken + 75000, 3);
            expect(tokenABalanceAfter).to.be.equal(tokenABalanceBefore.sub(amountFrom));
            //assumption - tokenB is HBAR
            expect(tokenBBalanceAfter).to.be.greaterThanOrEqual(tokenBBalanceBefore.sub(gas));
            expect(tokenCBalanceAfter).to.be.greaterThan(tokenCBalanceBefore.add(amountTo));
            expect(tokenABalanceFeeAfter.sub(tokenABalanceFeeBefore.add(etaSwapFee)).abs()).to.be.lessThanOrEqual(100);
        }
    });

    it("should be able to exchange tokens to exact tokens", async function () {
        for (const name of Object.keys(ORACLES)) {
            await syncMirrorNode();
            if (!ORACLES[name].validPair) {
                console.warn(`Missing token pair for ${name}`);
                continue;
            }
            const { tokenA, tokenB, poolFee } = ORACLES[name].validPair;

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
                feeOnTransfer: true,
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
            // expect(tokenABalanceAfter).to.be.lessThanOrEqual(tokenABalanceBefore.sub(amountTo.mul(rate).div(hre.ethers.BigNumber.from(10).pow(18)).mul(1000 + feeRate * 1000).div(1000)));
            expect(tokenBBalanceAfter).to.be.equal(tokenBBalanceBefore.add(amountTo));
            expect(tokenABalanceFeeAfter.sub(tokenABalanceFeeBefore.add(etaSwapFee)).abs()).to.be.lessThanOrEqual(100);
        }
    });

    it("should be able to exchange HBAR to exact tokens", async function () {
        for (const name of Object.keys(ORACLES)) {
            await syncMirrorNode();
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
                feeOnTransfer: true,
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

            const gas = await getGas(GAS_LIMITS.HBARToExactToken);
            expect(tokenABalanceAfter).to.be.greaterThanOrEqual(tokenABalanceBefore.sub(amountFrom).sub(gas));
            expect(tokenBBalanceAfter).to.be.equal(tokenBBalanceBefore.add(amountTo));
            expect(tokenABalanceFeeAfter.sub(tokenABalanceFeeBefore.add(etaSwapFee)).abs()).to.be.lessThanOrEqual(100);
        }
    });

    it("should be able to exchange tokens to exact HBAR", async function () {
        for (const name of Object.keys(ORACLES)) {
            await syncMirrorNode();
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

            const { amountFrom, amountTo, path, etaSwapFee } = await hre.run('get-quote', {
                aggregatorId: [ORACLES[name].aggregatorId],
                feeOnTransfer: true,
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

            const gas = await getGas(GAS_LIMITS.tokenToExactHBAR, 2);
            expect(tokenBBalanceAfter).to.be.greaterThanOrEqual(tokenBBalanceBefore.sub(amountFrom));
            expect(tokenABalanceAfter).to.be.greaterThan(tokenABalanceBefore.add(amountTo).sub(gas));
            expect(tokenBBalanceFeeAfter.sub(tokenBBalanceFeeBefore.add(etaSwapFee)).abs()).to.be.lessThanOrEqual(100);
        }
    });

    it("should be able to exchange tokens to exact tokens (indirect swap)", async function () {
        for (const name of Object.keys(ORACLES)) {
            await syncMirrorNode();
            if (!ORACLES[name].validTriple) {
                console.warn(`Missing token triple for ${name}`);
                continue;
            }
            const { tokenA, tokenB, tokenC, poolFee } = ORACLES[name].validTriple;

            const [tokenABalanceBefore, tokenBBalanceBefore, tokenCBalanceBefore, tokenABalanceFeeBefore] = await Promise.all([
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenA
                }),
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenB
                }),
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenC
                }),
                hre.run('get-balance', {
                    userAddress: feeAccount.id.toSolidityAddress(),
                    tokenAddress: tokenA
                }),
            ]);

            const { amountFrom, amountTo, path, etaSwapFee } = await hre.run('get-quote', {
                aggregatorId: [ORACLES[name].aggregatorId],
                feeOnTransfer: true,
                tokenA,
                tokenB,
                tokenC,
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
                gasLimit: GAS_LIMITS.tokenToExactToken + 75000,
                isTokenFromHBAR: false,
            });


            const [tokenABalanceAfter, tokenBBalanceAfter, tokenCBalanceAfter, tokenABalanceFeeAfter] = await Promise.all([
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenA
                }),
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenB
                }),
                hre.run('get-balance', {
                    userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                    tokenAddress: tokenC
                }),
                hre.run('get-balance', {
                    userAddress: feeAccount.id.toSolidityAddress(),
                    tokenAddress: tokenA
                }),
            ]);

            const gas = await getGas(GAS_LIMITS.HBARToExactToken + 75000, 3);
            expect(tokenABalanceAfter).to.be.greaterThan(tokenABalanceBefore.sub(amountFrom));
            //assumption tokenB is HBAR
            expect(tokenBBalanceAfter).to.be.greaterThanOrEqual(tokenBBalanceBefore.sub(gas));
            expect(tokenCBalanceAfter).to.be.equal(tokenCBalanceBefore.add(amountTo));
            expect(tokenABalanceFeeAfter.sub(tokenABalanceFeeBefore.add(etaSwapFee)).abs()).to.be.lessThanOrEqual(100);
        }
    });

    it('should be able to splitSwap exact HBAR to tokens', async function () {
        await syncMirrorNode();
        const { tokenA, tokenB, poolFee } = ORACLES.SaucerSwapOracle.validPairHbar;
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

        const { amountFrom: amountFrom1, amountTo: amountTo1, path: path1, etaSwapFee: etaSwapFee1 } = await hre.run('get-quote', {
            aggregatorId: [ORACLES.SaucerSwapOracle.aggregatorId],
            feeOnTransfer: false,
            tokenA,
            tokenB,
            poolFee,
        });
        const { amountFrom: amountFrom2, amountTo: amountTo2, path: path2, etaSwapFee: etaSwapFee2 } = await hre.run('get-quote', {
            aggregatorId: [ORACLES.SaucerSwapV2Oracle.aggregatorId],
            feeOnTransfer: false,
            tokenA,
            tokenB,
            poolFee,
        });

        await hre.run("call-split-swap-exchange", {
            client,
            clientAccount,
            exchangeAddress,
            tokenFrom: tokenA,
            paths: [path1, path2],
            amountsFrom: [amountFrom1, amountFrom2],
            amountsTo: [amountTo1, amountTo2],
            aggregatorIds: [ORACLES.SaucerSwapOracle.aggregatorId, ORACLES.SaucerSwapV2Oracle.aggregatorId],
            feeOnTransfer: false,
            gasLimit: GAS_LIMITS.exactHBARToToken * 2,
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

        const gas = await getGas(GAS_LIMITS.HBARToExactToken * 2);
        expect(tokenABalanceAfter).to.be.greaterThanOrEqual(tokenABalanceBefore.sub(amountFrom1).sub(amountFrom2).sub(gas));
        expect(tokenBBalanceAfter).to.be.greaterThanOrEqual(tokenBBalanceBefore.add(amountTo1).add(amountTo2));
        expect(tokenABalanceFeeAfter.sub(tokenABalanceFeeBefore.add(etaSwapFee1).add(etaSwapFee2)).abs()).to.be.lessThanOrEqual(100);
    });

    it('should be able to splitSwap tokens to exact HBAR', async function () {
        await syncMirrorNode();
        const { tokenA, tokenB, poolFee } = ORACLES.SaucerSwapOracle.validPairHbar;

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

        const { amountFrom: amountFrom1, amountTo: amountTo1, path: path1, etaSwapFee: etaSwapFee1 } = await hre.run('get-quote', {
            aggregatorId: [ORACLES.SaucerSwapOracle.aggregatorId],
            feeOnTransfer: true,
            tokenA: tokenB,
            tokenB: tokenA,
            poolFee,
        });
        const { amountFrom: amountFrom2, amountTo: amountTo2, path: path2, etaSwapFee: etaSwapFee2 } = await hre.run('get-quote', {
            aggregatorId: [ORACLES.SaucerSwapV2Oracle.aggregatorId],
            feeOnTransfer: true,
            tokenA: tokenB,
            tokenB: tokenA,
            poolFee,
        });

        await hre.run("call-split-swap-exchange", {
            client,
            clientAccount,
            exchangeAddress,
            tokenFrom: tokenB,
            paths: [path1, path2],
            amountsFrom: [amountFrom1, amountFrom2],
            amountsTo: [amountTo1, amountTo2],
            aggregatorIds: [ORACLES.SaucerSwapOracle.aggregatorId, ORACLES.SaucerSwapV2Oracle.aggregatorId],
            feeOnTransfer: true,
            gasLimit: GAS_LIMITS.tokenToExactHBAR * 2,
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

        const gas = await getGas(GAS_LIMITS.tokenToExactHBAR * 2, 2);
        expect(tokenBBalanceAfter).to.be.greaterThanOrEqual(tokenBBalanceBefore.sub(amountFrom1).sub(amountFrom2));
        expect(tokenABalanceAfter).to.be.greaterThan(tokenABalanceBefore.add(amountTo1).add(amountTo2).sub(gas));
        expect(tokenBBalanceFeeAfter.sub(tokenBBalanceFeeBefore.add(etaSwapFee1).add(etaSwapFee2)).abs()).to.be.lessThanOrEqual(100);
    });

    it('should be able to pause and unpause swaps by admin', async function () {
        for (const name of Object.keys(ORACLES)) {
            await syncMirrorNode();
            const { tokenA, tokenB, poolFee } = ORACLES[name].validPair;
            const tokenABalanceBefore = await hre.run('get-balance', {
                userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                tokenAddress: tokenA
            });

            await hre.run('set-exchange-paused', { exchangeAddress, paused: true });

            const { amountFrom, amountTo, path } = await hre.run('get-quote', {
                aggregatorId: [ORACLES[name].aggregatorId],
                feeOnTransfer: false,
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
                    isTokenFromHBAR: false,
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
                isTokenFromHBAR: false,
            });

            const tokenABalanceAfter = await hre.run('get-balance', {
                userAddress: AccountId.fromString(clientAccount.id).toSolidityAddress(),
                tokenAddress: tokenA
            });

            expect(tokenABalanceAfter).to.be.equal(tokenABalanceBefore.sub(amountFrom));
        }
    });

    it("should be able to change fee as admin", async function () {
        const oldFeeRate = 0.005;
        const feeRate = 0.009;
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
});
