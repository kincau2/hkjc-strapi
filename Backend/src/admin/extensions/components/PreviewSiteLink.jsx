import React from 'react';

const PreviewSiteLink = () => {
  const handleClick = (e) => {
    e.preventDefault();
    const previewUrl = 'http://localhost:5500/tc/index.html?preview=true';
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <a
      href="http://localhost:5500/tc/index.html?preview=true"
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        textDecoration: 'none',
        color: 'inherit',
        width: '100%',
      }}
    >
      <span style={{ marginRight: '8px', fontSize: '18px' }}>🔍</span>
      <span>Preview Site</span>
    </a>
  );
};

export default PreviewSiteLink;
