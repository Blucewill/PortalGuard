const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const ONE_DAY = 24 * 60 * 60;

describe("DemoDrainer", function () {
  async function deploy() {
    const [admin, victim, attacker, anyone] = await ethers.getSigners();

    const registry = await ethers.deployContract("DrainerRegistry", [admin.address]);
    const guard = await ethers.deployContract("SafeApprove", [await registry.getAddress()]);
    const token = await ethers.deployContract("MockToken");
    const drainer = await ethers.deployContract("DemoDrainer", [attacker.address]);

    await token.mint(victim.address, ethers.parseEther("1000"));
    return { admin, victim, attacker, anyone, registry, guard, token, drainer };
  }

  it("takes everything from a wallet that gave an unlimited approval", async function () {
    const { victim, attacker, anyone, token, drainer } = await loadFixture(deploy);
    await token.connect(victim).approve(drainer, ethers.MaxUint256);

    await drainer.connect(anyone).drain(token, victim);

    expect(await token.balanceOf(victim)).to.equal(0);
    expect(await token.balanceOf(attacker)).to.equal(ethers.parseEther("1000"));
  });

  it("gets nothing once the approval is revoked", async function () {
    const { victim, anyone, token, drainer } = await loadFixture(deploy);
    await token.connect(victim).approve(drainer, ethers.MaxUint256);
    await token.connect(victim).approve(drainer, 0);

    await expect(drainer.connect(anyone).drain(token, victim))
      .to.be.revertedWithCustomError(drainer, "NothingToTake");
    expect(await token.balanceOf(victim)).to.equal(ethers.parseEther("1000"));
  });

  it("only gets the capped amount from a SafeApprove user", async function () {
    const { victim, attacker, anyone, guard, token, drainer } = await loadFixture(deploy);
    await token.connect(victim).approve(guard, ethers.MaxUint256);
    await guard.connect(victim).grant(token, drainer, ethers.parseEther("10"), (await time.latest()) + ONE_DAY);

    await drainer.connect(anyone).drainViaSafeApprove(guard, token, victim);

    expect(await token.balanceOf(attacker)).to.equal(ethers.parseEther("10"));
    expect(await token.balanceOf(victim)).to.equal(ethers.parseEther("990"));
    await expect(drainer.connect(anyone).drainViaSafeApprove(guard, token, victim))
      .to.be.revertedWithCustomError(drainer, "NothingToTake");
  });

  it("gets nothing from a SafeApprove user once it is flagged", async function () {
    const { admin, victim, anyone, registry, guard, token, drainer } = await loadFixture(deploy);
    await token.connect(victim).approve(guard, ethers.MaxUint256);
    await guard.connect(victim).grant(token, drainer, ethers.parseEther("10"), (await time.latest()) + ONE_DAY);
    await registry.connect(admin).flag(drainer, "demo drainer");

    await expect(drainer.connect(anyone).drainViaSafeApprove(guard, token, victim))
      .to.be.revertedWithCustomError(drainer, "NothingToTake");
    expect(await token.balanceOf(victim)).to.equal(ethers.parseEther("1000"));
  });
});
