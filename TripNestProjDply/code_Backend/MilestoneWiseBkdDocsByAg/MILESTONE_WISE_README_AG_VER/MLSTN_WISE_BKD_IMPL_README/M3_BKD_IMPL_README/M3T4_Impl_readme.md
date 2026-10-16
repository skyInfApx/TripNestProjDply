
# M3 T4 - BACKEND TASKS

## M3 T3 - Group Collaboration APIs  TASK

### PAIR PROG.G WITH AG


--------------------------
lets strt m3 t4-6
4. Group Collaboration APIs	Implement travel group creation, member management, invitations, shared itineraries, group roles and group discussions.
5. Shared Expenses & Collaboration APIs	Implement shared-expense functionality, group expense associations, member contributions and expense-sharing/settlement data required by the application.
6. Notifications & Media/Document APIs	Implement notification APIs for trip/activity reminders, budget alerts, group invitations and travel updates. Implement APIs for uploading/managing travel documents, tickets, hotel bookings and photos using the Media service.

1 file at a  tm teach - m3t4 = grp clb frst

---------------------------

can give a overview of this m3 t4 = grp collaboration first... here ... 
then it will easier to cnct ... 
only mod brief

Here is a moderately brief overview of M3 Task 4 (Group Collaboration) so you can easily connect all the dots before we write the remaining files:

1. The Real-World Scenario (Why We Need This)
Until now (M1 & M2): Only the person who created the trip can see and edit it.
With M3 Task 4: You can invite your travel companions so everyone shares the same vacation schedule, adds activities together, and later splits expenses (in Task 5).
2. The 3-Step User Journey
text


  [Trip Creator]                               [Friends / Companions]
        │                                                │
        ▼                                                │
1. Create Group                                          │
   "Goa Weekend Wanderers"                               │
   App generates Join Code: [GOA-4821]                   │
        │                                                │
        ├──────────── Shares code via WhatsApp ─────────►│
        │                                                ▼
        │                                         2. Enter Join Code
        │                                            Friend enters "GOA-4821"
        │                                            Instantly added as MEMBER!
        ▼                                                ▼
3. Collaborative Trip Hub
   Everyone sees the group roster, shared itinerary, and who is on the trip!
3. How the Backend Pieces Connect
Layer	Files	What It Does
1. Entities (Database)	GroupRole (Done)
TravelGroup (Done)
GroupMember (Done)	Stores the group name, unique 6-character join code (GOA-4821), and who belongs to the group with their role (OWNER, ADMIN, MEMBER).
2. Repositories	TravelGroupRepository
GroupMemberRepository	Performs SQL queries: finds groups by trip_id or by join_code, and checks if a user is already a member.
3. DTOs	GroupCreateRequest
GroupJoinRequest
GroupDetailsResponse	Clean data packets sent between frontend/Postman and Spring Boot.
4. Service	GroupCollaborationService	The "brain": generates random codes like GOA-7891, verifies user isn't already a member, and assigns roles.
5. Controller	GroupCollaborationController	Exposes the 3 REST endpoints:
• POST /api/trips/{id}/groups (Create Group)
• POST /api/groups/join (Join via Code)
• GET /api/trips/{id}/groups (View Members)
4. Roadmap of What’s Left for Task 4
Repositories: TravelGroupRepository & GroupMemberRepository (quick database queries)
DTOs: Request & Response models
Service: Business logic & code generator
Controller: The 3 REST API endpoints
With this overview in mind, are you ready to look at File 4: TravelGroupRepository.java?

--------------------------
Let's begin Milestone 3, Task 4: Group Collaboration APIs.

We will go strictly 1 file at a time, explaining the design and purpose of each file clearly before moving forward.

Step 1 / File 1: 
GroupRole.java
1. What is this file?
This is an Enum that defines the role and access level of every user in a travel group.

2. Why do we need it?
When multiple people plan a trip together, not everyone should have the same power. For example, a friend invited to join a Goa trip shouldn't be able to delete the whole trip or remove the trip creator.

3. The 3 Roles Defined:
java


package com.tripnest.backend.entity;
/**
 * Defines member roles within a travel collaboration group.
 */
public enum GroupRole {
    GROUP_OWNER,  // Creator of the trip & group: has full control (delete group, change roles)
    GROUP_ADMIN,  // Co-organizer: can invite friends, edit days, and log expenses
    GROUP_MEMBER  // Companion: can view trip details, log expenses, and participate
}

```
Role        	Can View Trip?	Can Log Expenses?	Can Invite Friends?	Can Delete Trip?
GROUP_OWNER	    Yes	            Yes	                Yes	                    Yes
GROUP_ADMIN	    Yes	            Yes	                Yes	                    No
GROUP_MEMBER	Yes	            Yes	                No	                    No
```

✅ File 1 is created.

Does this role hierarchy make sense, and are you ready for File 2: TravelGroup.java (the main database entity for the travel group and its 6-character invite code)?

--------------------------

File 2: 
TravelGroup.java
1. What is this file?
This is the JPA Entity that maps to the travel_groups table in PostgreSQL. It represents the group created for a vacation.

2. Key Architectural Decisions:
@OneToOne with Trip (unique = true):
A trip has exactly one collaboration group. Multiple groups for the same trip would cause split confusion.
join_code (e.g. "GOA-4821"):
A unique 6 to 8-character alphanumeric code.
Why this is awesome: Just like Kahoot or Google Classroom, instead of requiring the trip creator to know everyone's email, they can simply share "GOA-4821" on WhatsApp, and friends can enter it to join instantly!
@PrePersist:
Automatically records createdAt timestamp when the group is first initialized.
java


package com.tripnest.backend.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity
@Table(name = "travel_groups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TravelGroup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    // 1-to-1 link to the parent Trip
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false, unique = true)
    private Trip trip;
    // Group name (e.g., "Goa Weekend Wanderers")
    @Column(nullable = false)
    private String name;
    // 6-8 char code for friends to join
    @Column(name = "join_code", nullable = false, unique = true, length = 12)
    private String joinCode;
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
✅ File 2 is created.

Are you ready for File 3: GroupMember.java (the entity that links each companion User to the TravelGroup with their specific GroupRole)?

--------------------------
File 3: 
GroupMember.java
1. What is this file?
This is the Join Entity that connects a User to a TravelGroup. It answers two questions:

Who is in this group?
What is their role (GROUP_OWNER, GROUP_ADMIN, or GROUP_MEMBER)?
2. Key Architectural Decisions:
@UniqueConstraint(columnNames = {"group_id", "user_id"}):
Enforced at the database level so a user cannot accidentally join the same group twice or appear duplicated on the member roster.
@Enumerated(EnumType.STRING) on GroupRole:
Stores the role as clean text in PostgreSQL ("GROUP_OWNER", "GROUP_MEMBER"), making SQL debugging and pgAdmin queries easy to read.
joinedAt:
Tracks the exact timestamp when each companion accepted the invite or entered the join code.
java


package com.tripnest.backend.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity
@Table(
    name = "group_members",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"group_id", "user_id"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupMember {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private TravelGroup group;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private GroupRole role = GroupRole.GROUP_MEMBER;
    @Column(name = "joined_at", nullable = false, updatable = false)
    private LocalDateTime joinedAt;
    @PrePersist
    protected void onCreate() {
        if (joinedAt == null) {
            joinedAt = LocalDateTime.now();
        }
    }
}
✅ File 3 is created.

Now all 3 database entities for Group Collaboration (GroupRole, TravelGroup, GroupMember) are in place!

Are you ready for File 4: TravelGroupRepository.java (the database interface for finding groups by Trip ID and Join Code)?

--------------------------


File 4:  TravelGroupRepository.java
1. What is this file?
This is the Spring Data JPA Repository for querying the travel_groups table in PostgreSQL. Spring automatically generates all the SQL queries for us based on the method names!

2. The 4 Query Methods We Need:
java


package com.tripnest.backend.repository;
import com.tripnest.backend.entity.TravelGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
@Repository
public interface TravelGroupRepository extends JpaRepository<TravelGroup, Long> {
    // 1. Fetch group by Trip ID: "Show me the group for Goa Trip #5"
    Optional<TravelGroup> findByTripId(Long tripId);
    // 2. Fetch group by Join Code: "Find the group matching code GOA-4821"
    Optional<TravelGroup> findByJoinCode(String joinCode);
    // 3. Collision check: "Is this randomly generated code already taken?"
    boolean existsByJoinCode(String joinCode);
    // 4. Duplicate check: "Does this trip already have a group?"
    boolean existsByTripId(Long tripId);
}
✅ File 4 is created.

Are you ready for File 5: GroupMemberRepository.java (the database interface for listing group members and checking if a user is already in a group)?

--------------------------

Here is Step 5 / File 5: 
GroupMemberRepository.java
 following the Non-Technical first, then Technical format.

Part 1: Non-Technical Explanation (Layman / Interview View) 🗣️
What is this file? Think of this as the Guest List & Security Check for the trip.
Why do we need it?
When someone enters the Join Code (GOA-4821), we must check: "Are they already in the group?" (so they don't get added twice).
When someone tries to edit an itinerary day, we must check: "Is this person actually invited to this trip, and are they an Admin or just a guest?"
When opening the app, we need to show: "Here are the 4 friends currently in your group."
Part 2: Technical Explanation (Engineering View) 💻
This interface extends Spring Data's JpaRepository<GroupMember, Long>. Spring translates these method names into optimized SQL queries:

findByGroupId(Long groupId)
SQL: SELECT * FROM group_members WHERE group_id = ?
Purpose: Returns the full member roster (names, emails, roles) to display on the group screen.
existsByGroupIdAndUserId(Long groupId, Long userId)
SQL: SELECT COUNT(*) > 0 FROM group_members WHERE group_id = ? AND user_id = ?
Purpose: Fast 
O
(
1
)
O(1) check before joining. If true, we throw an error: "You are already a member of this trip!"
findByGroupIdAndUserId(Long groupId, Long userId)
SQL: SELECT * FROM group_members WHERE group_id = ? AND user_id = ?
Purpose: Fetches a companion's role (GROUP_OWNER, GROUP_ADMIN, or GROUP_MEMBER) to authorize actions.
findByUserId(Long userId)
SQL: SELECT * FROM group_members WHERE user_id = ?
Purpose: Lets a user see all the trips they have joined across the whole app.
The Code:
java


package com.tripnest.backend.repository;
import com.tripnest.backend.entity.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {
    // 1. Get all members in a group
    List<GroupMember> findByGroupId(Long groupId);
    // 2. Check if a user is already in this group
    boolean existsByGroupIdAndUserId(Long groupId, Long userId);
    // 3. Find specific member record to check their role
    Optional<GroupMember> findByGroupIdAndUserId(Long groupId, Long userId);
    // 4. Find all groups a particular user belongs to
    List<GroupMember> findByUserId(Long userId);
}
✅ File 5 is created.

With the Database Entities & Repositories complete, are you ready for File 6: GroupCreateRequest.java (the DTO data packet sent when a user creates a new travel group)?


--------------------------

Here is Step 6 / File 6: 
GroupCreateRequest.java
 with the Non-Technical first, then Technical structure and explicit GOAL comments.

Part 1: Non-Technical Explanation (Layman / Interview View) 🗣️
What is this file? When a trip creator decides: "I want to turn this Goa trip into a group vacation with friends," a popup modal asks:
"What do you want to name your travel group?"

Why do we need it? Instead of sending the whole complex database record across the internet, the frontend sends just this clean, simple form packet containing the group's name (e.g. "Goa Weekend Wanderers").
Part 2: Technical Explanation (Engineering View) 💻
Why only name? Why not joinCode or ownerId?
Security: A client should never supply their own ownerId (which could be faked) or their own joinCode (which could collide or be predictable).
The server will securely extract the owner's identity from the JWT token, and the service will automatically generate a cryptographically safe, unique 6-character code (e.g., GOA-4821).
Validation Guards:
@NotBlank: Rejects empty strings or accidental spaces.
@Size(min = 2, max = 100): Prevents single-letter nonsense or massive buffer-overflow text.
HTTP Endpoint:
Used in POST /api/trips/{tripId}/groups
The Code:
java


package com.tripnest.backend.dto.group;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
/**
 * GOAL: DTO payload sent by the trip owner to initialize a new travel group.
 * HTTP Context: POST /api/trips/{tripId}/groups
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupCreateRequest {
    /**
     * GOAL: Human-readable name for the travel group (e.g., "Goa Weekend Wanderers").
     * VALIDATION: Must not be blank, length between 2 and 100 characters.
     */
    @NotBlank(message = "Group name is required")
    @Size(min = 2, max = 100, message = "Group name must be between 2 and 100 characters")
    private String name;
}
✅ File 6 is created.

Are you ready for File 7: GroupJoinRequest.java (the DTO sent when a friend enters the 6-character code to join the trip)?

--------------------------

Here is Step 7 / File 7: 
GroupJoinRequest.java
.

Part 1: Non-Technical Explanation (Layman / Interview View) 🗣️
What is this file? Imagine you get a message on WhatsApp from your friend:

"Hey! Join our Goa trip on TripNest with code: GOA-4821"

When you open the app and type GOA-4821 into the "Join a Trip" box and click Submit, this file is the digital ticket sent to the server.

Why do we need it? It wraps the join code in a clean, validated format so the backend can verify it before adding you to the trip group.

Part 2: Technical Explanation (Engineering View) 💻
HTTP Endpoint:
Used in: POST /api/groups/join
Validation Guards:
@NotBlank: Rejects empty or whitespace submissions.
@Size(min = 4, max = 12): Ensures the code is formatted reasonably (e.g. GOA-4821), rejecting invalid inputs before even touching the database.
Security & Authentication:
Notice that the user's ID is not in this request packet. Spring Security will safely identify who is joining by reading the active JWT token from the Authorization header.
The Code:
java


package com.tripnest.backend.dto.group;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
/**
 * GOAL: DTO payload sent by a traveler to join an existing trip group using a code.
 * HTTP Context: POST /api/groups/join
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupJoinRequest {
    /**
     * GOAL: The 6-8 character alphanumeric join code (e.g. "GOA-4821") provided by the trip organizer.
     * VALIDATION: Must not be blank, size between 4 and 12 characters.
     */
    @NotBlank(message = "Join code is required")
    @Size(min = 4, max = 12, message = "Join code must be between 4 and 12 characters")
    private String joinCode;
}
✅ File 7 is created.

Are you ready for File 8: GroupMemberResponse.java (the response DTO that packages member details like Name, Email, Role, and Join Date for the UI)?

--------------------------

aprt from msg in wtsapp... can this grpCode be available in group for grpAdmin, grpOwner... so that they can send cd via email/msg. and when other frnd, logged in on site and click on join grp and enter grpCode , they r joined.

next file...
Yes, exactly! That is 100% how it works!

On the group dashboard, the GroupOwner and GroupAdmin will see an "Invite Companions" card showing the code prominently:

🎟️ Group Join Code: GOA-4821 [📋 Copy Code] [✉️ Email Invite]

The admin can copy it or email it directly. Any friend who logs in to TripNest can click "Join Group", type GOA-4821, and they are immediately added to the trip roster!

Now, here is Step 8 / File 8: 
GroupMemberResponse.java
.

Part 1: Non-Technical Explanation (Layman / Interview View) 🗣️
What is this file? When you open your travel group, you see a list of participants:
👑 Shreyas (shreyas@gmail.com) — Owner
⭐ Rahul (rahul@gmail.com) — Admin
👤 Priya (priya@gmail.com) — Member (Joined 2 hours ago)
Why do we need it? This file defines what information about each member is safe to send to the screen (their Name, Email, Role, and Join date), while keeping sensitive data (like user passwords) completely hidden.
Part 2: Technical Explanation (Engineering View) 💻
Data Masking & Security:
In the database, the User table has sensitive fields like password.
By returning this GroupMemberResponse DTO instead of the raw JPA User entity, we guarantee that passwords and internal hashes never leave the server.
Fields Mapped:
userId: Helps the frontend identify who is logged in (e.g. show "(You)" badge next to your own name).
role: Tells the UI whether to show Admin controls (like "Remove Member" or "Promote to Admin").
joinedAt: Allows sorting members chronologically by when they joined.
The Code:
java


package com.tripnest.backend.dto.group;
import com.tripnest.backend.entity.GroupRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
/**
 * GOAL: DTO returned to the frontend representing an individual member inside a travel group.
 * Used inside the group roster to display who is participating and their permissions.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupMemberResponse {
    /**
     * GOAL: Primary key ID of the group membership record.
     */
    private Long id;
    /**
     * GOAL: ID of the registered user.
     */
    private Long userId;
    /**
     * GOAL: Full name of the companion (e.g., "Rahul Sharma").
     */
    private String name;
    /**
     * GOAL: Contact email of the companion (e.g., "rahul@gmail.com").
     */
    private String email;
    /**
     * GOAL: Assigned role in the group (GROUP_OWNER, GROUP_ADMIN, or GROUP_MEMBER).
     */
    private GroupRole role;
    /**
     * GOAL: Timestamp when this companion joined the group.
     */
    private LocalDateTime joinedAt;
}
✅ File 8 is created.

Are you ready for File 9: GroupDetailsResponse.java (the master response packet that returns the Group Name, Trip Info, that shareable Join Code, and the list of all members)?

--------------------------

Noted! Removed the word GOAL from the code comments.

Here is Step 9 / File 9: 
GroupDetailsResponse.java
.

Part 1: Non-Technical Explanation (Layman / Interview View) 🗣️
What is this file? Think of this as the Complete Group Dashboard Summary.
Why do we need it? When you open your group page in TripNest, you want to see everything in one place:
Trip Info: "Goa Beach Vacation" (Goa, India)
Group Name: "Weekend Wanderers"
Shareable Invite Code: GOA-4821 (with a button to copy or email to friends)
The Member Roster: 3 Members joined (Shreyas, Rahul, Priya)
Part 2: Technical Explanation (Engineering View) 💻
Master Response Object: This DTO consolidates data from multiple tables (trips, travel_groups, group_members, and users) into a single payload, saving the frontend from making multiple separate network requests.
Where it is used:
POST /api/trips/{tripId}/groups (Returns newly created group with generated code)
GET /api/trips/{tripId}/groups (Returns the group details and all members)
POST /api/groups/join (Returns the group details right after a friend joins with the code)
Fields Mapped:
joinCode: The 6-character code the Admin copies and shares.
memberCount: Convenient counter (members.size()) for badge icons.
members: List of individual GroupMemberResponse items with name, email, role, and join time.
The Code:
java


package com.tripnest.backend.dto.group;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
/**
 * Master response DTO returned when fetching or initializing a travel group.
 * Contains the group metadata, shareable join code, and full member roster.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupDetailsResponse {
    // Unique ID of the travel group
    private Long id;
    // Associated trip ID
    private Long tripId;
    // Title of the vacation trip (e.g., "Goa Beach Vacation")
    private String tripTitle;
    // Destination of the trip (e.g., "Goa, India")
    private String destination;
    // Name given to the group by the owner (e.g., "Weekend Wanderers")
    private String name;
    // Unique 6-character code (e.g., "GOA-4821") that admins can copy and share
    private String joinCode;
    // Timestamp when the group was created
    private LocalDateTime createdAt;
    // Total count of current group members
    private int memberCount;
    // Full list of companions currently in this travel group
    @Builder.Default
    private List<GroupMemberResponse> members = new ArrayList<>();
}
✅ File 9 is created.

With all Entities, Repositories, and DTOs finished, we now enter the Business Logic Layer.

Are you ready for File 10: GroupCollaborationService.java (the Service Interface defining the rules for creating groups, joining by code, promoting admins, and removing members)?

--------------------------

Here is Step 10 / File 10: 
GroupCollaborationService.java
.

Part 1: Non-Technical Explanation (Layman / Interview View) 🗣️
What is this file? This is the "Operations Brain" of Group Collaboration.
What real-world actions does it handle?
Creating the Group: When the trip owner clicks "Start Group", this service creates the group, generates a cool code based on the destination (e.g. GOA-8421), and enrolls the creator as GROUP_OWNER.
Joining with Code: When a friend enters GOA-8421, this service verifies the code exists, confirms the friend isn't already in the group, and enrolls them as GROUP_MEMBER.
Viewing the Group: Loads the complete dashboard (trip name, join code, and member roster).
Promoting to Admin: Allows the Owner to promote a trusted friend to GROUP_ADMIN.
Leaving / Removing Members: Allows companions to leave or leaders to remove someone.
Part 2: Technical Explanation (Engineering View) 💻
Atomic Transactions (@Transactional):
When a group is created, two inserts must happen: insert into travel_groups and insert the creator into group_members.
@Transactional guarantees atomicity: if any step fails, the entire transaction rolls back cleanly.
Collision-Free Code Generator (generateUniqueJoinCode):
Takes the trip destination (e.g. "Goa" 
→
→ "GOA", "Mumbai" 
→
→ "MUM").
Appends 4 cryptographically secure random alphanumeric characters (e.g., GOA-8421).
Uses a do-while loop checking travelGroupRepository.existsByJoinCode(code) to guarantee zero code collisions.
Security & Permission Checks:
Checks !trip.getOwner().getId().equals(user.getId()) to prevent random users from claiming another user's trip.
Ensures only GROUP_OWNER can promote/demote members.
Protects the GROUP_OWNER from being removed.
The Code:
java


package com.tripnest.backend.service;
import com.tripnest.backend.dto.group.*;
import com.tripnest.backend.entity.*;
import com.tripnest.backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.SecureRandom;
import java.util.List;
import java.util.stream.Collectors;
@Service
public class GroupCollaborationService {
    private final TravelGroupRepository travelGroupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    // 1. Initializing a travel group & generating join code
    @Transactional
    public GroupDetailsResponse createGroup(Long tripId, GroupCreateRequest request, String userEmail) {
        // Verifies trip ownership, generates unique code, saves group, sets owner as GROUP_OWNER
        ...
    }
    // 2. Fetching group details & roster
    @Transactional(readOnly = true)
    public GroupDetailsResponse getGroupByTripId(Long tripId, String userEmail) {
        // Loads group and members if caller is an authorized participant
        ...
    }
    // 3. Joining via 6-character code
    @Transactional
    public GroupDetailsResponse joinGroupByCode(GroupJoinRequest request, String userEmail) {
        // Validates joinCode, prevents duplicate joins, adds user as GROUP_MEMBER
        ...
    }
    // 4. Role management (promoting to GROUP_ADMIN)
    @Transactional
    public GroupMemberResponse updateMemberRole(Long tripId, Long targetUserId, GroupRole newRole, String userEmail) {
        // Verifies caller is GROUP_OWNER and updates permissions
        ...
    }
    // 5. Removing member or leaving group
    @Transactional
    public void removeMember(Long tripId, Long targetUserId, String userEmail) {
        // Handles self-removal (leaving) or leader removal
        ...
    }
}
Verification:
Verified with mvn compile -DskipTests — BUILD SUCCESS across all 80 backend source files!
Are you ready for File 11: GroupCollaborationController.java (the final file of Task 4 — the REST Controller exposing endpoints for Postman and Frontend)?

--------------------------

Here is Step 11 / File 11: 
GroupCollaborationController.java
 — the final file that completes Milestone 3, Task 4!

Part 1: Non-Technical Explanation (Layman / Interview View) 🗣️
What is this file? This is the "Front Reception Desk" of the backend.
How does it work in practice?
When the trip owner clicks "Create Travel Group" on the website, their browser knocks on Door 1: POST /api/trips/1/groups.
When you open the group page to see your friends, your browser knocks on Door 2: GET /api/trips/1/groups.
When a friend on another computer types GOA-4821 and clicks "Join", their browser knocks on Door 3: POST /api/groups/join.
If the owner promotes a friend to Admin, the request goes to Door 4: PUT .../role.
If someone leaves the trip, the request goes to Door 5: DELETE .../members/{id}.
Part 2: Technical Explanation (Engineering View) 💻
REST Contract & HTTP Status Codes:
POST /api/trips/{tripId}/groups 
→
→ Returns 201 CREATED with the new group and join code.
GET /api/trips/{tripId}/groups 
→
→ Returns 200 OK with the group dashboard & roster.
POST /api/groups/join 
→
→ Returns 200 OK confirming successful entry.
PUT /api/trips/{tripId}/groups/members/{userId}/role 
→
→ Returns 200 OK with updated role.
DELETE /api/trips/{tripId}/groups/members/{userId} 
→
→ Returns 204 NO CONTENT.
Zero Trust Security:
User identity is never accepted from the request body. It is securely extracted directly from the verified JWT bearer token via Authentication.getName().
The Code:
java


package com.tripnest.backend.controller;
import com.tripnest.backend.dto.group.*;
import com.tripnest.backend.entity.GroupRole;
import com.tripnest.backend.service.GroupCollaborationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
@RestController
@CrossOrigin
public class GroupCollaborationController {
    private final GroupCollaborationService groupService;
    public GroupCollaborationController(GroupCollaborationService groupService) {
        this.groupService = groupService;
    }
    // 1. Initialize travel group and generate code
    @PostMapping("/api/trips/{tripId}/groups")
    public ResponseEntity<GroupDetailsResponse> createGroup(
            @PathVariable Long tripId,
            @Valid @RequestBody GroupCreateRequest request,
            Authentication authentication) {
        String userEmail = authentication.getName();
        GroupDetailsResponse response = groupService.createGroup(tripId, request, userEmail);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    // 2. View group dashboard & member roster
    @GetMapping("/api/trips/{tripId}/groups")
    public ResponseEntity<GroupDetailsResponse> getGroupByTripId(
            @PathVariable Long tripId,
            Authentication authentication) {
        String userEmail = authentication.getName();
        GroupDetailsResponse response = groupService.getGroupByTripId(tripId, userEmail);
        return ResponseEntity.ok(response);
    }
    // 3. Companion enters 6-character code to join
    @PostMapping("/api/groups/join")
    public ResponseEntity<GroupDetailsResponse> joinGroupByCode(
            @Valid @RequestBody GroupJoinRequest request,
            Authentication authentication) {
        String userEmail = authentication.getName();
        GroupDetailsResponse response = groupService.joinGroupByCode(request, userEmail);
        return ResponseEntity.ok(response);
    }
    // 4. Update member role (e.g. promote to GROUP_ADMIN)
    @PutMapping("/api/trips/{tripId}/groups/members/{userId}/role")
    public ResponseEntity<GroupMemberResponse> updateMemberRole(
            @PathVariable Long tripId,
            @PathVariable Long userId,
            @RequestParam GroupRole role,
            Authentication authentication) {
        String userEmail = authentication.getName();
        GroupMemberResponse response = groupService.updateMemberRole(tripId, userId, role, userEmail);
        return ResponseEntity.ok(response);
    }
    // 5. Remove member or leave group
    @DeleteMapping("/api/trips/{tripId}/groups/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long tripId,
            @PathVariable Long userId,
            Authentication authentication) {
        String userEmail = authentication.getName();
        groupService.removeMember(tripId, userId, userEmail);
        return ResponseEntity.noContent().build();
    }
}
🎉 Milestone 3, Task 4 is Complete!
We ran mvn compile -DskipTests — BUILD SUCCESS across all 81 files with zero errors!

Here is the complete file chain we built together:

GroupRole.java (Enum)
TravelGroup.java (Entity)
GroupMember.java (Join Entity)
TravelGroupRepository.java (JPA Repo)
GroupMemberRepository.java (JPA Repo)
GroupCreateRequest.java (DTO)
GroupJoinRequest.java (DTO)
GroupMemberResponse.java (DTO)
GroupDetailsResponse.java (DTO)
GroupCollaborationService.java (Business Logic)
GroupCollaborationController.java (REST Endpoints)
Would you like to review the Postman test payloads for these new endpoints, or are you ready to start Task 5: Shared Expenses & Debt Settlement APIs?

--------------------------

Postman testing helps in u/d.g endpts well ... and it will help to show to mentor .. so i need thm.
1 task in a day is max shud be limit ... 
i shd balance thngs .. .dsa + rvsn core / java / sql + syDs + proj prev rvsn + curr Proj task.
i will do nxt t5 2mrw.
giv pstmn tstng pts

**

Your daily pacing strategy is 100% spot-on. Doing 1 solid backend task per day while balancing DSA + Core Java revision + SQL + System Design + Project revision is the exact recipe for clearing technical interviews and finishing your internship with high quality without burning out.

Here is your complete Postman Testing Guide for M3 Task 4 (Group Collaboration APIs). You can use this directly to test your code and show your mentor how each endpoint handles both happy paths and security edge cases.

📬 Postman Testing Guide — M3 Task 4: Group Collaboration
Prerequisites
Base URL: http://localhost:8080
Two Test Users Needed:
User 1 (Trip Owner): Login via POST /api/auth/login 
→
→ copy JWT token as {{TOKEN_OWNER}}.
User 2 (Friend / Companion): Login via POST /api/auth/login 
→
→ copy JWT token as {{TOKEN_FRIEND}}.
1. Test 1: Initialize Travel Group (Trip Owner)
Mentor Talking Point: "The trip owner initializes a collaboration group. The system securely generates a collision-free 6-character join code and automatically enrolls the owner as GROUP_OWNER."

Method: POST
URL: http://localhost:8080/api/trips/1/groups
Headers:
Authorization: Bearer {{TOKEN_OWNER}}
Content-Type: application/json
Request Body:
json


{
  "name": "Goa Weekend Wanderers"
}
Expected Status: 201 Created
Sample Response:
json


{
  "id": 1,
  "tripId": 1,
  "tripTitle": "Goa Beach Vacation",
  "destination": "Goa",
  "name": "Goa Weekend Wanderers",
  "joinCode": "GOA-8421",
  "createdAt": "2026-09-18T17:25:00",
  "memberCount": 1,
  "members": [
    {
      "id": 1,
      "userId": 1,
      "name": "Shreyas",
      "email": "shreyas@gmail.com",
      "role": "GROUP_OWNER",
      "joinedAt": "2026-09-18T17:25:00"
    }
  ]
}
👉 Copy the returned joinCode (e.g. GOA-8421) for the next tests!

2. Test 2: View Group Dashboard & Member Roster
Mentor Talking Point: "Fetches the complete group summary. The frontend uses this to display the join code to admins and list all companions."

Method: GET
URL: http://localhost:8080/api/trips/1/groups
Headers:
Authorization: Bearer {{TOKEN_OWNER}}
Expected Status: 200 OK
3. Test 3: Companion Joins via Join Code
Mentor Talking Point: "A companion logs in with their own account, enters the 6-character code, and is instantly enrolled as GROUP_MEMBER."

Method: POST
URL: http://localhost:8080/api/groups/join
Headers:
Authorization: Bearer {{TOKEN_FRIEND}} (Using User 2's token!)
Content-Type: application/json
Request Body:
json


{
  "joinCode": "GOA-8421"
}
Expected Status: 200 OK
Sample Response:
json


{
  "id": 1,
  "tripId": 1,
  "name": "Goa Weekend Wanderers",
  "joinCode": "GOA-8421",
  "memberCount": 2,
  "members": [
    {
      "id": 1,
      "userId": 1,
      "name": "Shreyas",
      "role": "GROUP_OWNER"
    },
    {
      "id": 2,
      "userId": 2,
      "name": "Rahul",
      "email": "rahul@gmail.com",
      "role": "GROUP_MEMBER",
      "joinedAt": "2026-09-18T17:28:10"
    }
  ]
}
4. Test 4 (Security Edge Case): Duplicate Join Prevention
Mentor Talking Point: "If a user tries to enter the same code again, the system prevents duplicate memberships using both database constraints and service validation."

Method: POST
URL: http://localhost:8080/api/groups/join
Headers:
Authorization: Bearer {{TOKEN_FRIEND}}
Request Body:
json


{
  "joinCode": "GOA-8421"
}
Expected Result: 500 / 400 Bad Request with message:
text


"You are already a member of this travel group!"
5. Test 5: Promote Member to Admin
Mentor Talking Point: "Only the GROUP_OWNER has authority to promote a member to GROUP_ADMIN."

Method: PUT
URL: http://localhost:8080/api/trips/1/groups/members/2/role?role=GROUP_ADMIN
Headers:
Authorization: Bearer {{TOKEN_OWNER}}
Expected Status: 200 OK
Response:
json


{
  "id": 2,
  "userId": 2,
  "name": "Rahul",
  "role": "GROUP_ADMIN",
  "joinedAt": "2026-09-18T17:28:10"
}

6. Test 6: Member Leaves Group or Admin Removes Companion
Mentor Talking Point: "A member can leave the group, or an admin can remove a member. The database deletes the join row while leaving the user account intact."

Method: DELETE
URL: http://localhost:8080/api/trips/1/groups/members/2
Headers:
Authorization: Bearer {{TOKEN_OWNER}} (or {{TOKEN_FRIEND}} leaving)
Expected Status: 204 No Content

🔍 Quick pgAdmin SQL Verification:
Run this in pgAdmin Query Tool to show your mentor the persisted data:

sql
-- See all travel groups and generated join codes
SELECT tg.id, tg.trip_id, t.title AS trip_title, tg.name AS group_name, tg.join_code, tg.created_at
FROM travel_groups tg
JOIN trips t ON tg.trip_id = t.id;

-- See group members and their assigned roles
SELECT gm.id, gm.group_id, u.name AS user_name, u.email, gm.role, gm.joined_at
FROM group_members gm
JOIN users u ON gm.user_id = u.id;


Take your time today for DSA, Core Java, and SQL revision. Tomorrow, whenever you are ready, we will tackle M3 Task 5: Shared Expenses & Min-Cash-Flow Debt Settlement Algorithm! Have a great study session!



**-------
grp name, grp id, trip name, trip id , grp mbrs usr id , grp mbrs usr eml / usr name... sql for ths
Here is the SQL query for your database, Azn:

sql


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


--------------------------

Awesome job, Azn! 🎯

All your Postman tests executed with 100% precision! Notice how the code dynamically grabbed "SHI" from "shimla" and generated the collision-free code SHI-3YZ3, and correctly blocked both duplicate group creation and duplicate member joins. That is rock-solid engineering!

1. Documentation Updated & Created 📁
M3T4_Impl_readmeAg.md Created:

Location: 
M3T4_Impl_readmeAg.md
Captures the full architectural breakdown, RBAC permissions matrix, your exact Postman runs with JSON outputs, PostgreSQL queries, and SDE-1 interview defense talking points. (Your personal notes file M3T4_Impl_readme.md was left untouched as per your rule).
Master Registry 
APIsCreated.md
 Updated:

Milestone 3 Task 4 is now marked COMPLETED (5 Active Endpoints Verified).
Total active production endpoints across TripNest has reached 41 Endpoints!
2. Can we have "Delete a Group Member" Feature?
Good news: It is ALREADY built into your backend right now! 🚀

We already coded this inside GroupCollaborationController.java and GroupCollaborationService.java:

🛠️ The Endpoint:
Method: DELETE
URL: http://localhost:8080/api/trips/7/groups/members/{userId}
Expected Status: 204 No Content
💡 How It Works (Dual Behavior):
Self-Leave (Voluntary Exit):
If companion pi (userId: 2) calls DELETE /api/trips/7/groups/members/2 using their own TOKEN_FRIEND, they gracefully leave the trip group.
Kick Out (Admin/Owner Action):
If the GROUP_OWNER (or a GROUP_ADMIN) calls DELETE /api/trips/7/groups/members/2, the companion is removed/expelled from the roster.
Owner Protection Rule (Fail-Safe):
If anyone tries to delete the Owner (userId: 6), the backend throws:
"The Group Owner cannot be removed from the trip group."
3. What about the GROUP_ADMIN Role? What can they do?
🏠 Non-Technical / Layman Analogy:
Think of the GROUP_OWNER as the Captain of the ship (the person who booked the trip), and the GROUP_ADMIN as the Co-Captain / Vice Captain.
On a group trip with 5-10 friends, the owner might be driving or busy. The owner promotes a trusted friend (pi) to GROUP_ADMIN to help run the vacation.

⚙️ What GROUP_ADMIN can do across our APIs:
Scope	What GROUP_ADMIN Can Do	API Involved
Task 4 (Collaboration)	Remove / kick out companions who cancelled their trip	DELETE /api/trips/{tripId}/groups/members/{userId}
Task 5 (Shared Bills)	Add shared group expenses and decide who splits them	POST /api/expenses/{id}/split
Task 5 (Settlements)	Verify UPI payments and mark debts as SETTLED	PUT /api/splits/{id}/settle
Task 6 (Vault & Media)	Upload shared hotel vouchers, train tickets, and group photos	POST /api/trips/{tripId}/documents
Task 6 (Notifications)	Broadcast itinerary change alerts to all group members	POST /api/notifications
🛑 What GROUP_ADMIN is RESTRICTED from doing:
❌ An Admin cannot demote or kick the GROUP_OWNER.
❌ An Admin cannot delete or cancel the entire Trip.
4. Can we have an "Edit Group Name" Feature?
Right now, group creation sets the initial name (e.g. "Hill Station Explorers").

If you want travelers to be able to rename their group later (e.g. to "Shimla Snow Trekkers"), we can easily add a single endpoint:

Method: PUT
URL: http://localhost:8080/api/trips/{tripId}/groups
Authorized Roles: GROUP_OWNER and GROUP_ADMIN
Body:
json


{
  "name": "Shimla Snow Trekkers"
}
--------------------------


give del mbr api and edit grp name api ... will do using grpAdmin but mention both in notes?
Both APIs are implemented, compiled (BUILD SUCCESS across 81 files), and documented in both 
M3T4_Impl_readmeAg.md
 and 
APIsCreated.md
! 🚀

Here is the breakdown, followed by your Postman testing steps using GROUP_ADMIN (TOKEN_FRIEND / pi):

1. 💡 Non-Technical (Layman) vs. 💻 Technical Explanation
💡 Non-Technical (Layman):
Think of pi as your Trip Co-Captain:

Rename the Group: The original name was "Hill Station Explorers". Since pi is now a GROUP_ADMIN, pi doesn't need to disturb the trip owner to change the group title to something cooler, like "Shimla Mountain Squad".
Manage the Roster: If a companion drops out of the trip, pi (the Admin) has the authority to remove them. But if pi gets cheeky and tries to kick the Owner out of their own trip, the system slaps on the emergency brakes!
💻 Technical (Spring Boot Architecture):
Edit Group Name (PUT /api/trips/{tripId}/groups):
Reads the authenticated caller from SecurityContext.
Verifies membership and verifies that caller.role == GROUP_OWNER || caller.role == GROUP_ADMIN.
Updates group.name and flushes to PostgreSQL via travelGroupRepository.save().
Delete Member (DELETE /api/trips/{tripId}/groups/members/{userId}):
Checks:
If targetMember.role == GROUP_OWNER 
→
→ Blocked! (Owner can never be removed).
If caller is deleting themselves 
→
→ Permitted (Self-leave).
If caller is GROUP_OWNER or GROUP_ADMIN 
→
→ Permitted (Companion kick).
2. 🧪 Postman Testing as GROUP_ADMIN (TOKEN_FRIEND)
(Make sure your backend is running the latest build on port 8080!)

🧪 Test 6A: Edit Group Name (Executed by GROUP_ADMIN)
Goal: Verify that your companion pi (TOKEN_FRIEND), who has role GROUP_ADMIN, can rename the group without the owner's help.

Method: PUT
URL: http://localhost:8080/api/trips/7/groups
Headers:
Authorization: Bearer {{TOKEN_FRIEND}} (pi's token)
Content-Type: application/json
Body (raw JSON):
json


{
  "name": "Shimla Mountain Squad"
}
Expected Status: 200 OK
Expected Response:
json


{
  "id": 1,
  "tripId": 7,
  "tripTitle": "hill station tour sept",
  "destination": "shimla",
  "name": "Shimla Mountain Squad",
  "joinCode": "SHI-3YZ3",
  "memberCount": 2,
  "members": [ ... ]
}
(Notice "name" is now updated to "Shimla Mountain Squad"!)
🧪 Test 6B: Security Fail-Safe Check (Negative Test)
Goal: Verify that even as a GROUP_ADMIN, pi cannot kick out the trip owner (userId: 6).

Method: DELETE
URL: http://localhost:8080/api/trips/7/groups/members/6
Headers:
Authorization: Bearer {{TOKEN_FRIEND}}
Expected Status: 500 Internal Server Error (or error response)
Expected Message:
"The Group Owner cannot be removed from the trip group."
🧪 Test 6C: Member Removal / Self-Leave
Goal: Test leaving or removing a member.

Scenario: pi departs the trip (Self-Leave):
Method: DELETE
URL: http://localhost:8080/api/trips/7/groups/members/2
Headers: Authorization: Bearer {{TOKEN_FRIEND}}
Expected Status: 204 No Content
(If you then run GET /api/trips/7/groups, memberCount drops back to 1!)
(Tip: If you do Test 6C and pi leaves, you can always have pi rejoin with POST /api/groups/join using SHI-3YZ3 anytime!)

3. 📋 Documentation Summary
M3T4_Impl_readmeAg.md
: Includes both APIs, the GROUP_ADMIN permissions matrix, and the tests above.
APIsCreated.md
: Updated to 6 Active Endpoints for Task 4, bringing your platform total to 42 Production Endpoints!
Give Test 6A and 6B a quick spin in Postman and tell me how it looks! 🚀

--------------------------
-----------------


mentor said, let a user to search group name and sent invite for addition....
or 
let grpAdmin, add user
have we done both way ?
Great observation from your mentor, Azn! 🎯

Here is the honest status:

Right now, we have done Way 1 (Join Code SHI-3YZ3). We have NOT done the other two ways yet!

Let's break down all 3 ways in layman terms so it's crystal clear, and see how easy it is to add both!

1. 💡 Non-Technical (Layman) Analogy: The 3 Ways to Join a Travel Group
Method	Real-World Analogy	Who Initiates?	Have We Done It?
Way 1: Join via Code	Kahoot / Zoom Meeting Passcode: Owner shares SHI-3YZ3 on WhatsApp. You type the code 
→
→ You're in!	Friend enters code	✅ DONE & TESTED!
Way 2: Direct Add by Admin	WhatsApp Group Add: Admin opens group, picks kim@example.com from contacts, and directly drops them in. No code needed!	Admin / Owner pushes user in	⏳ NOT YET
Way 3: Search by Name	Telegram / Discord Search: User types "Shimla" in the search bar, finds "Shimla Hill Station Explorers", and clicks to join.	User searches & joins	⏳ NOT YET
2. 💻 Technical / Spring Boot Breakdown (What We Need to Add)
Your mentor wants flexibility so travelers aren't forced to copy-paste 6-letter codes if the Admin already knows who they are, or if someone wants to discover the group by name.

To give your project both features:

🔹 Feature A: grpAdmin Adds User Directly
Endpoint: POST /api/trips/{tripId}/groups/members
Caller: Must be GROUP_OWNER or GROUP_ADMIN (pi or aln)
Payload:
json


{
  "email": "kim@example.com"
}
How it works:
Admin provides the friend's email.
Backend looks up users table for kim@example.com.
Verifies kim isn't already in the group.
Automatically enrolls kim as GROUP_MEMBER!
🔹 Feature B: Search Group by Name
Endpoint: GET /api/groups/search?name=Shimla
Caller: Any authenticated traveler
How it works:
Uses SQL: SELECT * FROM travel_groups WHERE LOWER(name) LIKE LOWER('%Shimla%').
Returns matching groups, destination, creator name, member count, and their join code!
3. 🛠️ Ready to Build Both?
We can build both right now cleanly, strictly 1 file at a time:

File 1: Update TravelGroupRepository.java 
→
→ Add findByNameContainingIgnoreCase(String name).
File 2: Create AddMemberRequest.java DTO 
→
→ Input for {"email": "..."}.
File 3: Update GroupCollaborationService.java 
→
→ Add addMemberByAdmin() and searchGroupsByName().
File 4: Update GroupCollaborationController.java 
→
→ Expose the two new endpoints.
Shall we go ahead and add this so your mentor is 100% satisfied? Let's start with File 1! 🚀

7:37 PM
or can a user search by some unique group id or join code or group name?
YES! Absolutely, Azn! And that is actually a MUCH smarter, higher-level engineering design! 🌟

Instead of creating 3 separate, rigid endpoints (/search-by-name, /search-by-code, /search-by-id), you can design a Google-Style "Universal Group Search" API!

1. 💡 Non-Technical (Layman) Analogy: The "One-Box" Search
Think of YouTube or WhatsApp search:

You don't have three different search boxes saying "Type ID here", "Type Code here", "Type Name here".
You just have ONE search bar.
Whatever the user types into that box:
If they type 1 
→
→ It finds Group ID 1.
If they type SHI-3YZ3 
→
→ It finds the group with that Join Code.
If they type Shimla or Explorers 
→
→ It finds groups matching that name.
The backend does the thinking; the user just types and finds their group!

2. 💻 Technical (Spring Boot) Implementation:
We can create:

http


GET /api/groups/search?query={keyword}
Inside GroupCollaborationService.java:
java


// 1. If query is a number (e.g. "1"), search by Group ID:
if (query.matches("\\d+")) {
    travelGroupRepository.findById(Long.parseLong(query)).ifPresent(results::add);
}
// 2. Search by exact Join Code (e.g. "SHI-3YZ3"):
travelGroupRepository.findByJoinCode(query.toUpperCase().trim()).ifPresent(results::add);
// 3. Search by partial Name (e.g. "Shimla" or "Squad"):
List<TravelGroup> byName = travelGroupRepository.findByNameContainingIgnoreCase(query.trim());
results.addAll(byName);
🎯 Why Interviewers & Your Mentor Will LOVE This:
"Instead of polluting the API with multiple fragmented endpoints, I implemented a polymorphic Universal Query Parser that matches against ID, Join Code, and partial Name in a single call, eliminating UI complexity." That sounds like a Senior SDE answer!

3. The Complete Plan for Both of Mentor's Requirements:
We will build two powerful APIs:

🔍 Universal Search API:
GET /api/groups/search?query=Shimla (searches Group Name, Join Code, or Group ID)
👤 Admin Direct Add API:
POST /api/trips/{tripId}/groups/members with body {"email": "kim@example.com"} (Admin adds friend directly, no code needed)
Shall we implement this now, strictly 1 file at a time?
File 1: TravelGroupRepository.java (add findByNameContainingIgnoreCase)
File 2: AddMemberRequest.java (DTO for email input)
File 3: GroupCollaborationService.java (implement both methods)
File 4: GroupCollaborationController.java (expose the endpoints)
Ready to start with File 1? 🚀


--------------------------

Task 4 (Search & Direct Add) ... lets finsh ths frst ... 
Awesome decision, Azn! Let's polish and seal Task 4 completely so your mentor has zero gaps to point out. 🚀

As always, we work strictly 1 file at a time:

File 1: TravelGroupRepository.java (Database query for partial name search)
File 2: AddMemberRequest.java (DTO payload for Admin direct-add by email)
File 3: GroupCollaborationService.java (Business logic for Universal Search & Direct Add)
File 4: GroupCollaborationController.java (Exposing the 2 REST endpoints)
Let's dive into File 1!

--------------------------

Awesome decision, Azn! Let's polish and seal Task 4 completely so your mentor has zero gaps to point out. 🚀

As always, we work strictly 1 file at a time:

File 1: TravelGroupRepository.java (Database query for partial name search)
File 2: AddMemberRequest.java (DTO payload for Admin direct-add by email)
File 3: GroupCollaborationService.java (Business logic for Universal Search & Direct Add)
File 4: GroupCollaborationController.java (Exposing the 2 REST endpoints)
Let's dive into File 1!

📄 File 1: TravelGroupRepository.java
💡 1. Non-Technical (Layman) Analogy:
Think of this like adding a fuzzy keyword search feature to a library book catalog. If someone types "shimla", "SHIMLA", or just "explorers", you want the database to find any group whose title contains those characters anywhere inside it, without caring about uppercase or lowercase letters.

💻 2. Technical (Spring Boot & JPA) Explanation:
In Spring Data JPA, we don't need to write raw SQL queries by hand. We use the derived query method convention:

java


List<TravelGroup> findByNameContainingIgnoreCase(String name);
Behind the scenes, Hibernate automatically translates this method name into performant PostgreSQL SQL:

sql


SELECT * FROM travel_groups 
WHERE LOWER(name) LIKE LOWER(CONCAT('%', ?, '%'));
🛠️ Code Applied to 
TravelGroupRepository.java
:
java


package com.tripnest.backend.repository;
import com.tripnest.backend.entity.TravelGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
/**
 * TravelGroupRepository provides database operations for the TravelGroup entity.
 */
@Repository
public interface TravelGroupRepository extends JpaRepository<TravelGroup, Long> {
    /**
     * GOAL: Search travel groups whose name contains the query string (case-insensitive).
     * SQL:  SELECT * FROM travel_groups WHERE LOWER(name) LIKE LOWER(CONCAT('%', ?, '%'))
     */
    List<TravelGroup> findByNameContainingIgnoreCase(String name);
    /**
     * GOAL: Find the unique travel group linked to a specific trip ID.
     */
    Optional<TravelGroup> findByTripId(Long tripId);
    /**
     * GOAL: Find the travel group matching the 6-character join code entered by a user.
     */
    Optional<TravelGroup> findByJoinCode(String joinCode);
    boolean existsByJoinCode(String joinCode);
    boolean existsByTripId(Long tripId);
}
✅ Verification: Compiled cleanly (BUILD SUCCESS, 0 errors).

Ready for File 2 (AddMemberRequest.java)? Let me know and we'll create the DTO contract! 🚀

--------------------------

Let's keep the momentum going! Here is File 2:

📄 File 2: AddMemberRequest.java (DTO)
💡 1. Non-Technical (Layman) Analogy:
Think of this as a VIP Invitation Slip. When the Group Admin wants to add a friend directly without making them hunt for a 6-character passcode, the Admin writes down the friend's email (e.g. kim@example.com) on this slip. The system checks:

"Is the slip blank?" 
→
→ Rejected!
"Does it look like a valid email address with an @ and domain?" 
→
→ If not, rejected before anyone wastes time!
💻 2. Technical (Spring Boot & Jakarta Validation) Explanation:
Decoupling Layer: We use a DTO (Data Transfer Object) so the client only sends the exact field needed (email), keeping the internal database entities decoupled from the API request.
Declarative Validation:
@NotBlank(message = "Member email is required"): Prevents empty strings or whitespace.
@Email(message = "Please provide a valid email address"): Enforces RFC 5322 email syntax validation at the HTTP layer, throwing a 400 Bad Request before hitting PostgreSQL.
Lombok: @Data, @Builder, @NoArgsConstructor, and @AllArgsConstructor eliminate ~30 lines of boilerplate getters, setters, and constructors.
🛠️ Code Created at 
AddMemberRequest.java
:
java


package com.tripnest.backend.dto.group;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
/**
 * GOAL: DTO payload sent by a Group Owner or Group Admin to directly add a companion by email.
 * HTTP Context: POST /api/trips/{tripId}/groups/members
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddMemberRequest {
    /**
     * GOAL: The registered email address of the traveler to add into the travel group.
     * VALIDATION: Must not be blank and must follow valid email syntax.
     */
    @NotBlank(message = "Member email is required")
    @Email(message = "Please provide a valid email address")
    private String email;
}
✅ Verification: Compiled cleanly (BUILD SUCCESS, 82 source files, 0 errors).

Ready for File 3 (GroupCollaborationService.java) where we wire up both the Universal Search logic and the Admin Direct Add logic? Say the word! 🚀

--------------------------

Here is File 3, the brain of both operations:

📄 File 3: GroupCollaborationService.java (Business Logic)
In this file, we added the business logic for both features:

Universal Search Engine (searchGroups)
Admin Direct Add by Email (addMemberByAdmin)
💡 1. Non-Technical (Layman) Analogy:
The Smart Search Engine (searchGroups):
Think of a smart detective dog. If you give the dog a numeric badge number ("1"), it finds that specific badge. If you give it a secret code ("SHI-3YZ3"), it tracks down the code. If you give it a word ("Shimla"), it finds any group with that word in its title. The user doesn't have to specify what type of query it is—the engine automatically figures it out!

The VIP Backstage Pass (addMemberByAdmin):
Only the Club Owner (GROUP_OWNER) or Club Manager (GROUP_ADMIN) can escort someone directly through the VIP backstage door. The manager says: "Add kim@example.com". The bouncer checks:

Is the manager really an Admin or Owner? (If not 
→
→ Access Denied!).
Does a registered user with that email exist?
Is kim already inside? (If yes 
→
→ "Already a member!").
If all good 
→
→ kim is admitted immediately as a GROUP_MEMBER!
💻 2. Technical (Spring Boot & Architecture) Explanation:
In searchGroups(String query):
Uses a LinkedHashSet<TravelGroup> to maintain deterministic insertion order while preventing duplicate group cards if a query matches both a code and a name.
query.matches("\\d+"): Dynamically checks if the input is an integer ID for 
O
(
1
)
O(1) primary key lookup via findById().
Case-insensitive join code and partial name derived query execution.
In addMemberByAdmin(Long tripId, AddMemberRequest request, String callerEmail):
Strict RBAC check: callerMember.getRole() != GROUP_OWNER && callerMember.getRole() != GROUP_ADMIN throws an authorization exception.
Defensive verification using existsByGroupIdAndUserId to prevent duplicate membership records.
@Transactional ensures atomic persistence and immediate flush.
🛠️ Code Added to 
GroupCollaborationService.java
:
java


    /**
     * Universal Group Search: Finds groups by numeric Group ID, exact Join Code, or partial Group Name.
     */
    @Transactional(readOnly = true)
    public List<GroupDetailsResponse> searchGroups(String query) {
        if (query == null || query.trim().isEmpty()) {
            return Collections.emptyList();
        }
        String cleanQuery = query.trim();
        Set<TravelGroup> matchedGroups = new LinkedHashSet<>();
        // 1. If numeric, search by Group ID
        if (cleanQuery.matches("\\d+")) {
            travelGroupRepository.findById(Long.parseLong(cleanQuery)).ifPresent(matchedGroups::add);
        }
        // 2. Search by exact Join Code (e.g. "SHI-3YZ3")
        travelGroupRepository.findByJoinCode(cleanQuery.toUpperCase()).ifPresent(matchedGroups::add);
        // 3. Search by partial Group Name (e.g. "Shimla" or "Explorers")
        List<TravelGroup> byName = travelGroupRepository.findByNameContainingIgnoreCase(cleanQuery);
        matchedGroups.addAll(byName);
        // Map all unique matches to GroupDetailsResponse
        return matchedGroups.stream()
                .map(group -> {
                    List<GroupMember> members = groupMemberRepository.findByGroupId(group.getId());
                    return mapToGroupDetailsResponse(group, members);
                })
                .collect(Collectors.toList());
    }
    /**
     * Allows GROUP_OWNER or GROUP_ADMIN to directly add a companion by their registered email.
     */
    @Transactional
    public GroupDetailsResponse addMemberByAdmin(Long tripId, AddMemberRequest request, String callerEmail) {
        User caller = getUserByEmail(callerEmail);
        TravelGroup group = travelGroupRepository.findByTripId(tripId)
                .orElseThrow(() -> new RuntimeException("No travel group found for this trip."));
        // Verify caller is GROUP_OWNER or GROUP_ADMIN
        GroupMember callerMember = groupMemberRepository.findByGroupIdAndUserId(group.getId(), caller.getId())
                .orElseThrow(() -> new RuntimeException("Caller is not a member of this travel group."));
        if (callerMember.getRole() != GroupRole.GROUP_OWNER && callerMember.getRole() != GroupRole.GROUP_ADMIN) {
            throw new RuntimeException("Only Group Owners and Admins can directly add members.");
        }
        // Look up the target companion by email
        String targetEmail = request.getEmail().trim().toLowerCase();
        User targetUser = userRepository.findByEmail(targetEmail)
                .orElseThrow(() -> new RuntimeException("No registered traveler found with email: " + request.getEmail()));
        // Prevent duplicate addition
        if (groupMemberRepository.existsByGroupIdAndUserId(group.getId(), targetUser.getId())) {
            throw new RuntimeException("User '" + targetUser.getName() + "' is already a member of this travel group!");
        }
        // Add companion as GROUP_MEMBER
        GroupMember newMember = GroupMember.builder()
                .group(group)
                .user(targetUser)
                .role(GroupRole.GROUP_MEMBER)
                .build();
        groupMemberRepository.save(newMember);
        List<GroupMember> allMembers = groupMemberRepository.findByGroupId(group.getId());
        return mapToGroupDetailsResponse(group, allMembers);
    }
✅ Verification: Fresh compiled cleanly (BUILD SUCCESS, 82 source files, 0 errors).

Ready for File 4 (GroupCollaborationController.java) to expose both endpoints to Postman and the world? Let's finish it! 🚀



--------------------------

📄 File 4: GroupCollaborationController.java (REST Endpoints)
In this file, we exposed the two new public REST routes:

GET /api/groups/search?query=... 
→
→ Universal Group Search
POST /api/trips/{tripId}/groups/members 
→
→ Admin Direct Add by Email
💡 1. Non-Technical (Layman) Analogy:
Think of the Controller as the Hotel Front Reception Desk:

The Search Counter: Any guest walks up and asks: "Can you find the group named 'Shimla', or with code 'SHI-3YZ3', or ID '1'?" The receptionist checks the system and hands over the matching group cards.
The VIP Add Desk: The Group Admin or Owner walks up and says: "Please register my friend kim@example.com into Trip 7 immediately." The receptionist checks the Admin's ID badge, registers kim, and hands back the updated 3-member roster!
💻 2. Technical (Spring Boot) Explanation:
@GetMapping("/api/groups/search"): Accepts an optional @RequestParam(required = false, defaultValue = "") String query and returns ResponseEntity<List<GroupDetailsResponse>>.
@PostMapping("/api/trips/{tripId}/groups/members"): Uses @Valid @RequestBody AddMemberRequest request to validate email syntax, extracts the caller's email via Authentication.getName(), and responds with HTTP 201 Created.
🛠️ Code Applied to 
GroupCollaborationController.java
:
java


    /**
     * Universal search for travel groups by Group ID, Join Code, or partial Group Name.
     */
    @GetMapping("/api/groups/search")
    public ResponseEntity<List<GroupDetailsResponse>> searchGroups(
            @RequestParam(required = false, defaultValue = "") String query) {
        List<GroupDetailsResponse> response = groupService.searchGroups(query);
        return ResponseEntity.ok(response);
    }
    /**
     * Directly adds a companion to the group by email (GROUP_OWNER or GROUP_ADMIN).
     */
    @PostMapping("/api/trips/{tripId}/groups/members")
    public ResponseEntity<GroupDetailsResponse> addMemberByAdmin(
            @PathVariable Long tripId,
            @Valid @RequestBody AddMemberRequest request,
            Authentication authentication) {
        String userEmail = authentication.getName();
        GroupDetailsResponse response = groupService.addMemberByAdmin(tripId, request, userEmail);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
✅ Verification: Full clean compilation passed with flying colors (BUILD SUCCESS, 82 source files, 0 errors)!
📋 Registry Updated: 
APIsCreated.md
 now tracks 44 Active Production Endpoints!

🧪 Quick Postman Test Guide (To Test Both Live!)
(Make sure your backend is running on port 8080!)

🔍 Test 8: Universal Group Search
Method: GET
URL: http://localhost:8080/api/groups/search?query=Shimla (You can also test ?query=SHI-3YZ3 or ?query=1!)
Headers: Authorization: Bearer {{TOKEN_FRIEND}} (or TOKEN_OWNER)
Expected Status: 200 OK
Expected Response: An array containing your "Shimla Hill Station Explorers" group!
👤 Test 9: Admin Direct-Add by Email
Method: POST
URL: http://localhost:8080/api/trips/7/groups/members
Headers:
Authorization: Bearer {{TOKEN_FRIEND}} (pi - GROUP_ADMIN)
Content-Type: application/json
Body (raw JSON):
json


{
  "email": "kim@example.com"
}
Expected Status: 201 Created
Expected Response: memberCount: 3, with kim instantly added as GROUP_MEMBER!
Give these two a quick test in Postman and let me know the result! 🚀

--------------------------

BOOM! 💥 100% PERFECT EXECUTION, AZN!

Look at what you just verified:

🔍 Universal Search (3-in-1 Engine):
✅ By Name: ?query=shimla 
→
→ Matched!
✅ By Group ID: ?query=1 
→
→ Primary key resolved!
✅ By Join Code: ?query=SHI-3YZ3 
→
→ Unique passcode resolved!
👤 Admin Direct Add by Email:
✅ pi (GROUP_ADMIN) directly admitted kim@example.com without needing any code 
→
→ Status 201 Created, roster expanded to 3 members!

--------------------------

🏆 Milestone 3 Task 4 is Officially 100% COMPLETE & DOCUMENTED!
M3T4_Impl_readmeAg.md
: Fully updated with your live Test 8 (all 3 search scenarios) and Test 9 outputs!
APIsCreated.md
: Task 4 now boasts 8 active production endpoints, bringing the entire platform total to 44 Production Endpoints (100% compiled & tested)!
--------------------------



--------------------------

--------------------------
--------------------------
## POSTMAN TESTING M3 - T4 

## Step-by-Step Postman Testing Guide — M3 Task 4: Group Collaboration
Make sure your backend is running in 1 VS Code (BUILD SUCCESS, running on port 8080).


### 🔑 Step 0: Get Your Two JWT Tokens in Postman

👤 User 1 (Trip Owner — aln@example.com): LOGIN API
Method: POST
URL: http://localhost:8080/api/auth/login
Body (raw JSON): json
{
  "email": "aln@example.com",
  "password": "password123"
}
Action: Copy the token from the response 
→→ save as TOKEN_OWNER.

.
👥 User 2 (Friend / Companion): LOGIN API
(If you already registered a friend like rahul@example.com, log in. If not, hit POST /api/auth/register first!)
Method: POST
URL: http://localhost:8080/api/auth/login
Body (raw JSON): json
{
  "email": "rahul@example.com",
  "password": "password123"
}
Action: Copy the token from the response 
→→ save as TOKEN_FRIEND.
(Also note Rahul's id from the response or profile, e.g., userId: 7)


### 💡 Non-Technical (Layman) Analogy: The 3 Ways to Join a Travel Group

| Method | Real-World Analogy | Who Initiates? | Have We Done It? |
| :--- | :--- | :---: | :---: |
| **Way 1: Join via Code** | **Kahoot / Zoom Meeting Passcode:** Owner shares `SHI-3YZ3` on WhatsApp. You type the code $\rightarrow$ You're in! | Friend enters code | ✅ **DONE & TESTED!** |
| **Way 2: Direct Add by Admin** | **WhatsApp Group Add:** Admin opens group, picks `kim@example.com` from contacts, and directly drops them in. No code needed! | Admin / Owner pushes user in | ⏳ **to be done at end** |
| **Way 3: Universal Search** | **Telegram / Discord / Spotify Search:** User types `"Shimla"`, `"SHI-3YZ3"`, or Group ID `1` in the search bar, finds the group, and clicks to join. | User searches & joins | ⏳ **to be done at d end** |


### 🧪 Test 1: Create Travel Group (Owner)
Goal: Trip Owner creates a group for Trip ID 7 ("hill station tour sept"). The system auto-generates a unique join code and assigns the creator as GROUP_OWNER.
Method: POST
URL: http://localhost:8080/api/trips/7/groups
Headers: Authorization: Bearer <TOKEN_OWNER>
Content-Type: application/json

Body (raw JSON): json
{
  "name": "Hill Station Explorers"
}

Status: 201 Created
Response: json
{
    "id":1,  "tripId":7,  "tripTitle":"hill station tour sept",
    "destination":"shimla",
    "name":"Hill Station Explorers",
    "joinCode":"SHI-3YZ3",   "createdAt":"2026-09-23T15:49:47.9355538",
    "memberCount":1,
    "members":[
        {"id":1,"userId":6,"name":"aln","email":"aln@example.com","role":"GROUP_OWNER","joinedAt":"2026-09-23T15:49:47.9763043"}
    ]
}
** Copy the "joinCode" (e.g. HILL-842 or whatever code was generated).

** Test 1b : If tried to add same grp  2nd time by same user
then, response: 500 Internal Server Error
op>
"timestamp":"2026-09-23T10:38:35.443Z","status":500,"error":"Internal Server Error","trace":"java.lang.RuntimeException: A travel group already exists for this trip.\r\n\tat com.tripnest.backend.service.GroupCollaborationService.createGroup(GroupCollaborationService.java:


### 🧪 Test 2: View Group Dashboard (Owner)
Goal: Retrieve group details and verify the owner is present.

Method: GET
URL: http://localhost:8080/api/trips/7/groups
Headers:Authorization: Bearer <TOKEN_OWNER>

Status: 200 OK
Response : json
{"id":1,"tripId":7,"tripTitle":"hill station tour sept","destination":"shimla","name":"Hill Station Explorers","joinCode":"SHI-3YZ3","createdAt":"2026-09-23T15:49:47.935554","memberCount":1,"members":[{"id":1,"userId":6,"name":"aln","email":"aln@example.com","role":"GROUP_OWNER","joinedAt":"2026-09-23T15:49:47.976304"}]}


### 🧪 Test 3: Friend Joins via Join Code (Companion)
Goal: Friend uses the 6-character code to join the trip without needing a direct email invite.
Friend use own jwt token in postman.

Method: POST
URL: http://localhost:8080/api/groups/join
Headers: Authorization: Bearer <TOKEN_FRIEND>
Content-Type: application/json
Body (raw JSON): json
{
  "joinCode": "SHI-3YZ3" 
}
(Replace with the actual join code from Test 1)

Status: 200 OK
Response: Now shows totalMembers: 2, with your friend listed under role: "GROUP_MEMBER".
Response:
    { "id":1,     "tripId":7,    "tripTitle":"hill station tour sept",
    "destination":"shimla",      "name":"Hill Station Explorers",
    "joinCode":"SHI-3YZ3",     "createdAt":"2026-09-23T15:49:47.935554",  "memberCount":2,       "members":[
        {"id":2,"userId":2,"name":"pi","email":"ramanujanmthgd1@gmail.com","role":"GROUP_MEMBER","joinedAt":"2026-09-23T15:57:54.6438298"},
        {"id":1,"userId":6,"name":"aln","email":"aln@example.com","role":"GROUP_OWNER","joinedAt":"2026-09-23T15:49:47.976304"}
        ]
    }


** Test 3b: Duplicate Join Check (Negative Test)
Goal: Verify that a user cannot join the same group twice.

Method: POST
URL: http://localhost:8080/api/groups/join
Headers: Authorization: Bearer <TOKEN_FRIEND>
Body (raw JSON): Same code as Test 3.
Expected Status: 400 Bad Request or error response with:
json
"User is already a member of this travel group."
op>
"timestamp":"2026-09-23T10:41:23.351Z","status":500,"error":"Internal Server Error","trace":"java.lang.RuntimeException: You are already a member of this travel group!\r\n\tat com.tripnest.backend.service.GroupCollaborationService.joinGroupByCode(GroupCollaborationService.java:126)\r


### 🧪 Test 4: Promote a Grp Mbr to Group Admin (Owner)
Goal: Owner promotes the friend to GROUP_ADMIN so they can manage activities and bills.

Method: PUT
URL: http://localhost:8080/api/trips/7/groups/members/{friendUserId}/role?role=GROUP_ADMIN
http://localhost:8080/api/trips/7/groups/members/2/role?role=GROUP_ADMIN
(Replace {friendUserId} with the friend's user ID, e.g. 2)
Headers: Authorization: Bearer <TOKEN_OWNER>

Status: 200 OK
Response: json
    {"id":2,  "userId":2,    "name":"pi",  "email":"ramanujanmthgd1@gmail.com","role":"GROUP_ADMIN",  "joinedAt":"2026-09-23T15:57:54.64383"}


### 5: 🧪 Test 5: Final Roster Verification
Goal: Verify both users see the updated 2-member group with appropriate roles.
chk role change is done. 

Method: GET
URL: http://localhost:8080/api/trips/7/groups
Headers: Authorization: Bearer <TOKEN_FRIEND> (or TOKEN_OWNER)

Status: 200 OK
Response: Shows 2 members: Owner (GROUP_OWNER) and Companion (GROUP_ADMIN).
    {"id":1,"tripId":7,"tripTitle":"hill station tour sept","destination":"shimla","name":"Hill Station Explorers","joinCode":"SHI-3YZ3","createdAt":"2026-09-23T15:49:47.935554","memberCount":2,"members":
        [{"id":2,"userId":2,"name":"pi","email":"ramanujanmthgd1@gmail.com",
        "role":"GROUP_ADMIN",     "joinedAt":"2026-09-23T15:57:54.64383"},
        {"id":1,"userId":6,"name":"aln","email":"aln@example.com",
        "role":"GROUP_OWNER",     "joinedAt":"2026-09-23T15:49:47.976304"}]
    }


### 6 : 🧪 Postman Testing as GROUP_ADMIN/ GROUP_OWNER (TOKEN_FRIEND)
(Make sure your backend is running the latest build on port 8080!)

### 🧪 Test 6a: Edit Group Name (Executed by GROUP_OWNER)
Goal: Verify that your companion pi (TOKEN_FRIEND), who has role GROUP_ADMIN, can rename the group without the owner's help.

aln-userid-6, grp owner
Method: PUT
URL: http://localhost:8080/api/trips/7/groups
Status: 200 OK
Response: json
{"id":1,"tripId":7,"tripTitle":"hill station tour sept","destination":"shimla",
"name":"Hill Station Squad",      "joinCode":"SHI-3YZ3", ...
...... 
Name is now Hill Station Squad
}

### 🧪 Test 6b: Edit Group Name (Executed by GROUP_ADMIN)

pi-userid-2, grp admin
Method: PUT
URL: http://localhost:8080/api/trips/7/groups
Headers: Authorization: Bearer {{TOKEN_FRIEND}} (pi's token)-rmnjn tkn
Content-Type: application/json

Body (raw JSON): json
{
  "name": "Shimla Hill Station Explorers"
}
Status: 200 OK
Response: json
{"id":1,"tripId":7,"tripTitle":"hill station tour sept","destination":"shimla",
"name":"Shimla Hill Station Explorers",      "joinCode":"SHI-3YZ3",
"createdAt":"2026-09-23T15:49:47.935554",
"memberCount":3,"members":[{"id":2,"userId":2,"name":"pi","email":"ramanujanmthgd1@gmail.com","role":"GROUP_ADMIN","joinedAt":"2026-09-23T15:57:54.64383"},{"id":1,"userId":6,"name":"aln","email":"aln@example.com","role":"GROUP_OWNER","joinedAt":"2026-09-23T15:49:47.976304"},{"id":3,"userId":7,"name":"kim","email":"kim@example.com","role":"GROUP_MEMBER","joinedAt":"2026-09-23T17:20:44.23285"}]
}
-(Notice "name" is now updated to "Shimla Hill Station Explorers"!)




### Test 7a : Delete grp mbr by GROUP_ADMIN

** First create a new mbr - kim - user_id 7  [using register and login api]
{
  "email": "kim@example.com",
  "password": "password123"
}
userid-7
tripnestdb2ag=# select * from users where id = 7;
 id |      email      | name |                           password
----+-----------------+------+--------------------------------------------------------------
  7 | kim@example.com | kim  | $2a$10$xPjXX7Q.w07EFBQ9At9guOj43LZ9LpS2vxsMxoizTc.zW2zE0VnRC
(1 row)



** add frnd in grp - trip id:7, nameGrp-hill station tour - 
[use Frnd join via join code - api in grp fldr]
op>
{"id":1,  "tripId":7,  "tripTitle":"hill station tour sept",  "destination":"shimla",
"name":"Hill Station Explorers",  "joinCode":"SHI-3YZ3",
"createdAt":"2026-09-23T15:49:47.935554",
"memberCount":3,"members":[
    {"id":2,"userId":2,"name":"pi","email":"ramanujanmthgd1@gmail.com","role":"GROUP_ADMIN","joinedAt":"2026-09-23T15:57:54.64383"},
    {"id":1,"userId":6,"name":"aln","email":"aln@example.com","role":"GROUP_OWNER","joinedAt":"2026-09-23T15:49:47.976304"},
    {"id":3,"userId":7,"name":"kim","email":"kim@example.com","role":"GROUP_MEMBER","joinedAt":"2026-09-23T17:20:44.2328503"}
    ]
}
now total mbr in grp = 3

** now chk deltn of any grpMbr [ex- user-km, id-7] from grp[tripid=7], by GrpAdmin [user-pi, id-2]
Method: DELETE
URL: http://localhost:8080/api/trips/{trip_id}/groups/members/{user_id_to_be_deleted}
Headers: Authorization: Bearer {{TOKEN_FRIEND}} .. PI user, jwt tkn
user_id_to_be_dltd= add km user, id=7.
trip_id= 7 [tripTitle":"hill station tour sept]

Status: 204 No Content
The server successfully processed the request, but is not returning any content.
Response: blank

** try again to delt same userid, by grpAdmin
status: 500 Internal Server Error
Response:
"timestamp":"2026-09-23T13:22:22.746Z","status":500,"error":"Internal Server Error","trace":"java.lang.RuntimeException: Target member not found in this group.


### 🧪 Test 7B: Security Fail-Safe Check (Negative Test)
Goal: Verify that even as a GROUP_ADMIN, pi[id:2] cannot kick out the trip owner (userId: 6).

Method: DELETE
URL: http://localhost:8080/api/trips/7/groups/members/6
Headers: Authorization: Bearer {{TOKEN_FRIEND}}

 Status: 500 Internal Server Error (or error response)
 Message:
"timestamp":"2026-09-23T13:27:36.114Z","status":500,"error":"Internal Server Error","trace":"java.lang.RuntimeException: The Group Owner cannot be removed from the trip group.



### 🧪 Test 7C: Member Removal / Self-Leave
Goal: Test leaving or removing a member.

** add km again in grpId=7
[use FrndJoin api - in grp fldr]
{"id":1,"tripId":7,"tripTitle":"hill station tour sept","destination":"shimla","name":"Shimla Hill Station Explorers","joinCode":"SHI-3YZ3","createdAt":"2026-09-23T15:49:47.935554","memberCount":3,
"members":[{"id":2,"userId":2,"name":"pi","email":"ramanujanmthgd1@gmail.com","role":"GROUP_ADMIN","joinedAt":"2026-09-23T15:57:54.64383"},{"id":1,"userId":6,"name":"aln","email":"aln@example.com","role":"GROUP_OWNER","joinedAt":"2026-09-23T15:49:47.976304"},{"id":4,"userId":7,"name":"kim","email":"kim@example.com","role":"GROUP_MEMBER","joinedAt":"2026-09-23T19:00:52.499614"}]}
now see - grpid=4, km added [userid=7]
total mbrs = 3 ["memberCount":3]

**
Scenario:  departs the trip (Self-Leave):
Method: DELETE
URL: http://localhost:8080/api/trips/7/groups/members/7
Headers: Authorization: Bearer {{TOKEN_FRIEND}}

 Status: 204 No Content
op> blank


** (If you then run GET /api/trips/7/groups, memberCount drops back to 2!)
op>
{"id":1,"tripId":7,"tripTitle":"hill station tour sept","destination":"shimla","name":"Shimla Hill Station Explorers","joinCode":"SHI-3YZ3","createdAt":"2026-09-23T15:49:47.935554","memberCount":2,
"members":[{"id":2,"userId":2,"name":"pi","email":"ramanujanmthgd1@gmail.com","role":"GROUP_ADMIN","joinedAt":"2026-09-23T15:57:54.64383"},{"id":1,"userId":6,"name":"aln","email":"aln@example.com","role":"GROUP_OWNER","joinedAt":"2026-09-23T15:49:47.976304"}]}

"memberCount":2 now.


### 🔍 Test 8: Universal Group Search
Method: GET
a- Using Group name part , like Shimla
URL: http://localhost:8080/api/groups/search?query=shimla  (or can also use ?query=SHI-3YZ3 or ?query=1!)
Headers: Authorization: Bearer {{TOKEN_FRIEND}} (or TOKEN_OWNER)

Status: 200 OK
Response: An array containing your "Shimla Hill Station Explorers" group!
[
  {"id":1,"tripId":7,"tripTitle":"hill station tour sept","destination":"shimla","name":"Shimla Hill Station Explorers","joinCode":"SHI-3YZ3","createdAt":"2026-09-23T15:49:47.935554","memberCount":2,
  "members":[{"id":2,"userId":2,"name":"pi","email":"ramanujanmthgd1@gmail.com","role":"GROUP_ADMIN","joinedAt":"2026-09-23T15:57:54.64383"},{"id":1,"userId":6,"name":"aln","email":"aln@example.com","role":"GROUP_OWNER",
  "joinedAt":"2026-09-23T15:49:47.976304"}]
  }]

**
8b- Using Group Id, like 7
URL: http://localhost:8080/api/groups/search?query=1
grpId = 1, shimla

Status: 200 OK
Response: same resp as above

**
8c- Using Group joining code, like SHI-3YZ3
URL: http://localhost:8080/api/groups/search?query=SHI-3YZ3

Status: 200 OK
Response: same resp as above


### 👤 Test 9: Admin Direct-Add by Email
Method: POST
URL: http://localhost:8080/api/trips/7/groups/members
Headers: Authorization: Bearer {{TOKEN_FRIEND}} (pi - GROUP_ADMIN)
Content-Type: application/json
Body (raw JSON): json
{
  "email": "kim@example.com"
}

Status: 201 Created
Response: memberCount: 3, with kim instantly added as GROUP_MEMBER!
{"id":1,"tripId":7,"tripTitle":"hill station tour sept","destination":"shimla","name":"Shimla Hill Station Explorers","joinCode":"SHI-3YZ3","createdAt":"2026-09-23T15:49:47.935554","memberCount":3,
"members":[
  {"id":2,"userId":2,"name":"pi","email":"ramanujanmthgd1@gmail.com","role":"GROUP_ADMIN","joinedAt":"2026-09-23T15:57:54.64383"},{"id":1,"userId":6,"name":"aln","email":"aln@example.com","role":"GROUP_OWNER","joinedAt":"2026-09-23T15:49:47.976304"},{"id":5,"userId":7,"name":"kim","email":"kim@example.com","role":"GROUP_MEMBER","joinedAt":"2026-09-25T01:10:42.1846551"}
  ]
}



--------------------------
--------------------------




--------------------------
--------------------------
## sql queries in m3 t4

```
postgres=# \c tripnestdb2ag
You are now connected to database "tripnestdb2ag" as user "postgres".
```


```
tripnestdb2ag=# \dt
             List of relations
 Schema |      Name      | Type  |  Owner
--------+----------------+-------+----------
 public | activities     | table | postgres
 public | attractions    | table | postgres
 public | budgets        | table | postgres
 public | destination    | table | postgres
 public | expenses       | table | postgres
 public | group_members  | table | postgres
 public | itineraries    | table | postgres
 public | itinerary_days | table | postgres
 public | roles          | table | postgres
 public | travel_groups  | table | postgres
 public | trips          | table | postgres
 public | user_roles     | table | postgres
 public | users          | table | postgres
(13 rows)
```


```
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
```


```
tripnestdb2ag=# select  * from trips;
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
```


```
tripnestdb2ag=# select  * from trips  where user_id=6;
 id | destination |  end_date  | number_of_travelers | start_date | status  |         title          | user_id
----+-------------+------------+---------------------+------------+---------+------------------------+---------
  8 | bluru       | 2026-09-30 |                   1 | 2026-09-29 | PLANNED | sw ivw                 |       6
  9 | asdfs       | 2026-09-29 |                   1 | 2026-09-25 | PLANNED | sadfas                 |       6
  7 | shimla      | 2026-09-26 |                   6 | 2026-09-20 | ONGOING | hill station tour sept |       6
(3 rows)
```


```
tripnestdb2ag=# select  * from trips  where user_id=2;
 id | destination  |  end_date  | number_of_travelers | start_date |  status   |       title       | user_id
----+--------------+------------+---------------------+------------+-----------+-------------------+---------
  2 | bluru - urbn | 2026-09-26 |                   1 | 2026-09-20 | PLANNED   | sw ivw bluru      |       2
  3 | mumbai       | 2026-09-17 |                   1 | 2026-09-16 | ONGOING   | mumbai trip       |       2
  4 | pune         | 2026-09-16 |                   1 | 2026-09-16 | COMPLETED | visit frnd - pune |       2
(3 rows)
```


```
tripnestdb2ag=# select * from users where id = 7;
 id |      email      | name |                           password
----+-----------------+------+--------------------------------------------------------------
  7 | kim@example.com | kim  | $2a$10$xPjXX7Q.w07EFBQ9At9guOj43LZ9LpS2vxsMxoizTc.zW2zE0VnRC
(1 row)
```

```
tripnestdb2ag=# -- See all travel groups and generated join codes
tripnestdb2ag=# SELECT tg.id, tg.trip_id, t.title AS trip_title, tg.name AS group_name, tg.join_code, tg.created_at
tripnestdb2ag-# FROM travel_groups tg
tripnestdb2ag-# JOIN trips t ON tg.trip_id = t.id;
 id | trip_id |       trip_title       |          group_name           | join_code |         created_at
----+---------+------------------------+-------------------------------+-----------+----------------------------
  1 |       7 | hill station tour sept | Shimla Hill Station Explorers | SHI-3YZ3  | 2026-09-23 15:49:47.935554
(1 row)
```



```
tripnestdb2ag=# -- See group members and their assigned roles
tripnestdb2ag=# SELECT gm.id, gm.group_id, u.name AS user_name, u.email, gm.role, gm.joined_at
tripnestdb2ag-# FROM group_members gm
tripnestdb2ag-# JOIN users u ON gm.user_id = u.id;
 id | group_id | user_name |           email           |    role     |         joined_at
----+----------+-----------+---------------------------+-------------+----------------------------
  1 |        1 | aln       | aln@example.com           | GROUP_OWNER | 2026-09-23 15:49:47.976304
  2 |        1 | pi        | ramanujanmthgd1@gmail.com | GROUP_ADMIN | 2026-09-23 15:57:54.64383
(2 rows)
```



```
tripnestdb2ag=# -- grp name, grp id, trip name, trip id , grp mbrs usr id , grp mbrs usr eml / usr name... sql for ths
tripnestdb2ag=#
tripnestdb2ag=# SELECT
tripnestdb2ag-#     tg.id AS group_id,
tripnestdb2ag-#     tg.name AS group_name,
tripnestdb2ag-#     t.id AS trip_id,
tripnestdb2ag-#     t.title AS trip_name,
tripnestdb2ag-#     u.id AS member_user_id,
tripnestdb2ag-#     u.name AS member_user_name,
tripnestdb2ag-#     u.email AS member_user_email,
tripnestdb2ag-#     gm.role AS member_role,
tripnestdb2ag-#     tg.join_code
tripnestdb2ag-# FROM travel_groups tg
tripnestdb2ag-# JOIN trips t ON tg.trip_id = t.id
tripnestdb2ag-# JOIN group_members gm ON gm.group_id = tg.id
tripnestdb2ag-# JOIN users u ON gm.user_id = u.id
tripnestdb2ag-# ORDER BY tg.id, gm.joined_at;
 group_id |          group_name           | trip_id |       trip_name        | member_user_id | member_user_name |     member_user_email     | member_role | join_code
----------+-------------------------------+---------+------------------------+----------------+------------------+---------------------------+-------------+-----------
        1 | Shimla Hill Station Explorers |       7 | hill station tour sept |              6 | aln              | aln@example.com           | GROUP_OWNER | SHI-3YZ3
        1 | Shimla Hill Station Explorers |       7 | hill station tour sept |              2 | pi               | ramanujanmthgd1@gmail.com | GROUP_ADMIN | SHI-3YZ3
(2 rows)
```

--------------------------
--------------------------




--------------------------

--------------------------

--------------------------

