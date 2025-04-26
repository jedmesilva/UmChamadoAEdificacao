
import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const countries = [
  { name: 'Brasil', code: 'BR', dialCode: '+55', format: '+55 (00) 0 0000-0000' },
  { name: 'Estados Unidos', code: 'US', dialCode: '+1', format: '+1 000 000 0000' },
  { name: 'Portugal', code: 'PT', dialCode: '+351', format: '+351 000 000 000' },
  { name: 'Espanha', code: 'ES', dialCode: '+34', format: '+34 000 000 000' },
  { name: 'Reino Unido', code: 'GB', dialCode: '+44', format: '+44 00 0000 0000' },
  { name: 'França', code: 'FR', dialCode: '+33', format: '+33 0 00 00 00 00' },
  { name: 'Alemanha', code: 'DE', dialCode: '+49', format: '+49 000 000000' },
  { name: 'Itália', code: 'IT', dialCode: '+39', format: '+39 000 000 0000' },
  { name: 'Japão', code: 'JP', dialCode: '+81', format: '+81 00 0000 0000' },
  { name: 'Canadá', code: 'CA', dialCode: '+1', format: '+1 000 000 0000' },
];

export interface CountrySelectProps {
  value?: string
  onChange?: (value: string) => void
}

export function CountrySelect({ value, onChange }: CountrySelectProps) {
  const [open, setOpen] = React.useState(false)
  const selectedCountry = countries.find(country => country.dialCode === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[130px] justify-between"
        >
          {selectedCountry ? (
            <>
              <img
                src={`https://flagcdn.com/${selectedCountry.code.toLowerCase()}.svg`}
                width="20"
                height="15"
                className="mr-2"
                alt={selectedCountry.name}
              />
              {selectedCountry.dialCode}
            </>
          ) : (
            "Selecionar..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Buscar país..." />
          <CommandEmpty>Nenhum país encontrado.</CommandEmpty>
          <CommandGroup>
            {countries.map((country) => (
              <CommandItem
                key={country.code}
                value={country.name}
                onSelect={() => {
                  onChange?.(country.dialCode)
                  setOpen(false)
                }}
              >
                <img
                  src={`https://flagcdn.com/${country.code.toLowerCase()}.svg`}
                  width="20"
                  height="15"
                  className="mr-2"
                  alt={country.name}
                />
                {country.name}
                <Check
                  className={cn(
                    "ml-auto h-4 w-4",
                    value === country.dialCode ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
