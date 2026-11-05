import { NewArrivalsBoard } from "@/components/new-arrivals-board"
import { getNewArrivalsBoard } from "@/lib/catalog"

export const dynamic = "force-dynamic"
export const metadata = { title: "New arrivals" }

export default async function NewPage() {
  const board = await getNewArrivalsBoard()
  return <NewArrivalsBoard products={board.products} groups={board.groups} collections={board.collections} />
}
