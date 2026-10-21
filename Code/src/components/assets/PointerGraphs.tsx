import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface PointsChartDataPoint {
  date: string;
  total:number;
  change: number;
  
}

export interface PointsChartProps {
  title: string;
  data: PointsChartDataPoint[];
}

export default function PointsChart({
  title,
  data,
}: PointsChartProps) {
  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">
        {title}
      </h3>

      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="95%">
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 10,
              left: 0,
              bottom: 5,
            }}
          >
            <XAxis
              dataKey="date"
              tick={{
                fontSize: 10,
                fill: "#9ca3af",
              }}
              tickLine={false}
              axisLine={{
                stroke: "#e5e7eb",
              }}
              interval="preserveStartEnd"
            />

            <YAxis
              tick={{
                fontSize: 10,
                fill: "#9ca3af",
              }}
              tickLine={false}
              axisLine={false}
              width={35}
            />

            <Tooltip
              contentStyle={{
                fontSize: "11px",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
              }}
            />

            <Line
              type="linear"
              dataKey="total"
              stroke="#111827"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
          
        </ResponsiveContainer>
         <p className="text-[10px] text-center mt-1 text-gray-600 font-small">Time of day</p>
       
      </div>
    </div>
  );
}

