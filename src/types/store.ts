export type CardVariant = {
  id: string
  size: string
  color: string
  colorCode: string | null
  price: string
  stock: number
  active: boolean
}

export type CardProduct = {
  id: string
  slug: string
  name: string
  category: string
  categorySlug: string
  price: string
  compareAtPrice: string | null
  image: string | null
  imageAlt: string
  hoverImage: string | null
  badge: "New" | "Sale" | "Limited" | null
  sampleData: boolean
  colors: { name: string; code: string | null }[]
  variants: CardVariant[]
  inStock: boolean
}

export type ProductFilters = {
  category?: string
  collection?: string
  size?: string
  color?: string
  min?: number
  max?: number
  availability?: "in" | "out" | ""
  sale?: boolean
  newest?: boolean
  q?: string
  sort?: "featured" | "newest" | "price-asc" | "price-desc" | "best"
  page?: number
}

export type QuoteLine = {
  itemId: string
  variantId: string
  productId: string
  name: string
  sku: string
  size: string
  color: string
  quantity: number
  unitPrice: string
  lineTotal: string
  image: string | null
  sampleData: boolean
}

export type Quote = {
  lines: QuoteLine[]
  subtotal: string
  discount: string
  shipping: string
  tax: string
  total: string
  currency: string
  coupon: string | null
  couponError: string | null
  shippingName: string | null
  shippingEta: string | null
  pricesAreSamples: boolean
  inventoryIsDemonstration: boolean
}
