"use client"

import { useState } from "react"

export function Gallery({ images }: { images: Array<{ url: string; alt: string }> }) {
  const [index, setIndex] = useState(0)
  const image = images[index] ?? images[0]
  if (!image) return <div className="aspect-[4/5] bg-white" />
  return (
    <div>
      <img src={image.url} alt={image.alt} className="aspect-[4/5] w-full bg-white object-contain" />
      {images.length > 1 ? (
        <div className="mt-3 flex gap-2">
          {images.map((item, itemIndex) => (
            <button key={item.url} type="button" onClick={() => setIndex(itemIndex)} className={itemIndex === index ? "border border-ink" : "border border-transparent"}>
              <img src={item.url} alt="" className="h-20 w-16 object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
