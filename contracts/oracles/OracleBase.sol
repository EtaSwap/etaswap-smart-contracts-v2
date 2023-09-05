// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "../interfaces/IOracle.sol";
import "../libraries/Sqrt.sol";

abstract contract OracleBase is IOracle {
    using Sqrt for uint256;

    function getRate(IERC20 srcToken, IERC20 dstToken) external view override returns (uint256 rate, uint256 weight) {
        uint256 balance0;
        uint256 balance1;
        (balance0, balance1) = _getBalances(srcToken, dstToken);
        weight = (balance0 * balance1).sqrt();

        rate = balance0 != 0 ? balance1 * 1e18 / balance0 : 0;
    }

    function _getBalances(IERC20 srcToken, IERC20 dstToken) internal view virtual returns (uint256 srcBalance, uint256 dstBalance);
}