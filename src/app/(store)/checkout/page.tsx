import { CheckoutForm } from "@/components/checkout-form"
import { listAddresses } from "@/lib/account"
import { getCurrentUser } from "@/lib/auth"
import { getCart, quoteCheckout, shippingMethods } from "@/lib/commerce"
import { paystackConfigured } from "@/lib/settings"

export const dynamic = "force-dynamic"
export const metadata = { title: "Checkout" }

export default async function CheckoutPage() {
  const [methods, user] = await Promise.all([shippingMethods(), getCurrentUser()])
  const addresses = user ? await listAddresses(user.id) : []
  const address = addresses.find((item) => item.is_default) ?? addresses[0]
  const quote = methods[0] ? await quoteCheckout(methods[0].id) : await getCart()
  return (
    <CheckoutForm
      initial={quote}
      methods={methods}
      paystack={paystackConfigured()}
      prefill={{
        email: user?.email ?? "",
        firstName: address?.first_name || user?.firstName || "",
        lastName: address?.last_name || user?.lastName || "",
        phone: address?.phone || user?.phone || "",
        street: address?.street ?? "",
        city: address?.city ?? "",
        region: address?.region ?? "",
        country: address?.country || "Ghana",
      }}
    />
  )
}
