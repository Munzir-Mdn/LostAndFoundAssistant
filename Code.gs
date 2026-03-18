const SHEETS = {
  USERS: 'Users',
  LOST: 'LostItems',
  FOUND: 'FoundItems',
  CLAIMS: 'Claims'
};

function doGet(e) {
  const action = (e.parameter.action || '').trim();

  try {
    switch (action) {
      case 'getLostItems':
        return jsonOutput(readSheet(SHEETS.LOST));
      case 'getFoundItems':
        return jsonOutput(readSheet(SHEETS.FOUND));
      case 'getClaims':
        return jsonOutput(readSheet(SHEETS.CLAIMS));
      case 'getUsers':
        return jsonOutput(readSheet(SHEETS.USERS));
      default:
        return jsonOutput({ success: false, message: 'Invalid action' });
    }
  } catch (error) {
    return jsonOutput({ success: false, message: error.message });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const payload = data.payload || {};

    switch (action) {
      case 'registerUser':
        appendRow(SHEETS.USERS, [
          generateId(),
          payload.fullName,
          payload.email,
          payload.phone,
          payload.password,
          payload.role || 'user',
          new Date().toISOString()
        ]);
        return jsonOutput({ success: true, message: 'User registered' });

      case 'createLostItem':
        appendRow(SHEETS.LOST, [
          generateId(),
          payload.userId,
          payload.itemName,
          payload.category,
          payload.location,
          payload.itemDate,
          payload.imageUrl,
          payload.description,
          payload.status || 'Open',
          new Date().toISOString()
        ]);
        return jsonOutput({ success: true, message: 'Lost item created' });

      case 'createFoundItem':
        appendRow(SHEETS.FOUND, [
          generateId(),
          payload.userId,
          payload.itemName,
          payload.category,
          payload.location,
          payload.itemDate,
          payload.imageUrl,
          payload.description,
          payload.status || 'Open',
          new Date().toISOString()
        ]);
        return jsonOutput({ success: true, message: 'Found item created' });

      case 'createClaim':
        appendRow(SHEETS.CLAIMS, [
          generateId(),
          payload.foundId,
          payload.claimantUserId,
          payload.claimantName,
          payload.claimDetails,
          payload.status || 'Pending',
          new Date().toISOString()
        ]);
        return jsonOutput({ success: true, message: 'Claim submitted' });

      case 'updateStatus':
        updateStatus(data.sheetName, payload.id, payload.status);
        return jsonOutput({ success: true, message: 'Status updated' });

      case 'deleteRecord':
        deleteRecord(data.sheetName, payload.id);
        return jsonOutput({ success: true, message: 'Record deleted' });

      default:
        return jsonOutput({ success: false, message: 'Invalid action' });
    }
  } catch (error) {
    return jsonOutput({ success: false, message: error.message });
  }
}

function readSheet(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values.map(row => {
    const obj = {};
    headers.forEach((header, index) => obj[header] = row[index]);
    return obj;
  });
}

function appendRow(sheetName, rowData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  sheet.appendRow(rowData);
}

function updateStatus(sheetName, recordId, newStatus) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === recordId) {
      const statusColumn = findColumnIndex(sheet, 'status');
      sheet.getRange(i + 1, statusColumn).setValue(newStatus);
      return;
    }
  }
  throw new Error('Record not found');
}

function deleteRecord(sheetName, recordId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === recordId) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
  throw new Error('Record not found');
}

function findColumnIndex(sheet, headerName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idx = headers.findIndex(h => String(h).toLowerCase() === headerName.toLowerCase());
  if (idx === -1) throw new Error(`Column not found: ${headerName}`);
  return idx + 1;
}

function generateId() {
  return Utilities.getUuid();
}

function jsonOutput(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/*
SETUP GOOGLE SHEETS HEADERS

Users:
id | fullName | email | phone | password | role | createdAt

LostItems:
id | userId | itemName | category | location | itemDate | imageUrl | description | status | createdAt

FoundItems:
id | userId | itemName | category | location | itemDate | imageUrl | description | status | createdAt

Claims:
id | foundId | claimantUserId | claimantName | claimDetails | status | createdAt
*/
