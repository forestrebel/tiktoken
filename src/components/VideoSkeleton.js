export default function VideoSkeleton() {
  return (
    <div className="aspect-[9/16] relative rounded-lg overflow-hidden bg-gray-100 animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-100 to-gray-200" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  )
} 