import React from 'react';

export default function OrganicBackground() {
  return (
    <>
      {/* Linhas orgânicas SVG */}
      <div className="organic-line">
        <svg viewBox="0 0 1600 800" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{stopColor: 'rgba(173, 181, 189, 0)', stopOpacity: 0}} />
              <stop offset="20%" style={{stopColor: 'rgba(173, 181, 189, 0.3)', stopOpacity: 1}} />
              <stop offset="80%" style={{stopColor: 'rgba(173, 181, 189, 0.3)', stopOpacity: 1}} />
              <stop offset="100%" style={{stopColor: 'rgba(173, 181, 189, 0)', stopOpacity: 0}} />
            </linearGradient>
          </defs>
          <path d="M 0,300 Q 200,200 400,300 T 800,300 T 1200,300 T 1600,300" />
        </svg>
      </div>
      
      <div className="organic-line">
        <svg viewBox="0 0 1600 800" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{stopColor: 'rgba(206, 212, 218, 0)', stopOpacity: 0}} />
              <stop offset="15%" style={{stopColor: 'rgba(206, 212, 218, 0.4)', stopOpacity: 1}} />
              <stop offset="85%" style={{stopColor: 'rgba(206, 212, 218, 0.4)', stopOpacity: 1}} />
              <stop offset="100%" style={{stopColor: 'rgba(206, 212, 218, 0)', stopOpacity: 0}} />
            </linearGradient>
          </defs>
          <path d="M 0,500 Q 300,400 600,500 T 1200,500 T 1800,500" />
        </svg>
      </div>
      
      <div className="organic-line">
        <svg viewBox="0 0 1600 800" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{stopColor: 'rgba(134, 142, 150, 0)', stopOpacity: 0}} />
              <stop offset="25%" style={{stopColor: 'rgba(134, 142, 150, 0.25)', stopOpacity: 1}} />
              <stop offset="75%" style={{stopColor: 'rgba(134, 142, 150, 0.25)', stopOpacity: 1}} />
              <stop offset="100%" style={{stopColor: 'rgba(134, 142, 150, 0)', stopOpacity: 0}} />
            </linearGradient>
          </defs>
          <path d="M 0,100 Q 400,50 800,100 T 1600,100" />
        </svg>
      </div>
      
      <div className="organic-line">
        <svg viewBox="0 0 1600 800" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradient4" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{stopColor: 'rgba(173, 181, 189, 0)', stopOpacity: 0}} />
              <stop offset="18%" style={{stopColor: 'rgba(173, 181, 189, 0.35)', stopOpacity: 1}} />
              <stop offset="82%" style={{stopColor: 'rgba(173, 181, 189, 0.35)', stopOpacity: 1}} />
              <stop offset="100%" style={{stopColor: 'rgba(173, 181, 189, 0)', stopOpacity: 0}} />
            </linearGradient>
          </defs>
          <path d="M 0,700 Q 200,600 400,700 T 800,700 T 1200,700" />
        </svg>
      </div>
      
      <div className="organic-line">
        <svg viewBox="0 0 1600 800" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradient5" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{stopColor: 'rgba(206, 212, 218, 0)', stopOpacity: 0}} />
              <stop offset="12%" style={{stopColor: 'rgba(206, 212, 218, 0.3)', stopOpacity: 1}} />
              <stop offset="88%" style={{stopColor: 'rgba(206, 212, 218, 0.3)', stopOpacity: 1}} />
              <stop offset="100%" style={{stopColor: 'rgba(206, 212, 218, 0)', stopOpacity: 0}} />
            </linearGradient>
          </defs>
          <path d="M 0,200 Q 500,100 1000,200 T 2000,200" />
        </svg>
      </div>

      {/* Partículas orgânicas */}
      <div className="organic-particle"></div>
      <div className="organic-particle"></div>
      <div className="organic-particle"></div>
      <div className="organic-particle"></div>
      <div className="organic-particle"></div>
    </>
  );
}