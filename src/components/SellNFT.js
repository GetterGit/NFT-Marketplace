import Navbar from "./Navbar";
import { useState } from "react";
import { uploadFileToIPFS, uploadJSONToIPFS } from "../pinata";
import Marketplace from "../Marketplace.json";
import { useLocation } from "react-router";

export default function SellNFT() {
  const [formParams, updateFormParams] = useState({
    name: "",
    description: "",
    price: "",
  });
  const [fileURL, setFileURL] = useState(null);
  const ethers = require("ethers");
  const [message, updateMessage] = useState("");
  const location = useLocation();

  async function OnChangeFile(e) {
    // Taking the first out of uploaded files
    var file = e.target.files[0];

    // Trying to upload the file to IPFS
    try {
      const response = await uploadFileToIPFS(file);
      if (response.success === true) {
        console.log("Uploaded image to Pinata: ", response.pinataURL);
        // Updating the fileURL var's state
        setFileURL(response.pinataURL);
      }
    } catch (e) {
      console.log("Error during file upload:", e);
    }
  }

  async function uploadMetadataToIPFS() {
    const { name, description, price } = formParams;

    if (!name || !description || !price || !fileURL) {
      return;
    }

    const nftJSON = {
      name,
      description,
      price,
      image: fileURL,
    };

    console.log(nftJSON);

    try {
      const response = await uploadJSONToIPFS(nftJSON);
      if (response.success === true) {
        console.log("Uploaded metadata to Pinata: ", response.pinataURL);
        return response.pinataURL;
      }
    } catch (e) {
      console.log("Error during metadata upload: ", e);
    }
  }

  async function listNFT(e) {
    // listNFT is called by default when the user hits the Submit button
    // So, we prevent the default button behavior
    e.preventDefault();

    try {
      const metadataURL = await uploadMetadataToIPFS();
      // Getting the ethereum object which Metamask injects in the browser
      // Web3Provider extracts relevant values from the ethereum object
      // provider is our gateway to talking to Goerli Testnet
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      // Getting one of the user's addresses as signer
      const signer = provider.getSigner();

      updateMessage("Please wait - uploading metadata to IPFS ... ");

      // let allows you to declare variables that are limited to the scope of a block statement, or expression on which it is used
      // unlike the var keyword, which declares a variable globally, or locally to an entire function regardless of block scope
      let contract = new ethers.Contract(
        Marketplace.address,
        Marketplace.abi,
        signer
      );

      // Parsing FE values to then use as arguments in the contract's function call
      const price = ethers.utils.parseUnits(formParams.price, "ether");
      let listingPrice = await contract.getListPrice();
      listingPrice = listingPrice.toString();

      // Creating the NFT and paying the listing fee
      let transaction = await contract.createToken(metadataURL, price, {
        value: listingPrice,
      });
      await transaction.wait();

      console.log("The NFT has been successfully minted and listed.");
      updateMessage("");
      updateFormParams({ name: "", description: "", price: "" });
      // Redirecting the user to the marketplace homepage
      window.location.replace("/");
    } catch (e) {
      console.log("Error during metadata upload: ", e);
    }
  }

  return (
    <div className="">
      <Navbar></Navbar>
      <div className="flex flex-col place-items-center mt-10" id="nftForm">
        <form className="bg-white shadow-md rounded px-8 pt-4 pb-8 mb-4">
          <h3 className="text-center font-bold text-purple-500 mb-8">
            Upload your NFT to the marketplace
          </h3>
          <div className="mb-4">
            <label
              className="block text-purple-500 text-sm font-bold mb-2"
              htmlFor="name"
            >
              NFT Name
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="name"
              type="text"
              placeholder="Axie#4563"
              onChange={(e) =>
                updateFormParams({ ...formParams, name: e.target.value })
              }
              value={formParams.name}
            ></input>
          </div>
          <div className="mb-6">
            <label
              className="block text-purple-500 text-sm font-bold mb-2"
              htmlFor="description"
            >
              NFT Description
            </label>
            <textarea
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              cols="40"
              rows="5"
              id="description"
              type="text"
              placeholder="Axie Infinity Collection"
              value={formParams.description}
              onChange={(e) =>
                updateFormParams({ ...formParams, description: e.target.value })
              }
            ></textarea>
          </div>
          <div className="mb-6">
            <label
              className="block text-purple-500 text-sm font-bold mb-2"
              htmlFor="price"
            >
              Price (in ETH)
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              type="number"
              placeholder="Min 0.01 ETH"
              step="0.01"
              value={formParams.price}
              onChange={(e) =>
                updateFormParams({ ...formParams, price: e.target.value })
              }
            ></input>
          </div>
          <div>
            <label
              className="block text-purple-500 text-sm font-bold mb-2"
              htmlFor="image"
            >
              Upload Image
            </label>
            <input type={"file"} onChange={OnChangeFile}></input>
          </div>
          <br></br>
          <div className="text-green text-center">{message}</div>
          <button
            onClick={listNFT}
            className="font-bold mt-10 w-full bg-purple-500 text-white rounded p-2 shadow-lg"
          >
            List NFT
          </button>
        </form>
      </div>
    </div>
  );
}
