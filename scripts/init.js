const { Client, AccountBalanceQuery, PrivateKey, AccountCreateTransaction, Hbar,
    AccountAllowanceApproveTransaction,
    TokenId,
    ContractId,
} = require("@hashgraph/sdk");
require("dotenv").config();
const hre = require("hardhat");

const init = async () => {
    const operatorAccountId = process.env.TESTNET_OPERATOR_ACCOUNT_ID;
    const operatorPrivateKey = process.env.TESTNET_OPERATOR_PRIVATE_KEY_DER;

    if (!operatorAccountId || !operatorPrivateKey) {
        throw new Error("Environment variables must be present.");
    }

    const client = Client.forTestnet();
    client.setOperator(operatorAccountId, operatorPrivateKey);

    const clientAccount = { id: operatorAccountId, privateKey: operatorPrivateKey };
    console.log(`Client account init: ${clientAccount.id}, ${clientAccount.privateKey}`);

    //Create account for fee
    const feeAccount = {};
    const privateKey = PrivateKey.generateED25519();
    const publicKey = privateKey.publicKey;
    const account = await new AccountCreateTransaction()
        .setKey(publicKey)
        .execute(client);
    const { accountId } = await account.getReceipt(client);

    feeAccount.id = accountId;
    feeAccount.privateKey = privateKey;
    console.log(`Fee account init: ${feeAccount.id}, ${feeAccount.privateKey}`);

    const signers = await hre.ethers.getSigners();

    return { client, clientAccount, feeAccount, signers };
}

module.exports = { init };