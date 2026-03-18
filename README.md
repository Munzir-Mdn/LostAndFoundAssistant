# Lost and Found Assistant

Starter web application for a campus or community lost and found system.

## Included Files
- `index.html` - main frontend page
- `style.css` - UI styling
- `app.js` - frontend logic with demo localStorage mode
- `Code.gs` - Google Apps Script backend
- `README.md` - setup guide

## Features
- User registration and login
- Add lost item report
- Add found item report
- Search and filter reports
- Submit claims
- Update claim status
- Mark records as resolved
- Delete reports
- Demo data seeding
- Ready to connect to Google Apps Script

## How to Run Frontend
1. Download the project folder.
2. Open `index.html` in your browser.
3. Click **Load Demo Data** to test quickly.

## How to Connect Google Apps Script
1. Create a new Google Sheet.
2. Add 4 sheets with these names:
   - Users
   - LostItems
   - FoundItems
   - Claims
3. Add the exact headers shown at the bottom of `Code.gs`.
4. Open **Extensions > Apps Script**.
5. Paste the content of `Code.gs`.
6. Deploy as **Web App** with access set appropriately.
7. Copy the deployment URL.
8. In `app.js`, replace `API_URL: ''` with your Web App URL.
9. Replace local demo functions with `fetch()` calls as noted in the comment block.

## Suggested Next Improvements
- Add admin dashboard
- Add image upload to Google Drive
- Add email notifications
- Add Botpress chatbot integration
- Add automatic matching score
- Hash passwords before storing
- Add role-based authorization

## Suggested Database Mapping
### Users
id, fullName, email, phone, password, role, createdAt

### LostItems
id, userId, itemName, category, location, itemDate, imageUrl, description, status, createdAt

### FoundItems
id, userId, itemName, category, location, itemDate, imageUrl, description, status, createdAt

### Claims
id, foundId, claimantUserId, claimantName, claimDetails, status, createdAt
