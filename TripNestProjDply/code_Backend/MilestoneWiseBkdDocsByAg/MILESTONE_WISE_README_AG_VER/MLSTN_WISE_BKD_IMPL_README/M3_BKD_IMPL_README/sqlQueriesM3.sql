-- M3 P1 BUDGET --------------------------
select * from users;
select * from trips;

select * from trips where user_id = 6;

SELECT * FROM budgets;
select * from expenses;


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

-- userid, tripid, user eml, trip title
SELECT  u.id AS user_id, u.email AS user_email, t.id AS trip_id,  t.title AS trip_title
FROM trips t JOIN users u ON t.user_id = u.id;


select * from itineraries;
select * from budgets;

-- tripid, itnry id, user id, trip title, destination name
SELECT i.id as itineraryId, i.trip_id, t.destination, t.title, t.user_id FROM itineraries i join trips t on i.trip_id = t.id;


--- user id, trip id, trip name, expense amt
-- View All Logged Expenses:  sql
SELECT e.id, e.trip_id, e.description, e.category, e.amount, e.currency, e.expense_date,
u.name AS paid_by_name, u.email AS paid_by_email
FROM expenses e
JOIN users u ON e.paid_by_user_id = u.id
ORDER BY e.expense_date DESC;


--- Complete Financial Reconciliation (Budget vs Total Spent vs Remaining): sql
SELECT t.id AS trip_id, t.title AS trip_title, u.email AS owner_email,
    COALESCE(b.total_budget, 0.00) AS total_budget,
    COALESCE(SUM(e.amount), 0.00) AS total_spent,
    (COALESCE(b.total_budget, 0.00) - COALESCE(SUM(e.amount), 0.00)) AS remaining_budget
FROM trips t
JOIN users u ON t.user_id = u.id
LEFT JOIN budgets b ON b.trip_id = t.id
LEFT JOIN expenses e ON e.trip_id = t.id
WHERE t.id = 7
GROUP BY t.id, t.title, u.email, b.total_budget;
