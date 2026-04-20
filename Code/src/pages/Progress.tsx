
export function SiteProgress(){
    return(
        <div className="p-6">
            <h1 className="text-xl font-semibold text-gray-800 mb-1">Site Progress</h1>
            <div className="mt-6 space-y-4">
                  <div className="bg-purple-300 rounded-xl p-6 h-48 flex items-end cursor-pointer hover:opacity-90">
                    <span className= "text-sm font-medium text-white " >BIM Implementation</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-sky-300 rounded-xl p-6 h-48 flex items-end cursor-pointer hover:opacity-90">
                        <span className="text-sm font-medium text-white">Site completion prediction</span>
                    </div>
                    <div className="bg-indigo-300 rounded-xl p-6 h-48 flex items-end cursor-pointer hover:opacity-90">
                        <span className="text-sm font-medium text-white">Site pictorial progress</span>
                    </div>
                  </div>
            </div>
        </div>
    )
}