"use client";

import { useEffect, useState } from "react";
import { useAuthState } from "@/contexts/AuthStateContext";
import type { User } from "@/db/users.db";
import type { Account } from "@/db/accounts.db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import type { transactions } from "@/db/transactions.db";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { transferRequestBodySchema } from "../api/account/[accountId]/transfer/route";

import TransferDrawer from "./TransferDrawer"

interface AccountWithBalance extends Account {
	balance: string;
}

interface AppState {
	user: User | null;
	accounts: AccountWithBalance[];
	loading: boolean;
	selectedAccount: string | null;
	transactions: (typeof transactions)["$inferSelect"][] | undefined;
}

export default function AppPage() {
	const { impersonatedUserId } = useAuthState();
	const [appState, setAppState] = useState<AppState>({
		user: null,
		accounts: [],
		loading: true,
		selectedAccount: null,
		transactions: [],
	});
	const [isDrawerOpen, setIsDrawerOpen] = useState(false); // State to control drawer visibility

	async function fetchUserData() {
		if (!impersonatedUserId) {
			setAppState((prevState) => ({ ...prevState, loading: false }));
			return;
		}

		try {
			const response = await fetch(`/api/users/${impersonatedUserId}`);
			if (!response.ok) {
				throw new Error("Failed to fetch user data");
			}
			const data = await response.json();

			setAppState((prevState) => ({
				...prevState,
				user: data.user,
				accounts: data.accounts,
				loading: false,
			}));
		} finally {
			setAppState((prevState) => ({ ...prevState, loading: false }));
		}
	}

	useEffect(() => {
		fetchUserData();
	}, [impersonatedUserId]);

	const fetchTransactions = async (accountId: string) => {
		setAppState((prevState) => ({
			...prevState,
			selectedAccount: accountId,
			transactions: undefined,
		}));
		const response = await fetch(
			`/api/users/${impersonatedUserId}/transactions?accountId=${accountId}`,
		);

		const data = await response.json();

		setAppState((prevState) => ({
			...prevState,
			selectedAccount: accountId,
			transactions: data.transactions,
		}));
	};

	const handleTransfer = async (
		req: (typeof transferRequestBodySchema)["_type"],
	) => {
		if (!impersonatedUserId) return;

		if (!appState.selectedAccount) {
			return;
		}

		const response = await fetch(
			`/api/account/${appState.selectedAccount}/transfer`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(req),
			},
		);

		if (!response.ok) {
			throw await response.json();
		}

		await fetchUserData();
		await fetchTransactions(appState.selectedAccount);
		setIsDrawerOpen(false);
	};

	if (appState.loading) {
		return null;
	}

	if (!appState.user) {
		return (
			<div>
				No user selected. Please impersonate a user from the admin panel.
			</div>
		);
	}

	const maximumBalanceForSelectedAccount = (() => {
		const balance = appState.accounts.find(
			(a) => a.id === appState.selectedAccount,
		)?.balance;
		if (!balance) {
			return 0;
		}
		return Number(balance);
	})();

	return (
		<div className="container mx-auto py-10 px-4 relative">
			{/* Add padding here */}
			<div className="absolute top-4 right-4">
				<DropdownMenu>
					<DropdownMenuTrigger>
						<Avatar>
							<AvatarImage
								src={""}
								alt={`${appState.user.firstName} ${appState.user.lastName}`}
							/>
							<AvatarFallback>
								{appState.user.firstName[0]}
								{appState.user.lastName[0]}
							</AvatarFallback>
						</Avatar>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuItem>
							<Link href="/admin">Admin</Link>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<h1 className="text-2xl font-bold mb-5">User Dashboard</h1>
			<div className="flex">
				<Card className="w-1/3 px-4 py-6 mr-4 min-w-[250px]">
					<h2 className="text-xl font-semibold mb-4">Accounts</h2>
					<table className="w-full">
						<thead>
							<tr className="text-left">
								<th className="pb-2">Name</th>
								<th className="pb-2 text-right">Balance</th>
							</tr>
						</thead>
						<tbody>
							{appState.accounts.map((account) => (
								<tr
									key={account.id}
									className={`border-t hover:bg-gray-100 cursor-pointer ${
										appState.selectedAccount === account.id ? "bg-blue-100" : ""
									}`}
									onClick={() => fetchTransactions(account.id)}
									onKeyUp={(e) =>
										e.key === "Enter" && fetchTransactions(account.id)
									} // Add keyboard event handler
									tabIndex={0} // Make row focusable
								>
									<td className="py-2">
										<p className="font-semibold">{account.name}</p>
										<p className="text-xs text-gray-600">
											Acct: {account.accountNumber}
										</p>
									</td>
									<td className="py-2 text-right">
										{Intl.NumberFormat("en-US", {
											style: "currency",
											currency: "USD",
										}).format(Number(account.balance) / 100)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</Card>
				<Card className="p-6 min-w-0">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-xl font-semibold ">
							{appState.selectedAccount
								? "Transactions"
								: "Select an account to view transactions"}
						</h2>

						{appState.selectedAccount && (
							<Button
								className="mt-4"
								onClick={() => setIsDrawerOpen(true)}
								type="button" // Provide explicit type
							>
								Move Money
							</Button>
						)}
					</div>
					{appState.selectedAccount && (
						<table className="w-full table-fixed">
							<thead>
								<tr className="text-left">
									<th className="pb-2">Date</th>
									<th className="pb-2">Description</th>
									<th className="pb-2 text-right">Amount</th>
								</tr>
							</thead>
							<tbody>
								{appState.transactions?.map((transaction) => (
									<tr key={transaction.id} className="border-t">
										<td className="py-2">
											{new Date(transaction.createdAt).toLocaleDateString()}
										</td>
										<td className="py-2 overflow-hidden text-ellipsis whitespace-nowrap">
											{transaction.description}
										</td>
										<td className="py-2 text-right">
											{Intl.NumberFormat("en-US", {
												style: "currency",
												currency: "USD",
											}).format(transaction.amountCents / 100)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</Card>
			</div>
			<TransferDrawer
				isOpen={isDrawerOpen}
				onClose={() => setIsDrawerOpen(false)}
				selectedAccount={appState.selectedAccount}
				maximumBalanceForSelectedAccount={maximumBalanceForSelectedAccount}
				onTransfer={handleTransfer}
			/>
		</div>
	);
}
