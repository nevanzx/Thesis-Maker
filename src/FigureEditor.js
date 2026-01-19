import React, { useState, useEffect } from 'react';

const FigureEditor = ({ initialFigureData, onFigureChange }) => {
  const [figureType, setFigureType] = useState(initialFigureData?.type || 'IV, DV, MODV');
  const [variables, setVariables] = useState({
    iv: initialFigureData?.iv || initialFigureData?.['IV'] || '',
    dv: initialFigureData?.dv || initialFigureData?.['DV'] || '',
    modv: initialFigureData?.modv || initialFigureData?.['MODV'] || '',
    iv1: initialFigureData?.iv1 || initialFigureData?.['IV1'] || '',
    iv2: initialFigureData?.iv2 || initialFigureData?.['IV2'] || ''
  });

  // Update parent when variables change
  useEffect(() => {
    onFigureChange({
      type: figureType,
      iv: variables.iv,
      dv: variables.dv,
      modv: variables.modv,
      iv1: variables.iv1,
      iv2: variables.iv2
    });
  }, [variables, figureType, onFigureChange]);

  const handleVariableChange = (varName, value) => {
    setVariables(prev => ({
      ...prev,
      [varName]: value
    }));
  };

  return null; // Return nothing visible, just maintain data structure
};

export default FigureEditor;