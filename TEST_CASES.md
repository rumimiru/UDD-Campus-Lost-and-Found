# Campus Lost and Found Test Cases

The app is a browser-only prototype. Run it from a local web server or open `index.html` in a modern browser. Sample login: `sample.student` / `demo1234`.

| # | Test | Steps | Expected result |
|---|---|---|---|
| 1 | Student registration | Open **My Account**, choose **Create account**, enter valid details, select Student, and submit. | Account is saved, the user is logged in, and their name and role appear in the sidebar. |
| 2 | Teacher registration | Register with a unique email, school ID, and username; choose Teacher. | Account is saved with the Teacher role and the user is logged in. |
| 3 | Invalid registration | Submit the registration form empty; then try a duplicate email, username, or school ID. | Required-field or duplicate-value errors appear and no invalid account is created. |
| 4 | Login and logout | Log in by username and again by email; then log out. | Valid credentials start a session; invalid credentials show an error; logout clears the session. |
| 5 | Session persistence | Log in, reload the page, then log out and reload again. | The logged-in user is restored after the first reload; the guest state is restored after logout. |
| 6 | Invalid report and contact | While logged in, open **Report an Item** and submit it empty; enter an invalid contact and leave the field. | Required fields and contact validation show inline errors; no report is saved. |
| 7 | Lost/Found report forms | Create one Lost report and one Found report, choose the date from the date picker, and attach an image (or enter a valid photo URL). | Each report is added immediately with Unclaimed status, the location label changes with the report type, and the selected date and photo appear in the report. Images over 750 KB or non-image files are rejected. |
| 8 | Search and combined filters | Type a matching name/category/location; combine the search with Lost/Found and status filters. | Results update as the user types and satisfy all active filters together. |
| 9 | Claim request for a Found item | As a different logged-in user, open a Found report, submit contact details and ownership proof, with or without an optional proof image. | A Pending claim request is stored, any uploaded image is visible to the poster, the item becomes Pending, and the poster receives a notification. |
| 10 | Found-it report for a Lost item | As a different logged-in user, open a Lost report and submit contact details and where/how it was found. | A Pending Found-it request is stored, the item becomes Pending, and the poster receives a notification. |
| 11 | Poster-only review | Log in as someone other than the poster and try to review; then log in as the original poster and open their item report. | Only the original poster sees working Approve/Reject controls in that item's details. |
| 12 | Approve a request | As the original poster, confirm **Approve & delete report** for a Pending request. | The report and its associated requests are removed, the requester receives an approval notification, and other pending requesters are notified that the request was closed. |
| 13 | Reject a request | Reject a Pending request when it is the only one, then repeat when another request remains pending. | The rejected request leaves Pending; the item returns to Unclaimed only when no other request is pending; the requester is notified. |
| 14 | Notifications | Trigger a report, request, approval, and rejection; open the notification bell and mark notifications read. | Activity appears in the notification list; unread count updates and clears when read. |
| 15 | Sample data and reset | Confirm the fresh dashboard shows `Kaiser_LOST_TestJoke` as a Lost example, load sample data twice, then use **Reset All Data** and confirm. | The fresh dashboard shows the example; loading sample data brings the total to eight reports without duplicates; reset empties accounts, reports, requests, notifications, and session. |
| 16 | Modal and navigation controls | Open an item and press Escape; reopen it and use Cancel; navigate Dashboard, Items, Requests, Notifications, and Account. | Modals close and clear; each navigation option displays its corresponding view. |
| 17 | Delete own report | As the original poster, open the report and confirm **Delete report**; then try opening another user's report. | The poster can delete their own report and its requests; other users cannot see the delete action or delete the report. |

## Browser validation performed

- Student and Teacher registration, required-field errors, invalid login, valid login/logout, and session restoration were exercised in the browser.
- Lost and Found reports, type-dependent location labels, empty-form errors, live search, and Lost/Found/Unclaimed filters were exercised.
- Claim approval resolves and deletes the item and related requests; rejection returns an item to Unclaimed when no other requests are pending.
- On first launch, the dashboard is seeded with an inside joke(Kaiser_Joke_TestLost) example and its demo poster; loading sample data fills out the eight-report set without duplicates. Reset clears the saved records and session.
