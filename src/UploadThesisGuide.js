import React, { useState } from 'react';
import './App.css';

// Component for uploading thesis guide and handling placeholders
function UploadThesisGuide({ onGuideProcessed }) {
  const [fileContent, setFileContent] = useState('');
  const [originalFile, setOriginalFile] = useState(null);
  const [placeholders, setPlaceholders] = useState({});
  const [identifiedVariables, setIdentifiedVariables] = useState({});
  const [formValues, setFormValues] = useState({});
  const [step, setStep] = useState('upload_guide'); // 'upload_guide', 'select', 'encode', 'upload_json', 'fill'
  const [error, setError] = useState('');
  const [loadedGuideData, setLoadedGuideData] = useState(null); // Store the loaded guide data for validation

  // Handle guide file upload (with placeholders)
  const handleGuideFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setOriginalFile(file);

      // Handle different file types
      if (file.name.endsWith('.json') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target.result;
            setFileContent(content);
            // Process the file content to identify placeholders
            const foundPlaceholders = identifyPlaceholders(content);
            if (Object.keys(foundPlaceholders).length > 0) {
              setPlaceholders(foundPlaceholders);
              setIdentifiedVariables(foundPlaceholders);
            }

            // Parse the guide data to store it
            try {
              const guideData = JSON.parse(content);
              setLoadedGuideData(guideData);

              // If there are no placeholders to fill, we can process the guide immediately
              const foundPlaceholders = identifyPlaceholders(content);
              if (Object.keys(foundPlaceholders).length === 0) {
                // No placeholders, process the guide immediately and notify parent
                onGuideProcessed(guideData);
              } else {
                // There are placeholders, go to selection step
                setPlaceholders(foundPlaceholders);
                setIdentifiedVariables(foundPlaceholders);
                setStep('select');
              }
            } catch (parseError) {
              // If it's not JSON but has placeholders, we still want to store the guide data template
              // Just keep content as string for now, will be processed after variables are filled
              setStep('select');
            }
          } catch (error) {
            setError('Error reading file: ' + error.message);
          }
        };
        reader.readAsText(file);
      } else {
        setError('Please upload a JSON or text file.');
      }
    }
  };

  // Replace variables in text content
  const replaceVariablesInContent = (content, variables) => {
    let updatedContent = content;

    // Replace all variables in the content
    for (const [variable, value] of Object.entries(variables)) {
      // Replace all occurrences of the placeholder (case-insensitive)
      const placeholderRegex = new RegExp(`\\[(insert|Insert|INSERT)\\s+${variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'gi');
      updatedContent = updatedContent.replace(placeholderRegex, value);
    }

    return updatedContent;
  };

  // Replace variables in guide structure
  const replaceVariablesInGuide = (guideData, variables) => {
    // Create a deep copy of the guide data
    const updatedGuide = JSON.parse(JSON.stringify(guideData));

    // Replace placeholders in the entire guide structure
    const replaceInObject = (obj) => {
      if (typeof obj === 'string') {
        // Replace placeholders in string values
        for (const [variable, value] of Object.entries(variables)) {
          const placeholderRegex = new RegExp(`\\[(insert|Insert|INSERT)\\s+${variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'gi');
          obj = obj.replace(placeholderRegex, value);
        }
        return obj;
      } else if (Array.isArray(obj)) {
        return obj.map(item => replaceInObject(item));
      } else if (typeof obj === 'object' && obj !== null) {
        const newObj = {};
        for (const [key, value] of Object.entries(obj)) {
          newObj[key] = replaceInObject(value);
        }
        return newObj;
      }
      return obj;
    };

    return replaceInObject(updatedGuide);
  };

  // Handle saved JSON file upload (already processed)
  const handleJsonFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          // Check if the JSON has thesisContent (saved thesis)
          if (jsonData.thesisContent) {
              // This is a saved thesis content file - load content and variables directly
              // Check if guide structure is also included which means it's a complete thesis export
              if (jsonData.guideStructure) {
                // This is a complete thesis export - safe to process
                onGuideProcessed({ type: 'thesis_complete', guideStructure: jsonData.guideStructure, thesisContent: jsonData.thesisContent, variables: jsonData.variables || {} });
              } else {
                // This is content-only with variables, but user might have loaded a guide locally
                if (loadedGuideData && jsonData.variables) {
                  // Apply variables to the locally loaded guide and send both guide and content
                  const processedGuide = replaceVariablesInGuide(loadedGuideData, jsonData.variables);
                  setLoadedGuideData(processedGuide);
                  // Send as thesis_complete type to set both guide and content
                  onGuideProcessed({
                    type: 'thesis_complete',
                    guideStructure: processedGuide,
                    thesisContent: jsonData.thesisContent,
                    variables: jsonData.variables || {}
                  });
                } else {
                  // This is content-only, need to have guide loaded in parent
                  // The parent component will handle the validation and show appropriate message
                  onGuideProcessed({ type: 'thesis_content', thesisContent: jsonData.thesisContent, variables: jsonData.variables || {} });
                }
              }
          } else if (jsonData.guideStructure) {
              // This is an exported file that contains guide structure, thesis content and variables
              onGuideProcessed({ type: 'thesis_complete', guideStructure: jsonData.guideStructure, thesisContent: jsonData.thesisContent, variables: jsonData.variables || {} });
          } else {
            // This is a guide template - process normally
            onGuideProcessed(jsonData);
          }
        } catch (error) {
          setError('Error parsing JSON file: ' + error.message);
        }
      };
      reader.readAsText(file);
    } else {
      setError('Please upload a valid JSON file.');
    }
  };

  // Handle selection between guide vs saved JSON
  const handleSelectOption = (option) => {
    if (option === 'guide') {
      setStep('upload_guide');
    } else if (option === 'json') {
      setStep('upload_json');
    }
  };

  // Process the file content to identify placeholders
  const processFileContent = (content) => {
    // Identify placeholders in the content
    const foundPlaceholders = identifyPlaceholders(content);

    if (Object.keys(foundPlaceholders).length > 0) {
      setPlaceholders(foundPlaceholders);
      setIdentifiedVariables(foundPlaceholders);
      setStep('fill');
      setError('');
    } else {
      // If no placeholders, directly process the guide
      try {
        const guideData = JSON.parse(content);
        setLoadedGuideData(guideData);
        onGuideProcessed(guideData);
      } catch (parseError) {
        setError('No placeholders found, but the file is not valid JSON: ' + parseError.message);
      }
    }
  };

  // Function to identify placeholders in text
  const identifyPlaceholders = (content) => {
    // Match patterns like [insert IV1], [Insert DV], [INSERT MV], [insert Respondents], etc.
    // This will identify any placeholder that follows the pattern [insert X]
    const placeholderRegex = /\[(insert|Insert|INSERT)\s+([^\]]+)\]/gi;
    const matches = [];
    let match;

    while ((match = placeholderRegex.exec(content)) !== null) {
      matches.push(match[2].trim()); // Capture the content inside brackets after 'insert'
    }

    // Count occurrences of each unique placeholder
    const counts = {};
    matches.forEach(placeholder => {
      // Normalize the placeholder name to lowercase for grouping
      const normalized = placeholder.toLowerCase();
      counts[normalized] = (counts[normalized] || 0) + 1;
    });

    return counts;
  };

  // Handle form input changes
  const handleInputChange = (placeholder, value) => {
    setFormValues(prev => ({
      ...prev,
      [placeholder]: value
    }));
  };

  // Submit the filled variables
  const handleSubmit = () => {
    // Replace placeholders in the original content with the filled values
    let processedContent = fileContent;

    Object.keys(formValues).forEach(placeholder => {
      // Replace all occurrences of the placeholder (case-insensitive)
      const placeholderRegex = new RegExp(`\\[(insert|Insert|INSERT)\\s+${placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'gi');
      processedContent = processedContent.replace(placeholderRegex, formValues[placeholder]);
    });

    // Process the guide with the filled content
    try {
      const guideData = JSON.parse(processedContent);
      setLoadedGuideData(guideData);
      onGuideProcessed(guideData, formValues); // Pass the filled variables
    } catch (error) {
      setError('Error processing the guide after replacing variables: ' + error.message);
    }
  };

  return (
    <div className="upload-thesis-guide">
      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {step === 'upload_guide' && (
        <div className="row justify-content-center">
          <div className="col-12 col-md-6">
            <div className="card">
              <div className="card-body text-center">
                <h5 className="card-title">Upload Thesis Guide</h5>
                <p className="card-text">Upload your thesis guide file to continue</p>
                <input
                  type="file"
                  accept=".json,.txt"
                  onChange={handleGuideFileUpload}
                  className="form-control"
                />
                <small className="form-text text-muted">Supports JSON and text files</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'select' && (
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card">
              <div className="card-body text-center">
                <h5 className="card-title">Guide Loaded Successfully</h5>
                <p className="card-text">Choose what to do with your guide:</p>

                <div className="row">
                  <div className="col-12 col-md-6 mb-3">
                    <div className="card h-100 option-card" onClick={() => setStep('encode')}>
                      <div className="card-body d-flex flex-column">
                        <h6 className="card-title">Encode Variables</h6>
                        <p className="card-text">Input the variables to fill in the guide placeholders.</p>
                        <button className="btn btn-primary mt-auto">
                          Input Variables
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-6 mb-3">
                    <div className="card h-100 option-card" onClick={() => setStep('upload_json')}>
                      <div className="card-body d-flex flex-column">
                        <h6 className="card-title">Load Different Thesis Project</h6>
                        <p className="card-text">Upload a complete thesis project (guide + content) from a different export.</p>
                        <small className="text-muted">This replaces the current guide and loads different content.</small>
                        <button className="btn btn-primary mt-auto mt-2">
                          Upload Thesis Project
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'encode' && (
        <div className="container">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Fill in Variables</h5>
              <p className="card-text">We found the following variables in your thesis guide. Please fill in the values:</p>

              <div className="row">
                {Object.keys(identifiedVariables).map((placeholder, index) => {
                  // Create a more descriptive label for common academic variables
                  let descriptiveLabel = placeholder.toUpperCase();
                  if (placeholder.toLowerCase().startsWith('iv')) {
                    descriptiveLabel = `${placeholder.toUpperCase()} (Independent Variable)`;
                  } else if (placeholder.toLowerCase().startsWith('dv')) {
                    descriptiveLabel = `${placeholder.toUpperCase()} (Dependent Variable)`;
                  } else if (placeholder.toLowerCase().startsWith('mv')) {
                    descriptiveLabel = `${placeholder.toUpperCase()} (Moderating Variable)`;
                  } else if (placeholder.toLowerCase().includes('respondent') || placeholder.toLowerCase().includes('respondents')) {
                    descriptiveLabel = `${placeholder.toUpperCase()} (Research Respondents)`;
                  }

                  return (
                    <div key={index} className="col-12 col-md-6 mb-3">
                      <label className="form-label">
                        <strong>{descriptiveLabel}</strong> (appears {identifiedVariables[placeholder]} time{identifiedVariables[placeholder] > 1 ? 's' : ''})
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder={`Enter value for ${placeholder.toUpperCase()}`}
                        value={formValues[placeholder] || ''}
                        onChange={(e) => handleInputChange(placeholder, e.target.value)}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-3">
                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={Object.keys(identifiedVariables).some(placeholder => !formValues[placeholder] || formValues[placeholder].trim() === '')}
                >
                  Process Guide
                </button>
                <button
                  className="btn btn-secondary ms-2"
                  onClick={() => setStep('select')}
                >
                  Back
                </button>

                {/* Show validation message if there are empty fields */}
                {Object.keys(identifiedVariables).some(placeholder => !formValues[placeholder] || formValues[placeholder].trim() === '') && (
                  <div className="mt-2">
                    <small className="text-danger">Please fill in all variable fields to proceed.</small>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'upload_json' && (
        <div className="row justify-content-center">
          <div className="col-12 col-md-6">
            <div className="card">
              <div className="card-body text-center">
                <h5 className="card-title">Upload Thesis Project</h5>
                <p className="card-text">Upload a complete thesis project JSON file that contains both guide structure and content</p>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleJsonFileUpload}
                  className="form-control"
                />
                <small className="form-text text-muted">For files with both guide structure and content (completely different thesis project)</small>
                <button
                  className="btn btn-secondary mt-2"
                  onClick={() => setStep('select')}
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'fill' && (
        <div className="container">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Fill in Variables</h5>
              <p className="card-text">We found the following variables in your thesis guide. Please fill in the values:</p>

              <div className="row">
                {Object.keys(identifiedVariables).map((placeholder, index) => {
                  // Create a more descriptive label for common academic variables
                  let descriptiveLabel = placeholder.toUpperCase();
                  if (placeholder.toLowerCase().startsWith('iv')) {
                    descriptiveLabel = `${placeholder.toUpperCase()} (Independent Variable)`;
                  } else if (placeholder.toLowerCase().startsWith('dv')) {
                    descriptiveLabel = `${placeholder.toUpperCase()} (Dependent Variable)`;
                  } else if (placeholder.toLowerCase().startsWith('mv')) {
                    descriptiveLabel = `${placeholder.toUpperCase()} (Moderating Variable)`;
                  } else if (placeholder.toLowerCase().includes('respondent') || placeholder.toLowerCase().includes('respondents')) {
                    descriptiveLabel = `${placeholder.toUpperCase()} (Research Respondents)`;
                  }

                  return (
                    <div key={index} className="col-12 col-md-6 mb-3">
                      <label className="form-label">
                        <strong>{descriptiveLabel}</strong> (appears {identifiedVariables[placeholder]} time{identifiedVariables[placeholder] > 1 ? 's' : ''})
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder={`Enter value for ${placeholder.toUpperCase()}`}
                        value={formValues[placeholder] || ''}
                        onChange={(e) => handleInputChange(placeholder, e.target.value)}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-3">
                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={Object.keys(identifiedVariables).some(placeholder => !formValues[placeholder] || formValues[placeholder].trim() === '')}
                >
                  Process Guide
                </button>
                <button
                  className="btn btn-secondary ms-2"
                  onClick={() => setStep('upload_guide')}
                >
                  Back
                </button>

                {/* Show validation message if there are empty fields */}
                {Object.keys(identifiedVariables).some(placeholder => !formValues[placeholder] || formValues[placeholder].trim() === '') && (
                  <div className="mt-2">
                    <small className="text-danger">Please fill in all variable fields to proceed.</small>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadThesisGuide;