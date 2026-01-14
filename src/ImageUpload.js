import React, { useState, useRef } from 'react';
import './App.css'; // Import the main CSS file

const ImageUpload = ({ initialImageData, onImageChange, blockId }) => {
  const [imageData, setImageData] = useState(initialImageData);
  const [previewUrl, setPreviewUrl] = useState(initialImageData?.data || null);
  const [dimensions, setDimensions] = useState({
    width: initialImageData?.width || 600,
    height: initialImageData?.height || 400
  });
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPEG, PNG, GIF, etc.)');
        return;
      }

      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit. Please select a smaller image.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = e.target.result;
        setPreviewUrl(base64Data);

        const newImageData = {
          type: 'image',
          data: base64Data,
          width: dimensions.width,
          height: dimensions.height
        };

        setImageData(newImageData);
        onImageChange(newImageData);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle dimension changes
  const handleDimensionChange = (dimension, value) => {
    const newDimensions = {
      ...dimensions,
      [dimension]: parseInt(value) || (dimension === 'width' ? 600 : 400)
    };

    setDimensions(newDimensions);

    // Update image data with new dimensions
    if (imageData) {
      const updatedImageData = {
        ...imageData,
        width: newDimensions.width,
        height: newDimensions.height
      };
      setImageData(updatedImageData);
      onImageChange(updatedImageData);
    }
  };

  // Trigger file input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Remove image
  const removeImage = () => {
    setPreviewUrl(null);
    setImageData(null);
    onImageChange(null);
  };

  return (
    <div className="image-upload">
      <div className="image-controls" style={{ marginBottom: '1rem' }}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          style={{ display: 'none' }}
        />
        <button
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '0.875rem',
            backgroundColor: '#fff',
            borderColor: '#ccc',
            color: '#6c757d',
            border: '1px solid',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            marginRight: '0.5rem'
          }}
          onClick={triggerFileInput}
        >
          {previewUrl ? 'Change Image' : 'Select Image'}
        </button>
        {previewUrl && (
          <button
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.875rem',
              backgroundColor: '#fff',
              borderColor: '#dc3545',
              color: '#dc3545',
              border: '1px solid',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              marginRight: '0.5rem'
            }}
            onClick={removeImage}
          >
            Remove Image
          </button>
        )}

        {previewUrl && (
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ marginRight: '1rem' }}>
                <label style={{ marginBottom: '0', display: 'block', fontSize: '0.875rem' }}>Width:</label>
                <input
                  type="number"
                  style={{
                    width: '80px',
                    padding: '0.25rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.25rem',
                    display: 'inline-block',
                    marginLeft: '0.25rem'
                  }}
                  value={dimensions.width}
                  onChange={(e) => handleDimensionChange('width', e.target.value)}
                />
              </div>
              <div>
                <label style={{ marginBottom: '0', display: 'block', fontSize: '0.875rem' }}>Height:</label>
                <input
                  type="number"
                  style={{
                    width: '80px',
                    padding: '0.25rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.25rem',
                    display: 'inline-block',
                    marginLeft: '0.25rem'
                  }}
                  value={dimensions.height}
                  onChange={(e) => handleDimensionChange('height', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {previewUrl && (
        <div className="image-preview">
          <img
            src={previewUrl}
            alt="Preview"
            style={{
              maxWidth: '100%',
              maxHeight: '300px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
        </div>
      )}

      {!previewUrl && (
        <div style={{
          textAlign: 'center',
          padding: '1rem',
          border: '1px dashed #ccc',
          borderRadius: '0.375rem',
          backgroundColor: '#f8f9fa'
        }}>
          <p style={{ color: '#6c757d', marginBottom: '0' }}>
            {imageData ? 'Image loaded' : 'No image selected. Click "Select Image" to upload.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;