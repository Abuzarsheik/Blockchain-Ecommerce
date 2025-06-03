# Blockchain Verification Testing Guide

## Overview

This guide provides comprehensive testing procedures for the blockchain verification system from different user perspectives (Buyer, Seller, Admin).

## Prerequisites

### Environment Setup
```bash
# Backend Setup
cd backend
npm install
cp .env.example .env

# Configure blockchain settings in .env
REACT_APP_NETWORK_ID=11155111  # Sepolia testnet
ETHEREUM_RPC_URL=your_ethereum_rpc_url
PRIVATE_KEY=your_private_key

# Frontend Setup
cd frontend
npm install
cp .env.example .env

# Configure API endpoints
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_NETWORK_ID=11155111
```

### Test Data Requirements
1. **Test Wallet Addresses**: At least 3 different wallet addresses for buyer, seller, and arbitrator
2. **Test Orders**: Orders with different statuses (pending, confirmed, shipped, delivered, completed, disputed)
3. **Test Escrow Contracts**: Deployed escrow contracts with various states

## Test Scenarios

### 1. Buyer Testing Scenarios

#### Test 1.1: View Order with Blockchain Verification
**Objective**: Verify buyers can see blockchain verification section for their orders

**Steps**:
1. Login as a buyer user
2. Navigate to order history
3. Select an order that has blockchain data (`blockchainTx` or `escrowId`)
4. Verify blockchain verification section appears
5. Check all verification links work

**Expected Results**:
- Blockchain verification section visible
- Transaction hash displayed correctly
- "View on Explorer" link opens correct blockchain explorer
- "Verify Transaction" link works
- Escrow details link (if applicable) accessible

**Test Data**:
```javascript
// Test order with blockchain data
{
  _id: "order123",
  userId: "buyer_user_id",
  status: "confirmed",
  total: 0.1,
  blockchainTx: "0x1234567890abcdef...",
  escrowId: "0xabcdef1234567890...",
  payment_method: "escrow"
}
```

#### Test 1.2: Escrow Contract Details Access
**Objective**: Buyers can view detailed escrow contract information

**Steps**:
1. Login as buyer
2. Go to order with escrow
3. Click "View Escrow Details" 
4. Verify all escrow information displays
5. Test copy-to-clipboard functionality
6. Test external links

**Expected Results**:
- Escrow contract address displayed
- Transaction parties shown correctly
- Timeline shows relevant events
- All copy buttons work
- External explorer links functional

### 2. Seller Testing Scenarios

#### Test 2.1: Seller Access to Escrow Details
**Objective**: Sellers can view escrow contracts for their orders

**Steps**:
1. Login as seller user
2. Access order management
3. Select order with escrow
4. Verify seller can view escrow details
5. Check seller-specific information

**Expected Results**:
- Seller can access escrow details
- Seller address correctly identified
- Seller-specific actions available (if any)
- Timeline shows seller confirmations

#### Test 2.2: Order Confirmation with Blockchain Updates
**Objective**: Seller confirmations update blockchain records

**Steps**:
1. Login as seller
2. Confirm order with escrow
3. Verify blockchain transaction created
4. Check order status updates
5. Verify timeline updates

**Expected Results**:
- Seller confirmation recorded on blockchain
- Order status updated in database
- Timeline reflects confirmation
- Blockchain verification section updated

### 3. Admin Testing Scenarios

#### Test 3.1: Admin Full Access
**Objective**: Admins can view all escrow contracts and blockchain data

**Steps**:
1. Login as admin user
2. Access admin dashboard
3. View any escrow contract
4. Verify admin-specific data shown
5. Test bulk operations (if any)

**Expected Results**:
- Admin can view any escrow
- Additional admin data displayed
- System statistics visible
- Full transaction history accessible

#### Test 3.2: Admin Dispute Resolution
**Objective**: Admin can handle disputed escrow contracts

**Steps**:
1. Find disputed escrow
2. Access escrow details as admin
3. Review dispute information
4. Test admin resolution actions
5. Verify blockchain updates

**Expected Results**:
- Dispute details clearly displayed
- Admin resolution options available
- Actions update blockchain state
- All parties notified of resolution

### 4. Security Testing

#### Test 4.1: Unauthorized Access Prevention
**Objective**: Users cannot access escrow contracts they don't own

**Steps**:
1. Login as User A
2. Try to access User B's escrow contract directly
3. Verify access denied
4. Test various URL manipulation attempts

**Expected Results**:
- 403 Forbidden error returned
- No sensitive data exposed
- Error message user-friendly
- Logs security attempt

#### Test 4.2: Wallet Address Validation
**Objective**: Wallet address matching works correctly

**Steps**:
1. User with multiple wallet addresses
2. Test access with different addresses
3. Verify correct permissions granted
4. Test address case sensitivity

**Expected Results**:
- Correct wallet addresses grant access
- Case insensitive matching
- Invalid addresses rejected
- Proper error messages

### 5. Cross-Platform Testing

#### Test 5.1: Mobile Responsiveness
**Objective**: Verify mobile experience is optimal

**Steps**:
1. Test on various mobile devices
2. Check responsive design
3. Verify touch interactions
4. Test copy functionality on mobile

**Expected Results**:
- Mobile layout works correctly
- Touch interactions responsive
- Copy buttons work on mobile
- External links open properly

#### Test 5.2: Browser Compatibility
**Objective**: Ensure cross-browser functionality

**Steps**:
1. Test on Chrome, Firefox, Safari, Edge
2. Verify Web3 wallet connections
3. Test clipboard API across browsers
4. Check external link behavior

**Expected Results**:
- Consistent behavior across browsers
- Wallet connections work
- Clipboard API degrades gracefully
- External links function properly

### 6. Performance Testing

#### Test 6.1: Loading Performance
**Objective**: Verify acceptable loading times

**Steps**:
1. Test with slow network conditions
2. Measure time to load escrow details
3. Check loading states display
4. Test error recovery

**Expected Results**:
- Loading states show appropriate messages
- Reasonable load times (< 3 seconds)
- Error states handled gracefully
- Retry functionality works

#### Test 6.2: Large Data Sets
**Objective**: Test with many escrow contracts

**Steps**:
1. Create test data with 100+ escrows
2. Test pagination/filtering
3. Verify search functionality
4. Check memory usage

**Expected Results**:
- Performance remains acceptable
- Pagination works correctly
- Search is responsive
- No memory leaks

## Test Data Setup

### Sample Test Users
```javascript
// Buyer User
{
  _id: "buyer123",
  firstName: "John",
  lastName: "Buyer",
  email: "buyer@test.com",
  wallet_address: "0x1111111111111111111111111111111111111111",
  userType: "buyer"
}

// Seller User
{
  _id: "seller123",
  firstName: "Jane",
  lastName: "Seller", 
  email: "seller@test.com",
  wallet_address: "0x2222222222222222222222222222222222222222",
  userType: "seller"
}

// Admin User
{
  _id: "admin123",
  firstName: "Admin",
  lastName: "User",
  email: "admin@test.com",
  wallet_address: "0x3333333333333333333333333333333333333333",
  userType: "admin"
}
```

### Sample Test Orders
```javascript
// Complete Order with Escrow
{
  _id: "order_complete_123",
  userId: "buyer123",
  sellerId: "seller123",
  status: "completed",
  total: 0.05,
  payment_method: "escrow",
  escrowId: "0x4444444444444444444444444444444444444444",
  blockchainTx: "0x5555555555555555555555555555555555555555555555555555555555555555",
  items: [
    {
      product: "product123",
      name: "Test Product",
      quantity: 1,
      price: 0.05
    }
  ],
  created_at: new Date(),
  delivered_at: new Date()
}

// Disputed Order
{
  _id: "order_disputed_123",
  userId: "buyer123",
  sellerId: "seller123", 
  status: "disputed",
  total: 0.08,
  payment_method: "escrow",
  escrowId: "0x6666666666666666666666666666666666666666",
  dispute_reason: "Product not as described"
}
```

## Automated Testing

### Backend API Tests
```bash
# Run escrow endpoint tests
npm run test:escrow

# Test specific scenarios
npm run test -- --grep "escrow authorization"
npm run test -- --grep "escrow details validation"
```

### Frontend Component Tests
```bash
# Test blockchain verification components
npm run test src/pages/OrderDetail.test.js
npm run test src/pages/EscrowDetails.test.js

# Test user interactions
npm run test -- --testNamePattern="blockchain verification"
```

### Integration Tests
```bash
# Full end-to-end testing
npm run test:e2e

# Specific user journeys
npm run test:e2e -- --spec "buyer-blockchain-verification"
npm run test:e2e -- --spec "seller-escrow-management"
npm run test:e2e -- --spec "admin-escrow-oversight"
```

## Common Issues & Solutions

### Issue 1: Escrow Details Not Loading
**Symptoms**: Escrow details page shows loading indefinitely
**Solutions**:
- Check network connection to blockchain
- Verify escrow contract address format
- Check user permissions
- Verify backend service is running

### Issue 2: Blockchain Explorer Links Not Working
**Symptoms**: External links don't open correct pages
**Solutions**:
- Verify network configuration
- Check explorer URL formats
- Test with different browsers
- Validate transaction/address formats

### Issue 3: Copy to Clipboard Not Working
**Symptoms**: Copy buttons don't work
**Solutions**:
- Check HTTPS requirement for clipboard API
- Test browser compatibility
- Verify clipboard permissions
- Implement fallback for older browsers

### Issue 4: Authorization Errors
**Symptoms**: Users can't access their own escrow contracts
**Solutions**:
- Check wallet address matching logic
- Verify user authentication
- Check order-escrow relationships
- Validate permission logic

## Success Criteria

### Functionality Checklist
- [ ] Buyers can view their order blockchain verification
- [ ] Sellers can access relevant escrow contracts
- [ ] Admins have full access to all contracts
- [ ] Unauthorized access properly blocked
- [ ] External links work correctly
- [ ] Copy functionality works
- [ ] Mobile experience is smooth
- [ ] Loading states are informative
- [ ] Error handling is user-friendly
- [ ] Performance is acceptable

### User Experience Checklist
- [ ] Interface is intuitive and easy to use
- [ ] Visual hierarchy guides user attention
- [ ] Information is clearly presented
- [ ] Actions provide immediate feedback
- [ ] Error messages are helpful
- [ ] Design is responsive and accessible
- [ ] Navigation is logical and consistent

### Security Checklist
- [ ] User authorization works correctly
- [ ] Sensitive data is protected
- [ ] Security attempts are logged
- [ ] Wallet address validation is secure
- [ ] API endpoints are protected
- [ ] Input validation prevents attacks

## Reporting Issues

When reporting issues, include:
1. User type and permissions
2. Specific steps to reproduce
3. Expected vs actual behavior
4. Browser and device information
5. Network/blockchain configuration
6. Screenshots/videos if applicable
7. Console errors or logs

## Conclusion

This testing guide ensures comprehensive validation of the blockchain verification system across all user types and scenarios. Regular testing following these procedures will maintain system reliability and user satisfaction. 