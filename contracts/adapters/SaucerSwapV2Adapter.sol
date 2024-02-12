// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IUniswapV3Router.sol";
import "../interfaces/IAdapter.sol";
import "../interfaces/IWHBAR.sol";
import "../libraries/Path.sol";

contract SaucerSwapV2Adapter is Ownable, IAdapter {
    using SafeERC20 for IERC20;
    using Address for address;
    using Address for address payable;

    IUniswapV3Router public immutable router;
    address payable public immutable feeWallet;
    uint8 public feePromille;
    IERC20 public whbarToken;
    IWHBAR public whbarContract;

    constructor(address payable _feeWallet, IUniswapV3Router _router, uint8 _feePromille, IERC20 _whbarToken, IWHBAR _whbarContract) public {
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
     * @param path Tokens to be swapped in format [IERC20 tokenTo, bytes3 fee, IERC20 tokenIntermediate, bytes3 fee, IERC20 tokenFrom]
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
        IERC20 tokenFrom = feeOnTransfer ? Path.getLastAddress(path) : Path.getFirstAddress(path);
        IERC20 tokenTo = feeOnTransfer ? Path.getFirstAddress(path) : Path.getLastAddress(path);
        require(tokenFrom != tokenTo, "EtaSwap: TOKEN_PAIR_INVALID");

        uint256 fee = (tokenFrom == whbarToken ? msg.value : amountFrom) * feePromille / 1000;
        _transfer(tokenFrom, fee, feeWallet);

        uint256 amountFromWithoutFee = (tokenFrom == whbarToken ? msg.value : amountFrom) - fee;

        if (feeOnTransfer) {
            uint256 amountSpent = 0;
            IUniswapV3Router.ExactOutputParams memory routerInput = IUniswapV3Router.ExactOutputParams({
                path: path,
                recipient: tokenTo == whbarToken ? address(router) : address(this),
                deadline: deadline,
                amountOut: amountTo,
                amountInMaximum: amountFromWithoutFee
            });
            if (tokenFrom == whbarToken) {
                amountSpent = router.exactOutput{value: amountFromWithoutFee}(routerInput);
                router.refundETH();
            } else if (tokenTo == whbarToken) {
                _approveSpender(tokenFrom, address(router), amountFromWithoutFee);
                amountSpent = router.exactOutput(routerInput);
                router.unwrapWHBAR(amountTo, address(this));
            } else {
                _approveSpender(tokenFrom, address(router), amountFromWithoutFee);
                amountSpent = router.exactOutput(routerInput);
            }
            _transfer(tokenTo, amountTo, recipient);
            _transfer(tokenFrom, amountFromWithoutFee - amountSpent, recipient);
        } else {
            uint256 amountToReturn = 0;
            IUniswapV3Router.ExactInputParams memory routerInput = IUniswapV3Router.ExactInputParams({
                path: path,
                recipient: tokenTo == whbarToken ? address(router) : address(this),
                deadline: deadline,
                amountIn: amountFromWithoutFee,
                amountOutMinimum: amountTo
            });
            if (tokenFrom == whbarToken) {
                amountToReturn = router.exactInput{value: amountFromWithoutFee}(routerInput);
            } else if (tokenTo == whbarToken) {
                _approveSpender(tokenFrom, address(router), amountFromWithoutFee);
                amountToReturn = router.exactInput(routerInput);
                router.unwrapWHBAR(amountToReturn, address(this));
            } else {
                _approveSpender(tokenFrom, address(router), amountFromWithoutFee);
                amountToReturn = router.exactInput(routerInput);
            }
            require(amountToReturn >= amountTo);
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