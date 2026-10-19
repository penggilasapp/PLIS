# Data Model Specification - PLIS

## 1. Entities & Relations

### Customers (`customers`)
- `id`: string (Key: `CUST-XXXXXX`)
- `name`: string
- `phone`: string (Indexed for duplicate warning check)
- `address`: string?
- `notes`: string?
- `createdAt`: ISO 8601 string
- `updatedAt`: ISO 8601 string

### Master Layanan & Hierarki
- **Categories (`categories`)**: `id`, `name`
- **Classifications (`classifications`)**: `id`, `categoryId`, `name`
- **Units (`units`)**: `id`, `name`, `description`
- **Services (`services`)**:
  - `id`: string (`SRV-XXXXX`)
  - `categoryId`: string
  - `categoryName`: string
  - `classificationId`: string
  - `classificationName`: string
  - `name`: string
  - `unitId`: string
  - `unitName`: string
  - `pricePerUnit`: number
  - `estimatedDurationHours`: number
  - `isActive`: boolean

### Transactions (`transactions`)
- `id`: string (`TRX-YYYYMMDD-XXXX` - Sequential & Unique)
- `orderNumber`: string
- `customerId`: string
- `customerName`: string
- `customerPhone`: string
- `customerAddress`: string?
- `items`: Array of:
  - `id`: string
  - `serviceId`: string
  - `serviceName`: string (Snapshot)
  - `categoryName`: string (Snapshot)
  - `classificationName`: string (Snapshot)
  - `unitName`: string (Snapshot)
  - `pricePerUnit`: number (Snapshot)
  - `quantity`: number
  - `subtotal`: number
  - `notes`: string?
- `totalAmount`: number (Sum of item subtotals)
- `discount`: number
- `finalAmount`: number (totalAmount - discount)
- `paidAmount`: number (Sum of valid payments)
- `remainingAmount`: number (finalAmount - paidAmount)
- `paymentStatus`: `'BELUM_DIBAYAR' | 'SEBAGIAN' | 'LUNAS'`
- `laundryStatus`: `'DITERIMA' | 'DIPROSES' | 'SIAP_DIAMBIL' | 'SELESAI'`
- `statusHistory`: Array of `{ status, timestamp, updatedByUserId, updatedByUserName, note }`
- `createdAt`: string
- `estimatedCompletionAt`: string
- `completedAt`: string?
- `perfumePreference`: string?
- `specialNotes`: string?
- `isUrgent`: boolean
- `createdByUserId`: string
- `createdByUserName`: string

### Payments (`payments`)
- `id`: string (`PAY-YYYYMMDD-XXXX-YY`)
- `transactionId`: string
- `amount`: number
- `method`: `'TUNAI' | 'QRIS' | 'TRANSFER_BANK' | 'E_WALLET'`
- `paymentDate`: string
- `referenceNumber`: string?
- `notes`: string?
- `recordedByUserId`: string
- `recordedByUserName`: string

### Expenses (`expenses`)
- `id`: string (`EXP-TIMESTAMP`)
- `date`: string
- `category`: string
- `categoryLabel`: string
- `description`: string
- `amount`: number
- `paymentMethod`: string
- `notes`: string?
- `recordedByUserId`: string
- `recordedByUserName`: string

### Cash Sessions (`cashSessions`)
- `id`: string (`CASH-YYYY-MM-DD`)
- `date`: string
- `startingCash`: number
- `totalCashReceived`: number
- `totalCashExpense`: number
- `expectedEndingCash`: number
- `actualEndingCash`: number?
- `cashDifference`: number?
- `isClosed`: boolean

### Audit Logs (`auditLogs`)
- `id`: string
- `timestamp`: string
- `actionType`: string
- `entityType`: string
- `entityId`: string
- `description`: string
- `userId`: string
- `userName`: string
