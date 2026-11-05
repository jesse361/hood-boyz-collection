export function toPesewas(amount: string | number) {
  const raw = String(amount).trim()
  const negative = raw.startsWith("-")
  const [whole, fraction = ""] = raw.replace("-", "").split(".")
  const pesewas = Number(whole || "0") * 100 + Number((fraction + "00").slice(0, 2))
  if (!Number.isSafeInteger(pesewas)) throw new Error("Invalid money amount.")
  return negative ? -pesewas : pesewas
}

export function fromPesewas(pesewas: number) {
  const sign = pesewas < 0 ? "-" : ""
  const absolute = Math.abs(pesewas)
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`
}

export function formatMoney(amount: string | number, currency = "GHS") {
  const value = typeof amount === "number" ? amount : Number(amount)
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}

export function discountPercent(price: string, compareAt: string | null) {
  if (!compareAt) return null
  const current = toPesewas(price)
  const compare = toPesewas(compareAt)
  if (compare <= current || compare === 0) return null
  return Math.round(((compare - current) * 100) / compare)
}
