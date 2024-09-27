import { SearchableSelect } from "@/components/SearchableSelect";
import { useAuthState } from "@/contexts/AuthStateContext";
import type { Account } from "@/db/accounts.db";

interface AccountSelectProps {
	value: Account | undefined;
	onChange: (value: Account | undefined) => void;
	excludeAccountId?: string;
}

export function AccountSelect({
	value,
	onChange,
	excludeAccountId,
}: AccountSelectProps) {
	const { impersonatedUserId } = useAuthState();

	async function fetchAccounts() {
		if (!impersonatedUserId) return [];

		const response = await fetch(`/api/users/${impersonatedUserId}/accounts`);
		if (!response.ok) {
			throw new Error("Failed to fetch accounts");
		}
		const data = await response.json();
		const accountOptions = (data as Account[]).filter(
			(account) => account.id !== excludeAccountId,
		);

		return accountOptions;
	}

	return (
		<SearchableSelect<Account>
			value={value}
			fetchData={fetchAccounts}
			renderOption={(option) => (
				<div>
					<p>{option.name}</p>
				</div>
			)}
			getOptionKey={(option) => option.id}
			getDisplayLabelForOption={(option) => option.name}
			onChange={onChange}
			placeholder="Select an account"
		/>
	);
}
