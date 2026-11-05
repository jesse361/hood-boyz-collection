import { PageIntro } from "@/components/editorial"
import { getSettings } from "@/lib/settings"

export const dynamic = "force-dynamic"
export const metadata = { title: "Size guide" }

export default async function SizeGuidePage() {
  const settings = await getSettings()
  return (
    <div>
      <PageIntro title="Size guide" body={settings.sizeGuide.note} />
      <div className="grid gap-10 px-5 py-10 md:px-10">
        {settings.sizeGuide.tables.map((table) => (
          <section key={table.name}>
            <h2 className="display text-2xl">{table.name}</h2>
            <table className="mt-4 w-full max-w-xl text-left text-sm">
              <thead>
                <tr>{table.headers.map((header) => <th key={header} className="border-b border-line py-2">{header}</th>)}</tr>
              </thead>
              <tbody>
                {table.rows.map((row) => (
                  <tr key={row.join("-")}>{row.map((cell) => <td key={cell} className="border-b border-line py-2">{cell}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </div>
  )
}
