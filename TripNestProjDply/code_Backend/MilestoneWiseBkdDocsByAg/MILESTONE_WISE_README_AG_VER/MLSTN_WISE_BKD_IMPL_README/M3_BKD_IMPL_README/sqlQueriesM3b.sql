
SELECT current_database();

-- M3 P1 BUDGET --------------------------
select * from users;
select * from trips;

select * from trips where user_id = 6;

SELECT * FROM budgets;


-- user, bgt, trip, brief detl, with no bgt also
SELECT 
    u.id AS user_id,
    u.email AS user_email,
    t.id AS trip_id,
    t.title AS trip_name,
    b.id AS budget_id,
    COALESCE(b.total_budget, 0.00) AS budget_amt,
    COALESCE(b.currency, 'N/A') AS currency
FROM users u
JOIN trips t ON t.user_id = u.id
LEFT JOIN budgets b ON b.trip_id = t.id
ORDER BY u.id, t.id;

-- user, bgt, trip, brief detl, with bgt dtls only
SELECT 
    u.id AS user_id,
    u.email AS user_email,
    t.id AS trip_id,
    t.title AS trip_name,
    b.id AS budget_id,
    b.total_budget AS budget_amt,
    b.currency
FROM users u
JOIN trips t ON t.user_id = u.id
JOIN budgets b ON b.trip_id = t.id
ORDER BY u.id, t.id;




-- BGT, TRP, USER DTLS
SELECT 
    b.id AS budget_id,
    b.trip_id,
    t.title AS trip_title,
    u.email AS trip_owner,
    b.total_budget,
    b.currency,
    b.accommodation_limit,
    b.transportation_limit,
    b.food_limit,
    b.activities_limit,
    b.misc_limit,
    (b.accommodation_limit + b.transportation_limit + b.food_limit + b.activities_limit + b.misc_limit) AS total_allocated,
    (b.total_budget - (b.accommodation_limit + b.transportation_limit + b.food_limit + b.activities_limit + b.misc_limit)) AS unallocated_amount,
    b.created_at,
    b.updated_at
FROM budgets b
JOIN trips t ON b.trip_id = t.id
JOIN users u ON t.user_id = u.id;


-- M3 P2 EXPENSE --------------------------

select * from users;

select * from trips;

-- select u.id, u.email, t.trip_id from trips as t natural join users as u ON t.user_id = u.id;
-- userid, tripid, u
SELECT  u.id AS user_id, u.email AS user_email, t.id AS trip_id,  t.title AS trip_title
FROM trips t JOIN users u ON t.user_id = u.id;


select * from itineraries;

select * from budgets;


-- M3 P3 expns catg --------------------------


-- M3 P4 grp creation --------------------------

-- //select * from group;
select * from trips;
select * from users;

-- See all travel groups and generated join codes
SELECT tg.id, tg.trip_id, t.title AS trip_title, tg.name AS group_name, tg.join_code, tg.created_at
FROM travel_groups tg
JOIN trips t ON tg.trip_id = t.id;


-- See group members and their assigned roles
SELECT gm.id, gm.group_id, u.name AS user_name, u.email, gm.role, gm.joined_at
FROM group_members gm
JOIN users u ON gm.user_id = u.id;


-- grp name, grp id, trip name, trip id , grp mbrs usr id , grp mbrs usr eml / usr name... sql for ths

SELECT 
    tg.id AS group_id,
    tg.name AS group_name,
    t.id AS trip_id,
    t.title AS trip_name,
    u.id AS member_user_id,
    u.name AS member_user_name,
    u.email AS member_user_email,
    gm.role AS member_role,
    tg.join_code
FROM travel_groups tg
JOIN trips t ON tg.trip_id = t.id
JOIN group_members gm ON gm.group_id = tg.id
JOIN users u ON gm.user_id = u.id
ORDER BY tg.id, gm.joined_at;


-- M3 T5 SHARED EXPENSE, MBR CNTRBTN  --------------------------

-- expenses and trips
select * from expenses e join trips t on e.trip_id = t.id;

-- exp, trips, userid, tripid, e.amt
select e.id as expId, e.trip_id, e.amount, e.description, t.user_id, t.title 
from expenses e join trips t on e.trip_id = t.id;


--- 1. The Master Split Ledger (Who owes what to whom per bill)
--- Inspects every individual split share, showing the original payer, the debtor companion, and whether it is settled.

SELECT 
    es.id AS split_id,
    e.id AS expense_id,
    e.description AS expense_title,
    e.amount AS total_bill,
    payer.id AS payer_id,
    payer.name AS paid_by_name,
    ower.id AS debtor_id,
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


---- M3 T6 --- NOTIFICATION ------------------------------------------

--- ### Query 1: Inspect Document Vault & Storage Links
SELECT 
    dv.id,
    dv.trip_id,
    dv.file_name,
    dv.file_type,
    dv.category,
    dv.file_size,
    dv.storage_url,
    u.name AS uploaded_by,
    dv.uploaded_at
FROM document_vault dv
JOIN users u ON dv.uploaded_by_user_id = u.id
WHERE dv.trip_id = 7
ORDER BY dv.uploaded_at DESC;



--- ### Query 2: Inspect In-App Notifications Feed & Read Status
SELECT 
    n.id,
    n.recipient_id,
    u.name AS recipient_name,
    n.type,
    n.title,
    n.is_read,
    n.created_at
FROM notifications n
JOIN users u ON n.recipient_id = u.id
ORDER BY n.created_at DESC;



--- ### Query 3: Storage Breakdown by Category for a Trip
SELECT 
    category,
    COUNT(*) AS total_files,
    SUM(file_size) AS total_bytes,
    ROUND(SUM(file_size) / 1024.0 / 1024.0, 2) AS total_mb
FROM document_vault
WHERE trip_id = 7
GROUP BY category;