// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeApprove} from "../SafeApprove.sol";

/// @title DemoDrainer
/// @notice FOR THE PORTALGUARD DEMO ONLY. Reproduces how a wallet drainer abuses
///         token approvals so PortalGuard's protection can be shown on testnet.
///         It refuses to deploy on any chain except Portaldot testnet and a local
///         Hardhat node, and it can only take tokens from wallets that approved it.
contract DemoDrainer {
    using SafeERC20 for IERC20;

    uint256 private constant PORTALDOT_TESTNET = 420420777;
    uint256 private constant HARDHAT = 31337;

    /// Where drained test tokens go (the demo's "attacker" wallet).
    address public immutable collector;

    event Drained(address indexed victim, address indexed token, uint256 amount, bool viaSafeApprove);

    error TestnetOnly();
    error NothingToTake();

    constructor(address collector_) {
        if (block.chainid != PORTALDOT_TESTNET && block.chainid != HARDHAT) revert TestnetOnly();
        collector = collector_;
    }

    /// @notice How much a classic drainer could take from `victim` right now:
    ///         the smaller of their balance and the allowance they gave this contract.
    function takeable(IERC20 token, address victim) public view returns (uint256) {
        uint256 allowance = token.allowance(victim, address(this));
        uint256 balance = token.balanceOf(victim);
        return allowance < balance ? allowance : balance;
    }

    /// @notice The attack: pull everything the victim's approval allows.
    function drain(IERC20 token, address victim) external returns (uint256 amount) {
        amount = takeable(token, victim);
        if (amount == 0) revert NothingToTake();
        token.safeTransferFrom(victim, collector, amount);
        emit Drained(victim, address(token), amount, false);
    }

    /// @notice The same attack against a victim who uses SafeApprove: it can only get
    ///         what the victim's capped, expiring grant allows (and nothing once flagged).
    function drainViaSafeApprove(SafeApprove guard, IERC20 token, address victim) external returns (uint256 amount) {
        amount = guard.available(victim, address(token), address(this));
        uint256 balance = token.balanceOf(victim);
        if (balance < amount) amount = balance;
        if (amount == 0) revert NothingToTake();
        guard.spend(victim, address(token), collector, amount);
        emit Drained(victim, address(token), amount, true);
    }
}
