const { ethers, network } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer))} POT\n`);

  const registry = await ethers.deployContract("DrainerRegistry", [deployer.address]);
  await registry.waitForDeployment();
  console.log(`DrainerRegistry: ${await registry.getAddress()}`);
  console.log(`  tx: ${registry.deploymentTransaction().hash}`);

  const guard = await ethers.deployContract("SafeApprove", [await registry.getAddress()]);
  await guard.waitForDeployment();
  console.log(`SafeApprove:     ${await guard.getAddress()}`);
  console.log(`  tx: ${guard.deploymentTransaction().hash}`);

  const token = await ethers.deployContract("MockToken");
  await token.waitForDeployment();
  console.log(`MockToken:       ${await token.getAddress()}`);
  console.log(`  tx: ${token.deploymentTransaction().hash}`);

  // Demo only: the drainer sends what it takes to the deployer, our "attacker" wallet.
  const drainer = await ethers.deployContract("DemoDrainer", [deployer.address]);
  await drainer.waitForDeployment();
  console.log(`DemoDrainer:     ${await drainer.getAddress()}`);
  console.log(`  tx: ${drainer.deploymentTransaction().hash}`);

  console.log("\nPaste into web/src/config.js:");
  console.log(`export const CONTRACTS = {
  drainerRegistry: "${await registry.getAddress()}",
  safeApprove: "${await guard.getAddress()}",
  demoToken: "${await token.getAddress()}",
  demoDrainer: "${await drainer.getAddress()}",
};`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
