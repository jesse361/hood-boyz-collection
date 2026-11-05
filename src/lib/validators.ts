import { z } from "zod"

export const emailSchema = z.string().trim().email().max(180)
export const passwordSchema = z.string().min(8).max(200)

export const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: emailSchema,
  password: passwordSchema,
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
  next: z.string().optional(),
})

export const newsletterSchema = z.object({ email: emailSchema })

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: emailSchema,
  subject: z.string().trim().min(1).max(160),
  message: z.string().trim().min(10).max(4000),
})

export const addressSchema = z.object({
  label: z.string().trim().min(1).max(40).default("Home"),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().regex(/^[0-9+\s()-]{8,20}$/, "Enter a valid phone number."),
  country: z.string().trim().min(2).max(80),
  region: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  street: z.string().trim().min(3).max(200),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
})

export const checkoutSchema = addressSchema.extend({
  email: emailSchema,
  deliveryInstructions: z.string().trim().max(500).optional().or(z.literal("")),
  shippingMethodId: z.string().uuid(),
  paymentMethod: z.enum(["paystack", "pay_on_delivery"]),
  couponCode: z.string().trim().max(40).optional().or(z.literal("")),
  idempotencyKey: z.string().uuid(),
})

export const reviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  comment: z.string().trim().min(3).max(2000),
})

export const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().regex(/^[0-9+\s()-]{0,20}$/).optional().or(z.literal("")),
})

export const couponSchema = z.object({
  code: z.string().trim().min(2).max(40).transform((value) => value.toUpperCase()),
  description: z.string().trim().max(240).optional().or(z.literal("")),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.coerce.number().positive(),
  minimumOrderAmount: z.coerce.number().min(0).default(0),
  maximumDiscount: z.string().optional(),
  usageLimit: z.string().optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean().default(true),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>
