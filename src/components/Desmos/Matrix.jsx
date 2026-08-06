import React from "react";

const Matrix = () => {
  return (
    <div className="w-full h-full">
      <iframe
        src="https://www.desmos.com/matrix"
        width="100%"
        height="100%"
        style={{ border: "none" }}
        title="Desmos matrix"
        allowFullScreen
      />
    </div>
  );
};

export default Matrix;
