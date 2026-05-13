'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { permissions } from '@broadcast/auth';

import { authenticatedRequest } from '../auth/lib/authenticated-request';
import { useAuth } from '../auth/auth-provider';
import { StatusBadge } from './status-badge';

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  status: string;
  role: { name: string };
  operatorProfile?: { id: string; status: string } | null;
};

type UsersResponse = {
  items: UserRow[];
};

export function UsersManagement() {
  const auth = useAuth();
  const [search, setSearch] = useState('');
  const canInvite = auth.permissions.includes(permissions.usersInvite);
  const { data, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => authenticatedRequest<UsersResponse>(`/users?search=${encodeURIComponent(search)}`),
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground">Manage identity, roles, status, and operator ownership.</p>
        </div>
        {canInvite ? (
          <button className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
            Invite User
          </button>
        ) : null}
      </div>
      <input
        className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm"
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Filter users"
        value={search}
      />
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Operator</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td className="px-4 py-4" colSpan={4}>Loading users...</td></tr>
            ) : (
              data?.items.map((user) => (
                <tr className="border-t border-border" key={user.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{user.fullName}</div>
                    <div className="text-muted-foreground">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">{user.role.name.replaceAll('_', ' ')}</td>
                  <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                  <td className="px-4 py-3">{user.operatorProfile ? 'Operator' : 'User only'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
