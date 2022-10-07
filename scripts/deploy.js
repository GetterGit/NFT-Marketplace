// Importing the ethers library and hre from hardhat
const { ethers } = require("hardhat");
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  // Assign the deployer to be the first address in the signers array
  const [deployer] = await ethers.getSigners();
  const balance = await deployer.getBalance();
  // Creating a contract object
  const Marketplace = await hre.ethers.getContractFactory("NFTMarketplace");
  const marketplace = await Marketplace.deploy();

  await marketplace.deployed();

  const data = {
    address: marketplace.address,
    abi: JSON.parse(marketplace.interface.format("json")),
  };

  //This writes the ABI and address to the mktplace.json
  fs.writeFileSync("./src/Marketplace.json", JSON.stringify(data));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
