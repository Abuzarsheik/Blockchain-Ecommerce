// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title EscrowContract
 * @dev Smart contract for handling escrow payments in e-commerce transactions
 * Features:
 * - Automatic escrow activation on purchase
 * - Fund locking until delivery confirmation
 * - Dispute resolution mechanism
 * - Automatic fund release with timeouts
 * - Emergency admin controls
 */
contract EscrowContract is ReentrancyGuard, Ownable, Pausable {
    
    // Escrow states
    enum EscrowState {
        PENDING,        // Payment made, waiting for delivery
        DELIVERED,      // Seller marked as delivered
        CONFIRMED,      // Buyer confirmed receipt
        DISPUTED,       // Dispute raised
        RESOLVED,       // Dispute resolved by admin
        COMPLETED,      // Funds released to seller
        REFUNDED,       // Funds refunded to buyer
        EXPIRED         // Escrow expired (auto-release)
    }
    
    // Escrow structure
    struct Escrow {
        uint256 orderId;           // Order ID from backend
        address buyer;             // Buyer's wallet address
        address seller;            // Seller's wallet address
        uint256 amount;            // Total escrow amount in wei
        uint256 platformFee;       // Platform fee in wei
        EscrowState state;         // Current escrow state
        uint256 createdAt;         // Creation timestamp
        uint256 deliveryDeadline;  // Expected delivery deadline
        uint256 disputeDeadline;   // Deadline for raising disputes
        string productHash;        // Hash of product details
        string trackingInfo;       // Delivery tracking information
        bool sellerConfirmed;      // Seller confirmed delivery
        bool buyerConfirmed;       // Buyer confirmed receipt
        address disputeResolver;   // Admin who resolves disputes
        string disputeReason;      // Reason for dispute
    }
    
    // Contract state variables
    mapping(uint256 => Escrow) public escrows;
    mapping(address => uint256[]) public buyerEscrows;
    mapping(address => uint256[]) public sellerEscrows;
    mapping(address => bool) public authorizedResolvers;
    
    uint256 public escrowCounter;
    uint256 public platformFeeRate = 250; // 2.5% in basis points (10000 = 100%)
    uint256 public defaultDeliveryPeriod = 14 days;
    uint256 public disputePeriod = 7 days;
    uint256 public autoReleaseTimeout = 30 days;
    
    // Events
    event EscrowCreated(
        uint256 indexed escrowId,
        uint256 indexed orderId,
        address indexed buyer,
        address seller,
        uint256 amount
    );
    
    event DeliveryConfirmed(
        uint256 indexed escrowId,
        address indexed seller,
        string trackingInfo
    );
    
    event ReceiptConfirmed(
        uint256 indexed escrowId,
        address indexed buyer
    );
    
    event DisputeRaised(
        uint256 indexed escrowId,
        address indexed raiser,
        string reason
    );
    
    event DisputeResolved(
        uint256 indexed escrowId,
        address indexed resolver,
        bool favorBuyer
    );
    
    event FundsReleased(
        uint256 indexed escrowId,
        address indexed recipient,
        uint256 amount
    );
    
    event EscrowExpired(
        uint256 indexed escrowId,
        uint256 amount
    );
    
    // Modifiers
    modifier onlyBuyer(uint256 _escrowId) {
        require(escrows[_escrowId].buyer == msg.sender, "Only buyer can perform this action");
        _;
    }
    
    modifier onlySeller(uint256 _escrowId) {
        require(escrows[_escrowId].seller == msg.sender, "Only seller can perform this action");
        _;
    }
    
    modifier onlyParticipant(uint256 _escrowId) {
        require(
            escrows[_escrowId].buyer == msg.sender || 
            escrows[_escrowId].seller == msg.sender,
            "Only buyer or seller can perform this action"
        );
        _;
    }
    
    modifier onlyResolver() {
        require(authorizedResolvers[msg.sender] || msg.sender == owner(), "Only authorized resolver");
        _;
    }
    
    modifier validEscrow(uint256 _escrowId) {
        require(_escrowId > 0 && _escrowId <= escrowCounter, "Invalid escrow ID");
        _;
    }
    
    modifier inState(uint256 _escrowId, EscrowState _state) {
        require(escrows[_escrowId].state == _state, "Invalid escrow state");
        _;
    }
    
    constructor() {
        authorizedResolvers[msg.sender] = true;
    }
    
    /**
     * @dev Create a new escrow for an order
     * @param _orderId Order ID from backend system
     * @param _seller Seller's wallet address
     * @param _productHash Hash of product details for verification
     * @param _deliveryDays Expected delivery period in days
     */
    function createEscrow(
        uint256 _orderId,
        address _seller,
        string memory _productHash,
        uint256 _deliveryDays
    ) external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "Escrow amount must be greater than 0");
        require(_seller != address(0), "Invalid seller address");
        require(_seller != msg.sender, "Buyer and seller cannot be the same");
        require(_deliveryDays > 0 && _deliveryDays <= 365, "Invalid delivery period");
        
        escrowCounter++;
        uint256 escrowId = escrowCounter;
        
        uint256 platformFee = (msg.value * platformFeeRate) / 10000;
        uint256 deliveryDeadline = block.timestamp + (_deliveryDays * 1 days);
        uint256 disputeDeadline = deliveryDeadline + disputePeriod;
        
        escrows[escrowId] = Escrow({
            orderId: _orderId,
            buyer: msg.sender,
            seller: _seller,
            amount: msg.value,
            platformFee: platformFee,
            state: EscrowState.PENDING,
            createdAt: block.timestamp,
            deliveryDeadline: deliveryDeadline,
            disputeDeadline: disputeDeadline,
            productHash: _productHash,
            trackingInfo: "",
            sellerConfirmed: false,
            buyerConfirmed: false,
            disputeResolver: address(0),
            disputeReason: ""
        });
        
        buyerEscrows[msg.sender].push(escrowId);
        sellerEscrows[_seller].push(escrowId);
        
        emit EscrowCreated(escrowId, _orderId, msg.sender, _seller, msg.value);
    }
    
    /**
     * @dev Seller confirms delivery of product
     * @param _escrowId Escrow ID
     * @param _trackingInfo Delivery tracking information
     */
    function confirmDelivery(
        uint256 _escrowId,
        string memory _trackingInfo
    ) external validEscrow(_escrowId) onlySeller(_escrowId) inState(_escrowId, EscrowState.PENDING) {
        require(block.timestamp <= escrows[_escrowId].deliveryDeadline, "Delivery deadline passed");
        
        escrows[_escrowId].state = EscrowState.DELIVERED;
        escrows[_escrowId].sellerConfirmed = true;
        escrows[_escrowId].trackingInfo = _trackingInfo;
        
        emit DeliveryConfirmed(_escrowId, msg.sender, _trackingInfo);
    }
    
    /**
     * @dev Buyer confirms receipt of product
     * @param _escrowId Escrow ID
     */
    function confirmReceipt(
        uint256 _escrowId
    ) external validEscrow(_escrowId) onlyBuyer(_escrowId) {
        require(
            escrows[_escrowId].state == EscrowState.DELIVERED || 
            escrows[_escrowId].state == EscrowState.PENDING,
            "Invalid state for confirmation"
        );
        
        escrows[_escrowId].state = EscrowState.CONFIRMED;
        escrows[_escrowId].buyerConfirmed = true;
        
        emit ReceiptConfirmed(_escrowId, msg.sender);
        
        // Automatically release funds
        _releaseFunds(_escrowId);
    }
    
    /**
     * @dev Raise a dispute for an escrow
     * @param _escrowId Escrow ID
     * @param _reason Reason for the dispute
     */
    function raiseDispute(
        uint256 _escrowId,
        string memory _reason
    ) external validEscrow(_escrowId) onlyParticipant(_escrowId) {
        require(
            escrows[_escrowId].state == EscrowState.PENDING || 
            escrows[_escrowId].state == EscrowState.DELIVERED,
            "Cannot dispute in current state"
        );
        require(block.timestamp <= escrows[_escrowId].disputeDeadline, "Dispute period expired");
        require(bytes(_reason).length > 0, "Dispute reason required");
        
        escrows[_escrowId].state = EscrowState.DISPUTED;
        escrows[_escrowId].disputeReason = _reason;
        
        emit DisputeRaised(_escrowId, msg.sender, _reason);
    }
    
    /**
     * @dev Resolve a dispute (admin only)
     * @param _escrowId Escrow ID
     * @param _favorBuyer True to refund buyer, false to pay seller
     */
    function resolveDispute(
        uint256 _escrowId,
        bool _favorBuyer
    ) external validEscrow(_escrowId) onlyResolver inState(_escrowId, EscrowState.DISPUTED) {
        escrows[_escrowId].state = EscrowState.RESOLVED;
        escrows[_escrowId].disputeResolver = msg.sender;
        
        emit DisputeResolved(_escrowId, msg.sender, _favorBuyer);
        
        if (_favorBuyer) {
            _refundBuyer(_escrowId);
        } else {
            _releaseFunds(_escrowId);
        }
    }
    
    /**
     * @dev Auto-release funds after timeout (anyone can call)
     * @param _escrowId Escrow ID
     */
    function autoReleaseFunds(uint256 _escrowId) external validEscrow(_escrowId) {
        require(
            escrows[_escrowId].state == EscrowState.DELIVERED ||
            escrows[_escrowId].state == EscrowState.PENDING,
            "Cannot auto-release in current state"
        );
        require(
            block.timestamp > escrows[_escrowId].createdAt + autoReleaseTimeout,
            "Auto-release timeout not reached"
        );
        
        escrows[_escrowId].state = EscrowState.EXPIRED;
        
        emit EscrowExpired(_escrowId, escrows[_escrowId].amount);
        
        // Auto-release to seller after timeout
        _releaseFunds(_escrowId);
    }
    
    /**
     * @dev Internal function to release funds to seller
     */
    function _releaseFunds(uint256 _escrowId) internal nonReentrant {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.amount > 0, "No funds to release");
        
        uint256 sellerAmount = escrow.amount - escrow.platformFee;
        escrow.state = EscrowState.COMPLETED;
        
        // Transfer platform fee to owner
        if (escrow.platformFee > 0) {
            (bool feeSuccess, ) = payable(owner()).call{value: escrow.platformFee}("");
            require(feeSuccess, "Platform fee transfer failed");
        }
        
        // Transfer remaining amount to seller
        (bool success, ) = payable(escrow.seller).call{value: sellerAmount}("");
        require(success, "Seller payment failed");
        
        emit FundsReleased(_escrowId, escrow.seller, sellerAmount);
    }
    
    /**
     * @dev Internal function to refund buyer
     */
    function _refundBuyer(uint256 _escrowId) internal nonReentrant {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.amount > 0, "No funds to refund");
        
        escrow.state = EscrowState.REFUNDED;
        
        // Refund full amount to buyer (platform keeps no fee on refunds)
        (bool success, ) = payable(escrow.buyer).call{value: escrow.amount}("");
        require(success, "Buyer refund failed");
        
        emit FundsReleased(_escrowId, escrow.buyer, escrow.amount);
    }
    
    /**
     * @dev Get escrow details
     */
    function getEscrow(uint256 _escrowId) external view validEscrow(_escrowId) returns (Escrow memory) {
        return escrows[_escrowId];
    }
    
    /**
     * @dev Get buyer's escrows
     */
    function getBuyerEscrows(address _buyer) external view returns (uint256[] memory) {
        return buyerEscrows[_buyer];
    }
    
    /**
     * @dev Get seller's escrows
     */
    function getSellerEscrows(address _seller) external view returns (uint256[] memory) {
        return sellerEscrows[_seller];
    }
    
    /**
     * @dev Check if escrow can be auto-released
     */
    function canAutoRelease(uint256 _escrowId) external view validEscrow(_escrowId) returns (bool) {
        Escrow memory escrow = escrows[_escrowId];
        return (escrow.state == EscrowState.DELIVERED || escrow.state == EscrowState.PENDING) &&
               block.timestamp > escrow.createdAt + autoReleaseTimeout;
    }
    
    // Admin functions
    function setPlatformFeeRate(uint256 _feeRate) external onlyOwner {
        require(_feeRate <= 1000, "Fee rate cannot exceed 10%");
        platformFeeRate = _feeRate;
    }
    
    function setDefaultDeliveryPeriod(uint256 _days) external onlyOwner {
        require(_days > 0 && _days <= 365, "Invalid delivery period");
        defaultDeliveryPeriod = _days * 1 days;
    }
    
    function setDisputePeriod(uint256 _days) external onlyOwner {
        require(_days > 0 && _days <= 30, "Invalid dispute period");
        disputePeriod = _days * 1 days;
    }
    
    function setAutoReleaseTimeout(uint256 _days) external onlyOwner {
        require(_days >= 7 && _days <= 90, "Invalid auto-release timeout");
        autoReleaseTimeout = _days * 1 days;
    }
    
    function addResolver(address _resolver) external onlyOwner {
        authorizedResolvers[_resolver] = true;
    }
    
    function removeResolver(address _resolver) external onlyOwner {
        authorizedResolvers[_resolver] = false;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency withdrawal function (only in extreme cases)
     */
    function emergencyWithdraw(uint256 _escrowId) external onlyOwner {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.amount > 0, "No funds to withdraw");
        
        uint256 amount = escrow.amount;
        escrow.amount = 0;
        escrow.state = EscrowState.REFUNDED;
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Emergency withdrawal failed");
    }
} 