# Milestone 3 — Task 5: Shared Expenses, Settlements & Debt Minimization DSA (M3T5_Impl_readmeAg.md)

**Document Version:** 3.5.0  
**Author:** Shreyas (Azn - Backend Engineer) & Antigravity (Ag - AI Pair Programmer)  
**Status:** **100% IMPLEMENTED & COMPILED (90 Source Files, 0 Errors) | Live Postman Tests 1–5 Executed & Passed**  
**Target Path:** `src/main/java/com/tripnest/backend/`  

---

## 1. Feature Overview & Architecture

Task 5 implements the collaborative financial settlement engine for group travel in TripNest:
1. **Equal & Custom Expense Splitting:** Allows companions to split any trip expenditure equally or assign customized amounts.
2. **Penny Split Balancing:** Guarantees that division remainder paise (e.g. ₹2,000.00 / 3 or ₹100.00 / 3) are distributed one paisa at a time (₹666.67, ₹666.67, ₹666.66) so $\sum \text{shares} \equiv \text{totalBill}$ to the exact paisa.
3. **Payer Self-Share Invariant:** Payer's own consumption share is marked inherently settled (`is_settled = true`), preventing circular self-debts.
4. **Member Contribution Passbook:** Aggregates `totalPaid`, `fairShare`, `netBalance`, and human-friendly badge `status` (`RECEIVES`, `OWES`, `SETTLED`).
5. **Greedy Debt Minimization Algorithm (Min-Cash-Flow DSA):** Simplifies an entangled graph of up to $\frac{N(N-1)}{2}$ peer-to-peer debts down to **at most $N - 1$ direct transactions** ($O(N \log N)$ sorting + $O(N)$ two-pointer greedy matching).
6. **Direct Debt Settlement Mutation:** `PUT /api/splits/{id}/settle` marks debts as paid with audit timestamp.

---

## 2. Implemented Code Inventory (8 Files)

| File | Type | Location | Purpose |
| :--- | :--- | :--- | :--- |
| `ExpenseSplit.java` | Entity | `entity/` | JPA entity mapping `expense_splits` table with foreign keys & indexes |
| `ExpenseSplitRepository.java` | Repository | `repository/` | Spring Data JPA repo with `JOIN FETCH`, JPQL aggregations, and derived queries |
| `ExpenseSplitRequest.java` | DTO | `dto/split/` | Input payload supporting `EQUAL` and `CUSTOM` split modes |
| `ExpenseSplitResponse.java` | DTO | `dto/split/` | Rich receipt response card with debtor, creditor, and expense details |
| `DebtSettlementDTO.java` | DTO | `dto/split/` | Minimized settlement card: "Who pays whom how much" |
| `MemberContributionDTO.java` | DTO | `dto/split/` | Trip member financial summary: total paid, fair share, net balance |
| `ExpenseSplitService.java` | Service | `service/` | Business rules, penny balancing, recalculation, and greedy debt minimization |
| `ExpenseSplitController.java` | Controller | `controller/` | 7 REST endpoints with JWT security and dual URL aliases |

---

## 3. The 7 Active REST Endpoints

| Method | Endpoint URL | Description | Auth | Success Status |
| :--- | :--- | :--- | :---: | :---: |
| **`POST`** | `/api/expenses/{expenseId}/split` | Split an expense (EQUAL or CUSTOM) | Bearer JWT | `201 Created` |
| **`GET`** | `/api/expenses/{expenseId}/splits` | View all individual shares for an expense | Bearer JWT | `200 OK` |
| **`GET`** | `/api/trips/{tripId}/splits` | View all split shares across the entire trip | Bearer JWT | `200 OK` |
| **`GET`** | `/api/trips/{tripId}/splits/my-debts` | View current user's active/unsettled debts | Bearer JWT | `200 OK` |
| **`PUT`** | `/api/splits/{splitId}/settle` | Settle a specific split debt share | Bearer JWT | `200 OK` |
| **`GET`** | `/api/trips/{tripId}/splits/contributions` | Member contribution summary (Paid vs Share) | Bearer JWT | `200 OK` |
| **`GET`** | `/api/trips/{tripId}/debts/settle` | Greedy Debt Minimization settlement plan | Bearer JWT | `200 OK` |

---

## 4. Live Postman Test Suite & Actual Verification Results

### 🔑 Authentication Setup: Get JWT Bearer Token
```http
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{
  "email": "aln@example.com",
  "password": "yourPassword"
}
```
*Response copies Bearer token into Postman request header:*  
`Authorization: Bearer <YOUR_TOKEN>`

---

### 📊 Database Context Before Testing (Expenses in Trip 7)
```text
tripnestdb2ag=# select e.id as expId, e.trip_id, e.amount, e.description, t.user_id, t.title 
                 from expenses e join trips t on e.trip_id = t.id;

 expid | trip_id |  amount  |                description                 | user_id |         title
-------+---------+----------+--------------------------------------------+---------+------------------------
     2 |       7 |  2200.00 | Taxi from Airport to Hotel                 |       6 | hill station tour sept
     1 |       7 |  2000.00 | Dinner at Heritage Cafe (Includes Dessert) |       6 | hill station tour sept
     3 |       7 | 10000.00 | Hotel charge                               |       6 | hill station tour sept
     4 |       7 | 10000.50 | Hotel charge                               |       6 | hill station tour sept
(4 rows)
```

---

### 🧪 Test 1: Equal Split with Penny Balancing (₹2,000.00 / 3 Friends)
* **Goal:** Verify that a bill split among 3 friends (Users 6, 2, 7) handles remainder paise correctly and automatically marks the payer's own share as `isSettled = true`.
* **Method:** `POST`
* **URL:** `http://localhost:8080/api/expenses/1/split` *(Total bill: ₹2,000.00, paid by user 6)*
* **Headers:**  
  `Authorization: Bearer {{TOKEN}}`  
  `Content-Type: application/json`
* **Body (raw JSON):**
```json
{
  "splitType": "EQUAL",
  "userIds": [6, 2, 7]
}
```
* **Status:** `201 Created`
* **Actual Live Postman Response:**
```json
[
  {
    "id": 1,
    "expenseId": 1,
    "expenseDescription": "Dinner at Heritage Cafe (Includes Dessert)",
    "userId": 6,
    "userName": "aln",
    "userEmail": "aln@example.com",
    "shareAmount": 666.67,
    "isSettled": true,
    "settledAt": "2026-09-28T16:24:11.3421455",
    "paidByUserId": 6,
    "paidByUserName": "aln",
    "createdAt": "2026-09-28T16:24:11.3479271"
  },
  {
    "id": 2,
    "expenseId": 1,
    "expenseDescription": "Dinner at Heritage Cafe (Includes Dessert)",
    "userId": 2,
    "userName": "pi",
    "userEmail": "ramanujanmthgd1@gmail.com",
    "shareAmount": 666.67,
    "isSettled": false,
    "settledAt": null,
    "paidByUserId": 6,
    "paidByUserName": "aln",
    "createdAt": "2026-09-28T16:24:11.3664304"
  },
  {
    "id": 3,
    "expenseId": 1,
    "expenseDescription": "Dinner at Heritage Cafe (Includes Dessert)",
    "userId": 7,
    "userName": "kim",
    "userEmail": "kim@example.com",
    "shareAmount": 666.66,
    "isSettled": false,
    "settledAt": null,
    "paidByUserId": 6,
    "paidByUserName": "aln",
    "createdAt": "2026-09-28T16:24:11.3678302"
  }
]
```
* **What to Verify:**
  - The sum of the 3 shares is exact: $666.67 + 666.67 + 666.66 = 2000.00$. Zero paise lost!
  - The payer (`userId: 6`) has `"isSettled": true` (no self-debt). Other companions have `"isSettled": false`.

---

### 🧪 Test 2: Custom Split with Specific Amounts (₹2,200.00 Taxi)
* **Goal:** Verify that travelers can assign customized amounts to each person.
* **Method:** `POST`
* **URL:** `http://localhost:8080/api/expenses/2/split` *(Total bill: ₹2,200.00)*
* **Headers:** `Authorization: Bearer {{TOKEN}}`
* **Body (raw JSON):**
```json
{
  "splitType": "CUSTOM",
  "customShares": [
    { "userId": 6, "amount": 1200.00 },
    { "userId": 2, "amount": 500.00 },
    { "userId": 7, "amount": 500.00 }
  ]
}
```
* **Status:** `201 Created`
* **Actual Live Postman Response:**
```json
[
  {
    "id": 4,
    "expenseId": 2,
    "expenseDescription": "Taxi from Airport to Hotel",
    "userId": 6,
    "userName": "aln",
    "userEmail": "aln@example.com",
    "shareAmount": 1200.00,
    "isSettled": true,
    "settledAt": "2026-09-28T16:34:51.137585",
    "paidByUserId": 6,
    "paidByUserName": "aln",
    "createdAt": "2026-09-28T16:34:51.1459108"
  },
  {
    "id": 5,
    "expenseId": 2,
    "expenseDescription": "Taxi from Airport to Hotel",
    "userId": 2,
    "userName": "pi",
    "userEmail": "ramanujanmthgd1@gmail.com",
    "shareAmount": 500.00,
    "isSettled": false,
    "settledAt": null,
    "paidByUserId": 6,
    "paidByUserName": "aln",
    "createdAt": "2026-09-28T16:34:51.1636532"
  },
  {
    "id": 6,
    "expenseId": 2,
    "expenseDescription": "Taxi from Airport to Hotel",
    "userId": 7,
    "userName": "kim",
    "userEmail": "kim@example.com",
    "shareAmount": 500.00,
    "isSettled": false,
    "settledAt": null,
    "paidByUserId": 6,
    "paidByUserName": "aln",
    "createdAt": "2026-09-28T16:34:51.1671637"
  }
]
```

---

### 🧪 Test 3: View All Individual Shares for an Expense
* **Goal:** Retrieve the itemized breakdown of who owes what for one specific bill.
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/expenses/3/splits` *(Total bill: ₹10,000.00)*
* **Headers:** `Authorization: Bearer {{TOKEN}}`
* **Status:** `200 OK`
* **Actual Live Postman Response:**
```json
[
  {
    "id": 7,
    "expenseId": 3,
    "expenseDescription": "Hotel charge",
    "userId": 6,
    "userName": "aln",
    "userEmail": "aln@example.com",
    "shareAmount": 6000.00,
    "isSettled": true,
    "settledAt": "2026-09-28T17:29:28.636679",
    "paidByUserId": 6,
    "paidByUserName": "aln",
    "createdAt": "2026-09-28T17:29:28.638679"
  },
  {
    "id": 8,
    "expenseId": 3,
    "expenseDescription": "Hotel charge",
    "userId": 2,
    "userName": "pi",
    "userEmail": "ramanujanmthgd1@gmail.com",
    "shareAmount": 2000.00,
    "isSettled": false,
    "settledAt": null,
    "paidByUserId": 6,
    "paidByUserName": "aln",
    "createdAt": "2026-09-28T17:29:28.64468"
  },
  {
    "id": 9,
    "expenseId": 3,
    "expenseDescription": "Hotel charge",
    "userId": 7,
    "userName": "kim",
    "userEmail": "kim@example.com",
    "shareAmount": 2000.00,
    "isSettled": false,
    "settledAt": null,
    "paidByUserId": 6,
    "paidByUserName": "aln",
    "createdAt": "2026-09-28T17:29:28.64569"
  }
]
```

---

### 🧪 Test 4: View All Splits Across the Entire Trip
* **Goal:** Fetch all split records belonging to a trip in one call.
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/trips/7/splits`
* **Headers:** `Authorization: Bearer {{TOKEN}}`
* **Status:** `200 OK`
* **Actual Live Postman Response (All 9 Splits):**
```json
[
  {"id":1,"expenseId":1,"expenseDescription":"Dinner at Heritage Cafe (Includes Dessert)","userId":6,"userName":"aln","userEmail":"aln@example.com","shareAmount":666.67,"isSettled":true,"settledAt":"2026-09-28T16:24:11.342146","paidByUserId":6,"paidByUserName":"aln","createdAt":"2026-09-28T16:24:11.347927"},
  {"id":2,"expenseId":1,"expenseDescription":"Dinner at Heritage Cafe (Includes Dessert)","userId":2,"userName":"pi","userEmail":"ramanujanmthgd1@gmail.com","shareAmount":666.67,"isSettled":false,"settledAt":null,"paidByUserId":6,"paidByUserName":"aln","createdAt":"2026-09-28T16:24:11.36643"},
  {"id":3,"expenseId":1,"expenseDescription":"Dinner at Heritage Cafe (Includes Dessert)","userId":7,"userName":"kim","userEmail":"kim@example.com","shareAmount":666.66,"isSettled":false,"settledAt":null,"paidByUserId":6,"paidByUserName":"aln","createdAt":"2026-09-28T16:24:11.36783"},
  
  {"id":4,"expenseId":2,"expenseDescription":"Taxi from Airport to Hotel","userId":6,"userName":"aln","userEmail":"aln@example.com","shareAmount":1200.00,"isSettled":true,"settledAt":"2026-09-28T16:34:51.137585","paidByUserId":6,"paidByUserName":"aln","createdAt":"2026-09-28T16:34:51.145911"},
  {"id":5,"expenseId":2,"expenseDescription":"Taxi from Airport to Hotel","userId":2,"userName":"pi","userEmail":"ramanujanmthgd1@gmail.com","shareAmount":500.00,"isSettled":false,"settledAt":null,"paidByUserId":6,"paidByUserName":"aln","createdAt":"2026-09-28T16:34:51.163653"},
  {"id":6,"expenseId":2,"expenseDescription":"Taxi from Airport to Hotel","userId":7,"userName":"kim","userEmail":"kim@example.com","shareAmount":500.00,"isSettled":false,"settledAt":null,"paidByUserId":6,"paidByUserName":"aln","createdAt":"2026-09-28T16:34:51.167164"},
  
  {"id":7,"expenseId":3,"expenseDescription":"Hotel charge","userId":6,"userName":"aln","userEmail":"aln@example.com","shareAmount":6000.00,"isSettled":true,"settledAt":"2026-09-28T17:29:28.636679","paidByUserId":6,"paidByUserName":"aln","createdAt":"2026-09-28T17:29:28.638679"},
  {"id":8,"expenseId":3,"expenseDescription":"Hotel charge","userId":2,"userName":"pi","userEmail":"ramanujanmthgd1@gmail.com","shareAmount":2000.00,"isSettled":false,"settledAt":null,"paidByUserId":6,"paidByUserName":"aln","createdAt":"2026-09-28T17:29:28.64468"},
  {"id":9,"expenseId":3,"expenseDescription":"Hotel charge","userId":7,"userName":"kim","userEmail":"kim@example.com","shareAmount":2000.00,"isSettled":false,"settledAt":null,"paidByUserId":6,"paidByUserName":"aln","createdAt":"2026-09-28T17:29:28.64569"}
]
```

---

### 🧪 Test 5: View My Active / Pending Debts
* **Goal:** Fetch only the logged-in user's active, unsettled debts for this trip.
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/trips/7/splits/my-debts`
* **Headers:** `Authorization: Bearer {{TOKEN_PI}}` (When logged in as Pi)
* **Status:** `200 OK`
* **Response:** Returns only the split shares where `userId = 2` and `isSettled = false`.

---

### 🧪 Test 6: Member Contribution Financial Summary
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/trips/7/splits/contributions`
* **Headers:** `Authorization: Bearer {{TOKEN}}`
* **Status:** `200 OK`
* **Expected Response:**
```json
[
  {
    "userId": 6,
    "userName": "aln",
    "userEmail": "aln@example.com",
    "totalPaid": 14200.00,
    "fairShare": 7866.67,
    "netBalance": 6333.33,
    "status": "RECEIVES"
  },
  {
    "userId": 2,
    "userName": "pi",
    "userEmail": "ramanujanmthgd1@gmail.com",
    "totalPaid": 0.00,
    "fairShare": 3166.67,
    "netBalance": -3166.67,
    "status": "OWES"
  },
  {
    "userId": 7,
    "userName": "kim",
    "userEmail": "kim@example.com",
    "totalPaid": 0.00,
    "fairShare": 3166.66,
    "netBalance": -3166.66,
    "status": "OWES"
  }
]
```

---

### 🧪 Test 7: Greedy Debt Minimization ("Who Owes Whom How Much")
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/trips/7/debts/settle`
* **Headers:** `Authorization: Bearer {{TOKEN}}`
* **Status:** `200 OK`
* **Expected Response:**
```json
[
  {
    "fromUserId": 2,
    "fromUserName": "pi",
    "toUserId": 6,
    "toUserName": "aln",
    "amount": 3166.67
  },
  {
    "fromUserId": 7,
    "fromUserName": "kim",
    "toUserId": 6,
    "toUserName": "aln",
    "amount": 3166.66
  }
]
```

---

### 🧪 Test 8: Settle a Debt
* **Method:** `PUT`
* **URL:** `http://localhost:8080/api/splits/2/settle`
* **Headers:** `Authorization: Bearer {{TOKEN}}`
* **Status:** `200 OK`
* **Verification:** `isSettled: true`, `settledAt` populated with current timestamp.

---

## 5. PostgreSQL Verification Queries

```sql
-- 1. Master Split Ledger: Shows who owes what to whom for each expense
SELECT 
    es.id AS split_id,
    e.id AS expense_id,
    e.description AS expense_title,
    e.amount AS total_bill,
    payer.name AS paid_by,
    ower.name AS owes_name,
    es.share_amount,
    es.is_settled,
    es.settled_at
FROM expense_splits es
JOIN expenses e ON es.expense_id = e.id
JOIN users payer ON e.paid_by_user_id = payer.id
JOIN users ower ON es.user_id = ower.id
WHERE e.trip_id = 7
ORDER BY e.id, es.id;

-- 2. Penny-Balancing Sanity Check (Audit: Discrepancy must equal 0.00)
SELECT 
    e.id AS expense_id,
    e.description,
    e.amount AS expense_total,
    COALESCE(SUM(es.share_amount), 0.00) AS total_splits_sum,
    (e.amount - COALESCE(SUM(es.share_amount), 0.00)) AS discrepancy
FROM expenses e
LEFT JOIN expense_splits es ON e.id = es.expense_id
WHERE e.trip_id = 7
GROUP BY e.id, e.description, e.amount
ORDER BY e.id;
```
