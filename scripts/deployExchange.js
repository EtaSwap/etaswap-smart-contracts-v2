const { ethers } = require("hardhat");
const {
  ContractFunctionParameters,
  Client,
  TokenAssociateTransaction,
  PrivateKey,
  ContractCreateFlow, AccountId, Hbar, TransferTransaction, ContractExecuteTransaction,
} = require('@hashgraph/sdk');

module.exports = async ({ client, clientAccount, feeAccount, adapters }) => {
  //Assign the first signer, which comes from the first privateKey from our configuration in hardhat.config.js, to a wallet variable.
  let wallet = (await ethers.getSigners())[0];
  let allTokensToAssociate = [];

  const Exchange= await ethers.getContractFactory("Exchange", wallet);
  const exchangeTx = new ContractCreateFlow()
      .setGas(300000)
      .setAdminKey(client.operatorPublicKey)
      .setBytecode(Exchange.bytecode);
  const exchangeSign = await exchangeTx.sign(PrivateKey.fromString(clientAccount.privateKey));
  const exchangeSignResponse = await exchangeSign.execute(client);
  const { contractId } = await exchangeSignResponse.getReceipt(client);
  const exchangeAddress = `0x${contractId?.toSolidityAddress()}`;
  console.log(`Exchange deployed to: ${exchangeAddress}`);

  for (let adapterInfo of adapters) {
    const Adapter = await ethers.getContractFactory(adapterInfo.contractName, wallet);
    const adapterTx = new ContractCreateFlow()
        .setGas(250000)
        .setAdminKey(client.operatorPublicKey)
        .setConstructorParameters(
            new ContractFunctionParameters()
                .addAddress(`0x${feeAccount.id.toSolidityAddress()}`)
                .addAddress(adapterInfo.router)
                .addUint256(5)
                .addAddress(adapterInfo.whbarToken)
                .addAddress(adapterInfo.whbarContract)
        )
        .setBytecode(Adapter.bytecode);
    const adapterSign = await adapterTx.sign(PrivateKey.fromString(clientAccount.privateKey));
    const adapterSignResponse = await adapterSign.execute(client);
    const { contractId } = await adapterSignResponse.getReceipt(client);
    const adapterAddress = `0x${contractId?.toSolidityAddress()}`;
    console.log(`${adapterInfo.aggregatorId} adapter deployed to: ${adapterAddress}`);

    // Associate adapter with tokens
    const assocTx = await new TokenAssociateTransaction()
        .setTokenIds(adapterInfo.tokensToAssociate)
        .setAccountId(AccountId.fromSolidityAddress(adapterAddress))
        .freezeWith(client);
    const assocSign = await assocTx.sign(PrivateKey.fromString(clientAccount.privateKey));
    const assocRes = await assocSign.execute(client);
    const assocReceipt = await assocRes.getReceipt(client);

    const exchange = await ethers.getContractAt("Exchange", exchangeAddress, wallet);
    await exchange.setAdapter(adapterInfo.aggregatorId, adapterAddress, );

    allTokensToAssociate = allTokensToAssociate.concat(adapterInfo.tokensToAssociate);
  }

  allTokensToAssociate = allTokensToAssociate.filter((v, i, a)=> a.indexOf(v)=== i);

  // Associate exchange with tokens
  const assocExchangeTx = await new TokenAssociateTransaction()
      .setTokenIds(allTokensToAssociate)
      .setAccountId(AccountId.fromSolidityAddress(exchangeAddress))
      .freezeWith(client);
  const assocExchangeSign = await assocExchangeTx.sign(PrivateKey.fromString(clientAccount.privateKey));
  const assocExchangeRes = await assocExchangeSign.execute(client);
  await assocExchangeRes.getReceipt(client);
  console.log(`Exchange associated to all tokens.`)

  //Associate fee wallet to all tokens
  const assocFeeTx = await new TokenAssociateTransaction()
      .setTokenIds(allTokensToAssociate)
      .setAccountId(feeAccount.id)
      .freezeWith(client);
  const assocFeeSign = await assocFeeTx.sign(feeAccount.privateKey);
  const assocFeeRes = await assocFeeSign.execute(client);
  await assocFeeRes.getReceipt(client);
  console.log('Fee account associated to all tokens.');

  return { contractAddress: exchangeAddress };
};
