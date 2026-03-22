/**
 * Auto-refresh Token Example
 * 
 * This example demonstrates how the SDK automatically refreshes tokens
 * before they expire (2 minutes threshold).
 */

import { EnfyraClient } from '../src/index';

const client = new EnfyraClient({
  baseUrl: 'http://localhost:3000/api',
});

async function example1_ManualRefresh() {
  console.log('=== Example 1: Manual Refresh ===\n');
  
  // Login
  const tokens = await client.auth.login({
    email: 'user@example.com',
    password: 'password123',
  });
  
  console.log('Logged in:', {
    expTime: new Date(tokens.expTime).toLocaleString(),
    expiresIn: Math.round((tokens.expTime - Date.now()) / 1000 / 60) + ' min',
  });
  
  // Wait until token is about to expire (less than 2 minutes)
  console.log('Waiting 13 minutes (token expires in 15 min)...\n');
  await new Promise(resolve => setTimeout(resolve, 13 * 60 * 1000));
  
  // Check token status
  const currentTokens = client.auth.getTokens();
  if (currentTokens) {
    const timeLeft = currentTokens.expTime - Date.now();
    console.log('Time left:', Math.round(timeLeft / 1000 / 60) + ' min');
  }
  
  // Make API call - will auto-refresh before request
  console.log('Making API call (will auto-refresh)...\n');
  const users = await client.from('user_definition').execute();
  
  console.log('API call successful!');
  console.log('Token has been refreshed automatically.\n');
}

async function example2_ProactiveRefresh() {
  console.log('=== Example 2: Proactive Refresh ===\n');
  
  // Login
  await client.auth.login({
    email: 'user@example.com',
    password: 'password123',
  });
  
  console.log('Logged in successfully\n');
  
  // Make multiple API calls over time
  // Each call will check if token needs refresh (< 2 min threshold)
  
  console.log('Making API call 1...');
  await client.from('user_definition').execute();
  console.log('✓ Success\n');
  
  await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
  
  console.log('Making API call 2 (5 min later)...');
  await client.from('user_definition').execute();
  console.log('✓ Success\n');
  
  await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
  
  console.log('Making API call 3 (10 min later)...');
  await client.from('user_definition').execute();
  console.log('✓ Success\n');
  
  console.log('All API calls completed without 401 errors!');
  console.log('Token was refreshed automatically when needed.\n');
}

async function example3_CheckAuthStatus() {
  console.log('=== Example 3: Check Auth Status ===\n');
  
  // Check if authenticated (without making API call)
  const isAuthenticated = client.auth.isAuthenticated();
  console.log('Is authenticated:', isAuthenticated);
  
  // Get current tokens
  const tokens = client.auth.getTokens();
  if (tokens) {
    console.log('Token info:', {
      expTime: new Date(tokens.expTime).toLocaleString(),
      expiresIn: Math.round((tokens.expTime - Date.now()) / 1000 / 60) + ' min',
      hasRefreshToken: !!tokens.refreshToken,
    });
  }
  
  // Get user info
  const user = await client.auth.getMe();
  console.log('Current user:', user.email);
}

async function example4_Logout() {
  console.log('=== Example 4: Logout ===\n');
  
  // Logout (clears tokens and calls API)
  await client.auth.logout();
  
  console.log('Logged out successfully');
  console.log('Tokens cleared from storage\n');
  
  // Try to make API call (should fail)
  try {
    await client.from('user_definition').execute();
  } catch (error) {
    console.log('API call failed as expected:', error.message);
  }
}

// Run examples
async function runAllExamples() {
  try {
    await example1_ManualRefresh();
    await example2_ProactiveRefresh();
    await example3_CheckAuthStatus();
    await example4_Logout();
  } catch (error) {
    console.error('Error:', error);
  }
}

runAllExamples();
