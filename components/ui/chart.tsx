"use client"

import type * as React from "react"
import { createContext, useContext } from "react"

type ChartConfig = Record<string, { label: string; color: string }>

const ChartContext = createContext<{ config: ChartConfig } | null>(null)

interface ChartContainerProps {
  config: ChartConfig
  children: React.ReactNode
}

export function ChartContainer({ config, children }: ChartContainerProps) {
  return (
    <ChartContext.Provider value={{ config }}>
      <style jsx global>{`
        :root {
          --chart-1: 100 78% 44%;
          --chart-2: 210 40% 96.1%;
          --color-progress: #75008d;
          --color-target: #d4d4d8;
        }
      `}</style>
      {children}
    </ChartContext.Provider>
  )
}

export function ChartTooltipContent({ active, payload, label }: any) {
  const context = useContext(ChartContext)

  if (!active || !payload || !context) {
    return null
  }

  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {context.config[entry.dataKey]?.label}
            </span>
            <span className="font-bold">{entry.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChartTooltip(props: any) {
  return <ChartTooltipContent {...props} />
}
