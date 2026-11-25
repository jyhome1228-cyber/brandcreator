import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

export type SelectOption = { value: string; label: string };

type BramerSelectProps = {
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
};

export default function BramerSelect({ value, options, onChange, ariaLabel, placeholder = '선택해 주세요' }: BramerSelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const currentIndex = Math.max(0, options.findIndex(item => item.value === value));
  const selected = options.find(item => item.value === value);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const choose = (index: number) => {
    const next = options[index];
    if (!next) return;
    onChange(next.value);
    setActive(index);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!options.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(event.key === 'ArrowDown' ? currentIndex : Math.max(0, currentIndex - 1));
      setOpen(true);
    }
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!options.length) { setOpen(false); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(previous => (previous + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActive(event.key === 'Home' ? 0 : options.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(active);
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  return <div ref={rootRef} className={`bramer-custom-select ${open ? 'is-open' : ''}`}>
    <button
      ref={triggerRef}
      type="button"
      className="bramer-select-trigger"
      aria-label={ariaLabel}
      disabled={!options.length}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? id : undefined}
      onClick={() => { setActive(currentIndex); setOpen(previous => !previous); }}
      onKeyDown={onTriggerKeyDown}
    >
      <span>{selected?.label ?? placeholder}</span>
      <svg aria-hidden="true" viewBox="0 0 20 20" width="17" height="17" fill="none"><path d="m5 7 5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </button>
    {open && options.length > 0 ? <div
      id={id}
      ref={listRef}
      role="listbox"
      className="bramer-select-list"
      aria-label={ariaLabel}
      tabIndex={0}
      aria-activedescendant={`${id}-option-${active}`}
      onKeyDown={onListKeyDown}
    >
      {options.map((option, index) => <div
        role="option"
        id={`${id}-option-${index}`}
        aria-selected={option.value === value}
        data-active={index === active}
        className={`bramer-select-option ${option.value === value ? 'is-selected' : ''} ${index === active ? 'is-active' : ''}`}
        key={option.value}
        onMouseEnter={() => setActive(index)}
        onPointerDown={event => event.preventDefault()}
        onClick={() => choose(index)}
      >
        <span>{option.label}</span>
        {option.value === value ? <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none"><path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg> : null}
      </div>)}
    </div> : null}
  </div>;
}
