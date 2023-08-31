// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IPangolinRouter.sol";
import "../interfaces/IAdapter.sol";
import '../libraries/TransferHelper.sol';

contract PangolinAdapter is Ownable, IAdapter {
    using SafeERC20 for IERC20;
    using Address for address;
    using Address for address payable;

    IPangolinRouter public immutable router;
    address payable public immutable feeWallet;
    uint256 public feePromille;
    IERC20 private constant hbar = IERC20(0x0000000000000000000000000000000000000000);
    IERC20 public whbar;

    constructor(address payable _feeWallet, IPangolinRouter _router, uint256 _feePromille, IERC20 _whbar) public {
        feeWallet = _feeWallet;
        router = _router;
        feePromille = _feePromille;
        whbar = _whbar;
    }

    function setFeePromille(uint256 _feePromille) external onlyOwner {
        feePromille = _feePromille;
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
        address payable recipient,
        IERC20 tokenFrom,
        IERC20 tokenTo,
        uint256 amountFrom,
        uint256 amountTo,
        uint256 deadline,
        bool feeOnTransfer
    ) external payable {
        require(tokenFrom != tokenTo, "TOKEN_PAIR_INVALID");

        uint256 fee = (tokenFrom == hbar ? msg.value : amountFrom) * feePromille / 1000;
        _transfer(tokenFrom, fee, feeWallet);

        address[] memory path = new address[](2);
        path[0] = address(tokenFrom == hbar ? whbar : tokenFrom);
        path[1] = address(tokenTo == hbar ? whbar : tokenTo);

        uint256 amountFromWithoutFee = amountFrom - fee;
        uint256 tokenToReturn = 0;
        if (feeOnTransfer) {
            if (tokenFrom == hbar) {
                uint[] memory amounts = router.swapAVAXForExactTokens{value: msg.value - fee}(
                    amountTo,
                    path,
                    address(this),
                    deadline
                );
                uint256 change = msg.value - amounts[0];
                _transfer(tokenFrom, change, recipient);
            } else if (tokenTo == hbar) {
                _approveSpender(tokenFrom, address(router), amountFromWithoutFee);
                uint[] memory amounts = router.swapTokensForExactAVAX(
                    amountTo,
                    amountFromWithoutFee,
                    path,
                    address(this),
                    deadline
                );
                uint256 change = amountFromWithoutFee - amounts[0];
                _transfer(tokenFrom, change, recipient);
            } else {
                _approveSpender(tokenFrom, address(router), amountFromWithoutFee);
                uint[] memory amounts = router.swapTokensForExactTokens(
                    amountTo,
                    amountFromWithoutFee,
                    path,
                    address(this),
                    deadline
                );
                uint256 change = amountFromWithoutFee - amounts[0];
                _transfer(tokenFrom, change, recipient);
            }
        } else {
            if (tokenFrom == hbar) {
                uint256 balanceToBefore = tokenTo.balanceOf(address(this));
                uint[] memory amounts = router.swapExactAVAXForTokens{value: msg.value - fee}(
                    amountTo,
                    path,
                    address(this),
                    deadline
                );
                uint256 balanceToAfter = tokenTo.balanceOf(address(this));
                require(balanceToAfter - amounts[1] == balanceToBefore, 'EtaSwap: incorrect amount from exchange');
                require(amounts[1] >= amountTo, 'EtaSwap: low amount from exchange');
                tokenToReturn = amounts[1];
            } else if (tokenTo == hbar) {
                _approveSpender(tokenFrom, address(router), amountFromWithoutFee);
                router.swapExactTokensForAVAX(
                    amountFromWithoutFee,
                    amountTo,
                    path,
                    address(this),
                    deadline
                );
            } else {
                _approveSpender(tokenFrom, address(router), amountFromWithoutFee);
                router.swapExactTokensForTokens(
                    amountFromWithoutFee,
                    amountTo,
                    path,
                    address(this),
                    deadline
                );
            }
        }

        _transfer(tokenTo, tokenToReturn, recipient);
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
        address payable recipient
    ) internal {
        if (amount > 0) {
            if (token == hbar) {
                //TODO: check only success response code https://github.com/saucerswaplabs/saucerswaplabs-core/blob/master/contracts/hedera/HederaResponseCodes.sol
                require(recipient.send(amount), "Failed to send Hbar");
            } else {
                token.safeTransfer(recipient, amount);
            }
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