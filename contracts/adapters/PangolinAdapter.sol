// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IPangolinRouter.sol";
import "../interfaces/IAdapter.sol";
import "../interfaces/IWHBAR.sol";
import "../libraries/Path.sol";

contract PangolinAdapter is Ownable, IAdapter {
    using SafeERC20 for IERC20;
    using Address for address;
    using Address for address payable;

    IPangolinRouter public immutable router;
    address payable public immutable feeWallet;
    uint8 public feePromille;
    IERC20 public whbarToken;
    IWHBAR public whbarContract;

    constructor(address payable _feeWallet, IPangolinRouter _router, uint8 _feePromille, IERC20 _whbarToken, IWHBAR _whbarContract) public {
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
     * @param path Tokens to be swapped in format [IERC20 tokenFrom, IERC20 tokenTo]
     * @param amountFrom Amount of tokenFrom to swap
     * @param amountTo Minimum amount of tokenTo to receive
     * @param deadline Timestamp at which the swap becomes invalid. Used by Uniswap
     */
    function swap(
        address payable recipient,
        bytes calldata path,
        uint256 amountFrom,
        uint256 amountTo,
        uint256 deadline,
        bool feeOnTransfer
    ) external payable {
        address[] memory pathDecode = Path.getAllAddresses(path, feeOnTransfer);
        IERC20 tokenFrom = IERC20(pathDecode[0]);
        IERC20 tokenTo = IERC20(pathDecode[pathDecode.length - 1]);
        require(tokenFrom != tokenTo, "EtaSwap: TOKEN_PAIR_INVALID");

        uint256 fee = (tokenFrom == whbarToken ? msg.value : amountFrom) * feePromille / 1000;
        _transfer(tokenFrom, fee, feeWallet);

        uint256 amountFromWithoutFee = (tokenFrom == whbarToken ? msg.value : amountFrom) - fee;

        uint256[] memory amounts;
        if (feeOnTransfer) {
            if (tokenFrom == whbarToken) {
                amounts = router.swapAVAXForExactTokens{value: amountFromWithoutFee}(
                    amountTo,
                    pathDecode,
                    address(this),
                    deadline
                );
            } else if (tokenTo == whbarToken) {
                // There is bug in pangolin DEX with allowance with function swapTokensForExactAVAX,
                // so we need to do it in 2 steps:
                // 1) swap token to WHBAR
                // 2) burn WHBAR and return to user
                _approveSpender(tokenFrom, address(router), amountFromWithoutFee);
                amounts = router.swapTokensForExactTokens(
                    amountTo,
                    amountFromWithoutFee,
                    pathDecode,
                    address(this),
                    deadline
                );

                _approveSpender(whbarToken, address(whbarContract), amounts[1]);
                whbarContract.withdraw(amounts[1]);
            } else {
                _approveSpender(tokenFrom, address(router), amountFromWithoutFee);
                amounts = router.swapTokensForExactTokens(
                    amountTo,
                    amountFromWithoutFee,
                    pathDecode,
                    address(this),
                    deadline
                );
            }
            _transfer(tokenTo, amounts[amounts.length - 1], recipient);
            _transfer(tokenFrom, amountFromWithoutFee - amounts[0], recipient);
        } else {
            if (tokenFrom == whbarToken) {
                amounts = router.swapExactAVAXForTokens{value: amountFromWithoutFee}(
                    amountTo,
                    pathDecode,
                    address(this),
                    deadline
                );
            } else if (tokenTo == whbarToken) {
                // There is bug in pangolin DEX with allowance with function swapExactTokensForAVAX,
                // so we need to do it in 2 steps:
                // 1) swap token to WHBAR
                // 2) burn WHBAR and return to user
                _approveSpender(tokenFrom, address(router), amountFromWithoutFee);
                amounts = router.swapExactTokensForTokens(
                    amountFromWithoutFee,
                    amountTo,
                    pathDecode,
                    address(this),
                    deadline
                );

                _approveSpender(whbarToken, address(whbarContract), amounts[amounts.length - 1]);
                whbarContract.withdraw(amounts[amounts.length - 1]);
            } else {
                _approveSpender(tokenFrom, address(router), amountFromWithoutFee);
                amounts = router.swapExactTokensForTokens(
                    amountFromWithoutFee,
                    amountTo,
                    pathDecode,
                    address(this),
                    deadline
                );
            }
            _transfer(tokenTo, amounts[amounts.length - 1], recipient);
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
            if (token == whbarToken) {
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