import { EnfyraClient, EnfyraError } from '../src';

const client = new EnfyraClient({
  baseUrl: 'http://localhost:3000/api',
  timeout: 30000,
  retries: 3,
});

async function example1_ListUsers() {
  console.log('\n=== Example 1: List Users ===');
  
  try {
    const users = await client
      .from('user_definition')
      .select('id,email,name,role.name')
      .filter({ status: { _eq: 'active' } })
      .sort('-createdAt')
      .limit(10)
      .execute();

    console.log('Users:', users.data);
    if (users.meta) {
      console.log('Meta:', users.meta);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function example2_CreateUser() {
  console.log('\n=== Example 2: Create User ===');
  
  try {
    const newUser = await client
      .from('user_definition')
      .insert({
        email: `test_${Date.now()}@example.com`,
        name: 'Test User',
        password: 'test123',
      })
      .execute();

    console.log('Created user:', newUser.data);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function example3_UpdateUser() {
  console.log('\n=== Example 3: Update User ===');
  
  try {
    const updated = await client
      .from('user_definition')
      .update({ name: 'Updated Name' })
      .byId(1)
      .execute();

    console.log('Updated user:', updated.data);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function example4_DeleteUser() {
  console.log('\n=== Example 4: Delete User ===');
  
  try {
    await client
      .from('user_definition')
      .delete()
      .byId(1)
      .execute();

    console.log('User deleted successfully');
  } catch (error) {
    console.error('Error:', error);
  }
}

async function example5_ComplexQuery() {
  console.log('\n=== Example 5: Complex Query ===');
  
  try {
    const result = await client
      .from('user_definition')
      .select('id,email,name')
      .filter({
        _and: [
          { email: { _contains: '@example.com' } },
          { name: { _is_not_null: true } },
        ],
      })
      .deep({
        posts: {
          fields: 'id,title',
          sort: '-createdAt',
          limit: 5,
        },
      })
      .meta(['totalCount', 'filterCount'])
      .execute();

    console.log('Users:', result.data);
    console.log('Meta:', result.meta);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function example6_FileUpload() {
  console.log('\n=== Example 6: File Upload ===');
  
  try {
    const blob = new Blob(['test content'], { type: 'text/plain' });
    const file = new File([blob], 'test.txt', { type: 'text/plain' });

    const uploaded = await client.storage.upload({
      file,
      title: 'Test File',
      description: 'Test upload from SDK',
    });

    console.log('Uploaded file:', uploaded);

    const downloadUrl = client.storage.getDownloadUrl(uploaded.id);
    console.log('Download URL:', downloadUrl);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function example7_ErrorHandling() {
  console.log('\n=== Example 7: Error Handling ===');
  
  try {
    await client.from('nonexistent_table').select('*').execute();
  } catch (error) {
    if (error instanceof EnfyraError) {
      console.log('Error code:', error.code);
      console.log('Status code:', error.statusCode);
      console.log('Message:', error.message);
      console.log('Details:', error.details);
    }
  }
}

async function main() {
  console.log('Enfyra SDK - Basic Usage Examples');
  console.log('=================================');

  await example1_ListUsers();
  await example2_CreateUser();
  await example3_UpdateUser();
  await example4_DeleteUser();
  await example5_ComplexQuery();
  await example6_FileUpload();
  await example7_ErrorHandling();

  console.log('\n✅ All examples completed');
}

main().catch(console.error);
