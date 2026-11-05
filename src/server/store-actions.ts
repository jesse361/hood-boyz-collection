"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { cookies, headers } from "next/headers"
import {
  destinationFor,
  getCurrentUser,
  loginUser,
  logoutUser,
  rateLimit,
  registerUser,
  requestPasswordReset,
  requireUser,
  resetPassword,
  updateProfile,
  verifyEmail,
} from "@/lib/auth"
import {
  addToCart,
  getOrderForViewer,
  mergeGuestBag,
  placeOrder,
  quoteCheckout,
  rememberOrderAccess,
  removeCartItem,
  setCoupon,
  toggleWishlist,
  updateCartQuantity,
  updateCartVariant,
} from "@/lib/commerce"
import { getSql, withTx } from "@/lib/db"
import { publicError } from "@/lib/errors"
import { initializePaystack } from "@/lib/payments/paystack"
import {
  addressSchema,
  checkoutSchema,
  contactSchema,
  loginSchema,
  newsletterSchema,
  profileSchema,
  registerSchema,
  reviewSchema,
} from "@/lib/validators"
import { safeNext } from "@/lib/utils"

function refresh() {
  revalidatePath("/", "layout")
}

export async function registerAction(_prev: { error?: string; devLink?: string | null }, formData: FormData): Promise<{ error?: string; devLink?: string | null }> {
  try {
    const parsed = registerSchema.parse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      password: formData.get("password"),
    })
    await rateLimit(`register:${parsed.email}`, 5, 900)
    const result = await registerUser(parsed)
    await mergeGuestBag(result.userId)
    refresh()
    redirect("/account")
  } catch (error) {
    if (isRedirect(error)) throw error
    return { error: publicError(error) }
  }
}

export async function loginAction(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  try {
    const parsed = loginSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
      next: String(formData.get("next") ?? ""),
    })
    const ip = (await headers()).get("x-forwarded-for") ?? "local"
    await rateLimit(`login:${ip}:${parsed.email}`, 8, 900)
    const userId = await loginUser(parsed.email, parsed.password)
    await mergeGuestBag(userId)
    const user = await getCurrentUser()
    refresh()
    redirect(user ? destinationFor(user, parsed.next) : "/account")
  } catch (error) {
    if (isRedirect(error)) throw error
    return { error: publicError(error) }
  }
}

export async function logoutAction() {
  await logoutUser()
  refresh()
  redirect("/")
}

export async function forgotAction(_prev: { message?: string; devLink?: string | null }, formData: FormData): Promise<{ message?: string; devLink?: string | null }> {
  try {
    const email = String(formData.get("email") ?? "")
    await rateLimit(`reset:${email}`, 5, 900)
    const result = await requestPasswordReset(email)
    return {
      message: "If an account exists for that email, reset instructions are ready.",
      devLink: result.devLink,
    }
  } catch (error) {
    return { message: publicError(error) }
  }
}

export async function resetAction(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  try {
    const password = String(formData.get("password") ?? "")
    const token = String(formData.get("token") ?? "")
    if (password.length < 8) return { error: "Use at least 8 characters." }
    await resetPassword(token, password)
    redirect("/account/login")
  } catch (error) {
    if (isRedirect(error)) throw error
    return { error: publicError(error) }
  }
}

export async function verifyAction(token: string) {
  await verifyEmail(token)
  refresh()
}

export async function profileAction(_prev: { error?: string; saved?: boolean }, formData: FormData): Promise<{ error?: string; saved?: boolean }> {
  try {
    const user = await requireUser()
    const parsed = profileSchema.parse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      phone: formData.get("phone") ?? "",
    })
    await updateProfile(user.id, { ...parsed, phone: parsed.phone ?? "" })
    refresh()
    return { saved: true }
  } catch (error) {
    return { error: publicError(error) }
  }
}

export async function addressAction(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  try {
    const user = await requireUser()
    const parsed = addressSchema.parse({
      label: formData.get("label") || "Home",
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      phone: formData.get("phone"),
      country: formData.get("country"),
      region: formData.get("region"),
      city: formData.get("city"),
      street: formData.get("street"),
      postalCode: formData.get("postalCode") ?? "",
    })
    await getSql()`
      insert into addresses (user_id, label, first_name, last_name, phone, country, region, city, street, postal_code, is_default)
      values (
        ${user.id}, ${parsed.label}, ${parsed.firstName}, ${parsed.lastName}, ${parsed.phone},
        ${parsed.country}, ${parsed.region}, ${parsed.city}, ${parsed.street}, ${parsed.postalCode || null}, true
      )
    `
    refresh()
    return {}
  } catch (error) {
    return { error: publicError(error) }
  }
}

export async function deleteAddressAction(formData: FormData) {
  const user = await requireUser()
  await getSql()`delete from addresses where id = ${String(formData.get("id"))} and user_id = ${user.id}`
  refresh()
}

export async function newsletterAction(_prev: { error?: string; success?: boolean }, formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    const parsed = newsletterSchema.parse({ email: formData.get("email") })
    await rateLimit(`newsletter:${parsed.email}`, 5, 3600)
    const existing = await getSql()<Array<{ status: string }>>`
      select status from newsletter_subscribers where lower(email) = ${parsed.email.toLowerCase()}
    `
    if (existing[0]?.status === "subscribed") return { error: "That email is already on the list." }
    await getSql()`
      insert into newsletter_subscribers (email, status)
      values (${parsed.email.toLowerCase()}, 'subscribed')
      on conflict (email) do update set status = 'subscribed', unsubscribed_at = null, subscribed_at = now()
    `
    return { success: true }
  } catch (error) {
    return { error: publicError(error) }
  }
}

export async function contactAction(_prev: { error?: string; success?: boolean }, formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    const parsed = contactSchema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
      subject: formData.get("subject"),
      message: formData.get("message"),
    })
    await rateLimit(`contact:${parsed.email}`, 5, 3600)
    await getSql()`
      insert into contact_messages (name, email, subject, message)
      values (${parsed.name}, ${parsed.email}, ${parsed.subject}, ${parsed.message})
    `
    return { success: true }
  } catch (error) {
    return { error: publicError(error) }
  }
}

export async function addToCartAction(variantId: string, quantity = 1) {
  try {
    await addToCart(variantId, quantity)
    refresh()
    return { ok: true as const }
  } catch (error) {
    return { error: publicError(error) }
  }
}

export async function updateQuantityAction(itemId: string, quantity: number) {
  await updateCartQuantity(itemId, quantity)
  refresh()
}

export async function updateVariantAction(itemId: string, variantId: string) {
  await updateCartVariant(itemId, variantId)
  refresh()
}

export async function removeItemAction(itemId: string) {
  await removeCartItem(itemId)
  refresh()
}

export async function couponAction(code: string) {
  await setCoupon(code)
  refresh()
}

export async function wishlistAction(productId: string) {
  const saved = await toggleWishlist(productId)
  refresh()
  return saved
}

export async function quoteAction(shippingMethodId: string, couponCode?: string) {
  try {
    return { quote: await quoteCheckout(shippingMethodId, couponCode) }
  } catch (error) {
    return { error: publicError(error) }
  }
}

export async function checkoutAction(input: unknown) {
  try {
    const parsed = checkoutSchema.parse(input)
    await rateLimit(`checkout:${parsed.email}`, 8, 900)
    const order = await placeOrder(parsed)
    if (order.accessToken) await rememberOrderAccess(order.orderNumber, order.accessToken)
    if (order.paymentMethod === "paystack" && order.paymentStatus !== "paid" && order.email && order.total && order.currency) {
      const payment = await initializePaystack(order.orderNumber, order.email, order.total, order.currency)
      return { orderNumber: order.orderNumber, authorizationUrl: payment.authorizationUrl }
    }
    refresh()
    return { orderNumber: order.orderNumber }
  } catch (error) {
    return { error: publicError(error) }
  }
}

export async function reviewAction(_prev: { error?: string; success?: boolean }, formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    const user = await requireUser()
    const parsed = reviewSchema.parse({
      productId: formData.get("productId"),
      rating: formData.get("rating"),
      title: formData.get("title") ?? "",
      comment: formData.get("comment"),
    })
    const paid = await getSql()<Array<{ id: string }>>`
      select o.id from orders o
      join order_items oi on oi.order_id = o.id
      where o.user_id = ${user.id} and oi.product_id = ${parsed.productId} and o.payment_status = 'paid'
      limit 1
    `
    await withTx(async (tx) => {
      await tx`
        insert into reviews (product_id, user_id, rating, title, comment, is_verified_purchase, is_approved)
        values (${parsed.productId}, ${user.id}, ${parsed.rating}, ${parsed.title ?? ""}, ${parsed.comment}, ${Boolean(paid[0])}, false)
        on conflict (product_id, user_id) do update
        set rating = excluded.rating, title = excluded.title, comment = excluded.comment, is_approved = false
      `
    })
    refresh()
    return { success: true }
  } catch (error) {
    return { error: publicError(error) }
  }
}

export async function trackOrderAction(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const orderNumber = String(formData.get("orderNumber") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const order = await getOrderForViewer(orderNumber, email)
  if (!order) return { error: "No order matched that number and email." }
  const jar = await cookies()
  jar.set("hb_track_email", email, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 30 })
  redirect(`/order-confirmation/${orderNumber}`)
}

function isRedirect(error: unknown) {
  return Boolean(error && typeof error === "object" && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT"))
}

export async function safeNextFrom(formData: FormData) {
  return safeNext(String(formData.get("next") ?? ""))
}

export async function deleteAccountAction() {
  const user = await requireUser()
  await logoutUser()
  await getSql()`delete from profiles where id = ${user.id}`
  refresh()
  redirect("/")
}
