require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { PRIVATE_KEY } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // "paris" avoids newer opcodes (PUSH0, MCOPY) for maximum compatibility
      // with Portaldot's EVM.
      evmVersion: "paris",
    },
  },
  networks: {
    portaldot: {
      url: "https://test-evm-rpc-v3.portaldot.dev",
      chainId: 420420777,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};
