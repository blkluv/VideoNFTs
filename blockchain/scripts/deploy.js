import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Deploying VideoLicenseNFT contract...");

  const VideoLicenseNFT = await hre.ethers.getContractFactory("VideoLicenseNFT");
  const videoLicenseNFT = await VideoLicenseNFT.deploy();
  await videoLicenseNFT.deployed();
  const contractAddress = videoLicenseNFT.address;
  
  console.log(`VideoLicenseNFT successfully deployed to: ${contractAddress}`);

  // Fetch ABI
  const artifactPath = path.join(__dirname, "../artifacts/contracts/VideoLicenseNFT.sol/VideoLicenseNFT.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abi = artifact.abi;

  // Formatting output
  const outputData = {
    address: contractAddress,
    abi: abi,
    exampleTransactionLogs: []
  };

  const outputPath = path.join(__dirname, "../../frontend/src/contractData.json");
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  
  console.log(`\nDeployment Data (Address, ABI, Logs) saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
