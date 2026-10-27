const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const ONE_DAY = 24 * 60 * 60;

describe("SafeApprove", function () {
  async function deploy() {
    const [admin, user, app, drainer, receiver] = await ethers.getSigners();

    const registry = await ethers.deployContract("DrainerRegistry", [admin.address]);
    const guard = await ethers.deployContract("SafeApprove", [await registry.getAddress()]);
    const token = await ethers.deployContract("MockToken");

    // The user holds 1,000 tUSD and approves SafeApprove once.
    await token.mint(user.address, ethers.parseEther("1000"));
    await token.connect(user).approve(await guard.getAddress(), ethers.MaxUint256);

    const expiry = (await time.latest()) + ONE_DAY;
    return { admin, user, app, drainer, receiver, registry, guard, token, expiry };
  }

  it("lets an app spend within its cap", async function () {
    const { user, app, receiver, guard, token, expiry } = await loadFixture(deploy);
    await guard.connect(user).grant(token, app, ethers.parseEther("50"), expiry);

    await guard.connect(app).spend(user, token, receiver, ethers.parseEther("30"));

    expect(await token.balanceOf(receiver)).to.equal(ethers.parseEther("30"));
    expect(await guard.available(user, token, app)).to.equal(ethers.parseEther("20"));
  });

  it("blocks spending above the cap", async function () {
    const { user, app, receiver, guard, token, expiry } = await loadFixture(deploy);
    await guard.connect(user).grant(token, app, ethers.parseEther("50"), expiry);

    await expect(guard.connect(app).spend(user, token, receiver, ethers.parseEther("51")))
      .to.be.revertedWithCustomError(guard, "ExceedsAllowance");
  });

  it("blocks spending after the grant expires", async function () {
    const { user, app, receiver, guard, token, expiry } = await loadFixture(deploy);
    await guard.connect(user).grant(token, app, ethers.parseEther("50"), expiry);

    await time.increaseTo(expiry + 1);

    await expect(guard.connect(app).spend(user, token, receiver, 1))
      .to.be.revertedWithCustomError(guard, "GrantExpired");
    expect(await guard.available(user, token, app)).to.equal(0);
  });

  it("blocks apps that were never granted anything", async function () {
    const { user, drainer, guard, token } = await loadFixture(deploy);
    await expect(guard.connect(drainer).spend(user, token, drainer, 1))
      .to.be.revertedWithCustomError(guard, "GrantRevoked");
  });

  it("revokes one or many grants", async function () {
    const { user, app, drainer, receiver, guard, token, expiry } = await loadFixture(deploy);
    await guard.connect(user).grant(token, app, 100, expiry);
    await guard.connect(user).grant(token, drainer, 100, expiry);

    await guard.connect(user).revokeMany([
      { token: await token.getAddress(), spender: app.address },
      { token: await token.getAddress(), spender: drainer.address },
    ]);

    await expect(guard.connect(app).spend(user, token, receiver, 1))
      .to.be.revertedWithCustomError(guard, "GrantRevoked");
    await expect(guard.connect(drainer).spend(user, token, receiver, 1))
      .to.be.revertedWithCustomError(guard, "GrantRevoked");
  });

  it("lockdown kills every grant at once", async function () {
    const { user, app, receiver, guard, token, expiry } = await loadFixture(deploy);
    await guard.connect(user).grant(token, app, 100, expiry);

    await guard.connect(user).lockdown();

    await expect(guard.connect(app).spend(user, token, receiver, 1))
      .to.be.revertedWithCustomError(guard, "GrantRevoked");

    // New grants after a lockdown work again.
    await guard.connect(user).grant(token, app, 100, expiry);
    await guard.connect(app).spend(user, token, receiver, 1);
  });

  it("refuses to grant to, or pay, a flagged drainer", async function () {
    const { admin, user, drainer, guard, registry, token, expiry } = await loadFixture(deploy);
    await guard.connect(user).grant(token, drainer, 100, expiry);

    await registry.connect(admin).flag(drainer, "fake airdrop site");

    await expect(guard.connect(drainer).spend(user, token, drainer, 1))
      .to.be.revertedWithCustomError(guard, "SpenderFlagged");
    await expect(guard.connect(user).grant(token, drainer, 100, expiry))
      .to.be.revertedWithCustomError(guard, "SpenderFlagged");
    expect(await guard.available(user, token, drainer)).to.equal(0);
  });

  it("rejects grants that are already expired", async function () {
    const { user, app, guard, token } = await loadFixture(deploy);
    const past = (await time.latest()) - 1;
    await expect(guard.connect(user).grant(token, app, 100, past))
      .to.be.revertedWithCustomError(guard, "ExpiryInPast");
  });
});

describe("DrainerRegistry", function () {
  async function deploy() {
    const [admin, alice, bob, suspect] = await ethers.getSigners();
    const registry = await ethers.deployContract("DrainerRegistry", [admin.address]);
    return { admin, alice, bob, suspect, registry };
  }

  it("counts one report per reporter", async function () {
    const { alice, bob, suspect, registry } = await loadFixture(deploy);
    await registry.connect(alice).report(suspect, "stole my NFT");
    await registry.connect(bob).report(suspect, "phishing link");

    expect(await registry.reportCount(suspect)).to.equal(2);
    await expect(registry.connect(alice).report(suspect, "again"))
      .to.be.revertedWithCustomError(registry, "AlreadyReported");
  });

  it("only the owner can flag", async function () {
    const { alice, suspect, registry } = await loadFixture(deploy);
    await expect(registry.connect(alice).flag(suspect, "x"))
      .to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
  });
});
