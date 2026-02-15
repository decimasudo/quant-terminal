"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts"

export function MarketTable({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="text-zinc-500 font-mono text-xs p-4">Loading market data...</div>;
  }

  return (
    <div className="w-full h-full overflow-auto pr-4">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800 hover:bg-transparent">
            <TableHead className="text-zinc-500 font-mono text-xs">TICKER</TableHead>
            <TableHead className="text-zinc-500 font-mono text-xs">NAME</TableHead>
            <TableHead className="text-zinc-500 font-mono text-xs text-right">PRICE</TableHead>
            <TableHead className="text-zinc-500 font-mono text-xs text-right">CHG %</TableHead>
            <TableHead className="text-zinc-500 font-mono text-xs text-right w-[120px]">TREND</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.ticker} className="border-zinc-800 hover:bg-zinc-900/50">
              <TableCell className="font-mono font-bold text-blue-400">{item.ticker}</TableCell>
              <TableCell className="font-mono text-zinc-400">{item.name}</TableCell>
              <TableCell className="font-mono text-right text-zinc-200">{item.price.toFixed(2)}</TableCell>
              <TableCell className={`font-mono text-right ${item.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {item.change}
              </TableCell>
              <TableCell className="text-right h-[45px]">
                <div className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={item.sparkline.map((val: number, i: number) => ({ index: i, value: val }))}>
                      <YAxis domain={['dataMin', 'dataMax']} hide />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={item.isPositive ? "#22c55e" : "#ef4444"} 
                        strokeWidth={2} 
                        dot={false} 
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
