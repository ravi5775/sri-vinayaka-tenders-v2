// Google Apps Script for Sri Vinayaka Backup Upload
// Deploy as web app to get endpoint URL

// Configuration
const CONFIG = {
  BACKUP_FOLDER_NAME: 'sri-vinayaka-backups',
  SECRET_KEY: 'backup-secret-vinayaka-2026-secure' // Change this to a random string
};

// Main POST handler
function doPost(e) {
  try {
    // Get secret from either URL parameters or POST body
    let params = e.parameter || {};
    let backupData = {};
    let providedSecret = params.secret;

    // If secret not in params, try to parse from POST body
    if (!providedSecret && e.postData) {
      try {
        const bodyData = JSON.parse(e.postData.contents);
        providedSecret = bodyData.secret;
        backupData = bodyData.data || bodyData;
      } catch (err) {
        // Continue - will handle below
      }
    }

    // If still no secret, check if it's in URL params again
    if (!providedSecret) {
      providedSecret = e.parameter ? e.parameter.secret : null;
    }

    // Verify request
    if (!providedSecret || providedSecret !== CONFIG.SECRET_KEY) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid or missing secret key'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // If no backup data yet, try to get it from POST body
    if (!backupData || Object.keys(backupData).length === 0) {
      if (e.postData) {
        try {
          const bodyData = JSON.parse(e.postData.contents);
          backupData = bodyData.data || bodyData;
        } catch (err) {
          // Continue
        }
      }
    }

    if (!backupData || Object.keys(backupData).length === 0) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'No backup data provided'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Get or create backup folder
    const folderId = getOrCreateBackupFolder();
    
    // Create backup file
    const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const fileContent = JSON.stringify(backupData, null, 2);
    
    const file = DriveApp.getFolderById(folderId).createFile(
      fileName,
      fileContent,
      MimeType.PLAIN_TEXT
    );
    
    // Add file metadata
    file.setDescription(`Automatic backup - ${new Date().toLocaleString()}`);

    const result = {
      success: true,
      fileId: file.getId(),
      fileName: fileName,
      webViewLink: file.getUrl(),
      timestamp: new Date().toISOString()
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Get or create backup folder in My Drive
function getOrCreateBackupFolder() {
  try {
    // Search for existing folder
    const folders = DriveApp.getFoldersByName(CONFIG.BACKUP_FOLDER_NAME);
    
    if (folders.hasNext()) {
      return folders.next().getId();
    }
    
    // Create new folder in My Drive root
    const newFolder = DriveApp.createFolder(CONFIG.BACKUP_FOLDER_NAME);
    return newFolder.getId();
    
  } catch (error) {
    throw new Error(`Failed to get/create folder: ${error.toString()}`);
  }
}

// Optional: Test the script locally
function testBackupUpload() {
  const testData = {
    timestamp: new Date().toISOString(),
    totalLoans: 69,
    totalInvestors: 10,
    totalTransactions: 625,
    totalPayments: 6,
    test: true
  };
  
  const e = {
    parameter: {
      secret: CONFIG.SECRET_KEY
    },
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const response = doPost(e);
  Logger.log('Test Response: ' + response.getContent());
}
