// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAdapter {
    function feePromille() external view returns (uint256);

    function setFeePromille(uint256 _feePromille) external;

    function swap(
        address payable recipient,
        IERC20 tokenFrom,
        IERC20 tokenTo,
        uint256 amountFrom,
        uint256 amountTo,
        uint256 deadline,
        bool feeOnTransfer
    ) external payable;
}