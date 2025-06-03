// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Escrow.sol";

/**
 * @title EscrowFactory
 * @dev Factory contract for creating escrow contracts
 */
contract EscrowFactory {
    address public owner;
    uint256 public factoryFee = 0.001 ether; // Factory fee in wei
    
    mapping(address => address[]) public buyerEscrows;
    mapping(address => address[]) public sellerEscrows;
    mapping(address => bool) public isEscrowContract;
    
    address[] public allEscrows;
    
    event EscrowCreated(
        address indexed escrowContract,
        address indexed buyer,
        address indexed seller,
        uint256 amount
    );
    
    event FactoryFeeUpdated(uint256 newFee);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Creates a new escrow contract
     * @param _seller The seller's address
     * @param _buyer The buyer's address  
     * @param _amount The escrow amount
     * @param _productHash Hash of the product details
     * @param _escrowDuration Duration of the escrow in seconds
     * @return Address of the created escrow contract
     */
    function createEscrow(
        address _seller,
        address _buyer,
        uint256 _amount,
        bytes32 _productHash,
        uint256 _escrowDuration
    ) external payable returns (address) {
        require(_seller != address(0), "Invalid seller address");
        require(_buyer != address(0), "Invalid buyer address");
        require(_amount > 0, "Amount must be greater than 0");
        require(msg.value >= _amount + factoryFee, "Insufficient payment");
        
        // Create new escrow contract
        Escrow newEscrow = new Escrow{value: _amount}(
            _seller,
            _buyer,
            _amount,
            _productHash,
            _escrowDuration
        );
        
        address escrowAddress = address(newEscrow);
        
        // Update mappings
        buyerEscrows[_buyer].push(escrowAddress);
        sellerEscrows[_seller].push(escrowAddress);
        isEscrowContract[escrowAddress] = true;
        allEscrows.push(escrowAddress);
        
        // Transfer factory fee to owner
        if (factoryFee > 0) {
            payable(owner).transfer(factoryFee);
        }
        
        // Refund excess payment
        uint256 excess = msg.value - _amount - factoryFee;
        if (excess > 0) {
            payable(msg.sender).transfer(excess);
        }
        
        emit EscrowCreated(escrowAddress, _buyer, _seller, _amount);
        
        return escrowAddress;
    }
    
    /**
     * @dev Get all escrow contracts for a buyer
     * @param _buyer The buyer's address
     * @return Array of escrow contract addresses
     */
    function getEscrowsByBuyer(address _buyer) external view returns (address[] memory) {
        return buyerEscrows[_buyer];
    }
    
    /**
     * @dev Get all escrow contracts for a seller
     * @param _seller The seller's address
     * @return Array of escrow contract addresses
     */
    function getEscrowsBySeller(address _seller) external view returns (address[] memory) {
        return sellerEscrows[_seller];
    }
    
    /**
     * @dev Get total number of escrow contracts created
     * @return Total number of escrows
     */
    function getTotalEscrows() external view returns (uint256) {
        return allEscrows.length;
    }
    
    /**
     * @dev Check if an address is an escrow contract created by this factory
     * @param _contract The contract address to check
     * @return True if it's an escrow contract from this factory
     */
    function isValidEscrow(address _contract) external view returns (bool) {
        return isEscrowContract[_contract];
    }
    
    /**
     * @dev Update the factory fee (only owner)
     * @param _newFee New factory fee in wei
     */
    function updateFactoryFee(uint256 _newFee) external onlyOwner {
        factoryFee = _newFee;
        emit FactoryFeeUpdated(_newFee);
    }
    
    /**
     * @dev Withdraw accumulated fees (only owner)
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner).transfer(balance);
    }
    
    /**
     * @dev Transfer ownership (only owner)
     * @param _newOwner New owner address
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid new owner address");
        owner = _newOwner;
    }
} 