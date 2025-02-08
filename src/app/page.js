import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen p-4">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">TikToken</h1>
        <Link 
          href="/upload"
          className="bg-green-500 text-white px-4 py-2 rounded-full font-medium"
        >
          Upload
        </Link>
      </header>

      {/* Video Grid */}
      <div className="grid grid-cols-2 gap-4 auto-rows-fr">
        {/* Grid items will be populated dynamically */}
        <div className="aspect-[9/16] bg-gray-800 rounded-lg animate-pulse" />
        <div className="aspect-[9/16] bg-gray-800 rounded-lg animate-pulse" />
        <div className="aspect-[9/16] bg-gray-800 rounded-lg animate-pulse" />
        <div className="aspect-[9/16] bg-gray-800 rounded-lg animate-pulse" />
      </div>
    </div>
  )
} 