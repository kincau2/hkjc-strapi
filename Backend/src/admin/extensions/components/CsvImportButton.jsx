import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

const CsvImportButton = () => {
  const location = useLocation();
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Only show on Pick collection page
  if (!location.pathname.includes('api::pick.pick')) {
    return null;
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    if (!confirm('This will delete all existing picks and import new ones from the CSV. Continue?')) {
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken');
      
      const response = await fetch('/api/picks/import', {
        method: 'POST',
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || `Successfully imported ${data.count} picks`);
        setFile(null);
        window.location.reload();
      } else {
        // Strapi error format: { error: { message: "..." } } or { message: "..." }
        const errorMessage = data.error?.message || data.message || 'Import failed';
        throw new Error(errorMessage);
      }
    } catch (error) {
      // Display full error message (including validation details with line breaks)
      alert(error.message || 'Failed to import CSV');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{
          padding: '6px 12px',
          border: '1px solid #dcdce4',
          borderRadius: '4px',
          fontSize: '14px',
        }}
      />
      <button
        onClick={handleUpload}
        disabled={!file || isLoading}
        style={{
          padding: '6px 16px',
          backgroundColor: !file || isLoading ? '#ccc' : '#4945ff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: !file || isLoading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '600',
        }}
      >
        {isLoading ? 'Importing...' : 'Import CSV'}
      </button>
    </div>
  );
};

export default CsvImportButton;
