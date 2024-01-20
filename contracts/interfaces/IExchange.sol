// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IExchange {
    function setAdapter(string calldata aggregatorId, address addr) external;
    function removeAdapter(string calldata aggregatorId) external;
    function adapterFee(string calldata aggregatorId) external view returns (uint8 fee);

    function swap(
        string calldata aggregatorId,
        bytes calldata path,
        uint256 amountFrom,
        uint256 amountTo,
        uint256 deadline,
        bool isTokenFromHBAR,
        bool feeOnTransfer
    ) external payable;
}