"use client";

import React, {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeftIcon, Loader2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserSelect } from "@/components/UserSelect";

import { AccountSelect } from "@/components/AccountSelect";
import { DateTimePicker } from "@/components/DatetimePicker";
import { MoneyInput } from "@/components/MoneyInput";
import { useAuthState } from "@/contexts/AuthStateContext";
import ScheduledTransfersTabs from "./ScheduledTransfersTabs";

import type { Account } from "@/db/accounts.db";
import type { User } from "@/db/users.db";
import type { transactions } from "@/db/transactions.db";

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

export default function ScheduleTransfersPage() {
  const { impersonatedUserId } = useAuthState();
  const [appState, setAppState] = React.useState<AppState>({
    user: null,
    accounts: [],
    loading: true,
    selectedAccount: null,
    transactions: [],
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [amount, setAmount] = React.useState("");
  const [
    maximumBalanceForSelectedAccount,
    setMaximumBalanceForSelectedAccount,
  ] = React.useState(0);
  const [fromAccount, setFromAccount] = React.useState<Account | undefined>(
    undefined
  );
  const [transferType, setTransferType] = React.useState<"account" | "user">(
    "account"
  );
  const [toAccount, setToAccount] = React.useState<Account | undefined>(
    undefined
  );
  const [toUser, setToUser] = React.useState<User | undefined>(undefined);

  // Current active tab
  const [activeTab, setActiveTab] = React.useState<
    "datetime" | "recurring" | "event"
  >("datetime");

  // Schedule Date and Time
  const [scheduleDate, setScheduleDate] = React.useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    return tomorrow;
  });

  // Recurring Transfer State Variables
  const [recurringInterval, setRecurringInterval] = React.useState<
    number | null
  >(null);
  const [recurringFrequency, setRecurringFrequency] = React.useState<
    "days" | "weeks" | "months" | null
  >(null);

  const router = useRouter();

  const [refreshScheduledTable, setRefreshScheduledTable] = useState(false);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
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
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Failed to fetch user data");
      } finally {
        setAppState((prevState) => ({ ...prevState, loading: false }));
      }
    };

    fetchUserData();
  }, [impersonatedUserId]);

  useEffect(() => {
    if (fromAccount) {
      const maximumBalanceForSelectedAccount = (() => {
        const balance = appState.accounts.find(
          (a) => a.id === fromAccount.id
        )?.balance;
        if (!balance) {
          return 0;
        }
        return Number(balance);
      })();
      setMaximumBalanceForSelectedAccount(maximumBalanceForSelectedAccount);
    }
  }, [fromAccount, appState.accounts]);

  const startDate = new Date(); // Current date
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1); // 1 year from now

  const isTransferButtonDisabled = () => {
    if (activeTab === "datetime") {
      return (
        !amount ||
        !fromAccount ||
        (transferType === "account" ? !toAccount : !toUser) ||
        !scheduleDate
      );
    }

    if (activeTab === "recurring") {
      if (
        !amount ||
        !fromAccount ||
        !recurringInterval ||
        !recurringFrequency ||
        (transferType === "account" ? !toAccount : !toUser)
      ) {
        return true;
      }
      return false;
    }

    if (activeTab === "event") {
      if (
        !amount ||
        !fromAccount ||
        (transferType === "account" ? !toAccount : !toUser)
      ) {
        return true;
      }
      return false;
    }

    return true;
  };

  const handleScheduleTransfer = async () => {
    setIsLoading(true); // Start loading
    setError(null); // Clear any previous errors

    try {
      if (
        !amount ||
        !fromAccount ||
        (transferType === "account" ? !toAccount : !toUser)
      ) {
        throw new Error("Invalid form data");
      }

      const transferData = {
        accountId: fromAccount?.id,
        type: transferType,
        entityId: transferType === "account" ? toAccount?.id : toUser?.id,
        amount: Number(amount),
        transferType: activeTab,
        scheduleDate: scheduleDate,
        recurringInterval: recurringInterval,
        recurringFrequency: recurringFrequency,
      };

      const response = await fetch(`/api/account/${fromAccount?.id}/schedule`, {
        method: "POST",
        body: JSON.stringify(transferData),
      });

      if (!response.ok) {
        throw new Error("Failed to schedule transfer");
      }

      // Reset form variables after successful submission
      setAmount("");
      setFromAccount(undefined);
      setToAccount(undefined);
      setToUser(undefined);
      setTransferType("account");
      setScheduleDate(new Date());
      setRecurringInterval(null);
      setRecurringFrequency(null);

      // Trigger refresh of ScheduledTable
      setRefreshScheduledTable((prev) => !prev);
    } catch (err: unknown) {
      // Changed from 'any' to 'unknown'
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  // Reset the recurring state when the active tab changes
  useEffect(() => {
    if (activeTab === "datetime") {
      setRecurringInterval(null);
      setRecurringFrequency(null);
    }
  }, [activeTab]);

  return (
    <div className="container mx-auto py-10 px-4 relative">
      <div className="absolute top-4 right-4">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar>
              <AvatarImage src={""} alt="User Avatar" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <Link href="/admin">Admin</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center mb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/app")}
          className="mr-2"
        >
          <ArrowLeftIcon className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold ml-4">Schedule Transfers</h1>
      </div>
      <div className="flex gap-4">
        <Card className="w-1/3 px-4 py-6">
          <div>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="mb-4 flex flex-col items-center">
              <MoneyInput
                autoFocus
                value={amount}
                onChange={(value) => setAmount(value)}
                maxAmountCents={maximumBalanceForSelectedAccount}
              />
              <Label className="text-gray-400 mt-4">Amount</Label>
              <p className="text-gray-400 mt-2">
                Balance after{" "}
                {Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(
                  (maximumBalanceForSelectedAccount - Number(amount)) / 100
                )}
              </p>
            </div>
            <div className="mb-4 px-4">
              <Label>From</Label>
              <AccountSelect
                value={fromAccount}
                onChange={(value) => setFromAccount(value)}
                excludeAccountId={toAccount?.id || undefined}
              />
            </div>
            <div className="mb-4 px-4">
              <Label>Destination</Label>
              <div className="flex mt-1 gap-2">
                <Select
                  value={transferType}
                  onValueChange={
                    setTransferType as Dispatch<SetStateAction<string>>
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="account">Account</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
                {transferType === "user" ? (
                  <UserSelect
                    value={toUser}
                    onChange={(value) => setToUser(value)}
                  />
                ) : (
                  <AccountSelect
                    value={toAccount}
                    onChange={(value) => setToAccount(value)}
                    excludeAccountId={fromAccount?.id || undefined} // Exclude the selected "From" account
                  />
                )}
              </div>
            </div>
            <Tabs
              defaultValue="datetime"
              className="w-full py-8"
              onValueChange={(val) =>
                setActiveTab(val as "datetime" | "recurring" | "event")
              }
            >
              <TabsList className="w-full">
                <TabsTrigger value="datetime" className="w-full">
                  Date & Time
                </TabsTrigger>
                <TabsTrigger value="recurring" className="w-full">
                  Recurring
                </TabsTrigger>
                <TabsTrigger value="event" className="w-full">
                  On Deposit
                </TabsTrigger>
              </TabsList>
              <TabsContent value="datetime">
                <Label>Schedule Date & Time</Label>
                <DateTimePicker
                  date={scheduleDate}
                  setDate={setScheduleDate}
                  startDate={startDate}
                  endDate={oneYearFromNow}
                />
              </TabsContent>
              <TabsContent value="recurring" className="w-full">
                <div className="space-y-4">
                  {/* Start Date & Time */}
                  <div>
                    <Label>Start Date & Time</Label>
                    <DateTimePicker
                      date={scheduleDate}
                      setDate={setScheduleDate}
                      startDate={startDate}
                      endDate={oneYearFromNow}
                    />
                  </div>

                  {/* Interval and Frequency */}
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <Label>Interval</Label>
                      <Input
                        type="number"
                        min={1}
                        max={
                          recurringFrequency === "days"
                            ? 355
                            : recurringFrequency === "weeks"
                            ? 52
                            : 12
                        }
                        value={recurringInterval ?? 0}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          if (Number.isNaN(value)) return;
                          const max =
                            recurringFrequency === "days"
                              ? 355
                              : recurringFrequency === "weeks"
                              ? 52
                              : 12;
                          if (value >= 1 && value <= max) {
                            setRecurringInterval(value);
                          }
                        }}
                        className="w-[75px]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label>Frequency</Label>
                      <Select
                        value={recurringFrequency ?? "days"}
                        onValueChange={(value: "days" | "weeks" | "months") => {
                          setRecurringFrequency(value);
                          if (value === "days") {
                            if (recurringInterval && recurringInterval > 355) {
                              setRecurringInterval(355);
                            }
                          } else if (value === "weeks") {
                            if (recurringInterval && recurringInterval > 52) {
                              setRecurringInterval(52);
                            }
                          } else if (value === "months") {
                            if (recurringInterval && recurringInterval > 12) {
                              setRecurringInterval(12);
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Select Frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="days">Days</SelectItem>
                          <SelectItem value="weeks">Weeks</SelectItem>
                          <SelectItem value="months">Months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="event">
                <div className="p-4">
                  <p className="text-gray-600 mt-2">
                    This transfer will occur the next time a deposit is made to{" "}
                    {fromAccount?.name || "the selected account"}.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <div className="flex justify-end">
            <Button
              variant="default"
              onClick={handleScheduleTransfer}
              type="button"
              disabled={isTransferButtonDisabled() || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling Transfer...
                </>
              ) : (
                "Schedule Transfer"
              )}
            </Button>
          </div>
        </Card>
        <Card className="w-2/3 px-4">
          <ScheduledTransfersTabs
            userId={impersonatedUserId}
            refresh={refreshScheduledTable}
          />
        </Card>
      </div>
    </div>
  );
}
