// src/components/CustomSelect.tsx

import { Listbox, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { MdCheck, MdUnfoldMore } from 'react-icons/md';

interface CustomSelectProps {
  options: { id: string; name: string }[];
  value: any;
  onChange: (value: any) => void;
  placeholder: string;
}

export default function CustomSelect({ options, value, onChange, placeholder }: CustomSelectProps) {
  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative w-full">
        <Listbox.Button className="relative w-full cursor-default rounded-full bg-white/5 border border-white/10 py-4 pl-6 pr-12 text-left text-white text-sm outline-none focus:border-emerald-neon/50 focus:bg-white/10 transition-all">
          <span className="block truncate">{value ? value.name : placeholder}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-5">
            <MdUnfoldMore className="h-5 w-5 text-white/30" aria-hidden="true" />
          </span>
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute mt-2 max-h-60 w-full overflow-auto rounded-[30px] bg-[#031c16] p-2 text-base shadow-lg ring-1 ring-white/10 focus:outline-none sm:text-sm z-50 ultra-glass">
            {options.map((option, optionIdx) => (
              <Listbox.Option
                key={optionIdx}
                className={({ active }) =>
                  `relative cursor-default select-none py-3 pl-10 pr-4 rounded-full ${
                    active ? 'bg-emerald-neon/10 text-emerald-neon' : 'text-white/70'
                  }`
                }
                value={option}
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-black' : 'font-normal'}`}>
                      {option.name}
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-emerald-neon">
                        <MdCheck className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}