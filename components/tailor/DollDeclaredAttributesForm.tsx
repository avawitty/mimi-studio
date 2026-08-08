import React from 'react';
import type { DollDeclaredAttributes } from '../../types';

const FIELDS: Array<{
  key: keyof DollDeclaredAttributes;
  label: string;
  placeholder: string;
  multiline?: boolean;
}> = [
  {
    key: 'hair',
    label: 'Hair',
    placeholder: 'e.g. chin-length brown bob, center part, blonde face-framing highlights',
  },
  {
    key: 'eyes',
    label: 'Eyes',
    placeholder: 'e.g. large brown almond eyes, glassy reflective iris',
  },
  {
    key: 'faceFeatures',
    label: 'Face & structure',
    placeholder: 'e.g. oval face, soft jaw, high cheekbones',
  },
  {
    key: 'distinguishingMarks',
    label: 'Marks & signatures',
    placeholder: 'e.g. beauty mark on left cheek — comma or line separated',
    multiline: true,
  },
  {
    key: 'skinTone',
    label: 'Resin skin tone',
    placeholder: 'e.g. warm pale resin with soft blush',
  },
  {
    key: 'expression',
    label: 'Expression',
    placeholder: 'e.g. serene cult calm, lips slightly parted',
  },
  {
    key: 'styleNotes',
    label: 'Style / wardrobe',
    placeholder: 'e.g. cream strapless tube bodice, minimalist editorial',
  },
  {
    key: 'otherNotes',
    label: 'Anything else',
    placeholder: 'Other features the doll should carry…',
    multiline: true,
  },
];

interface DollDeclaredAttributesFormProps {
  value: DollDeclaredAttributes;
  onChange: (next: DollDeclaredAttributes) => void;
  compact?: boolean;
}

export function emptyDeclaredAttributes(): DollDeclaredAttributes {
  return {};
}

export function hasDeclaredAttributes(attrs?: DollDeclaredAttributes): boolean {
  if (!attrs) return false;
  return Object.values(attrs).some((v) => String(v || '').trim().length > 0);
}

export const DollDeclaredAttributesForm: React.FC<DollDeclaredAttributesFormProps> = ({
  value,
  onChange,
  compact = false,
}) => {
  const setField = (key: keyof DollDeclaredAttributes, text: string) => {
    onChange({ ...value, [key]: text });
  };

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <p className="text-xs text-nous-subtle italic">
        Optional but authoritative — we prioritize what you write over generic defaults.
      </p>
      <div className={`grid gap-3 ${compact ? '' : 'md:grid-cols-2'}`}>
        {FIELDS.map((field) => (
          <label key={field.key} className="block space-y-1">
            <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
              {field.label}
            </span>
            {field.multiline ? (
              <textarea
                value={value[field.key] ?? ''}
                onChange={(e) => setField(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={compact ? 2 : 3}
                className="w-full border border-nous-border/40 bg-transparent px-3 py-2 text-sm resize-none"
              />
            ) : (
              <input
                type="text"
                value={value[field.key] ?? ''}
                onChange={(e) => setField(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full border border-nous-border/40 bg-transparent px-3 py-2 text-sm"
              />
            )}
          </label>
        ))}
      </div>
    </div>
  );
};
