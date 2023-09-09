// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IOracle {
    function getRate(IERC20 srcToken, IERC20 dstToken) external view returns (uint256 rate, uint256 weight);
}