// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockStablecoin is ERC20 {
    constructor() ERC20("MockUSD", "mUSD") {
        // Mint 1,000,000 tokens with 18 decimals to deployer (issuer)
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }
}
