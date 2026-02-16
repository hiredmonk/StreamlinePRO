# RLS Validation Matrix
_Last updated: 2026-02-16_

Use this matrix to close: `Multi-user RLS behavior validated via integration scenarios`.

## Test Identities
- `User A`: workspace admin
- `User B`: workspace member
- `User C`: non-member or removed member

## Scenario Matrix
| Scenario | Setup | Actor | Expected Result | Actual | Pass/Fail |
| --- | --- | --- | --- | --- | --- |
| Workspace-visible project read | Project privacy = `workspace_visible`; User B in workspace | User B | Can view project/tasks |  |  |
| Private project read denied | Project privacy = `private`; User C not in project | User C | Access denied/not listed |  |  |
| Private project member read allowed | User B added as project member | User B | Can view project/tasks |  |  |
| Removed member revocation | Remove User B from workspace | User B | Immediate access loss |  |  |
| Notification isolation | Trigger mention/assignment for User B | User C | Cannot read User B notification row(s) |  |  |
| Attachment isolation | Upload attachment in private project | User C | Signed URL/access denied |  |  |

## Execution Steps
1. Create required workspace/projects as User A.
2. Run each scenario with clean sessions (separate browser profiles or incognito windows).
3. Record result in `Actual` column and mark `Pass/Fail`.
4. Capture screenshot/log evidence for every fail.

## Sign-off Rule
Mark RLS item complete in `Todo.md` only when all matrix rows pass.
