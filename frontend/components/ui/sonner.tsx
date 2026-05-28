"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          "--normal-bg": "hsl(0 0% 100%)",
          "--normal-text": "hsl(240 10% 3.9%)",
          "--normal-border": "hsl(240 5.9% 90%)",
          "--success-bg": "hsl(143 85% 96%)",
          "--success-text": "hsl(140 100% 27%)",
          "--success-border": "hsl(145 92% 91%)",
          "--error-bg": "hsl(359 100% 97%)",
          "--error-text": "hsl(360 100% 45%)",
          "--error-border": "hsl(359 100% 94%)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
