// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title DisputeResolution
 * @dev Smart contract for automated dispute resolution in escrow transactions
 */
contract DisputeResolution is ReentrancyGuard, AccessControl, Pausable {
    using Counters for Counters.Counter;

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");

    // Dispute counter
    Counters.Counter private _disputeIds;

    // Dispute statuses
    enum DisputeStatus {
        Open,
        UnderReview,
        AutoAssessment,
        PendingEvidence,
        AdminReview,
        Resolved,
        Closed,
        Appealed
    }

    // Resolution decisions
    enum ResolutionDecision {
        BuyerWins,
        SellerWins,
        PartialRefund,
        MutualAgreement,
        Inconclusive
    }

    // Dispute categories
    enum DisputeCategory {
        ItemNotReceived,
        ItemNotAsDescribed,
        ItemDamaged,
        WrongItemSent,
        LateDelivery,
        SellerCommunication,
        PaymentIssue,
        RefundRequest,
        ShippingIssue,
        QualityIssue,
        CounterfeitItem,
        Other
    }

    // Dispute structure
    struct Dispute {
        uint256 disputeId;
        address buyer;
        address seller;
        address initiatedBy;
        uint256 escrowAmount;
        DisputeCategory category;
        string description;
        DisputeStatus status;
        uint256 createdAt;
        uint256 responseDeadline;
        uint256 escalationDeadline;
        bool requiresManualReview;
        address assignedArbitrator;
        Resolution resolution;
        AutoAssessment autoAssessment;
    }

    // Resolution structure
    struct Resolution {
        ResolutionDecision decision;
        uint256 refundAmount;
        uint256 sellerCompensation;
        string reason;
        address resolvedBy;
        uint256 resolvedAt;
        bool executed;
    }

    // Auto assessment structure
    struct AutoAssessment {
        uint256 confidenceScore;
        string recommendedAction;
        string reasoning;
        uint256 assessedAt;
        bool completed;
    }

    // Evidence structure
    struct Evidence {
        address submittedBy;
        string evidenceHash; // IPFS hash
        string description;
        uint256 submittedAt;
    }

    // Mappings
    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => Evidence[]) public disputeEvidence;
    mapping(uint256 => string[]) public disputeMessages;
    mapping(address => uint256[]) public userDisputes;
    mapping(address => uint256) public userDisputeCount;

    // Events
    event DisputeCreated(
        uint256 indexed disputeId,
        address indexed buyer,
        address indexed seller,
        uint256 escrowAmount,
        DisputeCategory category
    );

    event EvidenceSubmitted(
        uint256 indexed disputeId,
        address indexed submittedBy,
        string evidenceHash
    );

    event DisputeStatusUpdated(
        uint256 indexed disputeId,
        DisputeStatus oldStatus,
        DisputeStatus newStatus
    );

    event AutoAssessmentCompleted(
        uint256 indexed disputeId,
        uint256 confidenceScore,
        string recommendedAction
    );

    event DisputeResolved(
        uint256 indexed disputeId,
        ResolutionDecision decision,
        uint256 refundAmount,
        uint256 sellerCompensation
    );

    event DisputeEscalated(
        uint256 indexed disputeId,
        address indexed arbitrator,
        string reason
    );

    event MessageAdded(
        uint256 indexed disputeId,
        address indexed sender,
        string message
    );

    // Constructor
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(ARBITRATOR_ROLE, msg.sender);
    }

    /**
     * @dev Create a new dispute
     */
    function createDispute(
        address _buyer,
        address _seller,
        uint256 _escrowAmount,
        DisputeCategory _category,
        string memory _description
    ) external payable nonReentrant whenNotPaused returns (uint256) {
        require(_buyer != _seller, "Buyer and seller cannot be the same");
        require(_escrowAmount > 0, "Escrow amount must be greater than 0");
        require(msg.value == _escrowAmount, "Sent value must match escrow amount");
        require(
            msg.sender == _buyer || msg.sender == _seller,
            "Only buyer or seller can create dispute"
        );

        _disputeIds.increment();
        uint256 disputeId = _disputeIds.current();

        disputes[disputeId] = Dispute({
            disputeId: disputeId,
            buyer: _buyer,
            seller: _seller,
            initiatedBy: msg.sender,
            escrowAmount: _escrowAmount,
            category: _category,
            description: _description,
            status: DisputeStatus.Open,
            createdAt: block.timestamp,
            responseDeadline: block.timestamp + 7 days,
            escalationDeadline: block.timestamp + 14 days,
            requiresManualReview: false,
            assignedArbitrator: address(0),
            resolution: Resolution({
                decision: ResolutionDecision.Inconclusive,
                refundAmount: 0,
                sellerCompensation: 0,
                reason: "",
                resolvedBy: address(0),
                resolvedAt: 0,
                executed: false
            }),
            autoAssessment: AutoAssessment({
                confidenceScore: 0,
                recommendedAction: "",
                reasoning: "",
                assessedAt: 0,
                completed: false
            })
        });

        userDisputes[_buyer].push(disputeId);
        userDisputes[_seller].push(disputeId);
        userDisputeCount[_buyer]++;
        userDisputeCount[_seller]++;

        emit DisputeCreated(disputeId, _buyer, _seller, _escrowAmount, _category);

        // Trigger automated assessment
        _performAutoAssessment(disputeId);

        return disputeId;
    }

    /**
     * @dev Submit evidence for a dispute
     */
    function submitEvidence(
        uint256 _disputeId,
        string memory _evidenceHash,
        string memory _description
    ) external {
        Dispute storage dispute = disputes[_disputeId];
        require(dispute.disputeId != 0, "Dispute does not exist");
        require(
            msg.sender == dispute.buyer || 
            msg.sender == dispute.seller || 
            hasRole(ARBITRATOR_ROLE, msg.sender),
            "Not authorized to submit evidence"
        );
        require(
            dispute.status == DisputeStatus.Open ||
            dispute.status == DisputeStatus.PendingEvidence ||
            dispute.status == DisputeStatus.AdminReview,
            "Cannot submit evidence in current status"
        );

        disputeEvidence[_disputeId].push(Evidence({
            submittedBy: msg.sender,
            evidenceHash: _evidenceHash,
            description: _description,
            submittedAt: block.timestamp
        }));

        emit EvidenceSubmitted(_disputeId, msg.sender, _evidenceHash);

        // If dispute was pending evidence, move to review
        if (dispute.status == DisputeStatus.PendingEvidence) {
            _updateDisputeStatus(_disputeId, DisputeStatus.UnderReview);
        }
    }

    /**
     * @dev Add message to dispute
     */
    function addMessage(uint256 _disputeId, string memory _message) external {
        Dispute storage dispute = disputes[_disputeId];
        require(dispute.disputeId != 0, "Dispute does not exist");
        require(
            msg.sender == dispute.buyer || 
            msg.sender == dispute.seller || 
            hasRole(ARBITRATOR_ROLE, msg.sender),
            "Not authorized to add message"
        );

        disputeMessages[_disputeId].push(_message);
        emit MessageAdded(_disputeId, msg.sender, _message);
    }

    /**
     * @dev Perform automated assessment
     */
    function _performAutoAssessment(uint256 _disputeId) internal {
        Dispute storage dispute = disputes[_disputeId];
        
        // Update status to auto assessment
        _updateDisputeStatus(_disputeId, DisputeStatus.AutoAssessment);

        // Simple automated assessment logic
        uint256 confidenceScore = _calculateConfidenceScore(dispute);
        string memory recommendedAction;
        
        if (confidenceScore >= 85) {
            recommendedAction = "auto_resolve";
        } else if (confidenceScore >= 70) {
            recommendedAction = "request_more_info";
        } else {
            recommendedAction = "escalate_to_admin";
        }

        dispute.autoAssessment = AutoAssessment({
            confidenceScore: confidenceScore,
            recommendedAction: recommendedAction,
            reasoning: "Automated assessment based on dispute criteria",
            assessedAt: block.timestamp,
            completed: true
        });

        emit AutoAssessmentCompleted(_disputeId, confidenceScore, recommendedAction);

        // Execute recommended action
        _executeRecommendedAction(_disputeId, recommendedAction, confidenceScore);
    }

    /**
     * @dev Calculate confidence score for automated assessment
     */
    function _calculateConfidenceScore(Dispute memory dispute) internal view returns (uint256) {
        uint256 score = 50; // Base score

        // Adjust based on dispute category
        if (dispute.category == DisputeCategory.PaymentIssue) {
            score += 20; // Payment issues are usually clear-cut
        } else if (dispute.category == DisputeCategory.ItemNotReceived) {
            score += 15; // Can be verified with tracking
        } else if (dispute.category == DisputeCategory.ItemNotAsDescribed) {
            score -= 10; // Subjective, needs more evidence
        }

        // Adjust based on user history
        uint256 buyerDisputeRate = (userDisputeCount[dispute.buyer] * 100) / 10; // Simplified
        uint256 sellerDisputeRate = (userDisputeCount[dispute.seller] * 100) / 10; // Simplified

        if (buyerDisputeRate < 5) score += 10;
        if (sellerDisputeRate < 3) score += 15;

        // Adjust based on escrow amount
        if (dispute.escrowAmount > 1 ether) {
            score -= 15; // High value disputes need manual review
        }

        return score > 100 ? 100 : score;
    }

    /**
     * @dev Execute recommended action from assessment
     */
    function _executeRecommendedAction(
        uint256 _disputeId,
        string memory _action,
        uint256 _confidenceScore
    ) internal {
        if (keccak256(bytes(_action)) == keccak256(bytes("auto_resolve"))) {
            _autoResolve(_disputeId);
        } else if (keccak256(bytes(_action)) == keccak256(bytes("request_more_info"))) {
            _requestMoreInfo(_disputeId);
        } else {
            _escalateToAdmin(_disputeId, "Low confidence score requires manual review");
        }
    }

    /**
     * @dev Auto-resolve dispute
     */
    function _autoResolve(uint256 _disputeId) internal {
        Dispute storage dispute = disputes[_disputeId];
        
        // Simple resolution logic - can be enhanced
        ResolutionDecision decision;
        uint256 refundAmount;
        uint256 sellerCompensation;

        if (dispute.category == DisputeCategory.ItemNotReceived) {
            decision = ResolutionDecision.BuyerWins;
            refundAmount = dispute.escrowAmount;
            sellerCompensation = 0;
        } else {
            decision = ResolutionDecision.SellerWins;
            refundAmount = 0;
            sellerCompensation = dispute.escrowAmount;
        }

        _resolveDispute(_disputeId, decision, refundAmount, sellerCompensation, "Automated resolution");
    }

    /**
     * @dev Request more information
     */
    function _requestMoreInfo(uint256 _disputeId) internal {
        _updateDisputeStatus(_disputeId, DisputeStatus.PendingEvidence);
        disputes[_disputeId].responseDeadline = block.timestamp + 7 days;
    }

    /**
     * @dev Escalate dispute to admin
     */
    function _escalateToAdmin(uint256 _disputeId, string memory _reason) internal {
        disputes[_disputeId].requiresManualReview = true;
        _updateDisputeStatus(_disputeId, DisputeStatus.AdminReview);
        emit DisputeEscalated(_disputeId, address(0), _reason);
    }

    /**
     * @dev Assign arbitrator to dispute (Admin only)
     */
    function assignArbitrator(uint256 _disputeId, address _arbitrator) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(hasRole(ARBITRATOR_ROLE, _arbitrator), "Address is not an arbitrator");
        disputes[_disputeId].assignedArbitrator = _arbitrator;
        emit DisputeEscalated(_disputeId, _arbitrator, "Arbitrator assigned");
    }

    /**
     * @dev Resolve dispute manually (Arbitrator only)
     */
    function resolveDispute(
        uint256 _disputeId,
        ResolutionDecision _decision,
        uint256 _refundAmount,
        uint256 _sellerCompensation,
        string memory _reason
    ) external onlyRole(ARBITRATOR_ROLE) {
        Dispute storage dispute = disputes[_disputeId];
        require(
            dispute.assignedArbitrator == msg.sender || hasRole(ADMIN_ROLE, msg.sender),
            "Not assigned to this dispute"
        );

        _resolveDispute(_disputeId, _decision, _refundAmount, _sellerCompensation, _reason);
    }

    /**
     * @dev Internal function to resolve dispute
     */
    function _resolveDispute(
        uint256 _disputeId,
        ResolutionDecision _decision,
        uint256 _refundAmount,
        uint256 _sellerCompensation,
        string memory _reason
    ) internal {
        Dispute storage dispute = disputes[_disputeId];
        require(dispute.status != DisputeStatus.Resolved, "Dispute already resolved");
        require(_refundAmount + _sellerCompensation <= dispute.escrowAmount, "Invalid amounts");

        dispute.resolution = Resolution({
            decision: _decision,
            refundAmount: _refundAmount,
            sellerCompensation: _sellerCompensation,
            reason: _reason,
            resolvedBy: msg.sender,
            resolvedAt: block.timestamp,
            executed: false
        });

        _updateDisputeStatus(_disputeId, DisputeStatus.Resolved);

        emit DisputeResolved(_disputeId, _decision, _refundAmount, _sellerCompensation);

        // Execute resolution
        _executeResolution(_disputeId);
    }

    /**
     * @dev Execute resolution (transfer funds)
     */
    function _executeResolution(uint256 _disputeId) internal {
        Dispute storage dispute = disputes[_disputeId];
        Resolution storage resolution = dispute.resolution;
        
        require(!resolution.executed, "Resolution already executed");

        if (resolution.refundAmount > 0) {
            payable(dispute.buyer).transfer(resolution.refundAmount);
        }

        if (resolution.sellerCompensation > 0) {
            payable(dispute.seller).transfer(resolution.sellerCompensation);
        }

        resolution.executed = true;
        _updateDisputeStatus(_disputeId, DisputeStatus.Closed);
    }

    /**
     * @dev Update dispute status
     */
    function _updateDisputeStatus(uint256 _disputeId, DisputeStatus _newStatus) internal {
        DisputeStatus oldStatus = disputes[_disputeId].status;
        disputes[_disputeId].status = _newStatus;
        emit DisputeStatusUpdated(_disputeId, oldStatus, _newStatus);
    }

    /**
     * @dev Get dispute details
     */
    function getDispute(uint256 _disputeId) external view returns (Dispute memory) {
        return disputes[_disputeId];
    }

    /**
     * @dev Get dispute evidence
     */
    function getDisputeEvidence(uint256 _disputeId) external view returns (Evidence[] memory) {
        return disputeEvidence[_disputeId];
    }

    /**
     * @dev Get dispute messages
     */
    function getDisputeMessages(uint256 _disputeId) external view returns (string[] memory) {
        return disputeMessages[_disputeId];
    }

    /**
     * @dev Get user disputes
     */
    function getUserDisputes(address _user) external view returns (uint256[] memory) {
        return userDisputes[_user];
    }

    /**
     * @dev Emergency pause (Admin only)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause (Admin only)
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Withdraw contract balance (Admin only)
     */
    function withdraw() external onlyRole(ADMIN_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
    }
} 