import { AccountList } from "@/components/account-list"
import { AccountStatusBoxes } from "@/components/account-status-boxes"

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Accounts</h1>
      <AccountStatusBoxes />
      <AccountList />
    </div>
  )
}
