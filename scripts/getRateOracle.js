/*-
 *
 * Hedera Hardhat Example Project
 *
 * Copyright (C) 2023 Hedera Hashgraph, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

const { ethers } = require("hardhat");
const { Client, TokenAssociateTransaction, PrivateKey } = require('@hashgraph/sdk');

module.exports = async ({ name, address, tokenA, tokenB, connector }) => {
  //Assign the first signer, which comes from the first privateKey from our configuration in hardhat.config.js, to a wallet variable.
  const wallet = (await ethers.getSigners())[0];

  //Assign the greeter contract object in a variable, this is used for already deployed contract, which we have the address for. ethers.getContractAt accepts:
  //name of contract as first parameter
  //address of our contract
  //wallet/signer used for signing the contract calls/transactions with this contract
  // const greeter = await hre.ethers.getContractAt("Greeter", address, wallet);
  //using the greeter object(which is our contract) we can call functions from the contract. In this case we call greet which returns our greeting msg
  // const callRes = await greeter.greet();

  // console.log(`Contract call result: ${callRes}`);


  // const client = Client.forTestnet();
  // client.setOperator('0.0.39039', '302e020100300506032b65700422042021fc09ca40c46b0cf893a7e6279d382ebd5b0ddc2745897de36539551016ace8');
  //
  // const assocTx = await new TokenAssociateTransaction()
  //     .setTokenIds([
  //         '0.0.58850', '0.0.59042', '0.0.61266', '0.0.117947', '0.0.143056',
  //         '0.0.143063', '0.0.157962', '0.0.160931', '0.0.447892', '0.0.447893',
  //         '0.0.447894', '0.0.447895', '0.0.459411'
  //     ])
  //     .setAccountId('0.0.390392')
  //     .freezeWith(client);
  //
  // const assocSign = await assocTx.sign(PrivateKey.fromString('302e020100300506032b65700422042021fc09ca40c46b0cf893a7e6279d382ebd5b0ddc2745897de36539551016ace8'));
  // await assocSign.execute(client);
  // console.log('Account associated to WHBAR and SAUCE.')


  // const whbar = await hre.ethers.getContractAt([ {
  //   "inputs": [],
  //   "name": "deposit",
  //   "outputs": [],
  //   "stateMutability": "payable",
  //   "type": "function"
  // }], '0x0000000000000000000000000000000000026909', wallet);
  // console.log(await whbar.deposit({ value: '100999990000000000000', gasLimit: 5000000}));


  // const factory = await hre.ethers.getContractAt([ {
  //   "inputs": [
  //     {
  //       "internalType": "address",
  //       "name": "tokenA",
  //       "type": "address"
  //     },
  //     {
  //       "internalType": "address",
  //       "name": "tokenB",
  //       "type": "address"
  //     }
  //   ],
  //   "name": "getPair",
  //   "outputs": [
  //     {
  //       "internalType": "address",
  //       "name": "pair",
  //       "type": "address"
  //     }
  //   ],
  //   "stateMutability": "view",
  //   "type": "function",
  // }, {
  //   "inputs": [
  //     {
  //       "internalType": "address",
  //       "name": "tokenA",
  //       "type": "address"
  //     },
  //     {
  //       "internalType": "address",
  //       "name": "tokenB",
  //       "type": "address"
  //     }
  //   ],
  //   "name": "getPairContract",
  //   "outputs": [
  //     {
  //       "internalType": "address",
  //       "name": "pair",
  //       "type": "address"
  //     }
  //   ],
  //   "stateMutability": "view",
  //   "type": "function",
  // }, {
  //     "inputs": [],
  //     "name": "allPairsLength",
  //     "outputs": [
  //       {
  //         "internalType": "uint256",
  //         "name": "",
  //         "type": "uint256"
  //       }
  //     ],
  //     "stateMutability": "view",
  //     "type": "function"
  // }], '0x0000000000000000000000000000000000070297', wallet);
  // console.log(await factory.allPairsLength());
  // console.log(await factory.getPairContract('0x000000000000000000000000000000000002690a', '0x00000000000000000000000000000000000274a3'));
  // console.log(await factory.getPairContract('0x000000000000000000000000000000000002690a', '0x0000000000000000000000000000000000070293'));


  // const saucerSwapV2 = await hre.ethers.getContractAt("SaucerSwapV2Oracle", address.saucerSwapV2Address, wallet);
  // console.log(await saucerSwapV2.getRate('0x000000000000000000000000000000000000e6a2', '0x000000000000000000000000000000000000ef52','0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF'));

  const oracle = await hre.ethers.getContractAt(name, address, wallet);
  return oracle.getRate(tokenA, tokenB, connector);
};

