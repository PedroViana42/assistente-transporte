"use client";

import { useState } from "react";
import {
  formatMoneyFromCents,
  moneyCentsToDecimal,
  moneyMaskInputToCents,
  parseMoneyToCents
} from "@/lib/money";

type MoneyInputProps = {
  id: string;
  name: string;
  defaultValue?: string | number | null;
  required?: boolean;
};

export function MoneyInput({ id, name, defaultValue, required }: MoneyInputProps) {
  const [cents, setCents] = useState(() => Math.max(0, parseMoneyToCents(defaultValue ?? 0) ?? 0));

  return (
    <>
      <input type="hidden" name={name} value={moneyCentsToDecimal(cents)} />
      <input
        id={id}
        value={formatMoneyFromCents(cents)}
        type="text"
        inputMode="numeric"
        required={required}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setCents(moneyMaskInputToCents(event.currentTarget.value))}
      />
    </>
  );
}
