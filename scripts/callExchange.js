const { ethers } = require("hardhat");
const {
  AccountAllowanceApproveTransaction,
  TokenId,
  PrivateKey,
  ContractId,
} = require('@hashgraph/sdk');
const Long = require('long');

module.exports = async ({ client, clientAccount, exchangeAddress, tokenFrom, tokenTo, amountFrom, amountTo, aggregatorId, feeOnTransfer }) => {
  const wallet = (await ethers.getSigners())[0];

  const exchange = await ethers.getContractAt("Exchange", exchangeAddress, wallet);

  // Allow from user to swap
  const amountFromLong = Long.fromString(amountFrom.toString());
  const allowanceTx = new AccountAllowanceApproveTransaction()
      .approveTokenAllowance(TokenId.fromSolidityAddress(tokenFrom), clientAccount.id, ContractId.fromSolidityAddress(exchangeAddress), amountFromLong)
      .freezeWith(client);
  const allowanceSign = await allowanceTx.sign(PrivateKey.fromString(clientAccount.privateKey));
  const allowanceSubmit = await allowanceSign.execute(client);
  await allowanceSubmit.getReceipt(client);

  const feeData = await ethers.provider.getFeeData();
  //swap transaction
  const deadline = Math.floor(Date.now() / 1000) + 1000;
  const tx = await exchange.swap(
      aggregatorId,
      tokenFrom,
      tokenTo,
      amountFrom,
      amountTo,
      deadline,
      feeOnTransfer,
      { gasLimit: 900000, maxFeePerGas: feeData.gasPrice.mul(103).div(100), maxPriorityFeePerGas: feeData.maxPriorityFeePerGas }
  );
  await tx.wait();
  console.log();
  console.log(`Swap ${tokenFrom}/${tokenTo}, on ${aggregatorId}: ${tx.hash}`);

  return tx.hash;
};