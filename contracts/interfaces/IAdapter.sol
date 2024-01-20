// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAdapter {
    function feePromille() external view returns (uint8);

    function setFeePromille(uint8 _feePromille) external;

    function swap(
        address payable recipient,
        bytes calldata path,
        uint256 amountFrom,
        uint256 amountTo,
        uint256 deadline,
        bool feeOnTransfer
    ) external payable;
}