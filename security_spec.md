# SECURITY SPECIFICATION: MIMI ZINE REGISTRY (FIREBASE)

This document contains the security specification for the Mimi Zine Registry, adhering strictly to the **8 Pillars of Hardened Rules** for Attribute-Based Access Control (ABAC) and Zero-Trust Firestore Security.

---

## 1. DATA INVARIANTS

1. **Owner Integrity**: Documents within user-specific collections (such as `profiles`, `pocket`, `stacks`, `zine_folders`, `wardrobe_items`, etc.) MUST have a `userId` (or `uid` for profiles) that strictly matches the authenticated user (`request.auth.uid`). No user can write a document on behalf of another user.
2. **Immutable Identity**: Once created, the owner fields (`userId` / `uid`) of any document MUST remain completely immutable.
3. **Zine Visibility & Access Control**:
   - A `zine` is private to its owner unless the `isPublic` flag is set to `true`.
   - Access to zine sub-resources (like `/pages` or `/artifacts`) must strictly inherit the parent zine's access parameters.
4. **Sub-Resource Sync Gate**: For any `dossier_artifact`, read/write permissions are transitively evaluated by inspecting the parent `dossier_folder`. If the user is neither the owner nor a listed collaborator in the parent folder, access is instantly denied.
5. **Role Escalation Block**: Standard users are strictly forbidden from setting or altering their own `role` field (or `planStatus` / `isAdmin`) in the database. Only verified administrator identities can modify role or billing tier states.
6. **Temporal Integrity**: All timestamp fields such as `createdAt` or `updatedAt` must match the server's time (`request.time`) instead of accepting client-side overrides.

---

## 2. THE "DIRTY DOZEN" PAYLOADS (ATTACK VECTORS)

Below are 12 specific JSON payloads designed to break identity boundaries, bypass validation, or perform privilege escalation, which will return `PERMISSION_DENIED` under our fortress rules:

### Vector 01: The Identity Spoof (Profiles)
*Attempting to create a user profile for a victim's user ID.*
```json
// Target: /profiles/victim_user_123
{
  "uid": "victim_user_123",
  "handle": "attacker",
  "displayName": "Malicious Actor",
  "email": "attacker@evil.com"
}
```

### Vector 02: Admin Role Escalation (Profiles)
*Attempting to self-upgrade to 'admin' role during registration.*
```json
// Target: /users/attacker_user_123
{
  "uid": "attacker_user_123",
  "role": "admin"
}
```

### Vector 03: The Ghost Field Injection (Zines)
*Attempting to inject un-blueprint "Ghost Fields" to bypass strict hasOnly() schema guards.*
```json
// Target: /zines/zine_xyz
{
  "id": "zine_xyz",
  "userId": "attacker_user_123",
  "title": "Malicious Zine",
  "isPublic": false,
  "bypassSecurityFlag": true,
  "isPremiumUnlocked": true
}
```

### Vector 04: Temporal Spoofing (Public Transmissions)
*Attempting to post a transmission with a fake historic timestamp.*
```json
// Target: /public_transmissions/tx_999
{
  "userId": "attacker_user_123",
  "content": "Fake News",
  "timestamp": 1234567890
}
```

### Vector 05: Folder Hijacking (Dossier Folders)
*Attempting to inject user ID into another user's collaborator array.*
```json
// Target: /dossier_folders/folder_abc
{
  "id": "folder_abc",
  "userId": "victim_user_123",
  "name": "Classified Folder",
  "collaborators": ["attacker_user_123"]
}
```

### Vector 06: Orphaned Resource Creation (Thimble Items)
*Attempting to create an item associated with a board that doesn't exist.*
```json
// Target: /thimbleItems/item_non_existent
{
  "userId": "attacker_user_123",
  "boardId": "missing_board_404",
  "url": "https://attacker.com/payload",
  "createdAt": 1721151000
}
```

### Vector 07: Denial of Wallet (Resource Exhaustion)
*Attempting to write an extremely long, 10MB string into an ID or text field.*
```json
// Target: /zine_folders/folder_exhaust
{
  "id": "folder_exhaust",
  "userId": "attacker_user_123",
  "name": "A_VERY_LONG_STRING_REPEATED_1000000_TIMES..."
}
```

### Vector 08: State Transition Shortcut (Press Issues)
*Attempting to directly publish a draft issue without admin credentials.*
```json
// Target: /pressIssues/issue_999
{
  "title": "Leaked Edition",
  "status": "published",
  "userId": "attacker_user_123"
}
```

### Vector 09: PII Data Scraping (Private Profiles)
*Attempting to read another user's private profile details without authorization.*
```json
// Target: /profiles_private/victim_user_123 (GET request from attacker_user_123)
{}
```

### Vector 10: Immutable Owner Violation (Stacks)
*Attempting to change the ownership of an existing stack to bypass quota controls.*
```json
// Target: /stacks/stack_xyz (Update payload)
{
  "userId": "victim_user_123"
}
```

### Vector 11: Array Injection Attack (Wardrobe Items)
*Attempting to inject a massive, nested array of objects into simple string tag fields.*
```json
// Target: /wardrobe_items/item_abc
{
  "userId": "attacker_user_123",
  "name": "Stolen Jacket",
  "category": "outerwear",
  "tags": [ { "nested": "evil_payload" }, "normal_tag" ],
  "createdAt": 1721151000
}
```

### Vector 12: Unauthorized Subcollection Read (Zine Pages)
*Attempting to read pages of a private, locked zine owned by someone else.*
```json
// Target: /zines/private_victim_zine/pages/page_01 (GET request from attacker_user_123)
{}
```

---

## 3. FIRESTORE RULES TEST SPECIFICATION (`firestore.rules.test.ts`)

```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import * as fs from "fs";

describe("Mimi Zine Registry - Fortress Rules Audit", () => {
  let testEnv: RulesTestEnvironment;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "gen-lang-client-0210674664",
      firestore: {
        rules: fs.readFileSync("firestore.rules", "utf8"),
      },
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it("Vector 01 Fail: Blocks Identity Spoofing in user profiles", async () => {
    const attackerDb = testEnv.authenticatedContext("attacker_user_123").firestore();
    const profileRef = attackerDb.collection("profiles").doc("victim_user_123");
    
    await assertFails(
      profileRef.set({
        uid: "victim_user_123",
        handle: "attacker",
        displayName: "Malicious Actor",
        email: "attacker@evil.com"
      })
    );
  });

  it("Vector 02 Fail: Prevents Self-Assigned Role Escalation to admin", async () => {
    const userDb = testEnv.authenticatedContext("attacker_user_123").firestore();
    const userRef = userDb.collection("users").doc("attacker_user_123");

    await assertFails(
      userRef.set({
        uid: "attacker_user_123",
        role: "admin"
      })
    );
  });

  it("Vector 09 Fail: Enforces PII Private Profile Isolation", async () => {
    const attackerDb = testEnv.authenticatedContext("attacker_user_123").firestore();
    const privateRef = attackerDb.collection("profiles_private").doc("victim_user_123");

    await assertFails(privateRef.get());
  });

  it("Vector 12 Fail: Restricts private zine page access", async () => {
    // Setup victim's private zine inside admin/rules setup context
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection("zines").doc("private_victim_zine").set({
        id: "private_victim_zine",
        userId: "victim_user_123",
        title: "Secret Zine",
        isPublic: false
      });
    });

    const attackerDb = testEnv.authenticatedContext("attacker_user_123").firestore();
    const pageRef = attackerDb
      .collection("zines")
      .doc("private_victim_zine")
      .collection("pages")
      .doc("page_01");

    await assertFails(pageRef.get());
  });
});
```
