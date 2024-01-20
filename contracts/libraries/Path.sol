// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

library Path {
    function getFirstAddress(bytes memory path) internal pure returns (IERC20 addressOutput) {
        require(path.length >= 20, "Input data is too short");
        assembly {
            addressOutput := mload(add(path, 20))
        }
    }

    function getLastAddress(bytes memory path) internal pure returns (IERC20 addressOutput) {
        require(path.length >= 20, "Input data is too short");
        assembly {
            addressOutput := mload(add(add(path, sub(mload(path), 20)), 20))
        }
    }
}