"use client";

import { useState } from "react";
import { NumericFormat, type NumberFormatValues } from "react-number-format";
import { moneyToDecimal } from "@/lib/money";

type MoneyInputProps = {
  id: string;
  name: string;
  defaultValue?: string | number | null;
  required?: boolean;
};

export function MoneyInput({ id, name, defaultValue, required }: MoneyInputProps) {
  const [value, setValue] = useState(moneyToDecimal(defaultValue ?? 0));

  function handleValueChange(values: NumberFormatValues) {
    setValue(values.value || "0");
  }

  return (
    <>
      <input type="hidden" name={name} value={moneyToDecimal(value)} />
      <NumericFormat
        id={id}
        value={value}
        valueIsNumericString
        thousandSeparator="."
        decimalSeparator=","
        allowedDecimalSeparators={[",", "."]}
        decimalScale={2}
        fixedDecimalScale
        prefix="R$ "
        allowNegative={false}
        type="text"
        inputMode="decimal"
        required={required}
        onFocus={(event) => event.currentTarget.select()}
        onValueChange={handleValueChange}
      />
    </>
  );
}
