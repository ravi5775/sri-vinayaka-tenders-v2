const https = require('https');
const url = require('url');

// Upload file to Google Drive via Google Apps Script
// This bypasses the service account limitation by using your personal account
const uploadFileToGoogleDrive = async (
  fileContent,
  fileName,
  appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL,
  secretKey = process.env.GOOGLE_APPS_SCRIPT_SECRET
) => {
  return new Promise((resolve, reject) => {
    try {
      if (!appsScriptUrl) {
        throw new Error('GOOGLE_APPS_SCRIPT_URL not configured in .env');
      }

      if (!secretKey) {
        throw new Error('GOOGLE_APPS_SCRIPT_SECRET not configured in .env');
      }

      // Prepare backup data
      const backupData = typeof fileContent === 'string' 
        ? JSON.parse(fileContent) 
        : fileContent;

      // Create request payload with secret included
      const payload = JSON.stringify({
        secret: secretKey,
        data: backupData
      });

      // Parse the URL properly
      const parsedUrl = new url.URL(appsScriptUrl);
      
      const makeRequest = (requestUrl, requestMethod = 'POST', requestBody = payload) => {
        const requestHeaders = {
          'Content-Type': 'application/json',
        };

        if (requestBody) {
          requestHeaders['Content-Length'] = Buffer.byteLength(requestBody);
        }

        const requestOptions = {
          method: requestMethod,
          headers: requestHeaders,
        };

        const req = https.request(requestUrl, requestOptions, (res) => {
          // Handle redirects manually for better control
          if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
            const redirectUrl = res.headers.location;
            if (redirectUrl) {
              const nextMethod = [301, 302, 303].includes(res.statusCode) ? 'GET' : requestMethod;
              const nextBody = [301, 302, 303].includes(res.statusCode) ? null : requestBody;
              return makeRequest(redirectUrl, nextMethod, nextBody);
            }
          }

          let responseData = '';

          res.on('data', (chunk) => {
            responseData += chunk;
          });

          res.on('end', () => {
            try {
              // Trim any whitespace
              const trimmedResponse = responseData.trim();
              
              console.log(`📊 Apps Script Response (Status: ${res.statusCode}, Length: ${trimmedResponse.length})`);
              
              // Check if response looks like HTML (error page)
              if (trimmedResponse.startsWith('<')) {
                reject(new Error(`Apps Script returned HTML (status ${res.statusCode}): ${trimmedResponse.substring(0, 200)}`));
                return;
              }

              const response = JSON.parse(trimmedResponse);

              if (response.success) {
                console.log(`✅ File uploaded to Google Drive`);
                console.log(`   File ID: ${response.fileId}`);
                console.log(`   File Name: ${response.fileName}`);
                console.log(`   File Link: ${response.webViewLink}`);
                console.log(`   Created: ${response.timestamp}`);

                resolve({
                  success: true,
                  fileId: response.fileId,
                  fileName: response.fileName,
                  webViewLink: response.webViewLink,
                  createdTime: response.timestamp,
                });
              } else {
                reject(new Error(response.error || 'Unknown error from Apps Script'));
              }
            } catch (parseErr) {
              reject(new Error(`Failed to parse Apps Script response: ${parseErr.message}\nResponse was: ${responseData.substring(0, 500)}`));
            }
          });
        });

        req.on('error', (error) => {
          reject(new Error(`Failed to upload to Google Drive: ${error.message}`));
        });
        if (requestBody) {
          req.write(requestBody);
        }
        req.end();
      };

      makeRequest(parsedUrl);

    } catch (err) {
      reject(new Error(`Error uploading file to Google Drive: ${err.message}`));
    }
  });
};

// Keep backward compatibility - other functions are no longer needed with Apps Script
const initializeGoogleDrive = () => {
  console.log('📱 Using Google Apps Script for Google Drive uploads');
  return true;
};

const getOrCreateFolder = async () => {
  console.log('📁 Google Apps Script handles folder management automatically');
  return true;
};

const listFilesInFolder = async () => {
  console.log('📂 Use Google Drive UI to view files in the backup folder');
  return [];
};

module.exports = {
  initializeGoogleDrive,
  uploadFileToGoogleDrive,
  getOrCreateFolder,
  listFilesInFolder,
};
