export type AssetStatus ="Active" | "Idling" | "Off"


export interface Asset{
    id:number,
    name:string,
    asset_type: string,
    plate:string,
    status: AssetStatus,
    device_imei:string,
    location: string 
}

export interface TelematicsReading {
  id: number;
  asset_id: number;
  fuel_level: number;
  odometer_reading: number;
  engine_hours: number;
  timestamp_epoch: number;
  engine_status: AssetStatus;
  longitude: number;
  Latitude: number;
  fuel_consumption_rate: number;
}

export interface AssetTelemetryPayload {
  asset: Asset;
  latest: {
    engine_status: "Active" | "Idling" | "Off";
    fuel_level: number;
    burn_rate: number;
    distance: number;
    engine_hours: number;
  };
  history: {
    time: string;
    fuel: number;
    distance: number; // Pre-calculated by FastAPI (Current Odo - Baseline)
  }[];
}

export type StatusConfigType={
    dot:string;
    text:string;
    bg:string;
    border:string;
    label:string
}