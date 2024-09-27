"use client";

import type { User } from "@/db/users.db";
import { Button } from "@/components/ui/button";
import { useAuthState } from "@/contexts/AuthStateContext";
import { useRouter } from "next/navigation";

interface UserTableProps {
  users: User[];
}

export function UserTable({ users }: UserTableProps) {
  const router = useRouter();
  const { impersonatedUserId, setImpersonatedUserId } = useAuthState();

  const handleImpersonate = (userId: string) => {
    setImpersonatedUserId(userId);
    router.push('/app');
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4 border-b">ID</th>
            <th className="py-2 px-4 border-b">First Name</th>
            <th className="py-2 px-4 border-b">Last Name</th>
            <th className="py-2 px-4 border-b">Email</th>
            <th className="py-2 px-4 border-b">Created At</th>
            <th className="py-2 px-4 border-b" />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className={`hover:bg-gray-50 ${impersonatedUserId === user.id ? 'bg-blue-100' : ''}`}>
              <td className="py-2 px-4 border-b">{user.id}</td>
              <td className="py-2 px-4 border-b">{user.firstName}</td>
              <td className="py-2 px-4 border-b">{user.lastName}</td>
              <td className="py-2 px-4 border-b">{user.email}</td>
              <td className="py-2 px-4 border-b">
                {new Date(user.createdAt).toLocaleString()}
              </td>
              <td className="py-2 px-4 border-b">
                <Button
                  onClick={() => handleImpersonate(user.id)}
                  variant={impersonatedUserId === user.id ? "default" : "outline"}
                  size="sm"
                >
                  {impersonatedUserId === user.id ? 'Go to app' : 'Impersonate'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
