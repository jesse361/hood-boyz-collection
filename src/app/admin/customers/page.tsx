import { adminCustomers } from "@/lib/admin"
import { formatMoney } from "@/lib/money"

export const metadata = { title: "Customers" }

export default async function CustomersPage() {
  const customers = await adminCustomers()
  return (
    <div>
      <h1 className="display text-4xl">Customers</h1>
      <table className="mt-6 w-full text-left text-sm">
        <thead><tr className="border-b border-line"><th className="py-2">Name</th><th>Email</th><th>Orders</th><th>Paid</th></tr></thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id} className="border-b border-line">
              <td className="py-3">{customer.first_name} {customer.last_name}</td>
              <td>{customer.email}</td>
              <td>{customer.orders}</td>
              <td>{formatMoney(customer.spent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
