const { ethers } = require("hardhat");
const {
    AccountAllowanceApproveTransaction,
    TokenId,
    PrivateKey,
    ContractId, Hbar, HbarUnit,
} = require('@hashgraph/sdk');
const Long = require('long');

module.exports = async ({
                            client,
                            clientAccount,
                            exchangeAddress,
                            tokenFrom,
                            path,
                            amountFrom,
                            amountTo,
                            aggregatorId,
                            feeOnTransfer,
                            gasLimit,
                            isTokenFromHBAR,
                        }) => {
    const wallet = (await ethers.getSigners())[0];

    const exchange = await ethers.getContractAt("Exchange", exchangeAddress, wallet);

    // Allow from user to swap
    if (!isTokenFromHBAR) {
        const amountFromLong = Long.fromString(amountFrom.toString());
        const allowanceTx = new AccountAllowanceApproveTransaction()
            .approveTokenAllowance(TokenId.fromSolidityAddress(tokenFrom), clientAccount.id, ContractId.fromSolidityAddress(exchangeAddress), amountFromLong)
            .freezeWith(client);
        const allowanceSign = await allowanceTx.sign(PrivateKey.fromString(clientAccount.privateKey));
        const allowanceSubmit = await allowanceSign.execute(client);
        await allowanceSubmit.getReceipt(client);
    }

    //swap transaction
    const deadline = Math.floor(Date.now() / 1000) + 1000;
    const tx = await exchange.swap(
        aggregatorId,
        path,
        amountFrom,
        amountTo,
        deadline,
        isTokenFromHBAR,
        feeOnTransfer,
        {
          gasLimit,
          value: isTokenFromHBAR ? ethers.utils.parseUnits(Hbar.fromTinybars(amountFrom.toString()).to(HbarUnit.Hbar).toString()) : 0,
        }
    );
    const res = await tx.wait();
    console.log(`Swap on ${aggregatorId}: ${tx.hash} (${res.gasUsed} Gas (${((gasLimit - res.gasUsed) / gasLimit * 100).toFixed(2)}%))`);

    return tx.hash;
};
