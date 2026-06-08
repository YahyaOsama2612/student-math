import React, { useState } from "react";

const TruncatedText = ({ text, limit = 18 }) => {
  const [open, setOpen] = useState(false);

  if (!text) return "-";

  const isLong = text.length > limit;
  const displayedText = isLong ? text.slice(0, limit) + "..." : text;

  return (
    <>
      <span
        className={isLong ? "cursor-pointer  hover:underline" : ""}
        onClick={() => isLong && setOpen(true)}
      >
        {displayedText}
      </span>

      {/* Popup */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card p-6 rounded-lg max-w-lg w-full shadow-lg relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-xl font-bold text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>

            <h3 className="text-lg font-semibold text-one mb-4">
              Full Content
            </h3>

            <p className="text-foreground break-words">
              {text}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default TruncatedText;
