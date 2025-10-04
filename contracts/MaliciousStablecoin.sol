// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice ERC20 token that attempts reentrancy during transferFrom
contract MaliciousStablecoin is ERC20 {
    address public victim;   // target AnnuityToken
    address public attacker; // attacker account

    constructor() ERC20("Malicious", "MAL") {}

    function setVictim(address _victim) external {
        victim = _victim;
    }

    function setAttacker(address _attacker) external {
        attacker = _attacker;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /// @notice Override transferFrom to attempt reentrancy
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        bool ok = super.transferFrom(from, to, amount);

        if (victim != address(0) && attacker != address(0)) {
            // Attempt to call acceptAndIssue while transferFrom is executing
            (bool success, ) = victim.call(
                abi.encodeWithSignature("acceptAndIssue(address)", attacker)
            );
            success; // ignore revert to let transferFrom succeed
        }

        return ok;
    }
}