// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Escrow
 * @dev Smart contract for secure escrow transactions between buyers and sellers
 */
contract Escrow {
    enum EscrowState { Active, Completed, Refunded, Disputed }
    
    address public seller;
    address public buyer;
    address public arbitrator;
    uint256 public amount;
    bytes32 public productHash;
    uint256 public escrowDuration;
    uint256 public createdAt;
    uint256 public deliveryConfirmedAt;
    EscrowState public state;
    
    bool public deliveryConfirmed;
    bool public disputeRaised;
    string public disputeReason;
    
    event PaymentReleased(address indexed seller, uint256 amount);
    event PaymentRefunded(address indexed buyer, uint256 amount);
    event DeliveryConfirmed(address indexed buyer);
    event DisputeRaised(address indexed initiator, string reason);
    event DisputeResolved(bool refundToBuyer);
    event ArbitratorSet(address indexed arbitrator);
    
    modifier onlyBuyer() {
        require(msg.sender == buyer, "Only buyer can call this function");
        _;
    }
    
    modifier onlySeller() {
        require(msg.sender == seller, "Only seller can call this function");
        _;
    }
    
    modifier onlyArbitrator() {
        require(msg.sender == arbitrator, "Only arbitrator can call this function");
        _;
    }
    
    modifier onlyParties() {
        require(msg.sender == buyer || msg.sender == seller, "Only buyer or seller can call this function");
        _;
    }
    
    modifier inState(EscrowState _state) {
        require(state == _state, "Invalid escrow state");
        _;
    }
    
    modifier notExpired() {
        require(block.timestamp <= createdAt + escrowDuration, "Escrow has expired");
        _;
    }
    
    constructor(
        address _seller,
        address _buyer,
        uint256 _amount,
        bytes32 _productHash,
        uint256 _escrowDuration
    ) payable {
        require(_seller != address(0), "Invalid seller address");
        require(_buyer != address(0), "Invalid buyer address");
        require(_amount > 0, "Amount must be greater than 0");
        require(msg.value >= _amount, "Insufficient payment");
        
        seller = _seller;
        buyer = _buyer;
        amount = _amount;
        productHash = _productHash;
        escrowDuration = _escrowDuration;
        createdAt = block.timestamp;
        state = EscrowState.Active;
        
        // Set factory owner as default arbitrator
        arbitrator = tx.origin; // This should be set to a proper arbitrator service
    }
    
    /**
     * @dev Buyer confirms delivery of the product
     */
    function confirmDelivery() external onlyBuyer inState(EscrowState.Active) notExpired {
        require(!deliveryConfirmed, "Delivery already confirmed");
        
        deliveryConfirmed = true;
        deliveryConfirmedAt = block.timestamp;
        
        emit DeliveryConfirmed(buyer);
        
        // Auto-release payment after delivery confirmation
        _releasePayment();
    }
    
    /**
     * @dev Release payment to seller (can be called by buyer after delivery or automatically)
     */
    function releasePayment() external onlyParties inState(EscrowState.Active) {
        require(deliveryConfirmed || msg.sender == buyer, "Delivery must be confirmed first");
        _releasePayment();
    }
    
    /**
     * @dev Internal function to release payment
     */
    function _releasePayment() internal {
        state = EscrowState.Completed;
        payable(seller).transfer(amount);
        emit PaymentReleased(seller, amount);
    }
    
    /**
     * @dev Request refund (only buyer, only if delivery not confirmed and not expired)
     */
    function refund() external onlyBuyer inState(EscrowState.Active) {
        require(!deliveryConfirmed, "Cannot refund after delivery confirmation");
        require(block.timestamp > createdAt + escrowDuration, "Escrow not yet expired");
        
        state = EscrowState.Refunded;
        payable(buyer).transfer(amount);
        emit PaymentRefunded(buyer, amount);
    }
    
    /**
     * @dev Raise a dispute
     * @param _reason Reason for the dispute
     */
    function raiseDispute(string memory _reason) external onlyParties inState(EscrowState.Active) {
        require(!disputeRaised, "Dispute already raised");
        require(bytes(_reason).length > 0, "Dispute reason required");
        
        disputeRaised = true;
        disputeReason = _reason;
        state = EscrowState.Disputed;
        
        emit DisputeRaised(msg.sender, _reason);
    }
    
    /**
     * @dev Resolve dispute (only arbitrator)
     * @param _refundToBuyer True to refund buyer, false to pay seller
     */
    function resolveDispute(bool _refundToBuyer) external onlyArbitrator inState(EscrowState.Disputed) {
        if (_refundToBuyer) {
            state = EscrowState.Refunded;
            payable(buyer).transfer(amount);
            emit PaymentRefunded(buyer, amount);
        } else {
            state = EscrowState.Completed;
            payable(seller).transfer(amount);
            emit PaymentReleased(seller, amount);
        }
        
        emit DisputeResolved(_refundToBuyer);
    }
    
    /**
     * @dev Set arbitrator (only current arbitrator)
     * @param _newArbitrator New arbitrator address
     */
    function setArbitrator(address _newArbitrator) external onlyArbitrator {
        require(_newArbitrator != address(0), "Invalid arbitrator address");
        arbitrator = _newArbitrator;
        emit ArbitratorSet(_newArbitrator);
    }
    
    /**
     * @dev Emergency refund after significant time has passed (90 days)
     */
    function emergencyRefund() external onlyBuyer {
        require(block.timestamp > createdAt + 90 days, "Emergency refund not yet available");
        require(state == EscrowState.Active || state == EscrowState.Disputed, "Invalid state for emergency refund");
        
        state = EscrowState.Refunded;
        payable(buyer).transfer(amount);
        emit PaymentRefunded(buyer, amount);
    }
    
    /**
     * @dev Get contract details
     * @return All contract state variables
     */
    function getContractDetails() external view returns (
        address,
        address,
        uint256,
        bytes32,
        uint256,
        EscrowState
    ) {
        return (
            seller,
            buyer,
            amount,
            productHash,
            escrowDuration,
            state
        );
    }
    
    /**
     * @dev Get time remaining in escrow
     * @return Seconds remaining, 0 if expired
     */
    function getTimeRemaining() external view returns (uint256) {
        if (block.timestamp >= createdAt + escrowDuration) {
            return 0;
        }
        return (createdAt + escrowDuration) - block.timestamp;
    }
    
    /**
     * @dev Check if escrow has expired
     * @return True if expired
     */
    function isExpired() external view returns (bool) {
        return block.timestamp > createdAt + escrowDuration;
    }
    
    /**
     * @dev Get contract balance
     * @return Current contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
} 