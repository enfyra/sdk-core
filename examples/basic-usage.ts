import { EnfyraClient, EnfyraError } from '../src';

const client = new EnfyraClient({
  baseUrl: '/enfyra',
});

async function main() {
  const users = await client
    .from('enfyra_user')
    .select(['id', 'email', 'name', 'role.name'])
    .filter({ status: { _eq: 'active' } })
    .sort('-createdAt')
    .limit(10)
    .meta(['totalCount', 'filterCount'])
    .execute();

  const created = await client.from('articles').insert({
    title: 'SDK example',
    status: 'draft',
  });
  const record = Array.isArray(created.data) ? created.data[0] : created.data;

  await client
    .from('articles')
    .byId((record as { id: string }).id)
    .update({ status: 'published' });

  await client
    .from('articles')
    .byId((record as { id: string }).id)
    .delete();

  console.log(users.data, users.meta);
}

main().catch((error: unknown) => {
  if (error instanceof EnfyraError) {
    console.error(error.code, error.statusCode, error.details);
    return;
  }
  throw error;
});
