
export type AssetStatus ="Active " | "Idling" |"off"

export type AssetType ="Backhoe" | "Cement Mixer" |"Pickup Truck" | "Bulldozer" | "Excavator"| "Grader" | "Truck"

export interface Asset{
    id:number,
    asset_type: AssetType,
    Plate:string,
    status: AssetStatus,
    location: String 
}

export interface TelematicsData{
    id:number,
    asset_id:number,
    fuel_level:number,
    odometer_reading:number,
    engine_hours:number,
    timestamp_epoch : number,
    engine_status: AssetStatus

}

export function AssetManagement(){
   
    return(
        <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-800 mb-1">Asset Tracking</h1>
      <p className="text-sm text-gray-500">Asset records ,Live telematics, GPS, and Report</p>
      <div className="mt-6 bg-gray-100 rounded-xl h-64 flex items-center justify-center">
        <span className="text-gray-400 text-sm">Asset telematics panel loads here</span>
      </div>
    </div>

    )
}

