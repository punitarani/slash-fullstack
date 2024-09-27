"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface AddRandomUserButtonProps {
  onUserAdded: () => void;
}

export function AddRandomUserButton({ onUserAdded }: AddRandomUserButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleAddUser = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/admin/user", { method: "POST" });
      if (response.ok) {
        onUserAdded(); // Call the callback function to trigger user list refresh
        router.refresh();
      } else {
        console.error("Failed to add user");
      }
    } catch (error) {
      console.error("Error adding user:", error);
    }
    setIsLoading(false);
  };

  return (
    <Button
      onClick={handleAddUser}
      disabled={isLoading}
      className="mb-4"
    >
      {isLoading ? "Adding..." : "Add Random User"}
    </Button>
  );
}
