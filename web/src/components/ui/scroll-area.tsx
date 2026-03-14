"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="scroll-area"
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <div className="h-full w-full overflow-auto scrollbar-hide">
        {children}
      </div>
    </div>
  )
}

export { ScrollArea }
