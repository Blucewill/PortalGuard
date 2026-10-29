const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

// Deployed addresses are saved per network, so a failed run can be resumed
// without paying again for contracts that are already on-chain.
const SAVE_FILE = path.join(__dirname, "..", "deployments", `${network.name}.json`);

function load() {
  return fs.existsSync(SAVE_FILE) ? JSON.parse(fs.readFileSync(SAVE_FILE, "utf8")) : {};
}

function save(deployed) {
  fs.mkdirSync(path.dirname(SAVE_FILE), { recursive: true });
  fs.writeFileSync(SAVE_FILE, JSON.stringify(deployed, null, 2) + "\n");
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer))} POT\n`);

  const deployed = network.name === "hardhat" ? {} : load();

  async function deployOnce(key, name, args) {
    if (deployed[key]) {
      console.log(`${name.padEnd(16)} ${deployed[key].address} (already deployed)`);
      return deployed[key].address;
    }
    const contract = await ethers.deployContract(name, args);
    await contract.waitForDeployment();
    deployed[key] = { address: await contract.getAddress(), tx: contract.deploymentTransaction().hash };
    if (network.name !== "hardhat") save(deployed);
    console.log(`${name.padEnd(16)} ${deployed[key].address}`);
    console.log(`  tx: ${deployed[key].tx}`);
    return deployed[key].address;
  }

  const registry = await deployOnce("drainerRegistry", "DrainerRegistry", [deployer.address]);
  const guard = await deployOnce("safeApprove", "SafeApprove", [registry]);
  const token = await deployOnce("demoToken", "MockToken", []);
  // Demo only: the drainer sends what it takes to the deployer, our "attacker" wallet.
  const drainer = await deployOnce("demoDrainer", "DemoDrainer", [deployer.address]);

  console.log("\nPaste into web/src/config.js:");
  console.log(`export const CONTRACTS = {
  drainerRegistry: "${registry}",
  safeApprove: "${guard}",
  demoToken: "${token}",
  demoDrainer: "${drainer}",
};`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
