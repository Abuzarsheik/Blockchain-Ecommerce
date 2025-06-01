require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    // Local development network
    hardhat: {
      chainId: 1337,
      accounts: {
        count: 20,
        accountsBalance: "10000000000000000000000" // 10,000 ETH
      }
    },
    
    // Localhost network (for local testing)
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337
    },
    
    // Ethereum Sepolia Testnet
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
      gasPrice: 20000000000, // 20 gwei
      gas: 5000000
    },
    
    // Polygon Mumbai Testnet
    mumbai: {
      url: process.env.MUMBAI_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80001,
      gasPrice: 20000000000, // 20 gwei
      gas: 5000000
    },
    
    // BSC Testnet
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 97,
      gasPrice: 20000000000, // 20 gwei
      gas: 5000000
    }
  },
  
  // Etherscan verification
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
      bscTestnet: process.env.BSCSCAN_API_KEY || ""
    }
  },
  
  // Gas reporting
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    gasPrice: 20,
    showTimeSpent: true,
    showMethodSig: true
  },
  
  // Paths
  paths: {
    sources: "./contracts",
    tests: "./test/contracts",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  
  // Mocha configuration for contract tests
  mocha: {
    timeout: 40000
  }
}; 