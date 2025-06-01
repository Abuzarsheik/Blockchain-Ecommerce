const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("�� Starting Blocmerce contract deployment...\n");

  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deploying contracts with account: ${deployer.address}`);
  
  // Check balance
  const balance = await deployer.getBalance();
  console.log(`💰 Account balance: ${ethers.utils.formatEther(balance)} ETH\n`);

  if (balance.lt(ethers.utils.parseEther("0.01"))) {
    console.warn("⚠️  Warning: Low balance! You might need more ETH for deployment.\n");
  }

  // Deploy BlocmerceEscrow contract
  console.log("📋 Deploying BlocmerceEscrow contract...");
  
  const BlocmerceEscrow = await ethers.getContractFactory("BlocmerceEscrow");
  
  // Contract constructor parameters
  const platformWallet = deployer.address; // Use deployer as platform wallet for now
  const platformFeeRate = 250; // 2.5% platform fee
  
  console.log(`   Platform Wallet: ${platformWallet}`);
  console.log(`   Platform Fee Rate: ${platformFeeRate / 100}%`);
  
  // Deploy with gas estimation
  const gasEstimate = await BlocmerceEscrow.signer.estimateGas(
    BlocmerceEscrow.getDeployTransaction(platformWallet, platformFeeRate)
  );
  
  console.log(`   Estimated Gas: ${gasEstimate.toString()}`);
  
  const escrow = await BlocmerceEscrow.deploy(platformWallet, platformFeeRate, {
    gasLimit: gasEstimate.mul(120).div(100) // Add 20% buffer
  });

  console.log(`   Transaction Hash: ${escrow.deployTransaction.hash}`);
  console.log("   ⏳ Waiting for deployment confirmation...");

  await escrow.deployed();

  console.log(`✅ BlocmerceEscrow deployed successfully!`);
  console.log(`   Contract Address: ${escrow.address}`);
  console.log(`   Block Number: ${escrow.deployTransaction.blockNumber}\n`);

  // Verify contract on block explorer (if not local network)
  if (network.chainId !== 1337 && network.chainId !== 31337) {
    console.log("🔍 Verifying contract on block explorer...");
    
    try {
      // Wait a bit for the transaction to be indexed
      console.log("   Waiting 30 seconds for transaction indexing...");
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      await hre.run("verify:verify", {
        address: escrow.address,
        constructorArguments: [platformWallet, platformFeeRate],
      });
      
      console.log("✅ Contract verified successfully!\n");
    } catch (error) {
      console.log(`⚠️  Verification failed: ${error.message}\n`);
    }
  }

  // Save deployment information
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    contractAddress: escrow.address,
    deployer: deployer.address,
    platformWallet: platformWallet,
    platformFeeRate: platformFeeRate,
    transactionHash: escrow.deployTransaction.hash,
    blockNumber: escrow.deployTransaction.blockNumber,
    gasUsed: escrow.deployTransaction.gasLimit?.toString(),
    timestamp: new Date().toISOString(),
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info to file
  const deploymentFile = path.join(deploymentsDir, `${network.name}-deployment.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`📄 Deployment info saved to: ${deploymentFile}`);

  // Generate environment variables
  console.log("\n📝 Environment Variables:");
  console.log("Add these to your .env file:");
  console.log("=" .repeat(50));
  console.log(`${network.name.toUpperCase()}_ESCROW_CONTRACT=${escrow.address}`);
  console.log(`ESCROW_CONTRACT_ADDRESS=${escrow.address}`);
  console.log("=" .repeat(50));

  // Display contract interaction examples
  console.log("\n🔧 Contract Interaction Examples:");
  console.log("=" .repeat(50));
  console.log("// JavaScript/TypeScript");
  console.log(`const escrowAddress = "${escrow.address}";`);
  console.log("const escrowContract = new ethers.Contract(escrowAddress, escrowABI, signer);");
  console.log("");
  console.log("// Create escrow");
  console.log("await escrowContract.createEscrow(");
  console.log("  sellerAddress,");
  console.log("  deliveryDeadline,");
  console.log("  disputeDeadline,");
  console.log("  productHash,");
  console.log("  autoRelease,");
  console.log("  { value: ethers.utils.parseEther('0.1') }");
  console.log(");");
  console.log("=" .repeat(50));

  console.log("\n🎉 Deployment completed successfully!");
  console.log(`Visit block explorer to view contract: https://${getBlockExplorerUrl(network.chainId)}/address/${escrow.address}`);
}

function getBlockExplorerUrl(chainId) {
  switch (chainId) {
    case 1: return "etherscan.io";
    case 5: return "goerli.etherscan.io";
    case 11155111: return "sepolia.etherscan.io";
    case 137: return "polygonscan.com";
    case 80001: return "mumbai.polygonscan.com";
    case 56: return "bscscan.com";
    case 97: return "testnet.bscscan.com";
    default: return "etherscan.io";
  }
}

// Error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  }); 