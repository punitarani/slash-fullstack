import type {transferRequestBodySchema} from "@/app/api/account/[accountId]/transfer/route";
import {type Dispatch, type SetStateAction, useState} from "react";
import type {Account} from "@/db/accounts.db";
import type {User} from "@/db/users.db";
import {Drawer, DrawerContent, DrawerFooter, DrawerHeader} from "@/components/ui/drawer";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {MoneyInput} from "@/components/MoneyInput";
import {Label} from "@/components/ui/label";
import {UserSelect} from "@/components/UserSelect";
import {AccountSelect} from "@/components/AccountSelect";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Button} from "@/components/ui/button";
import {Loader2} from "lucide-react";

function TransferDrawer({
                          isOpen,
                          onClose,
                          selectedAccount,
                          maximumBalanceForSelectedAccount,
                          onTransfer,
                        }: {
  isOpen: boolean;
  onClose: () => void;
  selectedAccount: string | null;
  maximumBalanceForSelectedAccount: number;
  onTransfer: (
    req: (typeof transferRequestBodySchema)["_type"],
  ) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [toAccount, setToAccount] = useState<Account | undefined>(undefined);
  const [toUser, setToUser] = useState<User | undefined>(undefined);
  const [transferType, setTransferType] = useState<"account" | "user">(
    "account",
  );
  const [isLoading, setIsLoading] = useState(false); // Add this line
  const [error, setError] = useState<string | null>(null); // Add this line for error state

  const isTransferButtonDisabled = () => {
    return !amount || (transferType === "account" ? !toAccount : !toUser);
  };

  function handleClose() {
    setAmount("");
    setToAccount(undefined);
    setToUser(undefined);
    setTransferType("account");
    onClose();
  }

  const handleTransfer = async () => {
    if (!selectedAccount) return;
    setIsLoading(true);
    setError(null); // Clear any previous errors
    try {
      const entityId = transferType === "account" ? toAccount?.id : toUser?.id;
      if (!entityId) {
        throw new Error("Please select a destination account or user.");
      }

      console.log(
        await onTransfer({
          type: transferType,
          entityId,
          amount: Number(amount), // Convert to cents
        }),
      );
      handleClose();
    } catch (err) {
      setError(
        err &&
        typeof err === "object" &&
        "error" in err &&
        typeof err.error === "string"
          ? err.error
          : "An unknown error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Drawer open={isOpen} onClose={handleClose}>
      <DrawerContent className="max-w-md mx-auto my-auto">
        <DrawerHeader>
          <h2 className="text-2xl font-bold mb-4">Move Money</h2>
        </DrawerHeader>
        <div className="mx-4 mb-8">
          {error && (
            <Alert variant="destructive" className="">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <div className="mb-4 px-4 flex flex-col items-center">
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
              (maximumBalanceForSelectedAccount - Number(amount)) / 100,
            )}
          </p>
        </div>
        <div className="mb-4 px-4">
          <Label>Destination</Label>
          <div className="flex mt-1 gap-2">
            {transferType === "user" ? (
              <UserSelect
                value={toUser}
                onChange={(value) => setToUser(value)}
              />
            ) : (
              <AccountSelect
                value={toAccount}
                onChange={(value) => setToAccount(value)}
                excludeAccountId={selectedAccount || undefined}
              />
            )}
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
          </div>
        </div>
        <DrawerFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            type="button"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleTransfer}
            type="button"
            disabled={isTransferButtonDisabled() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transferring...
              </>
            ) : (
              "Transfer"
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export default TransferDrawer;
