"use client";

import { useState } from "react";
import { formatMoneyFromCents, moneyCentsToDecimal, parseMoneyToCents } from "@/lib/money";

type MoneyInputProps = {
  id: string;
  name: string;
  defaultValue?: string | number | null;
  required?: boolean;
};

export function MoneyInput({ id, name, defaultValue, required }: MoneyInputProps) {
  const initialCents = parseMoneyToCents(defaultValue) ?? 0;
  const [displayValue, setDisplayValue] = useState(formatMoneyFromCents(initialCents));
  const [cents, setCents] = useState(initialCents);

  function updateValue(value: string, shouldFormat: boolean) {
    const nextCents = parseMoneyToCents(value) ?? 0;
    setCents(nextCents);
    setDisplayValue(shouldFormat ? formatMoneyFromCents(nextCents) : value);
  }

  return (
    <>
      <input type="hidden" name={name} value={moneyCentsToDecimal(cents)} />
      <input
        id={id}
        inputMode="decimal"
        value={displayValue}
        required={required}
        onBlur={(event) => updateValue(event.currentTarget.value, true)}
        onChange={(event) => updateValue(event.currentTarget.value, false)}
      />
    </>
  );
}
