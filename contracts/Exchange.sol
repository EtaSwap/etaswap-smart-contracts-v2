// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IAdapter.sol";
import "./interfaces/IExchange.sol";
import "./libraries/Path.sol";

/**
 * @title Exchange
 */
contract Exchange is Ownable, Pausable, ReentrancyGuard, IExchange {
    using SafeERC20 for IERC20;
    using Address for address;
    using Address for address payable;

    // Mapping of aggregatorId to aggregator
    mapping(string => address) public adapters;
    mapping(string => bool) public adapterRemoved;

    event AdapterSet(
        string indexed aggregatorId,
        address indexed addr
    );
    event AdapterRemoved(string indexed aggregatorId);
    event Swap(
        string indexed aggregatorId,
        IERC20 indexed tokenFrom,
        IERC20 indexed tokenTo,
        uint256 amountFrom,
        uint256 amountTo,
        address sender
    );

    /**
     * @dev Sets the adapter for an aggregator. It can't be changed later.
     */
    function setAdapter(
        string calldata aggregatorId,
        address addr
    ) external {
        require(addr.code.length > 0, "EtaSwap: ADAPTER_NOT_A_CONTRACT");
        require(!adapterRemoved[aggregatorId], "EtaSwap: ADAPTER_REMOVED");
        require(adapters[aggregatorId] == address(0), "EtaSwap: ADAPTER_EXISTS");

        adapters[aggregatorId] = addr;
        emit AdapterSet(aggregatorId, addr);
    }

    function adapterFee(string calldata aggregatorId) external view returns (uint8 fee) {
        require(adapters[aggregatorId] != address(0), "EtaSwap: ADAPTER_DOES_NOT_EXIST");
        return IAdapter(adapters[aggregatorId]).feePromille();
    }

    /**
     * @dev Removes the adapter for an existing aggregator. This can't be undone.
     */
    function removeAdapter(string calldata aggregatorId) external onlyOwner {
        require(adapters[aggregatorId] != address(0), "EtaSwap: ADAPTER_DOES_NOT_EXIST");
        delete adapters[aggregatorId];
        adapterRemoved[aggregatorId] = true;
        emit AdapterRemoved(aggregatorId);
    }

    /**
     * @dev Performs a swap
     */
    function swap(
        string calldata aggregatorId,
        bytes calldata path,
        uint256 amountFrom,
        uint256 amountTo,
        uint256 deadline,
        bool isTokenFromHBAR,
        bool feeOnTransfer
    ) external payable whenNotPaused nonReentrant {
        require(adapters[aggregatorId] != address(0), "EtaSwap: ADAPTER_DOES_NOT_EXIST");

        _swap(
            aggregatorId,
            path,
            amountFrom,
            amountTo,
            deadline,
            isTokenFromHBAR,
            feeOnTransfer
        );
    }

    /**
     * @dev Performs a transactional split swap
     */
    function splitSwap(
        string[] calldata aggregatorIds,
        bytes[] calldata paths,
        uint256[] calldata amountsFrom,
        uint256[] calldata amountsTo,
        uint256 deadline,
        bool isTokenFromHBAR,
        bool feeOnTransfer
    ) external payable whenNotPaused nonReentrant {
        for (uint8 i = 0; i < aggregatorIds.length; i++) {
            require(adapters[aggregatorIds[i]] != address(0), "EtaSwap: ADAPTER_DOES_NOT_EXIST");
            _swap(
                aggregatorIds[i],
                paths[i],
                amountsFrom[i],
                amountsTo[i],
                deadline,
                isTokenFromHBAR,
                feeOnTransfer
            );
        }
    }


    function pauseSwaps() external onlyOwner {
        _pause();
    }

    function unpauseSwaps() external onlyOwner {
        _unpause();
    }

    function _swap(
        string calldata aggregatorId,
        bytes calldata path,
        uint256 amountFrom,
        uint256 amountTo,
        uint256 deadline,
        bool isTokenFromHBAR,
        bool feeOnTransfer
    ) internal {
        address adapter = adapters[aggregatorId];
        IERC20 tokenFrom = feeOnTransfer ? Path.getLastAddress(path) : Path.getFirstAddress(path);
        IERC20 tokenTo = feeOnTransfer ? Path.getFirstAddress(path) : Path.getLastAddress(path);

        if (!isTokenFromHBAR) {
            tokenFrom.safeTransferFrom(msg.sender, adapter, amountFrom);
        }

        IAdapter(adapter).swap{value: isTokenFromHBAR ? amountFrom : 0}(
            payable(msg.sender),
            path,
            amountFrom,
            amountTo,
            deadline,
            feeOnTransfer
        );

        emit Swap(
            aggregatorId,
            tokenFrom,
            tokenTo,
            amountFrom,
            amountTo,
            msg.sender
        );
    }
}