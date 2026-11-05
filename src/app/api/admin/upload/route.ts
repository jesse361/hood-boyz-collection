import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCurrentUser } from "@/lib/auth"

export const dynamic = "force-dynamic"

const types: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return Response.json({ error: "Sign in as staff to upload." }, { status: 401 })
  }
  const form = await request.formData()
  const file = form.get("file")
  const alt = String(form.get("alt") ?? "").trim()
  if (!(file instanceof File)) return Response.json({ error: "Choose an image." }, { status: 400 })
  if (!alt) return Response.json({ error: "Alt text is required." }, { status: 400 })
  const extension = types[file.type]
  if (!extension) return Response.json({ error: "Use a JPEG, PNG or WebP image." }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return Response.json({ error: "Images must be 5 MB or smaller." }, { status: 400 })
  const directory = path.join(process.cwd(), "public", "uploads")
  await mkdir(directory, { recursive: true })
  const filename = `${crypto.randomUUID()}.${extension}`
  await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()))
  return Response.json({ url: `/uploads/${filename}`, alt })
}
