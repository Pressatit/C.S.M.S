import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Camera } from "lucide-react";
import { Asset } from "../../types/asset";
import { TelematicsReading } from "../../types/asset";
import { AssetStatus,AssetTelemetryPayload } from "../../types/asset";
import { AssetType } from "../../types/asset";
import PointsChart from "./PointerGraphs";

 type StatusConfigType={
  dot:string;
  text:string;
  bg:string;
  border:string;
  label:string;
}

const STATUS_CONFIG: Record <string, StatusConfigType> = {
  Active: { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50", border: "border-green-200", label: "Active" },
  Idling: { dot: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", label: "Idling" },
  Off:    { dot: "bg-red-500",   text: "text-red-700",   bg: "bg-red-50",   border: "border-red-200",   label: "Off"    },
};


export function AssetTelematicsCard({data}: {data:AssetTelemetryPayload}) {

  const cfg = STATUS_CONFIG[data.latest.engine_status] || STATUS_CONFIG.off;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{data.asset.name}</h3>
          <span className="text-xs font-mono text-gray-400">{data.asset.plate}</span>
        </div>
        <div className="flex items-center items-end gap-2">
          
          <div className="text-right bg-gray-200/50 px-3 py-1.5 rounded-md border border-gray-200">
            <p className="text-[10px] font-bold text-gray-800 uppercase tracking-wide">Location</p>
            <p className="text-xs text-gray-600 font-medium">{data.asset.location}</p>
          </div>
          <button className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#84c4b4]/20 hover:bg-[#84c4b4]/40 text-teal-800 text-xs font-bold transition-colors">
            Camera view
          </button>
        
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${cfg.bg} ${cfg.border} ${cfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </div>
         </div> 
      </div>

      {/* Charts */}
      {data.history.length > 0 ? (
       <div className="space-y-4 pt-2">
         <PointsChart
           title="Fuel Amount"
           data={data.history.map((item) => ({
             date: item.time,
             total: item.fuel,
             change: 0,
           }))}
         />

        <PointsChart
          title="Distance"
          data={data.history.map((item) => ({
            date: item.time,
            total: item.distance,
            change: 0,
         }))}
        />
  </div>
) : (
  <div className="h-24 flex items-center justify-center bg-white rounded-lg border border-gray-100">
    <p className="text-xs text-gray-400 font-mono">
      Waiting for telemetry...
    </p>
  </div>
)}
    </div>
  );
}