pragma solidity 0.8.19;

interface IWHBAR {
    function deposit() external payable;
    function withdraw(uint) external;
}