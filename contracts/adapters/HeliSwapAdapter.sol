// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IHeliSwapRouter.sol";
import "../interfaces/IAdapter.sol";
import "../interfaces/IWHBAR.sol";

contract HeliSwapAdapter is Ownable, IAdapter {
    using SafeERC20 for IERC20;
    using Address for address;
    using Address for address payable;

    IHeliSwapRouter public immutable router;
    address payable public immutable feeWallet;
    uint8 public feePromille;
    IERC20 private constant hbar = IERC20(0x0000000000000000000000000000000000000000);
    IERC20 public whbarToken;
    IWHBAR public whbarContract;

    constructor(address payable _feeWallet, IHeliSwapRouter _router, uint8 _feePromille, IERC20 _whbarToken, IWHBAR _whbarContract) public {
        feeWallet = _feeWallet;
        router = _router;
        feePromille = _feePromille;
        whbarToken = _whbarToken;
        whbarContract = _whbarContract;
    }

    function setFeePromille(uint8 _feePromille) external onlyOwner {
        feePromille = _feePromille;
    }

    /**
     * @dev Performs a swap
     * @param recipient The original msg.sender performing the swap
     * @param tokenFrom Token to be swapped
     * @param pathEncode Tokens to be swapped in format [IERC20 tokenFrom, IERC20 tokenTo]
     * @param amountFrom Amount of tokenFrom to swap
     * @param amountTo Minimum amount of tokenTo to receive
     * @param deadline Timestamp at which the swap becomes invalid. Used by Uniswap
     */
    function swap(
        address payable recipient,
        IERC20 tokenFrom,
        bytes calldata pathEncode,
        uint256 amountFrom,
        uint256 amountTo,
        uint256 deadline,
        bool feeOnTransfer
    ) external payable {
        (, IERC20 tokenTo) = abi.decode(pathEncode, (IERC20, IERC20));
        require(tokenFrom != tokenTo, "EtaSwap: TOKEN_PAIR_INVALID");

        uint256 fee = (tokenFrom == hbar ? msg.value : amountFrom) * feePromille / 1000;
        _transfer(tokenFrom, fee, feeWallet);

        address[] memory path = new address[](2);
        path[0] = address(tokenFrom == hbar ? whbarToken : tokenFrom);
        path[1] = address(tokenTo == hbar ? whbarToken : tokenTo);

        uint256 amountFromWithoutFee = (tokenFrom == hbar ? msg.value : amountFrom) - fee;

        if (feeOnTransfer) {
            if (tokenFrom == hbar) {
                 uint[] memory amounts = router.swapHBARForExactTokens{value: amountFromWithoutFee}(
                    amountTo,
                    path,
                    address(this),
                    deadline
                );
                _transfer(tokenTo, amounts[1], recipient);
                _transfer(tokenFrom, amountFromWithoutFee - amounts[0], recipient);
            } else if (tokenTo == hbar) {
                _approveSpender(tokenFrom, address(router), amountFromWithoutFee);
                uint[] memory amounts = router.swapTokensForExactHBAR(
                    amountTo,
                    amountFromWithoutFee,
                    path,
                    address(this),
                    deadline
                );
                _transfer(tokenTo, amounts[1], recipient);
                _transfer(tokenFrom, amountFromWithoutFee - amounts[0], recipient);
            } else {
                _approveSpender(tokenFrom, address(router), amountFromWithoutFee);
                uint[] memory amounts = router.swapTokensForExactTokens(
                    amountTo,
                    amountFromWithoutFee,
                    path,
                    address(this),
                    deadline
                );
                _transfer(tokenTo, amounts[1], recipient);
                _transfer(tokenFrom, amountFromWithoutFee - amounts[0], recipient);
            }
        } else {
            uint256 amountToReturn = 0;
            if (tokenFrom == hbar) {
                amountToReturn = router.swapExactHBARForTokens{value: amountFromWithoutFee}(
                    amountTo,
                    path,
                    address(this),
                    deadline
                )[1];
            } else if (tokenTo == hbar) {
                _approveSpender(tokenFrom, address(router), amountFromWithoutFee);
                amountToReturn = router.swapExactTokensForHBAR(
                    amountFromWithoutFee,
                    amountTo,
                    path,
                    address(this),
                    deadline
                )[1];
            } else {
                _approveSpender(tokenFrom, address(router), amountFromWithoutFee);
                amountToReturn = router.swapExactTokensForTokens(
                    amountFromWithoutFee,
                    amountTo,
                    path,
                    address(this),
                    deadline
                )[1];
            }
            _transfer(tokenTo, amountToReturn, recipient);
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
        address payable recipient
    ) internal {
        if (amount > 0) {
            if (token == hbar) {
                (bool success,) = recipient.call{value:amount}(new bytes(0));
                require(success, 'EtaSwap: HBAR_TRANSFER_FAILED');
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

    receive() external payable {}

    fallback() external payable {}
}