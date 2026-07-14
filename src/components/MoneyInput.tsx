"use client";

import { useState } from "react";
import { formatMoneyFromCents, moneyToDecimal, parseMoneyToCents } from "@/lib/money";

type MoneyInputProps = {
  id: string;
  name: string;
  defaultValue?: string | number | null;
  required?: boolean;
};

export function MoneyInput({ id, name, defaultValue, required }: MoneyInputProps) {
  const [displayValue, setDisplayValue] = useState(formatDisplayValue(defaultValue ?? 0));

  function handleBlur() {
    setDisplayValue(formatDisplayValue(displayValue));
  }

  return (
    <>
      <input type="hidden" name={name} value={moneyToDecimal(displayValue)} />
      <input
        id={id}
        value={displayValue}
        type="text"
        inputMode="decimal"
        required={required}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={handleBlur}
        onChange={(event) => setDisplayValue(event.currentTarget.value)}
      />
    </>
  );
}

function formatDisplayValue(value: unknown): string {
  return formatMoneyFromCents(parseMoneyToCents(value) ?? 0);
}
