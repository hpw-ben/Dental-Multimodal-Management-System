import React from "react"
import { cn } from "@/lib/utils"

const U = 10
const p = (points: number[][]) => points.map(([x, y]) => `${x * U},${y * U}`).join(' ')

export type ToothType = "deciduous" | "upper" | "lower"
export type Surface = "center" | "top" | "bottom" | "left" | "right" | "root"

export interface TreatmentData {
  color?: string // hex
  symbol?: string // char
}

export type ToothState = Record<string, TreatmentData> // key is surface

interface ToothProps {
  id: number
  type: ToothType
  data: ToothState
  selectedSurfaces: string[] // List of selected surface keys e.g. "top", "root"
  onSurfaceMouseDown: (surface: Surface) => void 
  onSurfaceMouseEnter: (surface: Surface) => void
  size?: number
  // Simple mapping function for tooltips
  getMeaning?: (type: 'color' | 'symbol', value: string) => string
  getColor?: (value: string) => string
}

// Geometry Definitions
// We split the "Root" from the main trapezoid for Permanent teeth to allow 6-surface interaction.
const SHAPES = {
  deciduous: {
    viewBox: `0 0 ${3*U} ${3*U}`,
    paths: {
      center: p([[1,1], [2,1], [2,2], [1,2]]),
      top:    p([[0,0], [3,0], [2,1], [1,1]]),
      right:  p([[3,0], [3,3], [2,2], [2,1]]),
      bottom: p([[3,3], [0,3], [1,2], [2,2]]),
      left:   p([[0,3], [0,0], [1,1], [1,2]]),
      full:   p([[0,0], [3,0], [3,3], [0,3]]) // For merged view
    }
  },
  upper: {
    viewBox: `0 ${-1*U} ${3*U} ${4*U}`,
    paths: {
      center: p([[1,1], [2,1], [2,2], [1,2]]),
      // Split Top into Top (Trapezoid) and Root (Triangle)
      top:    p([[0,0], [3,0], [2,1], [1,1]]), 
      root:   p([[0,0], [1.5,-1], [3,0]]), // Triangle pointing up
      right:  p([[3,0], [3,3], [2,2], [2,1]]),
      bottom: p([[3,3], [0,3], [1,2], [2,2]]),
      left:   p([[0,3], [0,0], [1,1], [1,2]]),
      full:   p([[0,0], [3,0], [3,3], [0,3]]) // Crown only
    }
  },
  lower: {
    viewBox: `0 0 ${3*U} ${4*U}`,
    paths: {
      center: p([[1,1], [2,1], [2,2], [1,2]]),
      top:    p([[0,0], [3,0], [2,1], [1,1]]),
      right:  p([[3,0], [3,3], [2,2], [2,1]]),
      // Split Bottom into Bottom (Trapezoid) and Root (Triangle)
      bottom: p([[3,3], [0,3], [1,2], [2,2]]),
      root:   p([[3,3], [1.5,4], [0,3]]), // Triangle pointing down
      left:   p([[0,3], [0,0], [1,1], [1,2]]),
      full:   p([[0,0], [3,0], [3,3], [0,3]]) // Crown only
    }
  }
}

export function Tooth({ type, data, selectedSurfaces, onSurfaceMouseDown, onSurfaceMouseEnter, getMeaning, getColor }: ToothProps) {
  const shape = SHAPES[type]
  
  // Surfaces logic
  const crownSurfaces: Surface[] = ['center', 'top', 'right', 'bottom', 'left']
  const surfaces: Surface[] = [...crownSurfaces]
  const hasRoot = type === 'upper' || type === 'lower'
  if (hasRoot) {
    surfaces.push('root')
  }

  // Merging Logic
  const firstSymbol = data.center?.symbol
  
  // 1. Check if Crown is merged (all 5 crown surfaces same symbol)
  const isCrownMerged = !!firstSymbol && crownSurfaces.every(s => data[s]?.symbol === firstSymbol)
  
  // 2. Check if Root is also matching (for Full Merge)
  // If no root (deciduous), it matches by default. If root exists, must match center.
  const isRootMatching = !hasRoot || (data.root?.symbol === firstSymbol)
  
  // 3. Fully Merged = Crown Merged + Root Matches (if exists)
  // Used to decide if we hide the root symbol
  const isFullyMerged = isCrownMerged && isRootMatching

  const getFill = (surface: Surface) => {
    const val = data[surface]?.color
    if (!val) return "white"
    return getColor ? getColor(val) : val
  }

  const getSymbol = (surface: Surface) => {
    return data[surface]?.symbol
  }

  const isSelected = (surface: Surface) => selectedSurfaces.includes(surface)

  const aspectRatio = type === 'deciduous' ? '1 / 1' : '3 / 4'

  return (
    <div 
      className="flex flex-col items-center justify-center relative mx-px shrink-0 select-none group w-full"
    >
      {/* Container sizing */}
      <div className="w-full" style={{ aspectRatio }}>
        <svg 
          viewBox={shape.viewBox} 
          style={{ width: '100%', height: '100%', overflow: 'visible', display: 'block' }}
        >
          <g stroke="#94a3b8" strokeWidth="1.5" strokeLinejoin="round">
             {[...surfaces]
               .sort((a, b) => {
                 const aSel = isSelected(a)
                 const bSel = isSelected(b)
                 if (aSel === bSel) return 0
                 return aSel ? 1 : -1
               })
               .map(surface => {
               const path = shape.paths[surface as keyof typeof shape.paths]
               const selected = isSelected(surface)
               const colorVal = getFill(surface)
               const symbolVal = data[surface]?.symbol
               
               // Tooltip Content
               const labelParts = []
               if (colorVal && colorVal !== 'white') labelParts.push(getMeaning?.('color', colorVal))
               if (symbolVal) labelParts.push(getMeaning?.('symbol', symbolVal))
               const label = labelParts.filter(Boolean).join(' + ')
               
               return (
                 <polygon
                    key={surface}
                    points={path}
                    fill={colorVal}
                    stroke={selected ? "#3b82f6" : "#94a3b8"}
                    strokeWidth={selected ? "2.5" : "1.5"}
                    onMouseDown={(e) => {
                      e.preventDefault() // Prevent text selection/drag behavior
                      e.stopPropagation()
                      onSurfaceMouseDown(surface)
                    }}
                    onMouseEnter={() => {
                      onSurfaceMouseEnter(surface)
                    }}
                    className={cn(
                      "cursor-pointer transition-all hover:opacity-80 active:scale-[0.98]",
                      selected && " z-10 relative"
                    )}
                 >
                    {label && <title>{label}</title>}
                 </polygon>
               )
             })}
          </g>

          {/* Symbol Overlay Layer */}
          <g style={{ pointerEvents: 'none' }}>
             {/* Merged Symbol (Crown) */}
             {isCrownMerged && (
               (() => {
                 let mergedY = 1.5 * U
                 let mergedSize = 14
                 if (isFullyMerged && hasRoot) {
                    // Shift slightly towards root to indicate coverage
                    if (type === 'upper') mergedY = 0.8 * U
                    if (type === 'lower') mergedY = 2.2 * U
                    mergedSize = 16
                 }
                 return (
                   <text 
                     x={1.5*U} y={mergedY} 
                     textAnchor="middle" dy=".3em" 
                     fontSize={mergedSize} fontWeight="bold" 
                     fill={ data.center?.color && data.center.color !== 'white' && data.center.color !== 'clear' ? 'white' : 'black' }
                   >
                     {firstSymbol}
                   </text>
                 )
               })()
             )}

             {/* Individual Symbols */}
             {surfaces.map(surface => {
               // If Crown is merged, skip drawing crown symbols (Center big symbol handles it)
               if (isCrownMerged && crownSurfaces.includes(surface)) return null 
               
               // If Fully Merged (Crown+Root), hide Root symbol
               if (isFullyMerged && surface === 'root') return null

               const symbol = getSymbol(surface)
               if (!symbol) return null

               let tx = 0, ty = 0
               if(surface === 'center') { tx=1.5; ty=1.5; }
               if(surface === 'top')    { tx=1.5; ty=0.5; }
               if(surface === 'bottom') { tx=1.5; ty=2.5; }
               if(surface === 'left')   { tx=0.5; ty=1.5; }
               if(surface === 'right')  { tx=2.5; ty=1.5; }
               
               if(surface === 'root') {
                 tx = 1.5
                 if (type === 'upper') ty = -0.5
                 if (type === 'lower') ty = 3.5
               }

               return (
                 <text 
                   key={`sym-${surface}`} 
                   x={tx*U} y={ty*U} 
                   textAnchor="middle" dy=".3em" 
                   fontSize={surface === 'root' ? "6" : "6"} 
                   fontWeight="bold"
                   fill={ data[surface]?.color && data[surface]?.color !== 'white' && data[surface]?.color !== 'clear' ? 'white' : 'black' }
                 >
                   {symbol}
                 </text>
               )
             })}
          </g>
        </svg>
      </div>
    </div>
  )
}
