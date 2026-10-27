// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {DrainerRegistry} from "./DrainerRegistry.sol";

/// @title SafeApprove
/// @notice Capped, expiring token permissions.
///
///         The usual ERC-20 flow gives an app an unlimited allowance that never
///         expires, which is exactly what wallet drainers exploit. With SafeApprove
///         the user approves this contract once, then grants each app a small,
///         time-limited allowance. Apps pull tokens through this contract, so a
///         malicious app can take at most its cap, only until the expiry, and never
///         if it is flagged in the DrainerRegistry.
contract SafeApprove {
    using SafeERC20 for IERC20;

    struct Grant {
        uint256 amount;   // tokens the spender may still pull
        uint64 expiresAt; // unix timestamp after which the grant is dead
        uint64 epoch;     // owner's epoch when granted; lockdown() bumps it
    }

    struct GrantKey {
        address token;
        address spender;
    }

    DrainerRegistry public immutable registry;

    /// owner => token => spender => grant
    mapping(address => mapping(address => mapping(address => Grant))) public grants;
    /// owner => current epoch. Grants from an older epoch are invalid.
    mapping(address => uint64) public epochOf;

    event Granted(address indexed owner, address indexed token, address indexed spender, uint256 amount, uint64 expiresAt);
    event Revoked(address indexed owner, address indexed token, address indexed spender);
    event Spent(address indexed owner, address indexed token, address indexed spender, address to, uint256 amount);
    event Lockdown(address indexed owner, uint64 newEpoch);

    error ExpiryInPast();
    error SpenderFlagged(address spender);
    error GrantExpired();
    error GrantRevoked();
    error ExceedsAllowance(uint256 requested, uint256 available);

    constructor(DrainerRegistry registry_) {
        registry = registry_;
    }

    /// @notice Let `spender` pull up to `amount` of `token` from you until `expiresAt`.
    ///         Replaces any existing grant for the same token and spender.
    function grant(address token, address spender, uint256 amount, uint64 expiresAt) external {
        if (expiresAt <= block.timestamp) revert ExpiryInPast();
        if (registry.isFlagged(spender)) revert SpenderFlagged(spender);
        grants[msg.sender][token][spender] = Grant(amount, expiresAt, epochOf[msg.sender]);
        emit Granted(msg.sender, token, spender, amount, expiresAt);
    }

    /// @notice Revoke one grant.
    function revoke(address token, address spender) public {
        delete grants[msg.sender][token][spender];
        emit Revoked(msg.sender, token, spender);
    }

    /// @notice Revoke several grants in one transaction.
    function revokeMany(GrantKey[] calldata keys) external {
        for (uint256 i = 0; i < keys.length; i++) {
            revoke(keys[i].token, keys[i].spender);
        }
    }

    /// @notice Panic button: instantly invalidates every grant you have ever made.
    function lockdown() external {
        uint64 newEpoch = ++epochOf[msg.sender];
        emit Lockdown(msg.sender, newEpoch);
    }

    /// @notice How much `spender` can pull right now (0 if expired, revoked or flagged).
    function available(address owner, address token, address spender) external view returns (uint256) {
        Grant memory g = grants[owner][token][spender];
        if (g.epoch != epochOf[owner] || g.expiresAt <= block.timestamp || registry.isFlagged(spender)) {
            return 0;
        }
        return g.amount;
    }

    /// @notice Called by an approved app to move tokens from `owner` to `to`.
    function spend(address owner, address token, address to, uint256 amount) external {
        Grant storage g = grants[owner][token][msg.sender];
        if (g.expiresAt == 0 || g.epoch != epochOf[owner]) revert GrantRevoked();
        if (g.expiresAt <= block.timestamp) revert GrantExpired();
        if (registry.isFlagged(msg.sender)) revert SpenderFlagged(msg.sender);
        if (amount > g.amount) revert ExceedsAllowance(amount, g.amount);

        g.amount -= amount;
        emit Spent(owner, token, msg.sender, to, amount);
        IERC20(token).safeTransferFrom(owner, to, amount);
    }
}
