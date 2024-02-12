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

    function getAllAddresses(bytes memory data, bool reverse) internal pure returns (address[] memory) {
        require(data.length % 20 == 0, "Invalid data length");

        uint256 numAddresses = data.length / 20;
        address[] memory addresses = new address[](numAddresses);

//        assembly {
//            let startPos := add(data, 20)
//            for { let i := 0 } lt(i, numAddresses) { i := add(i, 1) } {
//                let addrPos := add(startPos, mul(i, 20))
//                let extractedAddress := mload(addrPos)
//                mstore(add(addresses, mul(add(i, 1), 32)), extractedAddress)
//            }
//        }

        assembly {
            if not(reverse) {
                let startPos := add(data, 20)
                for { let i := 0 } lt(i, numAddresses) { i := add(i, 1) } {
                    let addrPos := add(startPos, mul(i, 20))
                    let extractedAddress := mload(addrPos)
                    mstore(add(addresses, mul(add(i, 1), 32)), extractedAddress)
                }
            }

            if reverse {
                let startPos := add(data, 20)
                for { let i := 0 } lt(i, numAddresses) { i := add(i, 1) } {
                    let addrPos := add(startPos, mul(i, 20))
                    let extractedAddress := mload(addrPos)
                    mstore(add(addresses, mul(sub(numAddresses, i), 32)), extractedAddress)
                }
            }
        }

        return addresses;
    }
}