// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title BlocmerceEscrow
 * @dev Smart contract for handling escrow transactions in the Blocmerce marketplace
 * @author Blocmerce Team
 */
contract BlocmerceEscrow is ReentrancyGuard, Pausable, AccessControl {
    using Counters for Counters.Counter;
    
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant RESOLVER_ROLE = keccak256("RESOLVER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    // Counters
    Counters.Counter private _escrowIds;
    
    // Platform settings
    address public platformWallet;
    uint256 public platformFeeRate; // in basis points (100 = 1%)
    uint256 public constant MAX_FEE_RATE = 1000; // 10% maximum
    
    // Escrow states
    enum EscrowState {
        Created,
        Funded,
        Delivered,
        Completed,
        Disputed,
        Resolved,
        Refunded,
        Cancelled
    }
    
    // Escrow structure
    struct Escrow {
        uint256 id;
        address buyer;
        address seller;
        uint256 amount;
        uint256 platformFee;
        EscrowState state;
        uint256 createdAt;
        uint256 deliveryDeadline;
        uint256 disputeDeadline;
        string productHash; // IPFS hash of product details
        string deliveryProof; // IPFS hash of delivery confirmation
        bool autoRelease;
        uint256 disputeReason;
        address disputeResolver;
    }
    
    // Mappings
    mapping(uint256 => Escrow) public escrows;
    mapping(address => uint256[]) public buyerEscrows;
    mapping(address => uint256[]) public sellerEscrows;
    mapping(address => bool) public authorizedResolvers;
    
    // Events
    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        string productHash
    );
    
    event EscrowFunded(uint256 indexed escrowId, uint256 amount);
    event EscrowDelivered(uint256 indexed escrowId, string deliveryProof);
    event EscrowCompleted(uint256 indexed escrowId, uint256 sellerAmount, uint256 platformFee);
    event EscrowDisputed(uint256 indexed escrowId, address indexed initiator, uint256 reason);
    event EscrowResolved(uint256 indexed escrowId, address indexed resolver, uint256 buyerAmount, uint256 sellerAmount);
    event EscrowRefunded(uint256 indexed escrowId, uint256 amount);
    event EscrowCancelled(uint256 indexed escrowId);
    
    event PlatformFeeUpdated(uint256 oldRate, uint256 newRate);
    event PlatformWalletUpdated(address oldWallet, address newWallet);
    event ResolverAdded(address indexed resolver);
    event ResolverRemoved(address indexed resolver);
    
    // Custom errors
    error InvalidAmount();
    error InvalidAddress();
    error InvalidState();
    error InvalidDeadline();
    error NotAuthorized();
    error EscrowNotFound();
    error DisputeTimeExpired();
    error InsufficientFunds();
    error TransferFailed();
    error InvalidFeeRate();
    
    constructor(address _platformWallet, uint256 _platformFeeRate) {
        if (_platformWallet == address(0)) revert InvalidAddress();
        if (_platformFeeRate > MAX_FEE_RATE) revert InvalidFeeRate();
        
        platformWallet = _platformWallet;
        platformFeeRate = _platformFeeRate;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(RESOLVER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        
        authorizedResolvers[msg.sender] = true;
    }
    
    /**
     * @dev Create a new escrow
     * @param seller Address of the seller
     * @param deliveryDeadline Timestamp for delivery deadline
     * @param disputeDeadline Timestamp for dispute deadline
     * @param productHash IPFS hash of product details
     * @param autoRelease Whether to auto-release after delivery deadline
     */
    function createEscrow(
        address seller,
        uint256 deliveryDeadline,
        uint256 disputeDeadline,
        string memory productHash,
        bool autoRelease
    ) external payable nonReentrant whenNotPaused returns (uint256) {
        if (msg.value == 0) revert InvalidAmount();
        if (seller == address(0) || seller == msg.sender) revert InvalidAddress();
        if (deliveryDeadline <= block.timestamp) revert InvalidDeadline();
        if (disputeDeadline <= deliveryDeadline) revert InvalidDeadline();
        
        _escrowIds.increment();
        uint256 escrowId = _escrowIds.current();
        
        uint256 platformFee = (msg.value * platformFeeRate) / 10000;
        
        Escrow storage escrow = escrows[escrowId];
        escrow.id = escrowId;
        escrow.buyer = msg.sender;
        escrow.seller = seller;
        escrow.amount = msg.value;
        escrow.platformFee = platformFee;
        escrow.state = EscrowState.Funded;
        escrow.createdAt = block.timestamp;
        escrow.deliveryDeadline = deliveryDeadline;
        escrow.disputeDeadline = disputeDeadline;
        escrow.productHash = productHash;
        escrow.autoRelease = autoRelease;
        
        buyerEscrows[msg.sender].push(escrowId);
        sellerEscrows[seller].push(escrowId);
        
        emit EscrowCreated(escrowId, msg.sender, seller, msg.value, productHash);
        emit EscrowFunded(escrowId, msg.value);
        
        return escrowId;
    }
    
    /**
     * @dev Mark escrow as delivered by seller
     * @param escrowId ID of the escrow
     * @param deliveryProof IPFS hash of delivery proof
     */
    function markDelivered(uint256 escrowId, string memory deliveryProof) 
        external whenNotPaused {
        Escrow storage escrow = escrows[escrowId];
        
        if (escrow.id == 0) revert EscrowNotFound();
        if (msg.sender != escrow.seller) revert NotAuthorized();
        if (escrow.state != EscrowState.Funded) revert InvalidState();
        
        escrow.state = EscrowState.Delivered;
        escrow.deliveryProof = deliveryProof;
        
        emit EscrowDelivered(escrowId, deliveryProof);
        
        // Auto-release if enabled and deadline passed
        if (escrow.autoRelease && block.timestamp >= escrow.deliveryDeadline) {
            _completeEscrow(escrowId);
        }
    }
    
    /**
     * @dev Release escrow funds to seller (by buyer)
     * @param escrowId ID of the escrow
     */
    function releaseEscrow(uint256 escrowId) external nonReentrant whenNotPaused {
        Escrow storage escrow = escrows[escrowId];
        
        if (escrow.id == 0) revert EscrowNotFound();
        if (msg.sender != escrow.buyer) revert NotAuthorized();
        if (escrow.state != EscrowState.Delivered && escrow.state != EscrowState.Funded) {
            revert InvalidState();
        }
        
        _completeEscrow(escrowId);
    }
    
    /**
     * @dev Initiate dispute
     * @param escrowId ID of the escrow
     * @param reason Reason code for dispute
     */
    function initiateDispute(uint256 escrowId, uint256 reason) 
        external whenNotPaused {
        Escrow storage escrow = escrows[escrowId];
        
        if (escrow.id == 0) revert EscrowNotFound();
        if (msg.sender != escrow.buyer && msg.sender != escrow.seller) {
            revert NotAuthorized();
        }
        if (escrow.state != EscrowState.Delivered && escrow.state != EscrowState.Funded) {
            revert InvalidState();
        }
        if (block.timestamp > escrow.disputeDeadline) revert DisputeTimeExpired();
        
        escrow.state = EscrowState.Disputed;
        escrow.disputeReason = reason;
        
        emit EscrowDisputed(escrowId, msg.sender, reason);
    }
    
    /**
     * @dev Resolve dispute (by authorized resolver)
     * @param escrowId ID of the escrow
     * @param buyerPercent Percentage of funds to return to buyer (0-100)
     */
    function resolveDispute(uint256 escrowId, uint256 buyerPercent) 
        external nonReentrant whenNotPaused {
        if (!authorizedResolvers[msg.sender]) revert NotAuthorized();
        if (buyerPercent > 100) revert InvalidAmount();
        
        Escrow storage escrow = escrows[escrowId];
        
        if (escrow.id == 0) revert EscrowNotFound();
        if (escrow.state != EscrowState.Disputed) revert InvalidState();
        
        escrow.state = EscrowState.Resolved;
        escrow.disputeResolver = msg.sender;
        
        uint256 totalAmount = escrow.amount - escrow.platformFee;
        uint256 buyerAmount = (totalAmount * buyerPercent) / 100;
        uint256 sellerAmount = totalAmount - buyerAmount;
        
        // Transfer platform fee
        if (escrow.platformFee > 0) {
            (bool feeSuccess, ) = platformWallet.call{value: escrow.platformFee}("");
            if (!feeSuccess) revert TransferFailed();
        }
        
        // Transfer to buyer
        if (buyerAmount > 0) {
            (bool buyerSuccess, ) = escrow.buyer.call{value: buyerAmount}("");
            if (!buyerSuccess) revert TransferFailed();
        }
        
        // Transfer to seller
        if (sellerAmount > 0) {
            (bool sellerSuccess, ) = escrow.seller.call{value: sellerAmount}("");
            if (!sellerSuccess) revert TransferFailed();
        }
        
        emit EscrowResolved(escrowId, msg.sender, buyerAmount, sellerAmount);
    }
    
    /**
     * @dev Cancel escrow (before funding or by admin)
     * @param escrowId ID of the escrow
     */
    function cancelEscrow(uint256 escrowId) external nonReentrant whenNotPaused {
        Escrow storage escrow = escrows[escrowId];
        
        if (escrow.id == 0) revert EscrowNotFound();
        
        bool canCancel = msg.sender == escrow.buyer || 
                        msg.sender == escrow.seller || 
                        hasRole(ADMIN_ROLE, msg.sender);
        
        if (!canCancel) revert NotAuthorized();
        if (escrow.state != EscrowState.Created && escrow.state != EscrowState.Funded) {
            revert InvalidState();
        }
        
        escrow.state = EscrowState.Cancelled;
        
        // Refund if already funded
        if (escrow.state == EscrowState.Funded) {
            (bool success, ) = escrow.buyer.call{value: escrow.amount}("");
            if (!success) revert TransferFailed();
        }
        
        emit EscrowCancelled(escrowId);
    }
    
    /**
     * @dev Internal function to complete escrow
     */
    function _completeEscrow(uint256 escrowId) internal {
        Escrow storage escrow = escrows[escrowId];
        
        escrow.state = EscrowState.Completed;
        
        uint256 sellerAmount = escrow.amount - escrow.platformFee;
        
        // Transfer platform fee
        if (escrow.platformFee > 0) {
            (bool feeSuccess, ) = platformWallet.call{value: escrow.platformFee}("");
            if (!feeSuccess) revert TransferFailed();
        }
        
        // Transfer to seller
        (bool sellerSuccess, ) = escrow.seller.call{value: sellerAmount}("");
        if (!sellerSuccess) revert TransferFailed();
        
        emit EscrowCompleted(escrowId, sellerAmount, escrow.platformFee);
    }
    
    // Admin functions
    function setPlatformFeeRate(uint256 _platformFeeRate) 
        external onlyRole(ADMIN_ROLE) {
        if (_platformFeeRate > MAX_FEE_RATE) revert InvalidFeeRate();
        
        uint256 oldRate = platformFeeRate;
        platformFeeRate = _platformFeeRate;
        
        emit PlatformFeeUpdated(oldRate, _platformFeeRate);
    }
    
    function setPlatformWallet(address _platformWallet) 
        external onlyRole(ADMIN_ROLE) {
        if (_platformWallet == address(0)) revert InvalidAddress();
        
        address oldWallet = platformWallet;
        platformWallet = _platformWallet;
        
        emit PlatformWalletUpdated(oldWallet, _platformWallet);
    }
    
    function addAuthorizedResolver(address resolver) 
        external onlyRole(ADMIN_ROLE) {
        if (resolver == address(0)) revert InvalidAddress();
        
        authorizedResolvers[resolver] = true;
        _grantRole(RESOLVER_ROLE, resolver);
        
        emit ResolverAdded(resolver);
    }
    
    function removeAuthorizedResolver(address resolver) 
        external onlyRole(ADMIN_ROLE) {
        authorizedResolvers[resolver] = false;
        _revokeRole(RESOLVER_ROLE, resolver);
        
        emit ResolverRemoved(resolver);
    }
    
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    // View functions
    function getEscrow(uint256 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
    }
    
    function getBuyerEscrows(address buyer) external view returns (uint256[] memory) {
        return buyerEscrows[buyer];
    }
    
    function getSellerEscrows(address seller) external view returns (uint256[] memory) {
        return sellerEscrows[seller];
    }
    
    function getCurrentEscrowId() external view returns (uint256) {
        return _escrowIds.current();
    }
    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // Emergency withdrawal (admin only)
    function emergencyWithdraw() external onlyRole(ADMIN_ROLE) {
        uint256 balance = address(this).balance;
        (bool success, ) = platformWallet.call{value: balance}("");
        if (!success) revert TransferFailed();
    }
} 