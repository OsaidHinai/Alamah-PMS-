'use client';

interface RatingSelectProps {
  value: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
  label?: string;
}

const ratingLabels: Record<number, string> = {
  1: '١ — غير مقبول',
  2: '٢ — دون التوقعات',
  3: '٣ — يحقق التوقعات',
  4: '٤ — يتخطى التوقعات',
  5: '٥ — استثنائي',
};

export default function RatingSelect({ value, onChange, disabled, label }: RatingSelectProps) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <select
        value={value ?? ''}
        onChange={(e) => onChange(parseInt(e.target.value))}
        disabled={disabled}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-500"
      >
        <option value="">اختر التقييم</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>{ratingLabels[n]}</option>
        ))}
      </select>
    </div>
  );
}
