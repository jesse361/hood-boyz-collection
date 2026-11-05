import { adminReviews } from "@/lib/admin"
import { reviewModerationAction } from "@/server/admin-actions"

export const metadata = { title: "Reviews" }

export default async function ReviewsPage() {
  const reviews = await adminReviews()
  return (
    <div>
      <h1 className="display text-4xl">Reviews</h1>
      {reviews.length === 0 ? <p className="mt-4 text-mute">No reviews have been submitted.</p> : null}
      <ul className="mt-6 grid gap-4">
        {reviews.map((review) => (
          <li key={review.id} className="border border-line p-4 text-sm">
            <p className="font-medium">{review.product} · {review.rating}/5 {review.is_verified_purchase ? "· verified purchase" : ""}</p>
            <p className="mt-1">{review.comment}</p>
            <p className="text-mute">{review.author} · {review.is_approved ? "approved" : "waiting"}</p>
            <div className="mt-2 flex gap-3">
              <form action={reviewModerationAction}><input type="hidden" name="id" value={review.id} /><input type="hidden" name="decision" value="approve" /><button className="underline">Approve</button></form>
              <form action={reviewModerationAction}><input type="hidden" name="id" value={review.id} /><input type="hidden" name="decision" value="reject" /><button className="underline">Reject</button></form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
