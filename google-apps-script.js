/**
 * Handles incoming POST requests from the React application client.
 * Supports:
 * 1. action === "updateStatus" -> Admin modifies an order state row to 'Delivered'
 * 2. Default -> Captures and creates a new order submission row from checkout paths
 */
function doPost(e) {

  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // Prevents overlapping cell overrides if multi-conversions write concurrently

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheets()[0];
    var data = JSON.parse(e.postData.contents);

    // 🎛️ ACTION: SYNC STATUS ACTION FROM ADMINPANEL
    if (data.action === "updateStatus") {
      var rows = sheet.getDataRange().getValues();
      var updated = false;

      // Scans spreadsheet cells to find an exact match (Client Phone + Product ID matching matrix)
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][1]).toLowerCase().trim() === String(data.customerPhone).toLowerCase().trim() &&
          String(rows[i][3]).trim() === String(data.productId).trim()) {

          sheet.getRange(i + 1, 9).setValue(data.status); // Modifies Column I (Index 8)
          updated = true;
          break;
        }
      }

      if (updated) {
        return ContentService.createTextOutput(JSON.stringify({ "result": "success", "message": "Status synchronized successfully" }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": "Order reference record not found" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Add this check inside your existing doPost(e) function right next to your other action checks:
    if (data.action === "createPayout") {
      var payoutSheet = doc.getSheetByName("Payouts") || doc.getSheets()[0]; // Looks for your Payouts tab

      var payoutData = [
        data.email,          // Column A
        data.method,         // Column B
        data.accountType,    // Column C
        data.accountNumber,  // Column D
        data.amount,         // Column E
        new Date(),          // Column F
        "Pending"            // Column G
      ];

      payoutSheet.appendRow(payoutData);
      return ContentService.createTextOutput(JSON.stringify({ "result": "success", "message": "Payout row logged successfully" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 🛒 ACTION: APPEND NEW INCOMING CUSTOMER CONVERSION ROW
    var rowData = [
      data.customerName,             // Column A (Index 0)
      data.customerPhone,            // Column B (Index 1)
      data.shippingAddress,          // Column C (Index 2)
      data.productId,                // Column D (Index 3)
      data.productName,              // Column E (Index 4)
      data.price,                    // Column F (Index 5)
      data.referralCode || "DIRECT", // Column G (Index 6)
      new Date(),                    // Column H (Index 7): Conversion Timestamp
      "On Way"                       // Column I (Index 8): Initial state pipeline tag
    ];

    sheet.appendRow(rowData);
    return ContentService.createTextOutput(JSON.stringify({ "result": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  finally {
    lock.releaseLock();
  }


}

/**
 * Handles CORS Preflight configuration checks gracefully across network routing channels.
 */
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Handles incoming GET requests from both CreatorDashboard and AdminPanel.
 * Optional param: ?ref=CREATOR_CODE filters rows for specific affiliates.
 * Omitting the parameter returns the master list array for the admin log.
 */
function doGet(e) {
  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheets()[0];

    var lastRow = sheet.getLastRow();
    if (lastRow === 0) {
      return ContentService.createTextOutput(JSON.stringify({ result: "success", data: [], message: "Sheet is empty" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var rows = sheet.getDataRange().getValues();
    var orders = [];

    // Check if creator affiliate filter argument exists (?ref=CODE)
    var filterRef = null;
    if (e && e.parameter && e.parameter.ref) {
      filterRef = e.parameter.ref.toLowerCase().trim();
    }

    // Loops rows (Skips the tracking column header block at line index 0)
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];

      // Skips dead or completely empty formatting cells to secure loop operations
      if (!row || row.length < 7 || !row[0]) {
        continue;
      }

      var rawRefCode = row[6] !== undefined && row[6] !== null ? row[6] : "DIRECT";
      var orderRefCode = String(rawRefCode).toLowerCase().trim();

      // If filtering parameter was fed into route URL context, skip unmatching entries
      if (filterRef && orderRefCode !== filterRef) {
        continue;
      }

      orders.push({
        customerName: row[0] || "",
        customerPhone: row[1] || "",
        shippingAddress: row[2] || "",
        productId: row[3] || "",
        productName: row[4] || "",
        price: row[5] || 0,
        referralCode: rawRefCode,
        date: row[7] || "",
        deliveryStatus: row[8] || "On Way" // Safe fallback validation
      });
    }

    return ContentService.createTextOutput(JSON.stringify({ result: "success", data: orders }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}