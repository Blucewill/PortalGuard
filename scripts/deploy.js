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
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
