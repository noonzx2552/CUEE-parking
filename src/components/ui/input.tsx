import * as React from "react";

import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 py-0 text-sm leading-none text-zinc-900 caret-sky-600 outline-none ring-0 transition placeholder:text-zinc-400 focus:border-sky-400",
        props.className,
      )}
    />
  );
}
