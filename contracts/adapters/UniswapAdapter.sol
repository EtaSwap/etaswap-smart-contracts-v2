// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IUniswapV2Router02.sol";
import "../interfaces/IAdapter.sol";

contract UniswapAdapter is Ownable, IAdapter {
    using SafeERC20 for IERC20;
    using Address for address;
    using Address for address payable;

    IUniswapV2Router02 public immutable Router;
    address payable public immutable FeeWallet;
    uint256 public FeePromille;

    constructor(address payable feeWallet, IUniswapV2Router02 router, uint256 feePromille) public {
        FeeWallet = feeWallet;
        Router = router;
        FeePromille = feePromille;
    }

    function setFeePromille(uint256 feePromille) external onlyOwner {
        FeePromille = feePromille;
    }

    /**
     * @dev Performs a swap
     * @param recipient The original msg.sender performing the swap
     * @param tokenFrom Token to be swapped
     * @param tokenTo Token to be received
     * @param amountFrom Amount of tokenFrom to swap
     * @param amountTo Minimum amount of tokenTo to receive
     * @param deadline Timestamp at which the swap becomes invalid. Used by Uniswap
     */
    function swap(
        address recipient,
        IERC20 tokenFrom,
        IERC20 tokenTo,
        uint256 amountFrom,
        uint256 amountTo,
        uint256 deadline,
        bool feeOnTransfer
    ) external {
        require(tokenFrom != tokenTo, "TOKEN_PAIR_INVALID");

        uint256 fee = amountFrom * FeePromille / 1000;
        _transfer(tokenFrom, fee, FeeWallet);

        address[] memory path = new address[](2);
        path[0] = address(tokenFrom);
        path[1] = address(tokenTo);

        uint256 amountFromWithoutFee = amountFrom - fee;
        _approveSpender(tokenFrom, address(Router), amountFromWithoutFee);
        if (feeOnTransfer) {
            uint[] memory amounts = Router.swapTokensForExactTokens(
                amountTo,
                amountFromWithoutFee,
                path,
                recipient,
                deadline
            );
            uint256 change = amountFromWithoutFee - amounts[0];
            _transfer(tokenFrom, change, recipient);
        } else {
            Router.swapExactTokensForTokens(
                amountFromWithoutFee,
                amountTo,
                path,
                recipient,
                deadline
            );
        }
    }

    /**
     * @dev Transfers token to sender if amount > 0
     * @param token IERC20 token to transfer to sender
     * @param amount Amount of token to transfer
     * @param recipient Address that will receive the tokens
     */
    function _transfer(
        IERC20 token,
        uint256 amount,
        address recipient
    ) internal {
        if (amount > 0) {
            token.safeTransfer(recipient, amount);
        }
    }

    // https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/SafeERC20.sol
    /**
     * @dev Approves max amount of token to the spender if the allowance is lower than amount
     * @param token The ERC20 token to approve
     * @param spender Address to which funds will be approved
     * @param amount Amount used to compare current allowance
     */
    function _approveSpender(
        IERC20 token,
        address spender,
        uint256 amount
    ) internal {
        // If allowance is not enough, approve amount
        uint256 allowance = token.allowance(address(this), spender);
        if (allowance < amount) {
            token.approve(spender, amount);
        }
    }
}