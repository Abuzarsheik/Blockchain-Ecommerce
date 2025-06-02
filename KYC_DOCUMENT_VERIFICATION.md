# KYC Document Upload Verification Guide

## 📋 Overview
This guide explains how to verify that KYC documents are properly uploaded and saved in the Blocmerce system.

## 🔍 How Documents Are Saved

### Backend Implementation
1. **File Storage**: Documents are saved to `backend/uploads/kyc/` directory
2. **Database Records**: File paths and metadata are stored in MongoDB User collection
3. **Enhanced Logging**: Detailed logs show each step of the upload process
4. **Verification**: Database queries confirm documents are properly stored

### Document Structure in Database
```javascript
user.kyc.documents = {
  identity: {
    frontImage: "/uploads/kyc/userid_identityFront_timestamp_hash.jpg",
    backImage: "/uploads/kyc/userid_identityBack_timestamp_hash.jpg",
    type: "national_id",
    documentNumber: "ABC123456",
    verified: false
  },
  proofOfAddress: {
    image: "/uploads/kyc/userid_proofOfAddress_timestamp_hash.pdf",
    type: "utility_bill",
    verified: false
  },
  selfie: {
    image: "/uploads/kyc/userid_selfie_timestamp_hash.jpg",
    verified: false
  }
}
```

## ✅ Verification Methods

### 1. Backend Logs
When you upload documents, check the backend console for these confirmation logs:

```
📤 Starting KYC document upload for user 673abc123def456789
📋 Files received: identityFront, proofOfAddress, selfie
✅ Identity front document saved: 673abc123def456789_identityFront_1735776000000_a1b2c3d4.jpg
✅ Proof of address document saved: 673abc123def456789_proofOfAddress_1735776000000_e5f6g7h8.pdf
✅ Selfie document saved: 673abc123def456789_selfie_1735776000000_i9j0k1l2.jpg
📁 All KYC documents successfully saved to database for user: 673abc123def456789
📊 Total documents saved: 3
🔍 Database verification completed:
   - Identity Front: ✅ SAVED
   - Identity Back: ❌ NOT SAVED
   - Proof of Address: ✅ SAVED
   - Selfie: ✅ SAVED
```

### 2. Frontend Success Messages
After successful upload, you'll see:
- ✅ Toast notification: "🎉 Documents Successfully Saved!"
- Console log with detailed upload confirmation
- Progress indicator showing completion percentage

### 3. API Endpoint Verification
Use the verification endpoint to check document status:

**GET** `/api/profile/kyc/verify-documents`

This returns detailed information about all saved documents:

```json
{
  "success": true,
  "message": "✅ All required documents are properly saved and accessible!",
  "verification": {
    "userId": "673abc123def456789",
    "userName": "John Doe",
    "kycStatus": "pending",
    "documents": {
      "identity": {
        "front": {
          "path": "/uploads/kyc/673abc123def456789_identityFront_1735776000000_a1b2c3d4.jpg",
          "exists": true,
          "verified": false
        },
        "back": {
          "path": null,
          "exists": false,
          "verified": false
        }
      },
      "proofOfAddress": {
        "path": "/uploads/kyc/673abc123def456789_proofOfAddress_1735776000000_e5f6g7h8.pdf",
        "exists": true,
        "verified": false
      },
      "selfie": {
        "path": "/uploads/kyc/673abc123def456789_selfie_1735776000000_i9j0k1l2.jpg",
        "exists": true,
        "verified": false
      }
    }
  },
  "summary": {
    "totalDocuments": 3,
    "allRequiredDocuments": true,
    "status": "✅ COMPLETE"
  }
}
```

### 4. File System Verification
Check the physical files exist:
```bash
ls backend/uploads/kyc/
# Should show uploaded files with naming pattern:
# userid_documenttype_timestamp_hash.extension
```

### 5. Database Direct Query
In MongoDB, check the user document:
```javascript
db.users.findOne(
  { _id: ObjectId("673abc123def456789") },
  { "kyc.documents": 1, "firstName": 1, "lastName": 1 }
)
```

## 🎯 What Confirms Documents Are Saved

### ✅ Success Indicators:
1. **Backend logs** show "✅ SAVED" for each document
2. **Frontend toast** displays success message with file details
3. **Verification endpoint** shows `"exists": true` for all documents
4. **File system** contains the actual uploaded files
5. **Database** has document paths stored in user record

### ❌ Failure Indicators:
1. Backend logs show "❌ NOT SAVED"
2. Frontend shows error toast
3. Verification endpoint shows `"exists": false`
4. Files missing from uploads directory
5. Database document paths are null/empty

## 📱 How to Test

### Step 1: Upload Documents
1. Go to Profile Settings → KYC Verification
2. Complete personal information
3. Upload required documents (Identity, Proof of Address, Selfie)
4. Watch for success message

### Step 2: Verify Upload
1. Check browser console for detailed upload confirmation
2. Watch backend logs for save confirmations
3. Use verification endpoint: `GET /api/profile/kyc/verify-documents`
4. Check physical files in `backend/uploads/kyc/`

### Step 3: Confirm Database Storage
1. Check KYC status in Profile Settings
2. Verify completion percentage increased
3. Ensure documents show as uploaded in UI

## 🔒 Security Features

- **Unique filenames** prevent overwrites and enhance security
- **File validation** ensures only allowed types and sizes
- **Secure paths** prevent directory traversal attacks
- **Database verification** confirms files are properly linked
- **Audit trail** logs all upload activities

## 🚀 Next Steps After Upload

Once documents are verified as saved:
1. Complete any remaining KYC steps
2. Submit application for review
3. Wait for admin verification
4. Receive approval notification

---

**✅ CONFIRMATION: Your documents are properly saved when you see all the success indicators above!** 