// Enfyra SDK Playground - Pure JavaScript
import { EnfyraClient, WebSocketClient, EnfyraError } from '@enfyra/core';

let client = null;
let ws = null;
let logs = [];

// Expose functions to global scope
window.initClient = initClient;
window.testAll = testAll;
window.testLogin = testLogin;
window.testMe = testMe;
window.testLogout = testLogout;
window.testRefreshToken = testRefreshToken;
window.checkAuthStatus = checkAuthStatus;
window.checkCookies = checkCookies;
window.testListUsers = testListUsers;
window.testCreateUser = testCreateUser;
window.testUpdateUser = testUpdateUser;
window.testDeleteUser = testDeleteUser;
window.testFilterUsers = testFilterUsers;
window.testRouteDefinition = testRouteDefinition;
window.testMetaQuery = testMetaQuery;
window.testUploadFile = testUploadFile;
window.testListFiles = testListFiles;
window.testFolderTree = testFolderTree;
window.testCustomRoute = testCustomRoute;
window.testWebSocketConnect = testWebSocketConnect;
window.testWebSocketDisconnect = testWebSocketDisconnect;
window.testWebSocketSend = testWebSocketSend;
window.test404Error = test404Error;
window.testValidationError = testValidationError;
window.testAuthError = testAuthError;
window.clearLogs = clearLogs;
window.exportLogs = exportLogs;

// Logging utility
function log(message, type = 'info', data = null) {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = {
    timestamp,
    message,
    type,
    data,
  };
  
  logs.push(logEntry);
  
  const logsDiv = document.getElementById('logs');
  const color = type === 'error' ? 'text-red-400' : type === 'success' ? 'text-green-400' : 'text-blue-400';
  const dataStr = data ? `\n  ${JSON.stringify(data, null, 2)}` : '';
  
  logsDiv.innerHTML += `<div class="${color}">[${timestamp}] ${message}${dataStr}</div>\n`;
  logsDiv.scrollTop = logsDiv.scrollHeight;
  
  console.log(`[${timestamp}] ${message}`, data || '');
}

function displayResult(elementId, data, isError = false) {
  const el = document.getElementById(elementId);
  el.className = `mt-4 p-3 rounded-lg text-sm font-mono overflow-auto max-h-64 ${isError ? 'error' : 'success'}`;
  el.textContent = JSON.stringify(data, null, 2);
}

function clearLogs() {
  logs = [];
  document.getElementById('logs').innerHTML = '';
  log('Logs cleared');
}

function exportLogs() {
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `enfyra-logs-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  log('Logs exported');
}

// Initialize Client
async function initClient() {
  const baseUrl = document.getElementById('baseUrl').value;
  
  try {
    client = new EnfyraClient({
      baseUrl,
      timeout: 30000,
      retries: 3,
    });
    
    document.getElementById('clientStatus').innerHTML = 
      '<span class="text-green-600">✅ Client initialized successfully</span>';
    log('Client initialized', 'success', { baseUrl, origin: window.location.origin });
    log('Note: All requests automatically include credentials (cookies)', 'info');
  } catch (error) {
    document.getElementById('clientStatus').innerHTML = 
      '<span class="text-red-600">❌ Failed to initialize client</span>';
    log('Failed to initialize client', 'error', error);
  }
}

// Test All - Run all tests in sequence
async function testAll() {
  if (!client) { 
    log('Please initialize client first', 'error'); 
    return; 
  }
  
  clearLogs();
  log('=== STARTING ALL TESTS ===', 'info');
  log(' ', 'info');
  
  try {
    // 1. Test Login
    log('📝 [TEST 1/8] Testing Login...', 'info');
    const email = document.getElementById('loginEmail').value || 'admin@example.com';
    const password = document.getElementById('loginPassword').value || '123456';
    await testLogin(email, password);
    log(' ', 'info');
    
    // 2. Test Auth Status
    log('📝 [TEST 2/8] Testing Auth Status...', 'info');
    await checkAuthStatus();
    log(' ', 'info');
    
    // 3. Test Get Me
    log('📝 [TEST 3/8] Testing Get /me...', 'info');
    await testMe();
    log(' ', 'info');
    
    // 4. Test List Users
    log('📝 [TEST 4/8] Testing List Users...', 'info');
    await testListUsers();
    log(' ', 'info');
    
    // 5. Test Refresh Token
    log('📝 [TEST 5/8] Testing Refresh Token...', 'info');
    await testRefreshToken();
    log(' ', 'info');
    
    // 6. Test Logout
    log('📝 [TEST 6/8] Testing Logout...', 'info');
    await testLogout();
    log(' ', 'info');
    
    // 7. Test Error Handling (404)
    log('📝 [TEST 7/8] Testing 404 Error...', 'info');
    await test404Error();
    log(' ', 'info');
    
    // 8. Test Auth Error
    log('📝 [TEST 8/8] Testing Auth Error (without login)...', 'info');
    await testAuthError();
    log(' ', 'info');
    
    log('=== ALL TESTS COMPLETED ===', 'success');
    log(' ', 'info');
    log('💡 TIP: Click "Export Logs" button to download full logs for debugging', 'info');
    
  } catch (error) {
    log('Test suite failed', 'error', error);
  }
}

// Authentication Tests
async function testLogin(email = null, password = null) {
  if (!client) { log('Please initialize client first', 'error'); return; }
  
  if (!email) {
    email = document.getElementById('loginEmail').value;
    password = document.getElementById('loginPassword').value;
  }
  
  try {
    log('Logging in...', 'info', { email });
    const tokens = await client.auth.login({ email, password });
    
    displayResult('authResult', tokens);
    log('Login successful', 'success', {
      email,
      expTime: new Date(tokens.expTime).toLocaleString(),
    });
  } catch (error) {
    displayResult('authResult', error, true);
    log('Login failed', 'error', error);
  }
}

async function testMe() {
  if (!client) { log('Please initialize client first', 'error'); return; }
  
  try {
    log('Fetching current user...');
    const user = await client.auth.getMe();
    
    displayResult('authResult', user);
    log('Got current user', 'success', user);
    
    const tokens = client.auth.getTokens();
    if (tokens) {
      log('Current tokens', 'info', {
        expTime: new Date(tokens.expTime).toLocaleString(),
        expiresIn: Math.round((tokens.expTime - Date.now()) / 1000 / 60) + ' min',
      });
    }
  } catch (error) {
    displayResult('authResult', error, true);
    log('Get /me failed', 'error', error);
  }
}

async function testLogout() {
  if (!client) { log('Please initialize client first', 'error'); return; }
  
  try {
    log('Logging out...');
    await client.auth.logout();
    
    displayResult('authResult', { message: 'Logout successful' });
    log('Logout successful', 'success');
  } catch (error) {
    displayResult('authResult', error, true);
    log('Logout failed', 'error', error);
  }
}

async function testRefreshToken() {
  if (!client) { log('Please initialize client first', 'error'); return; }
  
  try {
    log('Refreshing token...');
    const tokens = await client.auth.refreshToken();
    
    displayResult('authResult', tokens);
    log('Token refreshed successfully', 'success', {
      expTime: new Date(tokens.expTime).toLocaleString(),
      expiresIn: Math.round((tokens.expTime - Date.now()) / 1000 / 60) + ' min',
    });
  } catch (error) {
    displayResult('authResult', error, true);
    log('Token refresh failed', 'error', error);
  }
}

async function checkAuthStatus() {
  if (!client) { log('Please initialize client first', 'error'); return; }
  
  const isAuthenticated = client.auth.isAuthenticated();
  const tokens = client.auth.getTokens();
  
  displayResult('authResult', {
    isAuthenticated,
    tokens: tokens ? {
      expTime: new Date(tokens.expTime).toLocaleString(),
      expiresIn: Math.round((tokens.expTime - Date.now()) / 1000 / 60) + ' min',
      hasRefreshToken: !!tokens.refreshToken,
    } : null,
  });
  
  log('Auth status checked', 'info', { isAuthenticated });
}

async function checkCookies() {
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key) {
      acc[key.trim()] = value ? value.substring(0, 50) + '...' : '';
    }
    return acc;
  }, {});
  
  log('Current browser cookies', 'info', cookies);
  displayResult('authResult', {
    cookieCount: Object.keys(cookies).length,
    cookies,
  });
}

// CRUD Tests
async function testRouteDefinition() {
  if (!client) { log('Please initialize client first', 'error'); return; }
  
  try {
    log('Listing route definitions...');
    const result = await client
      .from('route_definition')
      .select('*')
      .sort('-createdAt')
      .limit(20)
      .execute();
    
    displayResult('crudResult', result);
    log('Route definitions listed', 'success', { count: result.data.length });
  } catch (error) {
    displayResult('crudResult', error, true);
    log('List route definitions failed', 'error', error);
  }
}

async function testListUsers() {
  if (!client) { log('Please initialize client first', 'error'); return; }
  
  try {
    log('Listing users...');
    const result = await client
      .from('user_definition')
      .select('id,email,name,role.name')
      .sort('-createdAt')
      .limit(10)
      .execute();
    
    displayResult('crudResult', result);
    log('Users listed', 'success', { count: result.data.length });
  } catch (error) {
    displayResult('crudResult', error, true);
    log('List users failed', 'error', error);
  }
}

async function testCreateUser() {
  if (!client) { log('Please initialize client first', 'error'); return; }
  
  try {
    const email = `test_${Date.now()}@example.com`;
    log('Creating user...', 'info', { email });
    
    const result = await client
      .from('user_definition')
      .insert({
        email,
        name: 'Test User',
        password: 'test123',
      })
      .execute();
    
    displayResult('crudResult', result);
    log('User created', 'success', result.data);
  } catch (error) {
    displayResult('crudResult', error, true);
    log('Create user failed', 'error', error);
  }
}

async function testUpdateUser() {
  if (!client) { log('Please initialize client first', 'error'); return; }
  
  try {
    const userId = prompt('Enter user ID to update:');
    if (!userId) return;
    
    log('Updating user...', 'info', { userId });
    
    const result = await client
      .from('user_definition')
      .update({ name: `Updated ${Date.now()}` })
      .byId(userId)
      .execute();
    
    displayResult('crudResult', result);
    log('User updated', 'success', result.data);
  } catch (error) {
    displayResult('crudResult', error, true);
    log('Update user failed', 'error', error);
  }
}

async function testDeleteUser() {
  if (!client) { log('Please initialize client first', 'error'); return; }
  
  try {
    const userId = prompt('Enter user ID to delete:');
    if (!userId) return;
    
    log('Deleting user...', 'info', { userId });
    
    await client
      .from('user_definition')
      .delete()
      .byId(userId)
      .execute();
    
    displayResult('crudResult', { success: true, message: 'User deleted' });
    log('User deleted', 'success');
  } catch (error) {
    displayResult('crudResult', error, true);
    log('Delete user failed', 'error', error);
  }
}

async function testFilterUsers() {
  if (!client) { log('Please initialize client first', 'error'); return; }
  
  try {
    log('Filtering users...');
    
    const result = await client
      .from('user_definition')
      .select('id,email,name')
      .filter({
        email: { _contains: '@example.com' }
      })
      .limit(10)
      .execute();
    
    displayResult('crudResult', result);
    log('Users filtered', 'success', { count: result.data.length });
  } catch (error) {
    displayResult('crudResult', error, true);
    log('Filter users failed', 'error', error);
  }
}

async function testMetaQuery() {
  if (!client) { log('Please initialize client first', 'error'); return; }
  
  try {
    log('Querying with meta...');
    
    const result = await client
      .from('user_definition')
      .select('id,email')
      .limit(10)
      .meta(['totalCount', 'filterCount'])
      .execute();
    
    displayResult('crudResult', result);
    log('Meta query successful', 'success', result.meta);
  } catch (error) {
    displayResult('crudResult', error, true);
    log('Meta query failed', 'error', error);
  }
}

// File Storage Tests
async function testUploadFile() {
  if (!client) { log('Please initialize client first', 'error'); return; }
  
  const fileInput = document.getElementById('fileInput');
  const title = document.getElementById('fileTitle').value;
  
  if (!fileInput.files || fileInput.files.length === 0) {
    log('Please select a file', 'error');
    return;
  }
  
  try {
    const file = fileInput.files[0];
    log('Uploading file...', 'info', { name: file.name, size: file.size });
    
    const result = await client.storage.upload({
      file,
      title,
      description: 'Uploaded from playground',
    });
    
    displayResult('storageResult', result);
    log('File uploaded', 'success', result);
  } catch (error) {
    displayResult('storageResult', error, true);
    log('File upload failed', 'error', error);
  }
}

async function testListFiles() {
  if (!client) { log('Please initialize client first', 'error'); return; }
  
  try {
    log('Listing files...');
    
    const result = await client
      .from('file_definition')
      .select('id,filename,mimetype,size,folder')
      .limit(10)
      .execute();
    
    displayResult('storageResult', result);
    log('Files listed', 'success', { count: result.data.length });
  } catch (error) {
    displayResult('storageResult', error, true);
    log('List files failed', 'error', error);
  }
}

async function testFolderTree() {
  if (!client) { log('Please initialize client first', 'error'); return; }
  
  try {
    log('Getting folder tree...');
    
    const result = await client.storage.getFolderTree();
    
    displayResult('storageResult', result);
    log('Folder tree retrieved', 'success', result);
  } catch (error) {
    displayResult('storageResult', error, true);
    log('Get folder tree failed', 'error', error);
  }
}

// Custom Routes Tests
async function testCustomRoute() {
  if (!client) { log('Please initialize client first', 'error'); return; }
  
  const method = document.getElementById('customMethod').value;
  const endpoint = document.getElementById('customEndpoint').value;
  const bodyStr = document.getElementById('customBody').value;
  
  try {
    let body = null;
    if (bodyStr) {
      body = JSON.parse(bodyStr);
    }
    
    log(`Sending ${method} to ${endpoint}...`, 'info', { body });
    
    let response;
    switch (method) {
      case 'GET':
        response = await client.get(endpoint);
        break;
      case 'POST':
        response = await client.post(endpoint, body);
        break;
      case 'PATCH':
        response = await client.patch(endpoint, body);
        break;
      case 'DELETE':
        response = await client.delete(endpoint);
        break;
    }
    
    displayResult('customResult', response.data);
    log(`Custom route ${method} ${endpoint} successful`, 'success', response.data);
  } catch (error) {
    displayResult('customResult', error, true);
    log(`Custom route failed`, 'error', error);
  }
}

// WebSocket Tests
function testWebSocketConnect() {
  if (!client) { log('Please initialize client first', 'error'); return; }
  
  const gateway = document.getElementById('wsGateway').value;

  try {
    log(`Connecting to WebSocket gateway: ${gateway}...`);

    // Get baseUrl from input or use default
    const baseUrl = document.getElementById('baseUrl').value.replace(/\/api$/, '').replace(/\/$/, '');

    ws = new WebSocketClient({
      baseUrl,
      gateway,
      reconnect: false,
      maxReconnectAttempts: 5,
    });
    
    ws.on('connected', (data) => {
      console.log('WebSocket connected', data);
      document.getElementById('wsStatus').innerHTML = 
        '<span class="text-green-600">✅ Connected</span>';
      log('WebSocket connected', 'success');

      displayResult('wsResult', { status: 'connected', gateway });
    });
    
    ws.on('disconnect', ({ reason }) => {
      document.getElementById('wsStatus').innerHTML = 
        '<span class="text-red-600">❌ Disconnected</span>';
      log('WebSocket disconnected', 'error', { reason });
    });
    
    ws.on('message', (data) => {
      log('WebSocket message received', 'info', data);
      displayResult('wsResult', { event: 'message', data });
    });
    
    ws.on('backend_disconnected', ({ reason }) => {
      log('Backend disconnected', 'warning', { reason });
    });
    
    ws.on('backend_reconnected', () => {
      log('Backend reconnected', 'success');
    });
    
    ws.on('error', (error) => {
      log('WebSocket error', 'error', error);
    });
    
    ws.connect();
  } catch (error) {
    log('WebSocket connect failed', 'error', error);
    displayResult('wsResult', error, true);
  }
}

function testWebSocketDisconnect() {
  if (!ws) { log('WebSocket not connected', 'error'); return; }
  
  try {
    ws.disconnect();
    document.getElementById('wsStatus').innerHTML = 
      '<span class="text-gray-600">Disconnected</span>';
    log('WebSocket disconnected', 'info');
    displayResult('wsResult', { status: 'disconnected' });
    ws = null;
  } catch (error) {
    log('WebSocket disconnect failed', 'error', error);
  }
}

function testWebSocketSend() {
  if (!ws) { log('WebSocket not connected', 'error'); return; }
  
  const message = document.getElementById('wsMessage').value;
  
  try {
    log('Sending WebSocket message...', 'info', { message });
    ws.emit('message', { text: message, timestamp: Date.now() });
    displayResult('wsResult', { event: 'sent', message });
  } catch (error) {
    log('WebSocket send failed', 'error', error);
  }
}

// Error Handling Tests
async function test404Error() {
  if (!client) { log('Please initialize client first', 'error'); return; }
  
  try {
    log('Testing 404 error...');
    await client.get('/nonexistent-endpoint-12345');
    log('Should have thrown 404 error!', 'error');
  } catch (error) {
    if (error instanceof EnfyraError) {
      displayResult('errorResult', {
        code: error.code,
        statusCode: error.statusCode,
        message: error.message,
      });
      log('404 error caught successfully', 'success', {
        code: error.code,
        statusCode: error.statusCode,
      });
    }
  }
}

async function testValidationError() {
  if (!client) { log('Please initialize client first', 'error'); return; }
  
  try {
    log('Testing validation error...');
    await client
      .from('user_definition')
      .insert({}) // Empty data should fail
      .execute();
    log('Should have thrown validation error!', 'error');
  } catch (error) {
    if (error instanceof EnfyraError) {
      displayResult('errorResult', {
        code: error.code,
        statusCode: error.statusCode,
        message: error.message,
        details: error.details,
      });
      log('Validation error caught successfully', 'success', {
        code: error.code,
        statusCode: error.statusCode,
      });
    }
  }
}

async function testAuthError() {
  if (!client) { log('Please initialize client first', 'error'); return; }
  
  try {
    log('Testing 401 error...');
    client.clearAuthToken(); // Remove auth
    
    await client.get('/me');
    log('Should have thrown 401 error!', 'error');
  } catch (error) {
    if (error instanceof EnfyraError) {
      displayResult('errorResult', {
        code: error.code,
        statusCode: error.statusCode,
        message: error.message,
      });
      log('401 error caught successfully', 'success', {
        code: error.code,
        statusCode: error.statusCode,
      });
    }
  }
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
  log('Playground loaded. Click "Initialize Client" to start testing.');
});
