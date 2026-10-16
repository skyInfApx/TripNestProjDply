Microsoft Windows [Version 10.0.26100.8037]
(c) Microsoft Corporation. All rights reserved.

C:\Users\shreyasHm>psql -U postgres
Password for user postgres:
psql (17.11)
WARNING: Console code page (437) differs from Windows code page (1252)
         8-bit characters might not work correctly. See psql reference
         page "Notes for Windows users" for details.
Type "help" for help.

postgres=# db
postgres-# show db
postgres-# show databases;
ERROR:  syntax error at or near "db"
LINE 1: db
        ^
postgres=# show database;
ERROR:  unrecognized configuration parameter "database"
postgres=# show database
postgres-# CREATE DATABASE "TripNestDb2Ag"
postgres-# \l
                                                             List of databases
    Name     |  Owner   | Encoding | Locale Provider |      Collate       |       Ctype        | Locale | ICU Rules |   Access privileges
-------------+----------+----------+-----------------+--------------------+--------------------+--------+-----------+-----------------------
 postgres    | postgres | UTF8     | libc            | English_India.1252 | English_India.1252 |        |           |
 template0   | postgres | UTF8     | libc            | English_India.1252 | English_India.1252 |        |           | =c/postgres          +
             |          |          |                 |                    |                    |        |           | postgres=CTc/postgres
 template1   | postgres | UTF8     | libc            | English_India.1252 | English_India.1252 |        |           | =c/postgres          +
             |          |          |                 |                    |                    |        |           | postgres=CTc/postgres
 tripnest_db | postgres | UTF8     | libc            | English_India.1252 | English_India.1252 |        |           |
(4 rows)


postgres-# \c "TripNestDb2Ag"
connection to server at "localhost" (::1), port 5432 failed: FATAL:  database "TripNestDb2Ag" does not exist
Previous connection kept
postgres-# CREATE DATABASE "TripNestDb2Ag";
ERROR:  syntax error at or near "CREATE"
LINE 2: CREATE DATABASE "TripNestDb2Ag"
        ^
postgres=# CREATE DATABASE TripNestDb2Ag;
CREATE DATABASE
postgres=# \l
                                                              List of databases
     Name      |  Owner   | Encoding | Locale Provider |      Collate       |       Ctype        | Locale | ICU Rules |   Access privileges
---------------+----------+----------+-----------------+--------------------+--------------------+--------+-----------+-----------------------
 postgres      | postgres | UTF8     | libc            | English_India.1252 | English_India.1252 |        |           |
 template0     | postgres | UTF8     | libc            | English_India.1252 | English_India.1252 |        |           | =c/postgres          +
               |          |          |                 |                    |                    |        |           | postgres=CTc/postgres
 template1     | postgres | UTF8     | libc            | English_India.1252 | English_India.1252 |        |           | =c/postgres          +
               |          |          |                 |                    |                    |        |           | postgres=CTc/postgres
 tripnest_db   | postgres | UTF8     | libc            | English_India.1252 | English_India.1252 |        |           |
 tripnestdb2ag | postgres | UTF8     | libc            | English_India.1252 | English_India.1252 |        |           |
(5 rows)


postgres=# \c TripNestDb2Ag;
connection to server at "localhost" (::1), port 5432 failed: FATAL:  database "TripNestDb2Ag" does not exist
Previous connection kept
postgres=# \c "TripNestDb2Ag";
connection to server at "localhost" (::1), port 5432 failed: FATAL:  database "TripNestDb2Ag" does not exist
Previous connection kept
postgres=# \c TripNestDb2Ag
connection to server at "localhost" (::1), port 5432 failed: FATAL:  database "TripNestDb2Ag" does not exist
Previous connection kept
postgres=# CREATE DATABASE "TripNestDb2Ag";
CREATE DATABASE
postgres=# CREATE DATABASE tripnestdb2ag;
ERROR:  database "tripnestdb2ag" already exists
postgres=# \c tripnestdb2ag;
You are now connected to database "tripnestdb2ag" as user "postgres".
tripnestdb2ag=# select * from users;
 id |           email           | name  |                           password
----+---------------------------+-------+--------------------------------------------------------------
  1 | bell@gmail.com            | bell  | $2a$10$/YXqF0QXAChGicp9OUxIT.tNx7kzqo0TSSl6xeyYmHL/p5m/fnJBq
  2 | ramanujanmthgd1@gmail.com | pi    | $2a$10$e5ne0.lZDdMSWF6VMr5dl.gN3Ms935ymUzFHtzmpaFz5.QpZUmCES
  3 | bell2@gmail.com           | bell2 | $2a$10$arYgWikYNLRA76Yy3BcyFe3RNUQh64gi0dhPGn1/0i0HJPYjA.d4W
  4 | sam@gmail.com             | sam   | $2a$10$UZsezKUb7rjY6e/5WbeQJuy49LnqJjJyHWdPatckOCyoN2jWTxuaS
  5 | yn@gmail.com              | yn    | $2a$10$ieeEtH19cQ6jTXHXr0Re8.0jRaBG0sr4QqkOocrxjG1HT//I0cyZG
  6 | aln@example.com           | aln   | $2a$10$7bqFd0fSyjXQ4DjvaTOx0eFfg0Bs66oDs6hoUSjKYriaDZ09r.ZvK
(6 rows)


tripnestdb2ag=# select * from trips;
 id | destination  |  end_date  | number_of_travelers | start_date |  status   |       title       | user_id
----+--------------+------------+---------------------+------------+-----------+-------------------+---------
  1 | varanasi     | 2026-09-26 |                   1 | 2026-09-20 | PLANNED   | vns               |       1
  2 | bluru - urbn | 2026-09-26 |                   1 | 2026-09-20 | PLANNED   | sw ivw bluru      |       2
  3 | mumbai       | 2026-09-17 |                   1 | 2026-09-16 | ONGOING   | mumbai trip       |       2
  4 | pune         | 2026-09-16 |                   1 | 2026-09-16 | COMPLETED | visit frnd - pune |       2
  5 | dls          | 2026-09-30 |                   1 | 2026-09-27 | PLANNED   | dls vst           |       5
  6 | goa          | 2026-09-27 |                   4 | 2026-09-24 | PLANNED   | goa ofc tour      |       5
(6 rows)


tripnestdb2ag=# select * from trips;
 id | destination  |  end_date  | number_of_travelers | start_date |  status   |         title          | user_id
----+--------------+------------+---------------------+------------+-----------+------------------------+---------
  1 | varanasi     | 2026-09-26 |                   1 | 2026-09-20 | PLANNED   | vns                    |       1
  2 | bluru - urbn | 2026-09-26 |                   1 | 2026-09-20 | PLANNED   | sw ivw bluru           |       2
  3 | mumbai       | 2026-09-17 |                   1 | 2026-09-16 | ONGOING   | mumbai trip            |       2
  4 | pune         | 2026-09-16 |                   1 | 2026-09-16 | COMPLETED | visit frnd - pune      |       2
  5 | dls          | 2026-09-30 |                   1 | 2026-09-27 | PLANNED   | dls vst                |       5
  6 | goa          | 2026-09-27 |                   4 | 2026-09-24 | PLANNED   | goa ofc tour           |       5
  7 | shimla       | 2026-09-26 |                   6 | 2026-09-20 | PLANNED   | hill station tour sept |       6
(7 rows)


tripnestdb2ag=# select * from trips where user_id =7;
 id | destination | end_date | number_of_travelers | start_date | status | title | user_id
----+-------------+----------+---------------------+------------+--------+-------+---------
(0 rows)


tripnestdb2ag=# select * from trips where user_id = 6;
 id | destination |  end_date  | number_of_travelers | start_date | status  |         title          | user_id
----+-------------+------------+---------------------+------------+---------+------------------------+---------
  7 | shimla      | 2026-09-26 |                   6 | 2026-09-20 | PLANNED | hill station tour sept |       6
(1 row)


tripnestdb2ag=# select * from trips where user_id = 6;
 id | destination |  end_date  | number_of_travelers | start_date | status  |         title          | user_id
----+-------------+------------+---------------------+------------+---------+------------------------+---------
  7 | shimla      | 2026-09-26 |                   6 | 2026-09-20 | PLANNED | hill station tour sept |       6
  8 | bluru       | 2026-09-30 |                   1 | 2026-09-29 | PLANNED | sw ivw                 |       6
(2 rows)


tripnestdb2ag=# SELECT * FROM budgets;
 id | accommodation_limit | activities_limit |         created_at         | currency | food_limit | misc_limit | total_budget | transportation_limit |         updated_at         | trip_id
----+---------------------+------------------+----------------------------+----------+------------+------------+--------------+----------------------+----------------------------+---------
  1 |            18000.00 |          6000.00 | 2026-09-16 19:38:23.630443 | INR      |   10000.00 |    2000.00 |     50000.00 |             12000.00 | 2026-09-16 19:38:23.630443 |       7
  2 |             5000.00 |          1000.00 | 2026-09-16 20:07:10.480595 | INR      |    2000.00 |    2000.00 |     30000.00 |             20000.00 | 2026-09-16 20:11:42.859387 |       8
(2 rows)


tripnestdb2ag=# SELECT
tripnestdb2ag-#     b.id AS budget_id,
tripnestdb2ag-#     b.trip_id,
tripnestdb2ag-#     t.title AS trip_title,
tripnestdb2ag-#     u.email AS trip_owner,
tripnestdb2ag-#     b.total_budget,
tripnestdb2ag-#     b.currency,
tripnestdb2ag-#     b.accommodation_limit,
tripnestdb2ag-#     b.transportation_limit,
tripnestdb2ag-#     b.food_limit,
tripnestdb2ag-#     b.activities_limit,
tripnestdb2ag-#     b.misc_limit,
tripnestdb2ag-#     (b.accommodation_limit + b.transportation_limit + b.food_limit + b.activities_limit + b.misc_limit) AS total_allocated,
tripnestdb2ag-#     (b.total_budget - (b.accommodation_limit + b.transportation_limit + b.food_limit + b.activities_limit + b.misc_limit)) AS unallocated_amount,
tripnestdb2ag-#     b.created_at,
tripnestdb2ag-#     b.updated_at
tripnestdb2ag-# FROM budgets b
tripnestdb2ag-# JOIN trips t ON b.trip_id = t.id
tripnestdb2ag-# JOIN users u ON t.user_id = u.id;
 budget_id | trip_id |       trip_title       |   trip_owner    | total_budget | currency | accommodation_limit | transportation_limit | food_limit | activities_limit | misc_limit | total_allocated | unallocated_amount |         created_at         |         updated_at
-----------+---------+------------------------+-----------------+--------------+----------+---------------------+----------------------+------------+------------------+------------+-----------------+--------------------+----------------------------+----------------------------
         1 |       7 | hill station tour sept | aln@example.com |     50000.00 | INR      |            18000.00 |             12000.00 |   10000.00 |          6000.00 |    2000.00 |        48000.00 |            2000.00 | 2026-09-16 19:38:23.630443 | 2026-09-16 19:38:23.630443
         2 |       8 | sw ivw                 | aln@example.com |     30000.00 | INR      |             5000.00 |             20000.00 |    2000.00 |          1000.00 |    2000.00 |        30000.00 |               0.00 | 2026-09-16 20:07:10.480595 | 2026-09-16 20:11:42.859387
(2 rows)


tripnestdb2ag=# \d budgets;
                                             Table "public.budgets"
        Column        |              Type              | Collation | Nullable |             Default
----------------------+--------------------------------+-----------+----------+----------------------------------
 id                   | bigint                         |           | not null | generated by default as identity
 accommodation_limit  | numeric(12,2)                  |           |          |
 activities_limit     | numeric(12,2)                  |           |          |
 created_at           | timestamp(6) without time zone |           | not null |
 currency             | character varying(10)          |           | not null |
 food_limit           | numeric(12,2)                  |           |          |
 misc_limit           | numeric(12,2)                  |           |          |
 total_budget         | numeric(12,2)                  |           | not null |
 transportation_limit | numeric(12,2)                  |           |          |
 updated_at           | timestamp(6) without time zone |           | not null |
 trip_id              | bigint                         |           | not null |
Indexes:
    "budgets_pkey" PRIMARY KEY, btree (id)
    "ukcsajrbhf0r55txdi26qlulcpb" UNIQUE CONSTRAINT, btree (trip_id)
Foreign-key constraints:
    "fkq2m188eq0dc75wi4d67b66yqa" FOREIGN KEY (trip_id) REFERENCES trips(id)


tripnestdb2ag=# \d budgets;
                SELECT * FROM budgets where user_id = 6;
ERROR:  column "user_id" does not exist
LINE 1: SELECT * FROM budgets where user_id = 6;
                                    ^
tripnestdb2ag=# SELECT * FROM budgets where user_id = 6;
ERROR:  column "user_id" does not exist
LINE 1: SELECT * FROM budgets where user_id = 6;
                                    ^
tripnestdb2ag=# -- user, bgt, trip, brief detl, with bgt dtls only
tripnestdb2ag=# SELECT
tripnestdb2ag-#     u.id AS user_id,
tripnestdb2ag-#     u.email AS user_email,
tripnestdb2ag-#     t.id AS trip_id,
tripnestdb2ag-#     t.title AS trip_name,
tripnestdb2ag-#     b.id AS budget_id,
tripnestdb2ag-#     b.total_budget AS budget_amt,
tripnestdb2ag-#     b.currency
tripnestdb2ag-# FROM users u
tripnestdb2ag-# JOIN trips t ON t.user_id = u.id
tripnestdb2ag-# JOIN budgets b ON b.trip_id = t.id
tripnestdb2ag-# ORDER BY u.id, t.id;
 user_id |   user_email    | trip_id |       trip_name        | budget_id | budget_amt | currency
---------+-----------------+---------+------------------------+-----------+------------+----------
       6 | aln@example.com |       7 | hill station tour sept |         1 |   50000.00 | INR
       6 | aln@example.com |       8 | sw ivw                 |         2 |   30000.00 | INR
       6 | aln@example.com |       9 | sadfas                 |         3 |   20000.00 | INR
(3 rows)


tripnestdb2ag=# SELECT
tripnestdb2ag-#     u.id AS user_id,
tripnestdb2ag-#     u.email AS user_email,
tripnestdb2ag-#     t.id AS trip_id,
tripnestdb2ag-#     t.title AS trip_name,
tripnestdb2ag-#     b.id AS budget_id,
tripnestdb2ag-#     b.total_budget AS budget_amt,
tripnestdb2ag-#     b.currency
tripnestdb2ag-# FROM users u
tripnestdb2ag-# JOIN trips t ON t.user_id = u.id
tripnestdb2ag-# JOIN budgets b ON b.trip_id = t.id
tripnestdb2ag-# ORDER BY u.id, t.id;
 user_id |   user_email    | trip_id |       trip_name        | budget_id | budget_amt | currency
---------+-----------------+---------+------------------------+-----------+------------+----------
       6 | aln@example.com |       7 | hill station tour sept |         1 |   50000.00 | INR
       6 | aln@example.com |       8 | sw ivw                 |         2 |   30000.00 | INR
(2 rows)


tripnestdb2ag=# \d
                  List of relations
 Schema |         Name          |   Type   |  Owner
--------+-----------------------+----------+----------
 public | activities            | table    | postgres
 public | activities_id_seq     | sequence | postgres
 public | attractions           | table    | postgres
 public | attractions_id_seq    | sequence | postgres
 public | budgets               | table    | postgres
 public | budgets_id_seq        | sequence | postgres
 public | destination           | table    | postgres
 public | destination_id_seq    | sequence | postgres
 public | expenses              | table    | postgres
 public | expenses_id_seq       | sequence | postgres
 public | itineraries           | table    | postgres
 public | itineraries_id_seq    | sequence | postgres
 public | itinerary_days        | table    | postgres
 public | itinerary_days_id_seq | sequence | postgres
 public | roles                 | table    | postgres
 public | roles_id_seq          | sequence | postgres
 public | trips                 | table    | postgres
 public | trips_id_seq          | sequence | postgres
 public | user_roles            | table    | postgres
 public | user_roles_id_seq     | sequence | postgres
 public | users                 | table    | postgres
 public | users_id_seq          | sequence | postgres
(22 rows)


tripnestdb2ag=# \dt
             List of relations
 Schema |      Name      | Type  |  Owner
--------+----------------+-------+----------
 public | activities     | table | postgres
 public | attractions    | table | postgres
 public | budgets        | table | postgres
 public | destination    | table | postgres
 public | expenses       | table | postgres
 public | itineraries    | table | postgres
 public | itinerary_days | table | postgres
 public | roles          | table | postgres
 public | trips          | table | postgres
 public | user_roles     | table | postgres
 public | users          | table | postgres
(11 rows)


tripnestdb2ag=# \d expense;
Did not find any relation named "expense".
tripnestdb2ag=# \d expenses;
                                          Table "public.expenses"
     Column      |              Type              | Collation | Nullable |             Default
-----------------+--------------------------------+-----------+----------+----------------------------------
 id              | bigint                         |           | not null | generated by default as identity
 amount          | numeric(12,2)                  |           | not null |
 category        | character varying(30)          |           | not null |
 created_at      | timestamp(6) without time zone |           | not null |
 currency        | character varying(10)          |           | not null |
 description     | character varying(255)         |           | not null |
 expense_date    | date                           |           | not null |
 updated_at      | timestamp(6) without time zone |           | not null |
 paid_by_user_id | bigint                         |           | not null |
 trip_id         | bigint                         |           | not null |
Indexes:
    "expenses_pkey" PRIMARY KEY, btree (id)
    "idx_expenses_paid_by" btree (paid_by_user_id)
    "idx_expenses_trip_id" btree (trip_id)
Check constraints:
    "expenses_category_check" CHECK (category::text = ANY (ARRAY['ACCOMMODATION'::character varying, 'TRANSPORTATION'::character varying, 'FOOD'::character varying, 'ACTIVITIES'::character varying, 'SHOPPING'::character varying, 'MISCELLANEOUS'::character varying]::text[]))
Foreign-key constraints:
    "fk9twvm79qw1voae3xgtn1xq5y9" FOREIGN KEY (trip_id) REFERENCES trips(id)
    "fko0m8jktfrmdbhhajx3qwr8ngr" FOREIGN KEY (paid_by_user_id) REFERENCES users(id)


tripnestdb2ag=# select * from expenses;
 id | amount | category | created_at | currency | description | expense_date | updated_at | paid_by_user_id | trip_id
----+--------+----------+------------+----------+-------------+--------------+------------+-----------------+---------
(0 rows)


tripnestdb2ag=# SELECT  u.id AS user_id, u.email AS user_email, t.id AS trip_id,  t.title AS trip_title
tripnestdb2ag-# FROM trips t JOIN users u ON t.user_id = u.id;
 user_id |        user_email         | trip_id |       trip_title
---------+---------------------------+---------+------------------------
       1 | bell@gmail.com            |       1 | vns
       2 | ramanujanmthgd1@gmail.com |       2 | sw ivw bluru
       2 | ramanujanmthgd1@gmail.com |       3 | mumbai trip
       2 | ramanujanmthgd1@gmail.com |       4 | visit frnd - pune
       5 | yn@gmail.com              |       5 | dls vst
       5 | yn@gmail.com              |       6 | goa ofc tour
       6 | aln@example.com           |       8 | sw ivw
       6 | aln@example.com           |       9 | sadfas
       6 | aln@example.com           |       7 | hill station tour sept
(9 rows)


tripnestdb2ag=# SELECT  u.id AS user_id, u.email AS user_email, t.id AS trip_id,  t.title AS trip_title FROM trips t JOIN users u ON t.user_id = u.id;
 user_id |        user_email         | trip_id |       trip_title
---------+---------------------------+---------+------------------------
       1 | bell@gmail.com            |       1 | vns
       2 | ramanujanmthgd1@gmail.com |       2 | sw ivw bluru
       2 | ramanujanmthgd1@gmail.com |       3 | mumbai trip
       2 | ramanujanmthgd1@gmail.com |       4 | visit frnd - pune
       5 | yn@gmail.com              |       5 | dls vst
       5 | yn@gmail.com              |       6 | goa ofc tour
       6 | aln@example.com           |       8 | sw ivw
       6 | aln@example.com           |       9 | sadfas
       6 | aln@example.com           |       7 | hill station tour sept
(9 rows)


tripnestdb2ag=# select * from itineraries;
 id | trip_id
----+---------
  1 |       1
  2 |       2
  3 |       3
  4 |       4
  5 |       5
  6 |       6
  7 |       7
  8 |       8
  9 |       9
(9 rows)


tripnestdb2ag=# select i.id, i.trip_id, from itineraries i join trips t on i.trip_id = t.id;
ERROR:  syntax error at or near "from"
LINE 1: select i.id, i.trip_id, from itineraries i join trips t on i...
                                ^
tripnestdb2ag=# SELECT i.id, i.trip_id, FROM itineraries i join trips t on i.trip_id = t.id;
ERROR:  syntax error at or near "FROM"
LINE 1: SELECT i.id, i.trip_id, FROM itineraries i join trips t on i...
                                ^
tripnestdb2ag=# select * from trips;
 id | destination  |  end_date  | number_of_travelers | start_date |  status   |         title          | user_id
----+--------------+------------+---------------------+------------+-----------+------------------------+---------
  1 | varanasi     | 2026-09-26 |                   1 | 2026-09-20 | PLANNED   | vns                    |       1
  2 | bluru - urbn | 2026-09-26 |                   1 | 2026-09-20 | PLANNED   | sw ivw bluru           |       2
  3 | mumbai       | 2026-09-17 |                   1 | 2026-09-16 | ONGOING   | mumbai trip            |       2
  4 | pune         | 2026-09-16 |                   1 | 2026-09-16 | COMPLETED | visit frnd - pune      |       2
  5 | dls          | 2026-09-30 |                   1 | 2026-09-27 | PLANNED   | dls vst                |       5
  6 | goa          | 2026-09-27 |                   4 | 2026-09-24 | PLANNED   | goa ofc tour           |       5
  8 | bluru        | 2026-09-30 |                   1 | 2026-09-29 | PLANNED   | sw ivw                 |       6
  9 | asdfs        | 2026-09-29 |                   1 | 2026-09-25 | PLANNED   | sadfas                 |       6
  7 | shimla       | 2026-09-26 |                   6 | 2026-09-20 | ONGOING   | hill station tour sept |       6
(9 rows)


tripnestdb2ag=# SELECT i.id, i.trip_id FROM itineraries i join trips t on i.trip_id = t.id;
 id | trip_id
----+---------
  1 |       1
  2 |       2
  3 |       3
  4 |       4
  5 |       5
  6 |       6
  7 |       7
  8 |       8
  9 |       9
(9 rows)


tripnestdb2ag=# SELECT i.id, i.trip_id, t.destination, t.title, t.user_id FROM itineraries i join trips t on i.trip_id = t.id;
 id | trip_id | destination  |         title          | user_id
----+---------+--------------+------------------------+---------
  1 |       1 | varanasi     | vns                    |       1
  2 |       2 | bluru - urbn | sw ivw bluru           |       2
  3 |       3 | mumbai       | mumbai trip            |       2
  4 |       4 | pune         | visit frnd - pune      |       2
  5 |       5 | dls          | dls vst                |       5
  6 |       6 | goa          | goa ofc tour           |       5
  7 |       7 | shimla       | hill station tour sept |       6
  8 |       8 | bluru        | sw ivw                 |       6
  9 |       9 | asdfs        | sadfas                 |       6
(9 rows)


tripnestdb2ag=# SELECT i.id as itineraryId, i.trip_id, t.destination, t.title, t.user_id FROM itineraries i join trips t on i.trip_id = t.id;
 itineraryid | trip_id | destination  |         title          | user_id
-------------+---------+--------------+------------------------+---------
           1 |       1 | varanasi     | vns                    |       1
           2 |       2 | bluru - urbn | sw ivw bluru           |       2
           3 |       3 | mumbai       | mumbai trip            |       2
           4 |       4 | pune         | visit frnd - pune      |       2
           5 |       5 | dls          | dls vst                |       5
           6 |       6 | goa          | goa ofc tour           |       5
           7 |       7 | shimla       | hill station tour sept |       6
           8 |       8 | bluru        | sw ivw                 |       6
           9 |       9 | asdfs        | sadfas                 |       6
(9 rows)


tripnestdb2ag=# SELECT * from expenses;
 id |  amount  |    category    |         created_at         | currency |                description                 | expense_date |         updated_at         | paid_by_user_id | trip_id
----+----------+----------------+----------------------------+----------+--------------------------------------------+--------------+----------------------------+-----------------+---------
  2 |  2200.00 | TRANSPORTATION | 2026-09-17 15:06:15.607803 | INR      | Taxi from Airport to Hotel                 | 2026-09-20   | 2026-09-17 15:06:15.607803 |               6 |       7
  1 |  2000.00 | FOOD           | 2026-09-17 15:03:26.368372 | INR      | Dinner at Heritage Cafe (Includes Dessert) | 2026-09-20   | 2026-09-17 18:51:20.993773 |               6 |       7
  3 | 10000.00 | ACCOMMODATION  | 2026-09-17 18:57:39.262419 | INR      | Hotel charge                               | 2026-09-20   | 2026-09-17 18:57:39.262419 |               6 |       7
  4 | 10000.50 | ACCOMMODATION  | 2026-09-17 18:57:57.53078  | INR      | Hotel charge                               | 2026-09-21   | 2026-09-17 18:57:57.53078  |               6 |       7
  5 | 20000.00 | ACCOMMODATION  | 2026-09-17 19:01:03.52993  | INR      | Hotel charge                               | 2026-09-22   | 2026-09-17 19:01:03.52993  |               6 |       7
(5 rows)


tripnestdb2ag=# SELECT e.id, e.trip_id, e.description, e.category, e.amount, e.currency, e.expense_date,
tripnestdb2ag-# u.name AS paid_by_name, u.email AS paid_by_email
tripnestdb2ag-# FROM expenses e
tripnestdb2ag-# JOIN users u ON e.paid_by_user_id = u.id
tripnestdb2ag-# ORDER BY e.expense_date DESC;
 id | trip_id |                description                 |    category    |  amount  | currency | expense_date | paid_by_name |  paid_by_email
----+---------+--------------------------------------------+----------------+----------+----------+--------------+--------------+-----------------
  5 |       7 | Hotel charge                               | ACCOMMODATION  | 20000.00 | INR      | 2026-09-22   | aln          | aln@example.com
  4 |       7 | Hotel charge                               | ACCOMMODATION  | 10000.50 | INR      | 2026-09-21   | aln          | aln@example.com
  2 |       7 | Taxi from Airport to Hotel                 | TRANSPORTATION |  2200.00 | INR      | 2026-09-20   | aln          | aln@example.com
  1 |       7 | Dinner at Heritage Cafe (Includes Dessert) | FOOD           |  2000.00 | INR      | 2026-09-20   | aln          | aln@example.com
  3 |       7 | Hotel charge                               | ACCOMMODATION  | 10000.00 | INR      | 2026-09-20   | aln          | aln@example.com
(5 rows)


tripnestdb2ag=# ORDER BY e.expense_date DESC;SELECT e.id, e.trip_id, e.description, e.category, e.amount, e.currency, e.expense_date,
ERROR:  syntax error at or near "ORDER"
LINE 1: ORDER BY e.expense_date DESC;
        ^
tripnestdb2ag-# u.name AS paid_by_name, u.email AS paid_by_email
tripnestdb2ag-# FROM expenses e
tripnestdb2ag-# JOIN users u ON e.paid_by_user_id = u.id
tripnestdb2ag-# ORDER BY e.expense_date DESC;
 id | trip_id |                description                 |    category    |  amount  | currency | expense_date | paid_by_name |  paid_by_email
----+---------+--------------------------------------------+----------------+----------+----------+--------------+--------------+-----------------
  4 |       7 | Hotel charge                               | ACCOMMODATION  | 10000.50 | INR      | 2026-09-21   | aln          | aln@example.com
  2 |       7 | Taxi from Airport to Hotel                 | TRANSPORTATION |  2200.00 | INR      | 2026-09-20   | aln          | aln@example.com
  1 |       7 | Dinner at Heritage Cafe (Includes Dessert) | FOOD           |  2000.00 | INR      | 2026-09-20   | aln          | aln@example.com
  3 |       7 | Hotel charge                               | ACCOMMODATION  | 10000.00 | INR      | 2026-09-20   | aln          | aln@example.com
(4 rows)


tripnestdb2ag=# --- Complete Financial Reconciliation (Budget vs Total Spent vs Remaining): sql
tripnestdb2ag=# SELECT t.id AS trip_id, t.title AS trip_title, u.email AS owner_email,
tripnestdb2ag-#     COALESCE(b.total_budget, 0.00) AS total_budget,
tripnestdb2ag-#     COALESCE(SUM(e.amount), 0.00) AS total_spent,
tripnestdb2ag-#     (COALESCE(b.total_budget, 0.00) - COALESCE(SUM(e.amount), 0.00)) AS remaining_budget
tripnestdb2ag-# FROM trips t
tripnestdb2ag-# JOIN users u ON t.user_id = u.id
tripnestdb2ag-# LEFT JOIN budgets b ON b.trip_id = t.id
tripnestdb2ag-# LEFT JOIN expenses e ON e.trip_id = t.id
tripnestdb2ag-# WHERE t.id = 7
tripnestdb2ag-# GROUP BY t.id, t.title, u.email, b.total_budget;
 trip_id |       trip_title       |   owner_email   | total_budget | total_spent | remaining_budget
---------+------------------------+-----------------+--------------+-------------+------------------
       7 | hill station tour sept | aln@example.com |     50000.00 |    24200.50 |         25799.50
(1 row)


tripnestdb2ag=# SELECT id, name, weather FROM destination;
 id |       name        | weather
----+-------------------+---------
  1 | Bangalore         |
  2 | Pune              |
  3 | Munnar            |
  6 | Mussoorie         |
  4 | Coorg             |
  5 | Shillong          |
  7 | Goa               |
 10 | Varanasi          |
 25 | Manali            |
 26 | Ooty              |
 27 | Shimla            |
 28 | Darjeeling        |
 29 | Nainital          |
 30 | Kodaikanal        |
 31 | Gulmarg           |
 32 | Mumbai            |
 33 | Delhi             |
 36 | Singapore         |
 38 | Varkala           |
 40 | Puri              |
 37 | Gokarna           |
 39 | Havelock Island   |
 41 | Kovalam           |
 42 | Jaipur            |
 43 | Agra              |
 44 | Hampi             |
 45 | Khajuraho         |
 48 | Kaziranga         |
 49 | Sundarbans        |
 50 | Wayanad           |
 51 | Spiti Valley      |
 52 | Jim Corbett       |
 53 | Hyderabad         |
 54 | Chennai           |
 55 | Gurgaon           |
 56 | Noida             |
 57 | Kolkata           |
 58 | Pondicherry       |
 59 | Diu               |
 61 | Udaipur           |
 62 | Amritsar          |
 63 | Mysore            |
 64 | Aurangabad        |
 65 | Ranthambore       |
 66 | Rishikesh         |
 67 | Gir National Park |
 60 | Alibaug           |
(47 rows)


tripnestdb2ag=#
tripnestdb2ag=# SELECT id, name, weather FROM destination;
 id |       name        |    weather
----+-------------------+---------------
  3 | Munnar            | 17░C ╖ Clouds
 10 | Varanasi          | 27░C ╖ Clouds
  4 | Coorg             |
  2 | Pune              | 26░C ╖ Clouds
  1 | Bangalore         | 26░C ╖ Rain
  7 | Goa               |
  6 | Mussoorie         | 13░C ╖ Clouds
  5 | Shillong          | 17░C ╖ Rain
 25 | Manali            |
 26 | Ooty              |
 27 | Shimla            |
 28 | Darjeeling        |
 29 | Nainital          |
 30 | Kodaikanal        |
 31 | Gulmarg           |
 32 | Mumbai            |
 33 | Delhi             |
 36 | Singapore         |
 38 | Varkala           |
 40 | Puri              |
 37 | Gokarna           |
 39 | Havelock Island   |
 41 | Kovalam           |
 42 | Jaipur            |
 43 | Agra              |
 44 | Hampi             |
 45 | Khajuraho         |
 48 | Kaziranga         |
 49 | Sundarbans        |
 50 | Wayanad           |
 51 | Spiti Valley      |
 52 | Jim Corbett       |
 53 | Hyderabad         |
 54 | Chennai           |
 55 | Gurgaon           |
 56 | Noida             |
 57 | Kolkata           |
 58 | Pondicherry       |
 59 | Diu               |
 61 | Udaipur           |
 62 | Amritsar          |
 63 | Mysore            |
 64 | Aurangabad        |
 65 | Ranthambore       |
 66 | Rishikesh         |
 67 | Gir National Park |
 60 | Alibaug           |
(47 rows)


tripnestdb2ag=# SELECT id, name, weather FROM destination;
 id |       name        |    weather
----+-------------------+---------------
 10 | Varanasi          | 27░C ╖ Clouds
  4 | Coorg             |
  6 | Mussoorie         | 13░C ╖ Clouds
  5 | Shillong          | 17░C ╖ Rain
  3 | Munnar            | 16░C ╖ Rain
  2 | Pune              | 25░C ╖ Clouds
  1 | Bangalore         | 24░C ╖ Clouds
  7 | Goa               | 26░C ╖ Clouds
 39 | Havelock Island   |
 25 | Manali            | 31░C ╖ Rain
 26 | Ooty              | 13░C ╖ Clouds
 27 | Shimla            | 12░C ╖ Clouds
 28 | Darjeeling        | 15░C ╖ Clouds
 29 | Nainital          | 10░C ╖ Clouds
 30 | Kodaikanal        | 14░C ╖ Rain
 31 | Gulmarg           | 7░C ╖ Clear
 48 | Kaziranga         |
 49 | Sundarbans        |
 50 | Wayanad           |
 51 | Spiti Valley      |
 52 | Jim Corbett       |
 41 | Kovalam           | 28░C ╖ Clouds
 65 | Ranthambore       |
 60 | Alibaug           |
 32 | Mumbai            | 29░C ╖ Rain
 33 | Delhi             | 29░C ╖ Clouds
 36 | Singapore         | 29░C ╖ Clouds
 38 | Varkala           | 26░C ╖ Clouds
 40 | Puri              | 29░C ╖ Rain
 37 | Gokarna           | 27░C ╖ Clear
 42 | Jaipur            | 23░C ╖ Clouds
 43 | Agra              | 29░C ╖ Clouds
 44 | Hampi             | 26░C ╖ Clouds
 45 | Khajuraho         | 26░C ╖ Rain
 53 | Hyderabad         | 28░C ╖ Clouds
 54 | Chennai           | 31░C ╖ Rain
 55 | Gurgaon           | 28░C ╖ Clouds
 56 | Noida             | 29░C ╖ Clouds
 57 | Kolkata           | 26░C ╖ Clouds
 58 | Pondicherry       | 29░C ╖ Clouds
 59 | Diu               | 26░C ╖ Clouds
 61 | Udaipur           | 23░C ╖ Clouds
 62 | Amritsar          | 25░C ╖ Rain
 63 | Mysore            | 24░C ╖ Clouds
 64 | Aurangabad        | 27░C ╖ Rain
 66 | Rishikesh         | 23░C ╖ Clouds
 67 | Gir National Park | 24░C ╖ Clouds
(47 rows)


tripnestdb2ag=# SELECT id, name, weather FROM destination;
 id |       name        |    weather
----+-------------------+---------------
 10 | Varanasi          | 28░C ╖ Clouds
  4 | Coorg             | 20░C ╖ Clouds
  5 | Shillong          | 17░C ╖ Clouds
 53 | Hyderabad         | 28░C ╖ Rain
 55 | Gurgaon           | 27░C ╖ Clouds
  6 | Mussoorie         | 13░C ╖ Clouds
  3 | Munnar            | 16░C ╖ Rain
  2 | Pune              | 25░C ╖ Clouds
  1 | Bangalore         | 24░C ╖ Clouds
  7 | Goa               | 26░C ╖ Clouds
 39 | Havelock Island   | 27░C ╖ Rain
 25 | Manali            | 31░C ╖ Rain
 26 | Ooty              | 13░C ╖ Clouds
 27 | Shimla            | 12░C ╖ Clouds
 28 | Darjeeling        | 15░C ╖ Clouds
 29 | Nainital          | 10░C ╖ Clouds
 30 | Kodaikanal        | 14░C ╖ Rain
 31 | Gulmarg           | 7░C ╖ Clear
 48 | Kaziranga         | 24░C ╖ Clouds
 49 | Sundarbans        | 27░C ╖ Clouds
 50 | Wayanad           | 21░C ╖ Clouds
 51 | Spiti Valley      | 21░C ╖ Clear
 52 | Jim Corbett       | 23░C ╖ Clouds
 41 | Kovalam           | 28░C ╖ Clouds
 65 | Ranthambore       | 26░C ╖ Clouds
 60 | Alibaug           | 27░C ╖ Rain
 32 | Mumbai            | 29░C ╖ Rain
 33 | Delhi             | 29░C ╖ Clouds
 36 | Singapore         | 29░C ╖ Clouds
 38 | Varkala           | 26░C ╖ Clouds
 40 | Puri              | 29░C ╖ Rain
 37 | Gokarna           | 27░C ╖ Clear
 42 | Jaipur            | 23░C ╖ Clouds
 43 | Agra              | 29░C ╖ Clouds
 44 | Hampi             | 26░C ╖ Clouds
 45 | Khajuraho         | 26░C ╖ Rain
 54 | Chennai           | 31░C ╖ Rain
 56 | Noida             | 29░C ╖ Clouds
 57 | Kolkata           | 26░C ╖ Clouds
 58 | Pondicherry       | 29░C ╖ Clouds
 59 | Diu               | 26░C ╖ Clouds
 61 | Udaipur           | 23░C ╖ Clouds
 62 | Amritsar          | 25░C ╖ Rain
 63 | Mysore            | 24░C ╖ Clouds
 64 | Aurangabad        | 27░C ╖ Rain
 66 | Rishikesh         | 23░C ╖ Clouds
 67 | Gir National Park | 26░C ╖ Clouds
(47 rows)


tripnestdb2ag=#
tripnestdb2ag=#
tripnestdb2ag=#
tripnestdb2ag=# SELECT category, COUNT(*) as count, SUM(amount) as spent FROM expenses WHERE trip_id=7 GROUP BY category;
    category    | count |  spent
----------------+-------+----------
 ACCOMMODATION  |     2 | 20000.50
 FOOD           |     1 |  2000.00
 TRANSPORTATION |     1 |  2200.00
(3 rows)


tripnestdb2ag=# SELECT COALESCE(SUM(amount), 0) AS total_spent FROM expenses WHERE trip_id = 7;
 total_spent
-------------
    24200.50
(1 row)



--------------
till m3t3
--------------




--------------------------------------------



---------------------------------------------


