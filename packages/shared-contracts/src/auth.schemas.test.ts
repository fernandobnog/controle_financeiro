import assert from 'node:assert/strict';
import test from 'node:test';

import { sessionSchema } from './auth.schemas.js';

test('sessionSchema accepts only the public user fields needed by the frontend shell', () => {
  const session = sessionSchema.parse({
    accessToken: 'token-publico',
    expiresAt: '2030-05-28T10:00:00.000Z',
    user: {
      id: 'user-1',
      accountId: 'account-1',
      email: 'owner@familia-souza.local',
      fullName: 'Responsavel Familia Souza',
      role: 'owner'
    }
  });

  assert.deepEqual(session.user, {
    email: 'owner@familia-souza.local',
    fullName: 'Responsavel Familia Souza'
  });
});

test('sessionSchema rejects responses without the user fields rendered in the frontend shell', () => {
  assert.throws(
    () =>
      sessionSchema.parse({
        accessToken: 'token-publico',
        expiresAt: '2030-05-28T10:00:00.000Z',
        user: {
          email: 'owner@familia-souza.local'
        }
      }),
    /fullName/
  );
});