import { useState, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Input } from "./ui/input";

interface SearchableSelectProps<T> {
	value: T | undefined;
	onChange: (data: T | undefined) => void;
	fetchData: (searchTerm: string) => Promise<T[]>;
	/**
	 * Renders the option in the dropdown
	 * @param item The option to render
	 * @returns The rendered option
	 */
	renderOption: (item: T) => React.ReactNode;
	/**
	 * Get display label of the option. If not specified, falls back to
	 * getOptionKey
	 * @param item The option to get the display label for
	 * @returns The display label of the option
	 */
	getDisplayLabelForOption?: (item: T) => string;
	/**
	 * Get key of the option
	 */
	getOptionKey: (item: T) => string;
	placeholder?: string;
	className?: string | undefined;
}

export function SearchableSelect<T>({
	value,
	onChange,
	fetchData,
	renderOption,
	getOptionKey,
	getDisplayLabelForOption,
	className,
	placeholder = "Search...",
}: SearchableSelectProps<T>) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [options, setOptions] = useState<T[]>([]);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const search = async () => {
			const data = await fetchData(searchTerm);
			setOptions(data);
		};

		search();
	}, [searchTerm, fetchData]);

	const handleSelect = (item: T) => {
		onChange(item);
		setSearchTerm(
			getDisplayLabelForOption
				? getDisplayLabelForOption(item)
				: getOptionKey(item),
		);
		setIsOpen(false);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(e.target.value);
	};

	return (
		<Popover open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
			<PopoverTrigger asChild>
				<Input
					ref={inputRef}
					type="text"
					value={searchTerm}
					onChange={handleInputChange}
					onFocus={() => {
						if (!isOpen) {
							setIsOpen(true);
						}
					}}
					onClick={(e) => {
						e.preventDefault();
					}}
					placeholder={placeholder}
					className={className}
					tabIndex={0}
				/>
			</PopoverTrigger>
			<PopoverContent
				sideOffset={10}
				onOpenAutoFocus={(e) => e.preventDefault()}
				className="w-[--radix-popover-trigger-width] p-0"
			>
				<div className="max-h-[300px] overflow-y-auto" role="listbox">
					{options.length > 0 ? (
						options.map((option) => (
							<div
								key={getOptionKey(option)}
								className="cursor-pointer px-2 py-1 hover:bg-gray-100"
								onClick={() => handleSelect(option)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										handleSelect(option);
									}
								}}
								tabIndex={-1} // Changed from 0 to -1
								role="option"
								aria-selected={
									value && getOptionKey(option) === getOptionKey(value)
								}
							>
								{renderOption(option)}
							</div>
						))
					) : (
						<div className="p-2 text-center text-gray-500">
							No results found
						</div>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
