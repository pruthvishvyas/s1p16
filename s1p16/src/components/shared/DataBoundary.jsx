import { SkeletonCard } from './SkeletonCard.jsx'
import { EmptyState } from './EmptyState.jsx'

// Shows a skeleton while loading, an EmptyState on error/invalid data, otherwise children.
export function DataBoundary({ loading, error, valid, what = 'data', skeleton, children }) {
  if (loading) return skeleton || <SkeletonCard height={160} count={2} />
  if (error || !valid) {
    return (
      <EmptyState
        message={'No ' + what + ' available yet.'}
        action={'Run main.py, then python export_for_frontend.py, then re-generate and deploy.' + (error ? ' (' + error + ')' : '')}
      />
    )
  }
  return children
}
