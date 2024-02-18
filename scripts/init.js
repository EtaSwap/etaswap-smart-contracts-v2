const { Client, AccountBalanceQuery, PrivateKey, AccountCreateTransaction, Hbar,
    AccountAllowanceApproveTransaction,
    TokenId,
    ContractId, AccountUpdateTransaction, AccountId, TokenAssociateTransaction,
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

    // In case if need to assoc some token to main test account
    // const assocTx = await new TokenAssociateTransaction()
    //     .setTokenIds(['0.0.143063'])
    //     .setAccountId(AccountId.fromString(operatorAccountId))
    //     .freezeWith(client);
    // const assocSign = await assocTx.sign(PrivateKey.fromString(clientAccount.privateKey));
    // const assocRes = await assocSign.execute(client);
    // const assocReceipt = await assocRes.getReceipt(client);

    //Create account for fee
    const feeAccount = {};
    const privateKey = PrivateKey.generateED25519();
    const publicKey = privateKey.publicKey;
    const account = await new AccountCreateTransaction()
        .setKey(publicKey)
        .setMaxAutomaticTokenAssociations(10)
        .execute(client);
    const { accountId } = await account.getReceipt(client);

    feeAccount.id = accountId;
    feeAccount.privateKey = privateKey;

    console.log(`Fee account init: ${feeAccount.id}, ${feeAccount.privateKey}`);

    const signers = await hre.ethers.getSigners();

    return { client, clientAccount, feeAccount, signers };
}

module.exports = { init };