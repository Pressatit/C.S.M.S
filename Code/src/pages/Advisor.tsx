export function ProjectAdvisor(){
    return(
        <div className="flex flex-col h-full" >
         <div className="flex-1 ovrerflow-y-auto p-6"> 
            <h1 className="text-xl font-semibold text-gray-800 mb-1">Project Advisor</h1>
            <p className="text-sm text-gray-500 mb-6">AI-powered site advisor </p>
            <div className="flex items-center justify-center h-64 text-gray-300 text-sm">
                   Ask me anything about the site
            </div>
         </div>

         <div className ="border-t border-gray-200 bg-white px-6 py-4 space-y-3 rounded-full">
                <div className="flex gap-2 flex-wrap">
                    {["Attendance","Worker Locations","Total fuel consumption,Vehicle locations"].map(chip=> ( 
                        <button key={chip}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-full transition-colors duration-150 border border-gray-200">
                        {chip}
                        </button>
                    ))}
                </div>
                <div className= "flex gap-2 items-center">
                    <input type="text" placeholder="How is the site performing?"
                       className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-sm
                       text-gray-700 outline-none focus:border-gray-400 focus:bg-white transition-colors" />
                    <button className="w-11 h-11 bg-gray-800 hover:bg-gray-700 rounded-full
                           flex items-center justify-center text-white transition-colors flex-shrink-0"> ▶ </button>
                      
                </div>
            </div>
        </div>
    )
}