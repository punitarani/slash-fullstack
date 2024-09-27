"use client";

import { useEffect, useState, useCallback } from "react";
import type { User } from "@/db/users.db";
import { UserTable } from "./user-table";
import { AddRandomUserButton } from "./add-random-user-button";

export default function AdminPage() {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/admin/user');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const users = await response.json();
      setAllUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUserAdded = () => {
    fetchUsers();
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-5">Admin Dashboard</h1>
      <AddRandomUserButton onUserAdded={handleUserAdded} />
      {loading ? (
        <p>Loading users...</p>
      ) : (
        <UserTable users={allUsers} />
      )}
    </div>
  );
}
