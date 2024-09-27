import { db } from "@/db/db";
import { createJob } from "./task";
import { users } from "@/db/users.db";
import { accounts } from "@/db/accounts.db";
import { transactions } from "@/db/transactions.db";
import crypto from "node:crypto";

export const createUserJob = createJob({
	name: "create-user",
	handler: async () => {
		// Create user
		const [user] = await db
			.insert(users)
			.values({
				id: crypto.randomUUID(),
				firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
				lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
				email: `dummy+${crypto.randomUUID().slice(0, 8)}@joinslash.com`,
			})
			.returning();

		// Create accounts (1-10, including primary)
		const accountsCount = getRandomInt(1, 10);
		const accountsToCreate = Array.from({ length: accountsCount }, (_, i) => ({
			id: crypto.randomUUID(),
			name: i === 0 ? "Primary" : `Account ${i + 1}`,
			accountNumber: generateAccountNumber(),
			routingNumber: "123456789", // You might want to generate this more realistically
			userId: user.id,
			createdAt: new Date(Date.now() + i),
		}));

		const createdAccounts = await db
			.insert(accounts)
			.values(accountsToCreate)
			.returning();

		// Generate transactions
		const transactionsToCreate: (typeof transactions)["$inferInsert"][] = [];

		// Initial wire transfer
		const primaryAccount = createdAccounts[0];
		const initialWireAmount = getRandomInt(100 * 100, 1000 * 100); // Convert to cents
		const startingDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
		transactionsToCreate.push({
			id: crypto.randomUUID(),
			accountId: primaryAccount.id,
			amountCents: initialWireAmount,
			description: "Initial wire transfer",
			createdAt: startingDate,
			type: "wire",
			traceId: crypto.randomUUID(),
		});

		// Create book transfers until we hit now
		const accountBalances: Record<string, number> = {
			[primaryAccount.id]: initialWireAmount,
		};
		let currentDate = new Date(
			startingDate.getTime() + getRandomInt(0, 10 * 60 * 60 * 1000),
		);

		while (currentDate < new Date()) {
			// Filter out accounts with zero balance
			const fromAccounts = createdAccounts.filter(
				(account) => accountBalances[account.id] > 0,
			);
			if (fromAccounts.length === 0) break;

			const fromAccount =
				fromAccounts[getRandomInt(0, fromAccounts.length - 1)];
			const toAccount =
				createdAccounts[getRandomInt(0, createdAccounts.length - 1)];
			if (fromAccount.id === toAccount.id) {
				continue;
			}
			const maxAmount = accountBalances[fromAccount.id];
			const amount = getRandomInt(1 * 100, maxAmount); // 1 cent to maxAmount
			const description = `Transfer from ${fromAccount.name} to ${toAccount.name}`;

			const traceId = crypto.randomUUID();

			// Ensure fromAccount has enough balance
			if (!accountBalances[toAccount.id]) {
				accountBalances[toAccount.id] = 0;
			}

			// Debit transaction
			transactionsToCreate.push({
				id: crypto.randomUUID(),
				accountId: fromAccount.id,
				amountCents: -amount, // Negative amount for debit
				description,
				createdAt: currentDate,
				type: "book",
				traceId,
			});
			accountBalances[fromAccount.id] -= amount;

			// Credit transaction
			transactionsToCreate.push({
				id: crypto.randomUUID(),
				accountId: toAccount.id,
				amountCents: amount, // Positive amount for credit
				description,
				createdAt: currentDate,
				type: "book",
				traceId,
			});
			accountBalances[toAccount.id] += amount;

			// Increment the date by a random 10-14 hours
			currentDate = new Date(
				currentDate.getTime() +
					getRandomInt(10 * 60 * 60 * 1000, 14 * 60 * 60 * 1000),
			);
		}

		// Insert all transactions in bulk
		await db.insert(transactions).values(transactionsToCreate);

		return user;
	},
});

const firstNames = ["Alice", "Bob", "Charlie", "David", "Eva"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones"];

function getRandomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateAccountNumber(): string {
	return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}
