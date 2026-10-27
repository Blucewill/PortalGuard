// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title DrainerRegistry
/// @notice A public list of addresses known to drain wallets.
///         Anyone can report a suspicious address; the owner (later a set of
///         trusted reviewers) confirms reports by flagging them.
contract DrainerRegistry is Ownable {
    mapping(address => bool) public isFlagged;
    mapping(address => uint256) public reportCount;
    mapping(address => mapping(address => bool)) public hasReported;

    event Reported(address indexed suspect, address indexed reporter, string reason);
    event Flagged(address indexed suspect, string reason);
    event Unflagged(address indexed suspect);

    error AlreadyReported();

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Report an address you believe is a drainer. One report per reporter.
    function report(address suspect, string calldata reason) external {
        if (hasReported[suspect][msg.sender]) revert AlreadyReported();
        hasReported[suspect][msg.sender] = true;
        reportCount[suspect] += 1;
        emit Reported(suspect, msg.sender, reason);
    }

    /// @notice Confirm an address as a drainer. Wallet tools and SafeApprove will block it.
    function flag(address suspect, string calldata reason) external onlyOwner {
        isFlagged[suspect] = true;
        emit Flagged(suspect, reason);
    }

    /// @notice Remove a flag, e.g. after a false report.
    function unflag(address suspect) external onlyOwner {
        isFlagged[suspect] = false;
        emit Unflagged(suspect);
    }
}
