// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "./OracleBase.sol";
import "../interfaces/IUniswapV2Pair.sol";
import "../interfaces/IUniswapV2Factory.sol";

contract SaucerSwapV2Oracle is OracleBase {
    address public immutable factory;
    IERC20 private constant _NONE = IERC20(0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF);

    constructor(address _factory) {
        factory = _factory;
    }

    function _pairFor(IERC20 tokenA, IERC20 tokenB) private view returns (address pair) {
        pair = address(IUniswapV2Factory(factory).getPair(address(tokenA), address(tokenB)));
    }

    function _getBalances(IERC20 srcToken, IERC20 dstToken) internal view override returns (uint256 srcBalance, uint256 dstBalance) {
        (IERC20 token0, IERC20 token1) = srcToken < dstToken ? (srcToken, dstToken) : (dstToken, srcToken);
        address pair = _pairFor(token0, token1);
        if (pair.code.length == 0) {
            return (0, 0);
        }
        (uint256 reserve0, uint256 reserve1,) = IUniswapV2Pair(pair).getReserves();
        (srcBalance, dstBalance) = srcToken == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }
}
