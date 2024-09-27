"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "@/contexts/AuthStateContext";

export default function RootPage() {
	const router = useRouter();
	const { impersonatedUserId } = useAuthState();

	useEffect(() => {
		if (impersonatedUserId) {
			router.push("/app");
		} else {
			router.push("/admin");
		}
	}, [impersonatedUserId, router]);

	// Return null or a loading indicator while redirecting
	return null;
}
