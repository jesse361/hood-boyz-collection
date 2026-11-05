"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import { saveProductAction } from "@/server/admin-actions"

type ImageRow = { url: string; alt: string }
type VariantRow = { sku: string; size: string; color: string; colorCode: string | null; stock: number; low: number }

const field = "w-full border border-line bg-white px-3 py-2"

export function ProductEditor({
  product,
  categories,
  collections,
}: {
  product?: {
    id: string
    name: string
    slug: string
    short_description: string
    description: string
    details: string
    materials: string
    care_instructions: string
    fit_notes: string
    base_price: string
    compare_at_price: string | null
    sku: string
    category_id: string
    status: string
    featured: boolean
    is_new: boolean
    is_limited_edition: boolean
    sample_data: boolean
    seo_title: string | null
    seo_description: string | null
    images: ImageRow[]
    variants: VariantRow[]
    collectionIds: string[]
  }
  categories: Array<{ id: string; name: string }>
  collections: Array<{ id: string; name: string }>
}) {
  const [state, formAction] = useActionState(saveProductAction, {})
  const [images, setImages] = useState<ImageRow[]>(product?.images ?? [])
  const [progress, setProgress] = useState("")
  const [error, setError] = useState("")
  const variantText = (product?.variants ?? [])
    .map((variant) => [variant.sku, variant.size, variant.color, variant.colorCode ?? "", variant.stock, variant.low].join("|"))
    .join("\n")

  async function upload(files: FileList | null, alt: string) {
    if (!files?.length) return
    if (!alt.trim()) {
      setError("Alt text is required before upload.")
      return
    }
    setError("")
    const next = [...images]
    for (const file of files) {
      const body = new FormData()
      body.set("file", file)
      body.set("alt", alt)
      const url = await new Promise<string>((resolve, reject) => {
        const request = new XMLHttpRequest()
        request.open("POST", "/api/admin/upload")
        request.upload.onprogress = (event) => {
          if (event.lengthComputable) setProgress(`${file.name} ${Math.round((event.loaded / event.total) * 100)}%`)
        }
        request.onload = () => {
          const parsed = JSON.parse(request.responseText) as { url?: string; error?: string }
          if (request.status >= 400 || !parsed.url) reject(new Error(parsed.error || "Upload failed"))
          else resolve(parsed.url)
        }
        request.onerror = () => reject(new Error("Upload failed"))
        request.send(body)
      })
      next.push({ url, alt })
    }
    setImages(next)
    setProgress("")
  }

  return (
    <form action={formAction} className="grid gap-4">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <input type="hidden" name="images" value={JSON.stringify(images.map((image, index) => ({ ...image, primary: index === 0 })))} />
      <label className="grid gap-1 text-sm">Name<input className={field} name="name" required defaultValue={product?.name} /></label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">Slug<input className={field} name="slug" defaultValue={product?.slug} /></label>
        <label className="grid gap-1 text-sm">SKU<input className={field} name="sku" required defaultValue={product?.sku} /></label>
      </div>
      <label className="grid gap-1 text-sm">Short description<textarea className={field} name="short" rows={2} defaultValue={product?.short_description} /></label>
      <label className="grid gap-1 text-sm">Description<textarea className={field} name="description" rows={4} defaultValue={product?.description} /></label>
      <label className="grid gap-1 text-sm">Details<textarea className={field} name="details" rows={2} defaultValue={product?.details} /></label>
      <label className="grid gap-1 text-sm">Materials<textarea className={field} name="materials" rows={2} defaultValue={product?.materials} /></label>
      <label className="grid gap-1 text-sm">Care<textarea className={field} name="care" rows={2} defaultValue={product?.care_instructions} /></label>
      <label className="grid gap-1 text-sm">Fit<textarea className={field} name="fit" rows={2} defaultValue={product?.fit_notes} /></label>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-1 text-sm">Price GHS<input className={field} name="basePrice" required defaultValue={product?.base_price ?? ""} /></label>
        <label className="grid gap-1 text-sm">Compare at<input className={field} name="compareAt" defaultValue={product?.compare_at_price ?? ""} /></label>
        <label className="grid gap-1 text-sm">Status
          <select className={field} name="status" defaultValue={product?.status ?? "draft"}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>
      <label className="grid gap-1 text-sm">Category
        <select className={field} name="categoryId" defaultValue={product?.category_id} required>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap gap-4 text-sm">
        <label><input type="checkbox" name="featured" defaultChecked={product?.featured} /> Featured</label>
        <label><input type="checkbox" name="isNew" defaultChecked={product?.is_new} /> New</label>
        <label><input type="checkbox" name="limited" defaultChecked={product?.is_limited_edition} /> Limited</label>
        <label><input type="checkbox" name="sampleData" defaultChecked={product?.sample_data ?? true} /> Sample data</label>
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm">Collections</legend>
        {collections.map((collection) => (
          <label key={collection.id} className="text-sm">
            <input type="checkbox" name="collectionId" value={collection.id} defaultChecked={product?.collectionIds.includes(collection.id)} /> {collection.name}
          </label>
        ))}
      </fieldset>
      <label className="grid gap-1 text-sm">Variants, one per line: SKU|size|color|hex|stock|threshold
        <textarea className={field} name="variants" rows={6} defaultValue={variantText} />
      </label>
      <div className="grid gap-2">
        <p className="text-sm">Images</p>
        {images.map((image) => (
          <div key={image.url} className="flex items-center gap-3 text-sm">
            <img src={image.url} alt={image.alt} className="h-16 w-14 object-cover" />
            <span className="flex-1">{image.alt}</span>
            <button type="button" className="underline" onClick={() => setImages(images.filter((item) => item.url !== image.url))}>Remove</button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <input id="alt" className={field} placeholder="Alt text for the next upload" />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const alt = (document.getElementById("alt") as HTMLInputElement | null)?.value ?? ""
              void upload(event.target.files, alt).catch((reason: Error) => setError(reason.message))
            }}
          />
        </div>
        {progress ? <p className="text-sm">{progress}</p> : null}
      </div>
      <label className="grid gap-1 text-sm">SEO title<input className={field} name="seoTitle" defaultValue={product?.seo_title ?? ""} /></label>
      <label className="grid gap-1 text-sm">SEO description<textarea className={field} name="seoDescription" rows={2} defaultValue={product?.seo_description ?? ""} /></label>
      {error || state.error ? <p className="text-sm">{error || state.error}</p> : null}
      <Submit />
    </form>
  )
}

function Submit() {
  const status = useFormStatus()
  return <button disabled={status.pending} className="bg-ink py-3 text-paper">{status.pending ? "Saving" : "Save product"}</button>
}
