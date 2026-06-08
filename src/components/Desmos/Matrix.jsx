import React from 'react'

const Matrix = () => {
  return (
 <div className="w-full h-screen  p-4 bg-gray-100">
      {/* تقدر تحط لينك رسمة معينة جاهزة أو اللينك الرئيسي */}
      <iframe 
        src="https://www.desmos.com/matrix" 
        width="100%" 
        height="100%" 
        style={{ border: '1px solid #ccc', borderRadius: '8px' }}
        title="Desmos  matrix"
        allowFullScreen
      />
    </div>   )
}

export default Matrix