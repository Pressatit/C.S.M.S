import { useState, useEffect } from "react";
import { Truck, FileText, X, ChevronRight,Activity,LucideGitGraph } from "lucide-react";
import { AssetTelematicsCard } from "../components/assets/AssetTelemetryCard";
import { apiRequest } from "../utils/api";
import { Asset ,AssetTelemetryPayload} from "../types/asset";
import type { StatusConfigType } from "../types/asset";
import { Employee } from "./Employee";

// ── Status badge for the summary table ────────────────────────────────────────
const STATUS_DOT: Record<string, string> = {
  Active: "bg-green-500",
  Idling: "bg-amber-400", 
  Off:    "bg-red-500",
};

export interface AssetCreationForm{
        name: "",
        asset_type: "",
        number_plate: "",
        device_imei: "",     
}

const STATUS_CONFIG :Record<string,StatusConfigType> = {
  Active: { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50", border: "border-green-200", label: "Active" },
  Idling: { dot: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", label: "Idling" },
  Off:    { dot: "bg-red-500",   text: "text-red-700",   bg: "bg-red-50",   border: "border-red-200",   label: "Off"    },
};
// ── Asset table modal ─────────────────────────────────────────────────────────
function AssetDirectoryModal({ payloads, onClose }: { payloads: AssetTelemetryPayload[], onClose: () => void }) {

    const [isModalOpen,setIsModalOpen]=useState(false)
    const [formData, setFormData] = useState({
        asset_name: "",
        asset_type: "",
        number_plate: "",
        device_imei: "",
      });

      async function handleAddAsset(e:React.FormEvent){
        e.preventDefault();
        
        try{
        const res= await apiRequest<AssetCreationForm>("/assets",{
          method:"POST",
          body:JSON.stringify(formData)
        })

        console.log(`Asset ${res.name} created successfully`)
        setFormData({
        asset_name: "",
        asset_type: "",
        number_plate: "",
        device_imei: "",
      });
         
      }
      catch(err){
        console.log("Failed to create asset",err)

      }


      }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Asset Directory</h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-gray-800 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              + Add New Asset
            </button>
          </div>

         <div className="overflow-y-auto flex-1 p-2">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-gray-100">
                <th className="p-4 text-sm font-semibold text-gray-700 bg-gray-50/50">Asset ID</th>
                <th className="p-4 text-sm font-semibold text-gray-700 bg-gray-50/50">Name</th>
                <th className="p-4 text-sm font-semibold text-gray-700 bg-gray-50/50">Type</th>
                <th className="p-4 text-sm font-semibold text-gray-700 bg-gray-50/50">Location</th>
                <th className="p-4 text-sm font-semibold text-gray-700 bg-gray-50/50">Plate Number</th>
                <th className="p-4 text-sm font-semibold text-gray-700 bg-gray-50/50">Status</th>
              </tr>
            </thead>
            <tbody>
              {payloads.map((p, idx) => {
                const cfg = STATUS_CONFIG[p.latest.engine_status] || STATUS_CONFIG.off;
                return (
                  <tr key={p.asset.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                    <td className="p-4 text-sm text-gray-900 font-medium">AST-00{idx + 1}</td>
                    <td className="p-4 text-sm text-gray-600">{p.asset.name}</td>
                    <td className="p-4">
                      <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-full font-medium">
                        {p.asset.asset_type}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{p.asset.location}</td>
                    <td className="p-4 text-sm font-mono text-gray-600">{p.asset.plate}</td>
                    <td className="p-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                        <span className="text-gray-700 capitalize">{cfg.label}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
         {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Register New Site Asset</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddAsset} className="space-y-3">
        
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Asset Name</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm mt-1 focus:outline-gray-800"
                    value={formData.asset_name}
                    onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                  />
                </div>
            
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Asset Type</label>
                <input
                  type="text"
                  required
                  placeholder="Pickup, Wheel Loader, Cement mixer"
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm mt-1 focus:outline-gray-800"
                  value={formData.asset_type}
                  onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                
                <div>
                  <label className="text-xs font-semibold text-gray-600">Telematic device imei</label>
                  <input
                    type="text"
                    required
                    placeholder="HSK790HSK"
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm mt-1 focus:outline-gray-800"
                    value={formData.device_imei || ""}
                    onChange={(e) => setFormData({ ...formData, device_imei:String (e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Number Plate</label>
                <input
                  type="tel"
                  required
                  placeholder="KHM ..."
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm mt-1 focus:outline-gray-800"
                  value={formData.number_plate}
                  onChange={(e) => setFormData({ ...formData, number_plate: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium bg-gray-800 hover:bg-blue-700 text-white rounded-lg"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AssetManagement() {
  const [loading, setLoading] = useState(true);
  const [payloads, setPayloads] = useState<AssetTelemetryPayload[]>([]);
  const [showAllCards, setShowAllCards] = useState(false);
  const [showAssetTable, setShowAssetTable] = useState(false);
  const [modules,setSelectModules] =useState(false)
  const [error,setError] =useState("")
  

  

  // API Fetching matching the Backend Contract
  useEffect(() => {
    async function load (){
     try{
      const payloads = await apiRequest<AssetTelemetryPayload[]>("/telematics");

      setPayloads(payloads);

     }
     catch(err:any){
        setError(err.message ?? "Failed to load assets");
     }
     finally{
         setLoading(false);
     }    
    }
    void load()

  }, []);

  // Determine which cards to show on the right
  const activeAssets = payloads.filter(p => p.latest.engine_status !== "Off");
  // If showing all, map everything. Otherwise, show 2 active ones (or just the first 2 if none active)
  const previewPayloads = activeAssets.length >= 2 ? activeAssets.slice(0, 2) : payloads.slice(0, 2);
  const displayedPayloads = showAllCards ? payloads : previewPayloads;

  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-[#f4f4f4]">
      {/* Non-blocking Header */}
      <div className="flex items-center justify-center gap-2 mb-2">
        
        <h1 className="text-xl font-bold text-gray-900 text-end">Asset Tracking</h1>
      </div>
{!modules && (  
      <div className="flex gap-6 flex-1 min-h-0">
        
        {/* LEFT COLUMN: Site Machinery Table */}
  
<div className="w-80 flex-shrink-0 flex  flex-col gap-4">
  
  {/* The clickable card */}
  <div 
    onClick={() => setSelectModules(true)}
    
    className="bg-gray-200 rounded-2xl p-5 shadow-sm flex-1 flex flex-col cursor-pointer hover:bg-gray-800 hover:shadow-md transition-all duration-200 group relative"
  >
    
    {/* Widget Header */}
    <div className="flex justify-between bg-gray-800items-center border-b border-gray-400 pb-3 mb-4">
      <h2 className="font-semibold text-gray-800 group-hover:text-gray-200 text-lg">Site Machinery</h2>
      <ChevronRight size={18} className="text-gray-400 group-hover:text-gray-200 transition-colors group-hover:translate-x-1 duration-200" />
    </div>
    
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
    <div className="space-y-4 flex-1">
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded w-full"></div>
          <div className="h-8 bg-gray-300 rounded w-full"></div>
        </div>
      ) : (
        payloads.slice(0, 8).map((p) => {
          const cfg = STATUS_CONFIG[p.latest.engine_status] || STATUS_CONFIG.off;
          return (
            <div key={p.asset.id} className="flex justify-between items-center group/item">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-800">{p.asset.name}</span>
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{p.asset.plate}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-gray-200/50 px-2 py-1 rounded-md">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span className="text-[10px] font-semibold text-gray-600">{cfg.label}</span>
              </div>
            </div>
          );
        })
              )}
            </div>
            </div>

            {/* Footer hint */}
            <div className="pt-4 mt-auto text-center border-t border-gray-300/50">
              <span className="text-xs font-semibold text-gray-500 group-hover:text-blue-600 transition-colors">
                View all {payloads.length} assets →
              </span>
            </div>
          </div>

          <button className="bg-[#d9d9d9] hover:bg-[#c9c9c9] text-gray-800 font-semibold py-4 rounded-2xl shadow-sm transition-colors w-1/2 self-center">
            Report
          </button>
        </div>

        {/* RIGHT COLUMN: Telematics Cards */}
        <div className="flex-1 bg-gray-200 rounded-2xl hover:bg-gray-800 p-6 flex flex-col min-h-0 group">
          <h2 className="font-semibold text-center text-gray-800 group-hover:text-gray-200 text-lg">Live Machine Telematics</h2>

          <div className="flex-1 overflow-y-auto pr-2 space-y-6">
            {loading ? (
              // SKELETON LOADING FOR CARDS
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-xl p-4 h-64 animate-pulse border border-gray-200">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-8"></div>
                  <div className="h-20 bg-gray-200 rounded w-full mb-4"></div>
                  <div className="h-20 bg-gray-200 rounded w-full"></div>
                </div>
              ))
            ) : (
              // ACTUAL CARDS
              <>
                {displayedPayloads.map(payload => (
                  <AssetTelematicsCard key={payload.asset.id} data={payload} />
                ))}
                
                {/* View All Toggle Button */}
                {payloads.length > 2 && (
                  <button 
                    onClick={() => setShowAllCards(!showAllCards)}
                    className="w-full py-3 mt-4 border-2 border-dashed border-gray-400 rounded-xl text-gray-600 font-semibold hover:bg-gray-300 hover:border-gray-500 transition-all flex items-center justify-center gap-2"
                  >
                    <Activity size={16} />
                    {showAllCards ? "Collapse Preview" : `View All ${payloads.length} Machines`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

      </div>
      )}
      {modules && (
          <button
            onClick={() => setSelectModules(false)}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition"
          >
            ← Back to Modules
          </button>
        )}

      {modules && (
    <AssetDirectoryModal 
    payloads={payloads} 
    onClose={() => setShowAssetTable(false)} 
    />
    )}
    </div>
  );
}