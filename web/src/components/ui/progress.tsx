"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function Progress({
  className,
  value = 0,
  max = 100,
  ...props
}: React.ComponentProps<"div"> & { value?: number; max?: number }) {
  return (
    <div
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="h-full w-full flex-1 bg-primary transition-all duration-500 ease-in-out"
        style={{ transform: `translateX(-${100 - (value / max) * 100}%)` }}
      />
    </div>
  )
}

export { Progress }
