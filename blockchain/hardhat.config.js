import "dotenv/config";
import "@nomicfoundation/hardhat-toolbox";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.19",
    settings: {
      evmVersion: "paris"
    }
  },
  networks: {
    hardhat: {
    },
    amoy: {
      url: process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },
    ganache: {
      url: "http://127.0.0.1:7545",
      chainId: 1337
    }
  }
};
