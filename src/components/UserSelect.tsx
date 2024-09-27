import type { User } from "@/db/users.db";
import { SearchableSelect } from "./SearchableSelect";

interface UserSelectProps {
	value: User | undefined;
	onChange: (user: User | undefined) => void;
	className?: string | undefined;
}

export function UserSelect({ value, onChange, className }: UserSelectProps) {
	const fetchUsers = async (searchTerm: string) => {
		const escapedSearchTerm = encodeURIComponent(searchTerm);
		const response = await fetch(`/api/users/search?q=${escapedSearchTerm}`);
		const data = await response.json();
		return data;
	};

	const renderUser = (user: User) => (
		<div>
			<p className="whitespace-nowrap text-ellipsis overflow-hidden">
				{user.fullName}
			</p>
			<p className="text-gray-400 text-sm">{user.email}</p>
		</div>
	);

	const getUserValue = (user: User) => user.id;

	return (
		<SearchableSelect<User>
			className={className}
			value={value}
			onChange={(value) => onChange(value)}
			fetchData={fetchUsers}
			renderOption={renderUser}
			getDisplayLabelForOption={(user) => user.email}
			getOptionKey={getUserValue}
			placeholder="Search users..."
		/>
	);
}
