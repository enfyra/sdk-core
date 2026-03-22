/**
 * Ví dụ sử dụng Authentication trong Enfyra SDK
 * 
 * Features:
 * - login(email, password)
 * - logout()
 * - refreshToken()
 * - isAuthenticated()
 * - getMe()
 * - Auto-refresh token trước mỗi request (threshold: 2 phút)
 */

import { EnfyraClient } from '../src/index';

// 1. Khởi tạo client
const client = new EnfyraClient({
  baseUrl: 'http://localhost:3000/api',
  timeout: 30000,
  retries: 3,
});

async function example() {
  // 2. Kiểm tra đã login chưa
  console.log('Is authenticated:', client.auth.isAuthenticated());

  // 3. Login
  try {
    const tokens = await client.auth.login({
      email: 'user@example.com',
      password: 'password123',
    });
    
    console.log('Login successful!');
    console.log('Access Token:', tokens.accessToken);
    console.log('Refresh Token:', tokens.refreshToken);
    console.log('Expires at:', new Date(tokens.expTime).toISOString());
  } catch (error) {
    console.error('Login failed:', error);
    return;
  }

  // 4. Lấy thông tin user
  try {
    const user = await client.auth.getMe();
    console.log('User info:', user);
  } catch (error) {
    console.error('Failed to get user info:', error);
  }

  // 5. Sử dụng API - tự động refresh token nếu cần
  // Trước mỗi request, SDK tự động check:
  // - Nếu token còn < 2 phút → refresh trước
  // - Nếu token hết hạn → refresh trước
  try {
    const users = await client.from('user_definition')
      .select('id,email,name')
      .execute();
    
    console.log('Users:', users);
  } catch (error) {
    console.error('API call failed:', error);
  }

  // 6. Manual refresh token (không cần thiết vì có auto-refresh)
  try {
    const newTokens = await client.auth.refreshToken();
    console.log('Token refreshed manually:', newTokens);
  } catch (error) {
    console.error('Manual refresh failed:', error);
  }

  // 7. Logout
  try {
    await client.auth.logout();
    console.log('Logout successful!');
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

// Ví dụ 2: Set tokens thủ công (cho testing hoặc manual setup)
function exampleManualTokenSetup() {
  const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
  const refreshToken = 'dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...';
  
  client.auth.setTokens(accessToken, refreshToken);
  
  console.log('Tokens set manually');
  console.log('Is authenticated:', client.auth.isAuthenticated());
}

// Ví dụ 3: Get tokens hiện tại
function exampleGetTokens() {
  const tokens = client.auth.getTokens();
  
  if (tokens) {
    console.log('Current tokens:');
    console.log('- Access Token:', tokens.accessToken.substring(0, 20) + '...');
    console.log('- Refresh Token:', tokens.refreshToken.substring(0, 20) + '...');
    console.log('- Expires at:', new Date(tokens.expTime).toISOString());
    console.log('- Time until expiry:', tokens.expTime - Date.now(), 'ms');
  } else {
    console.log('No tokens available');
  }
}

example();
