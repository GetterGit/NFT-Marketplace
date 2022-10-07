//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract NFTMarketplace is ERC721URIStorage {
    // Declaring the Counter data type
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    Counters.Counter private _itemsSold;

    address payable owner;
    // Price users pay when listing NFTs in the marketplace
    uint256 listPrice = 0.01 ether;
    // Struct storing parameters of listed NFTs
    struct ListedToken {
        uint256 tokenId;
        address payable owner;
        address payable seller;
        uint256 price;
        bool currentlyListed;
    }

    mapping(uint256 => ListedToken) private idToListedToken;

    constructor() ERC721("NFTMarketplace", "NFTM") {
        // payable so that msg.sender is eligible to receive tokens from the SC
        owner = payable(msg.sender);
    }

    // HELPER FUNCTIONS
    function updateListPrice(uint256 _listPrice) public payable {
        require(
            msg.sender == owner,
            "Only owner can update the listing price."
        );
        listPrice = _listPrice;
    }

    function getListPrice() public view returns (uint256) {
        return listPrice;
    }

    function getLatestIdToListedToken()
        public
        view
        returns (ListedToken memory)
    {
        uint256 currentTokenId = _tokenIds.current();
        return idToListedToken[currentTokenId];
    }

    function getListedForTokenId(uint256 tokenId)
        public
        view
        returns (ListedToken memory)
    {
        return idToListedToken[tokenId];
    }

    function getCurrentTokenId() public view returns (uint256) {
        return _tokenIds.current();
    }

    // IMPLEMENTATION FUNCTIONS
    // payable because this function expects the caller to pay the listing price
    function createToken(string memory tokenURI, uint256 price)
        public
        payable
        returns (uint256)
    {
        require(
            msg.value == listPrice,
            "You have to send the exact listing price amount."
        );
        require(price > 0, "You have to set the price equal or above 0.");

        _tokenIds.increment();
        uint256 currentTokenId = _tokenIds.current();
        // _safeMint and not just _mint to make sure we are not minting to a contract which cannot accept/hold NFTs
        _safeMint(msg.sender, currentTokenId);
        _setTokenURI(currentTokenId, tokenURI);

        createListedToken(currentTokenId, price);

        return currentTokenId;
    }

    // Making it a private function because we won't call it from the FE as it's encapsulated into the createToken function
    function createListedToken(uint256 tokenId, uint256 price) private {
        idToListedToken[tokenId] = ListedToken(
            tokenId,
            payable(address(this)),
            payable(msg.sender),
            price,
            true
        );

        // Transferring the NFT to the SC to simplify selling this NFT to other users
        _transfer(msg.sender, address(this), tokenId);
    }

    function getAllNFTs() public view returns (ListedToken[] memory) {
        // We first need to provide an exact count of the items we want to see in the return array
        uint256 nftCount = _tokenIds.current();
        ListedToken[] memory tokens = new ListedToken[](nftCount);

        uint256 currentIndex = 0;
        for (uint256 i = 0; i < nftCount; i++) {
            uint256 currentId = i + 1;
            ListedToken storage currentItem = idToListedToken[currentId];
            tokens[currentIndex] = currentItem;
            currentIndex += 1;
        }

        return tokens;
    }

    function getMyNFTs() public view returns (ListedToken[] memory) {
        uint256 totalNftCount = _tokenIds.current();
        uint256 myNftCount = 0;
        uint256 currentIndex = 0;

        // Actualizing myNftCount to then use it as a length of the returned array
        for (uint256 i = 0; i < totalNftCount; i++) {
            if (
                idToListedToken[i + 1].owner == msg.sender ||
                idToListedToken[i + 1].seller == msg.sender
            ) {
                myNftCount += 1;
            }
        }

        // Now creating an array storing all NFTs of the querying user
        ListedToken[] memory tokens = new ListedToken[](myNftCount);
        for (uint256 i = 0; i < myNftCount; i++) {
            if (
                idToListedToken[i + 1].owner == msg.sender ||
                idToListedToken[i + 1].seller == msg.sender
            ) {
                uint256 currentId = i + 1;
                ListedToken storage currentItem = idToListedToken[currentId];
                tokens[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }

        return tokens;
    }

    function executeSale(uint256 tokenId) public payable {
        uint256 price = idToListedToken[tokenId].price;
        require(
            msg.value == price,
            "You have to send the exact NFT price amount."
        );

        address seller = idToListedToken[tokenId].seller;

        idToListedToken[tokenId].currentlyListed = true;
        idToListedToken[tokenId].seller = payable(msg.sender);
        _itemsSold.increment();

        // When the seller creates a token, it's transferred to the marketplace SC
        // So here we transfer from the SC to the buyer
        transferFrom(address(this), msg.sender, tokenId);

        // Now that the NFT is transferred to the buyer, the buyer becomes the owner unlike for the NFT creation case
        // So the buyer approves the NFT to the marketplace SC to be able to resell it in this marketplace
        approve(address(this), tokenId);

        // Transferring the funds
        payable(owner).transfer(listPrice);
        payable(seller).transfer(msg.value);
    }
}
