export default function AdeccoLogo({ className = "", variant = "red" }) {
  const colorClass = variant === "white" ? "text-white" : "text-[#e30613]";

  return (
    <span
      className={`inline-flex items-center ${colorClass} ${className}`}
      aria-label="Adecco"
    >
      <span className="font-black tracking-tight leading-none text-[2.35em] [font-family:Arial_Rounded_MT_Bold,Arial,sans-serif]">
        Adecco
      </span>
    </span>
  );
}
