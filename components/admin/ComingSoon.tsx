interface ComingSoonProps {
  title: string;
  description?: string;
}

export default function ComingSoon({
  title,
  description = "Bu modül yakında eklenecek.",
}: ComingSoonProps) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-gray-500">{description}</p>
    </div>
  );
}
