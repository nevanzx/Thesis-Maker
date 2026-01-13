import React, { useState, useRef } from 'react';

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
      <div className="image-controls mb-3">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="d-none"
        />
        <button 
          className="btn btn-sm btn-outline-secondary me-2"
          onClick={triggerFileInput}
        >
          {previewUrl ? 'Change Image' : 'Select Image'}
        </button>
        {previewUrl && (
          <button 
            className="btn btn-sm btn-outline-danger me-2"
            onClick={removeImage}
          >
            Remove Image
          </button>
        )}
        
        {previewUrl && (
          <div className="mt-2">
            <div className="d-flex align-items-center">
              <div className="me-3">
                <label className="form-label mb-0">Width:</label>
                <input
                  type="number"
                  className="form-control form-control-sm d-inline-block me-2"
                  style={{ width: '80px' }}
                  value={dimensions.width}
                  onChange={(e) => handleDimensionChange('width', e.target.value)}
                />
              </div>
              <div>
                <label className="form-label mb-0">Height:</label>
                <input
                  type="number"
                  className="form-control form-control-sm d-inline-block"
                  style={{ width: '80px' }}
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
        <div className="image-placeholder text-center p-4 border border-dashed rounded">
          <p className="text-muted mb-0">
            {imageData ? 'Image loaded' : 'No image selected. Click "Select Image" to upload.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;