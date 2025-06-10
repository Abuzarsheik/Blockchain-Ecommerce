const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting Blocmerce Smart Contract Deployment to Testnet...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  // Check deployer balance
  const balance = await deployer.getBalance();
  console.log("💰 Account balance:", ethers.utils.formatEther(balance), "ETH\n");

  if (balance.lt(ethers.utils.parseEther("0.01"))) {
    console.log("⚠️  Warning: Low balance. Consider adding more testnet ETH from faucet");
  }

  // Deploy EscrowFactory first
  console.log("📦 Deploying EscrowFactory...");
  const EscrowFactory = await ethers.getContractFactory("EscrowFactory");
  const escrowFactory = await EscrowFactory.deploy();
  await escrowFactory.deployed();
  
  console.log("✅ EscrowFactory deployed to:", escrowFactory.address);
  console.log("🔗 Transaction hash:", escrowFactory.deployTransaction.hash);

  // Deploy a sample Escrow contract
  console.log("\n📦 Deploying sample Escrow contract...");
  const Escrow = await ethers.getContractFactory("Escrow");
  
  // Sample parameters for the escrow
  const sampleSeller = "0x742d35Cc6634C0532925a3b8D0Ac33EC61cd5f4e"; // Replace with actual address
  const sampleBuyer = deployer.address;
  const sampleAmount = ethers.utils.parseEther("0.001"); // 0.001 ETH
  const sampleProductHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Sample Product"));
  const sampleDuration = 7 * 24 * 60 * 60; // 7 days in seconds

  const escrow = await Escrow.deploy(
    sampleSeller,
    sampleBuyer, 
    sampleAmount,
    sampleProductHash,
    sampleDuration,
    { value: sampleAmount }
  );
  await escrow.deployed();

  console.log("✅ Sample Escrow deployed to:", escrow.address);
  console.log("🔗 Transaction hash:", escrow.deployTransaction.hash);

  // Verification information
  console.log("\n🎉 Deployment Summary:");
  console.log("========================");
  console.log("🏭 EscrowFactory Address:", escrowFactory.address);
  console.log("🔒 Sample Escrow Address:", escrow.address);
  console.log("🌐 Network:", await ethers.provider.getNetwork());
  
  // Save deployment info
  const deploymentInfo = {
    network: await ethers.provider.getNetwork(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      EscrowFactory: {
        address: escrowFactory.address,
        transactionHash: escrowFactory.deployTransaction.hash
      },
      SampleEscrow: {
        address: escrow.address,
        transactionHash: escrow.deployTransaction.hash,
        parameters: {
          seller: sampleSeller,
          buyer: sampleBuyer,
          amount: ethers.utils.formatEther(sampleAmount),
          duration: sampleDuration
        }
      }
    }
  };

  console.log("\n📋 Contract Verification Commands:");
  console.log("===================================");
  console.log(`npx hardhat verify --network sepolia ${escrowFactory.address}`);
  console.log(`npx hardhat verify --network sepolia ${escrow.address} "${sampleSeller}" "${sampleBuyer}" "${sampleAmount}" "${sampleProductHash}" ${sampleDuration}`);

  console.log("\n🔍 Etherscan Links:");
  console.log("===================");
  const network = await ethers.provider.getNetwork();
  const etherscanBase = network.chainId === 11155111 ? "https://sepolia.etherscan.io" : "https://etherscan.io";
  console.log(`🏭 EscrowFactory: ${etherscanBase}/address/${escrowFactory.address}`);
  console.log(`🔒 Sample Escrow: ${etherscanBase}/address/${escrow.address}`);

  console.log("\n📄 Deployment completed successfully! ✨");
  console.log("Save these addresses for your README.md and frontend configuration.");

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 