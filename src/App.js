import React, { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'; // Import Bootstrap CSS
import geminiService from './geminiService';
import UploadThesisGuide from './UploadThesisGuide';  // Import the new component
import TableEditor from './TableEditor'; // Import the table editor component
import ImageUpload from './ImageUpload'; // Import the image upload component
import FigureEditor from './FigureEditor'; // Import the figure editor component
import './App.css';

// Main App Component
function App() {
  const [guideData, setGuideData] = useState(null);
  const [currentChapter, setCurrentChapter] = useState(1); // Start at 1 instead of 0
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0); // Track current section within the chapter
  const [thesisContent, setThesisContent] = useState({});
  const [filledVariables, setFilledVariables] = useState({}); // Store the variables used
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiResults, setApiResults] = useState({}); // Store API results for each content block
  const [checkedBlocks, setCheckedBlocks] = useState({}); // Track which blocks have been checked
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-pro'); // Track selected Gemini model
  const [showBottomControls, setShowBottomControls] = useState(true); // Track bottom control visibility

  const hasInitializedContent = useRef(false); // Track if content has been initialized
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [availableSessions, setAvailableSessions] = useState([]);
  const [docxTemplate, setDocxTemplate] = useState('standard'); // For DOCX template selection

  // State for dynamic literature review content
  const [literatureReviewContent, setLiteratureReviewContent] = useState({});
  const [currentLiteratureSubsection, setCurrentLiteratureSubsection] = useState(0);

  // Function to toggle bottom controls visibility
  const toggleBottomControls = () => {
    setShowBottomControls(!showBottomControls);
  };

  // Handle processed guide data
  const handleGuideProcessed = (data, variables = {}) => {
    // Check if data is a special object with type (from loading saved thesis content)
    if (data && typeof data === 'object' && data.type === 'thesis_content') {
      // This is a saved thesis content file loaded via UploadThesisGuide
      if (!guideData) {
        // If no guide is currently loaded, alert the user with instructions
        alert('Please load the corresponding thesis guide first before loading saved content. \n\n' +
              'Workflow:\n' +
              '1. Load your thesis guide file (like Chapter 1-2 1IVDV.json)\n' +
              '2. Fill in required variables if prompted\n' +
              '3. Once the thesis interface appears, use the "Import" button at the bottom to load saved content.');
      } else {
        // Guide is loaded, set the thesis content and variables
        setThesisContent(data.thesisContent);
        setFilledVariables(data.variables || {});
      }
    } else if (data && typeof data === 'object' && data.type === 'thesis_complete') {
      // This is a complete thesis with both guide structure and content
      setGuideData(data.guideStructure);
      setThesisContent(data.thesisContent);
      setFilledVariables(data.variables || {});
    } else if (data && typeof data === 'object' && data.type === 'saved_thesis') {
      // This is another format of saved thesis file
      alert('Please use the import button in the main application to load this saved thesis content.');
    } else if (data.thesisContent) {
      // This is an exported thesis file with thesisContent
      if (!guideData) {
        alert('Please load the corresponding thesis guide first before loading saved content. \n\n' +
              'Workflow:\n' +
              '1. Load your thesis guide file (like Chapter 1-2 1IVDV.json)\n' +
              '2. Fill in required variables if prompted\n' +
              '3. Once the thesis interface appears, use the "Import" button at the bottom to load saved content.');
      } else {
        setThesisContent(data.thesisContent);
        if (data.variables) {
          setFilledVariables(data.variables);
        }
      }
    } else {
      // This is a guide template, set the guide data and clear any existing content
      setGuideData(data);
      // Clear thesis content when loading a new guide to ensure empty textboxes
      setThesisContent({});
      // Clear literature review content as well
      setLiteratureReviewContent({});
      // Reset the initialization flag to allow re-initialization with empty content
      hasInitializedContent.current = false;
      // Clear filled variables as well since we're starting fresh
      setFilledVariables(variables || {});
      // Clear localStorage to prevent cross-contamination between different thesis projects
      localStorage.removeItem('thesisContent');
      localStorage.removeItem('currentChapter');
      // Also clear all sessions when loading a new guide
      localStorage.removeItem('thesis-sessions');
      const allSessionKeys = Object.keys(localStorage).filter(key => key.startsWith('thesis-session-'));
      allSessionKeys.forEach(key => localStorage.removeItem(key));
    }
  };

  // Initialize content with empty values only if not already set
  useEffect(() => {
    // Only initialize if guideData exists and thesisContent is empty (no imported content)
    // and we haven't initialized content before
    if (guideData && Object.keys(thesisContent).length === 0 && !hasInitializedContent.current) {
      const initialContent = {};
      guideData.chapters.forEach((chapter, chapterIndex) => {
        const chapterKey = `chapter-${chapterIndex}`; // Use 0-based indexing for content storage (match array indices)
        initialContent[chapterKey] = {};
        chapter.sections.forEach((section, sectionIndex) => {
          const sectionKey = `section-${sectionIndex}`; // Use 0-based indexing for content storage (match array indices)
          initialContent[chapterKey][sectionKey] = {};

          // For literature review sections, we handle initialization differently
          if (section.sectionTitle && section.sectionTitle.includes("Review of Related Literature")) {
            // Initialize with empty content, but we'll rely on literatureReviewContent for dynamic content
            section.contentBlocks.forEach((block, blockIndex) => {
              const blockKey = `block-${blockIndex}`; // Use 0-based indexing for content storage (match array indices)
              // Initialize with empty string for any initial blocks
              initialContent[chapterKey][sectionKey][blockKey] = '';
            });
          } else {
            // For all other sections, initialize with empty strings
            section.contentBlocks.forEach((block, blockIndex) => {
              const blockKey = `block-${blockIndex}`; // Use 0-based indexing for content storage (match array indices)
              // Only initialize with empty string, not the initial content from JSON
              initialContent[chapterKey][sectionKey][blockKey] = '';
            });
          }
        });
      });
      setThesisContent(initialContent);
      hasInitializedContent.current = true; // Mark as initialized
      // Reset to first chapter when guide is loaded
      setCurrentChapter(1);
    } else if (guideData && Object.keys(thesisContent).length > 0) {
      // If we have guideData and thesisContent already exists, mark as initialized
      hasInitializedContent.current = true;
    }
  }, [guideData, thesisContent]); // Run when either guideData or thesisContent changes

  // Handle text change
  const handleTextChange = (chapterIndex, sectionIndex, blockIndex, value) => {
    const newContent = { ...thesisContent };
    const chapterKey = `chapter-${chapterIndex}`; // Use 0-based indexing to match initialization
    const sectionKey = `section-${sectionIndex}`; // Use 0-based indexing to match initialization
    const blockKey = `block-${blockIndex}`; // Use 0-based indexing to match initialization

    if (!newContent[chapterKey]) {
      newContent[chapterKey] = {};
    }
    if (!newContent[chapterKey][sectionKey]) {
      newContent[chapterKey][sectionKey] = {};
    }
    newContent[chapterKey][sectionKey][blockKey] = value;
    setThesisContent(newContent);
  };

  // Handle table change
  const handleTableChange = (chapterIndex, sectionIndex, blockIndex, tableData) => {
    const newContent = { ...thesisContent };
    const chapterKey = `chapter-${chapterIndex}`; // Use 0-based indexing to match initialization
    const sectionKey = `section-${sectionIndex}`; // Use 0-based indexing to match initialization
    const blockKey = `block-${blockIndex}`; // Use 0-based indexing to match initialization

    if (!newContent[chapterKey]) {
      newContent[chapterKey] = {};
    }
    if (!newContent[chapterKey][sectionKey]) {
      newContent[chapterKey][sectionKey] = {};
    }
    newContent[chapterKey][sectionKey][blockKey] = tableData;
    setThesisContent(newContent);
  };

  // Handle image change
  const handleImageChange = (chapterIndex, sectionIndex, blockIndex, imageData) => {
    const newContent = { ...thesisContent };
    const chapterKey = `chapter-${chapterIndex}`; // Use 0-based indexing to match initialization
    const sectionKey = `section-${sectionIndex}`; // Use 0-based indexing to match initialization
    const blockKey = `block-${blockIndex}`; // Use 0-based indexing to match initialization

    if (!newContent[chapterKey]) {
      newContent[chapterKey] = {};
    }
    if (!newContent[chapterKey][sectionKey]) {
      newContent[chapterKey][sectionKey] = {};
    }
    newContent[chapterKey][sectionKey][blockKey] = imageData;
    setThesisContent(newContent);
  };

  // Check content using Gemini API
  const checkContent = async (content, initialContentText, requirements, blockId) => {
    if (!apiKey) {
      setShowApiKeyModal(true);
      return 'API key required';
    }

    // Prevent multiple concurrent requests for the same block
    const [chapterKey, sectionKey, blockKey] = blockId.split('|');
    const isCurrentlyChecking = apiResults[chapterKey]?.[sectionKey]?.[blockKey] === 'CHECKING...';
    if (isCurrentlyChecking) {
      // Already checking this block, so ignore the request
      return 'Already checking this content';
    }

    // Set a temporary status to indicate the block is being checked
    setApiResults(prevResults => {
      const updatedResults = { ...prevResults };
      if (!updatedResults[chapterKey]) updatedResults[chapterKey] = {};
      if (!updatedResults[chapterKey][sectionKey]) updatedResults[chapterKey][sectionKey] = {};
      updatedResults[chapterKey][sectionKey][blockKey] = 'CHECKING...';
      return updatedResults;
    });

    geminiService.setApiKey(apiKey);
    geminiService.setModel(selectedModel); // Set the selected model

    try {
      const result = await geminiService.checkContent(content, initialContentText, requirements);
      // Store the result in state
      setApiResults(prevResults => {
        const updatedResults = { ...prevResults };
        const [updatedResultsChapterKey, updatedResultsSectionKey, updatedResultsBlockKey] = blockId.split('|');

        if (!updatedResults[updatedResultsChapterKey]) updatedResults[updatedResultsChapterKey] = {};
        if (!updatedResults[updatedResultsChapterKey][updatedResultsSectionKey]) updatedResults[updatedResultsChapterKey][updatedResultsSectionKey] = {};
        updatedResults[updatedResultsChapterKey][updatedResultsSectionKey][updatedResultsBlockKey] = result;

        return updatedResults;
      });

      // Mark the block as checked
      setCheckedBlocks(prevChecked => {
        const updatedChecked = { ...prevChecked };
        const [checkedChapterKey, checkedSectionKey, checkedBlockKey] = blockId.split('|');

        if (!updatedChecked[checkedChapterKey]) updatedChecked[checkedChapterKey] = {};
        if (!updatedChecked[checkedChapterKey][checkedSectionKey]) updatedChecked[checkedChapterKey][checkedSectionKey] = {};
        updatedChecked[checkedChapterKey][checkedSectionKey][checkedBlockKey] = true;

        return updatedChecked;
      });

      console.log('Gemini API result:', result);
      return result;
    } catch (error) {
      console.error('Error checking content:', error);

      // Restore the previous result if there was one, or clear the checking status
      setApiResults(prevResults => {
        const updatedResults = { ...prevResults };
        if (!updatedResults[chapterKey]) updatedResults[chapterKey] = {};
        if (!updatedResults[chapterKey][sectionKey]) updatedResults[chapterKey][sectionKey] = {};
        if (updatedResults[chapterKey][sectionKey][blockKey] === 'CHECKING...') {
          delete updatedResults[chapterKey][sectionKey][blockKey];
        }
        return updatedResults;
      });

      // Show a more detailed error message to the user
      if (error.message.includes('429')) {
        alert(`Rate limit exceeded. Please wait before trying again: ${error.message}`);
      } else {
        alert(`Error checking content: ${error.message}`);
      }
      return 'Error checking content';
    }
  };

  // Check section requirements
  const checkSectionRequirements = async (section) => {
    if (!apiKey) {
      setShowApiKeyModal(true);
      return 'API key required';
    }

    geminiService.setApiKey(apiKey);
    geminiService.setModel(selectedModel); // Set the selected model

    try {
      const result = await geminiService.checkSectionRequirements(section);
      // In a real app, you might want to display this result to the user
      alert('Section requirements checked successfully! See console for details.');
      console.log('Gemini API result:', result);
      return result;
    } catch (error) {
      console.error('Error checking section requirements:', error);
      // Show a more detailed error message to the user
      alert(`Error checking section requirements: ${error.message}`);
      return 'Error checking section requirements';
    }
  };

  // Initialize literature review content based on existing thesis content
  useEffect(() => {
    if (guideData && thesisContent) {
      const newLiteratureReviewContent = {};

      // Identify literature review sections and initialize their content
      guideData.chapters.forEach((chapter, chapterIndex) => {
        const chapterKey = `chapter-${chapterIndex}`;
        if (thesisContent[chapterKey]) {
          chapter.sections.forEach((section, sectionIndex) => {
            // Check if this is a literature review section (by title)
            if (section.sectionTitle && section.sectionTitle.includes("Review of Related Literature")) {
              const sectionKey = `section-${sectionIndex}`;
              const sectionContent = thesisContent[chapterKey][sectionKey];

              if (sectionContent) {
                // Process each content block in the literature review section
                section.contentBlocks.forEach((block, blockIndex) => {
                  const blockKey = `block-${blockIndex}`;
                  const blockContentKey = `${chapterKey}-${sectionKey}-${blockKey}`;

                  // Get the content for this specific block
                  const content = sectionContent[blockKey] || '';

                  // Check if content is an object (new format with textp-x fields) or a string (old format)
                  if (typeof content === 'object' && content !== null) {
                    // New format: content is an object with textp-x fields
                    // Extract textp-x fields into an array of textbox objects
                    const textboxArray = [];
                    Object.keys(content)
                      .filter(key => key.startsWith('textp-'))
                      .sort((a, b) => {
                        // Sort by the number after 'textp-' to maintain order
                        const numA = parseInt(a.split('-')[1]);
                        const numB = parseInt(b.split('-')[1]);
                        return numA - numB;
                      })
                      .forEach((key, idx) => {
                        textboxArray.push({
                          id: idx,
                          content: content[key] || ''
                        });
                      });

                    newLiteratureReviewContent[blockContentKey] = textboxArray;
                  } else {
                    // Old format: content is a string, split by \n\n
                    // Split the content into multiple textboxes if it contains our separator
                    // Check if content is a string before calling split
                    const textboxContents = typeof content === 'string' ?
                      content.split('\n\n').filter(text => text.trim() !== '') :
                      [];

                    // Convert to array format for literature review textboxes
                    newLiteratureReviewContent[blockContentKey] = textboxContents.map((text, idx) => ({
                      id: idx,
                      content: text
                    }));
                  }
                });
              }
            }
          });
        }
      });

      setLiteratureReviewContent(newLiteratureReviewContent);
    }
  }, [thesisContent, guideData]);

  // Function to add a new literature review textbox
  const addLiteratureSubsection = (chapterKey, blockContentKey) => {
    setLiteratureReviewContent(prev => {
      const contentArray = prev[blockContentKey] || [];
      const newId = contentArray.length > 0 ? Math.max(...contentArray.map(item => item.id)) + 1 : 0;
      return {
        ...prev,
        [blockContentKey]: [
          ...contentArray,
          { id: newId, content: '' }
        ]
      };
    });
    // Keep the user on the same subsection, don't change currentLiteratureSubsection
  };

  // Function to remove a literature review textbox
  const removeLiteratureSubsection = (chapterKey, blockContentKey, textboxId) => {
    setLiteratureReviewContent(prev => {
      const contentArray = prev[blockContentKey] || [];
      if (contentArray.length <= 1) return prev; // Prevent removing the last textbox

      const updatedArray = contentArray.filter(item => item.id !== textboxId);

      // Update the current subsection if needed
      if (currentLiteratureSubsection >= updatedArray.length) {
        setCurrentLiteratureSubsection(Math.max(0, updatedArray.length - 1));
      }

      return {
        ...prev,
        [blockContentKey]: updatedArray
      };
    });
  };

  // Function to update literature review textbox content
  const updateLiteratureSubsectionContent = (chapterKey, blockContentKey, textboxId, content, blockType = 'subsection') => {
    setLiteratureReviewContent(prev => {
      const contentArray = prev[blockContentKey] || [];

      // For paragraph blocks, there should only be one textbox with id 0
      // So we update the entire array to maintain the single textbox structure
      if (blockType === 'paragraph') {
        return {
          ...prev,
          [blockContentKey]: [{ id: 0, content }]
        };
      }

      // For other block types, update the specific textbox as before
      return {
        ...prev,
        [blockContentKey]: contentArray.map(item =>
          item.id === textboxId ? { ...item, content } : item
        )
      };
    });
  };

  // Function to navigate to next literature subsection (between different subsections/blocks)
  const goToNextLiteratureSubsection = (chapterKey, sectionKey) => {
    const totalSubsections = guideData?.chapters[currentChapter - 1]?.sections[currentSectionIndex]?.contentBlocks?.length || 0;
    if (currentLiteratureSubsection < totalSubsections - 1) {
      setCurrentLiteratureSubsection(prev => prev + 1);
    }
  };

  // Function to navigate to previous literature subsection (between different subsections/blocks)
  const goToPreviousLiteratureSubsection = (chapterKey, sectionKey) => {
    if (currentLiteratureSubsection > 0) {
      setCurrentLiteratureSubsection(prev => prev - 1);
    }
  };

  // Function to navigate to next literature textbox within the same subsection
  const goToNextLiteratureTextbox = (chapterKey, blockContentKey) => {
    const textboxArray = literatureReviewContent[blockContentKey] || [{ id: 0, content: '' }];
    // For now, we'll just focus on the first textbox since we're displaying them one at a time per subsection
    // This will be updated as we implement multiple textboxes per subsection
  };

  // Function to navigate to previous literature textbox within the same subsection
  const goToPreviousLiteratureTextbox = (chapterKey, blockContentKey) => {
    // For now, we'll just focus on the first textbox since we're displaying them one at a time per subsection
    // This will be updated as we implement multiple textboxes per subsection
  };

  // Auto-save current session when content changes
  useEffect(() => {
    if (guideData && Object.keys(thesisContent).length > 0) {
      // Save current session with a slight delay to avoid too frequent saves
      const timer = setTimeout(() => {
        saveCurrentSession();
      }, 2000); // Save after 2 seconds of inactivity

      return () => clearTimeout(timer);
    }
  }, [thesisContent, filledVariables, currentChapter, guideData]);

  // Check for available sessions on app start
  useEffect(() => {
    const sessions = getAvailableSessions();
    if (sessions.length > 0) {
      setAvailableSessions(sessions);
      setShowSessionModal(true);
    }
  }, []);

  // Export thesis as JSON with variables included
  const exportThesis = (shouldDownload = true) => {
    if (thesisContent) {
      // Create a copy of thesisContent to potentially modify
      let exportContent = { ...thesisContent };

      // Process literature review sections to merge dynamic content with standard structure
      if (guideData && literatureReviewContent) {
        guideData.chapters.forEach((chapter, chapterIndex) => {
          const chapterKey = `chapter-${chapterIndex}`;
          if (chapter.sections) {
            chapter.sections.forEach((section, sectionIndex) => {
              // Check if this is a literature review section (by title)
              if (section.sectionTitle && section.sectionTitle.includes("Review of Related Literature")) {
                const sectionKey = `section-${sectionIndex}`;

                // Process each content block in the literature review section
                section.contentBlocks.forEach((block, blockIndex) => {
                  const blockKey = `block-${blockIndex}`;
                  const blockContentKey = `${chapterKey}-${sectionKey}-${blockKey}`;

                  // Get the textboxes for this specific block
                  const textboxArray = literatureReviewContent[blockContentKey] || [];

                  // Initialize the section in exportContent if it doesn't exist
                  if (!exportContent[chapterKey]) {
                    exportContent[chapterKey] = {};
                  }
                  if (!exportContent[chapterKey][sectionKey]) {
                    exportContent[chapterKey][sectionKey] = {};
                  }

                  if (textboxArray.length > 0) {
                    // For paragraph blocks, continue using the old string format
                    // For subsection blocks, use the new object format with textp-x fields
                    if (block.contentType === 'subsection') {
                      // Create object with textp-x fields for each textbox
                      const subsectionContent = {};
                      textboxArray.forEach((textbox, textboxIndex) => {
                        subsectionContent[`textp-${textboxIndex}`] = textbox.content || '';
                      });
                      exportContent[chapterKey][sectionKey][`block-${blockIndex}`] = subsectionContent;
                    } else {
                      // For paragraph blocks and other types, combine textboxes with \n\n
                      const combinedContent = textboxArray.map(textbox => textbox.content || '').join('\n\n');
                      exportContent[chapterKey][sectionKey][`block-${blockIndex}`] = combinedContent;
                    }
                  } else {
                    // Fallback to original content if no textboxes are present
                    exportContent[chapterKey][sectionKey][`block-${blockIndex}`] = thesisContent[chapterKey]?.[sectionKey]?.[blockKey] || '';
                  }
                });
              }
            });
          }
        });
      }

      // Export the student's work with 0-based indexing and variables
      const exportData = {
        thesisContent: exportContent, // Student's content with 0-based indexing (chapter-0, section-0, block-0)
        variables: filledVariables, // Variables used to fill placeholders
        projectTitle: guideData?.projectTitle,
        version: guideData?.version,
        exportDate: new Date().toISOString()
        // Note: We don't include guideStructure to allow flexibility when guide changes
      };
      const dataStr = JSON.stringify(exportData, null, 2);

      if (shouldDownload) {
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

        const exportFileDefaultName = 'thesis-content.json';

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        // Clear all sessions after successful export
        localStorage.removeItem('thesis-sessions');
        const allSessionKeys = Object.keys(localStorage).filter(key => key.startsWith('thesis-session-'));
        allSessionKeys.forEach(key => localStorage.removeItem(key));
      }

      return dataStr; // Return the data string for other uses
    }
  };

  // Export thesis to DOCX format
  const exportToDocx = async () => {
    if (!thesisContent || !guideData) {
      alert('No thesis content to export.');
      return;
    }

    try {
      // Prepare the data to send to the server
      const exportData = {
        thesisContent: thesisContent,
        guideData: guideData,
        filledVariables: filledVariables,
        template: docxTemplate
      };

      // Send a POST request to the server
      // For development, we use relative path, which will work when the backend is running
      // In production, the build is served by the same server with API endpoints
      // Check if we're running in development mode by checking the hostname
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiUrl = isDevelopment ? 'http://localhost:3000/api/export-docx' : '/api/export-docx';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      if (!response.ok) {
        // Try to parse as JSON first, but handle HTML responses
        let errorMessage = 'Failed to export to DOCX';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If JSON parsing fails, try to get text content
          try {
            const errorText = await response.text();
            // If it's HTML with a DOCTYPE, it's likely an error page
            if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
              errorMessage = `Server error: ${response.status} ${response.statusText}`;
            } else {
              errorMessage = errorText || errorMessage;
            }
          } catch (textError) {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      // Create a blob from the response and download it
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', 'thesis.docx');
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Clear all sessions after successful export
      localStorage.removeItem('thesis-sessions');
      const allSessionKeys = Object.keys(localStorage).filter(key => key.startsWith('thesis-session-'));
      allSessionKeys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error exporting to DOCX:', error);
      alert('Error exporting to DOCX: ' + error.message);
    }
  };

  // Session management functions
  const saveCurrentSession = () => {
    if (Object.keys(thesisContent).length > 0) { // Only save if there's actual content
      const sessionData = {
        thesisContent,
        literatureReviewContent, // Include the dynamic literature review content
        filledVariables,
        currentChapter,
        guideData, // Save the guide data as well to properly restore the interface
        projectTitle: guideData?.projectTitle,
        version: guideData?.version,
        savedAt: new Date().toISOString()
      };

      const sessionId = `thesis-session-${Date.now()}`;
      localStorage.setItem(sessionId, JSON.stringify(sessionData));

      // Also keep track of all session IDs
      const allSessions = JSON.parse(localStorage.getItem('thesis-sessions') || '[]');
      allSessions.push(sessionId);
      localStorage.setItem('thesis-sessions', JSON.stringify(allSessions));
    }
  };

  const getAvailableSessions = () => {
    try {
      const sessionIds = JSON.parse(localStorage.getItem('thesis-sessions') || '[]');
      const sessions = [];

      sessionIds.forEach(sessionId => {
        const sessionData = localStorage.getItem(sessionId);
        if (sessionData) {
          sessions.push({
            id: sessionId,
            data: JSON.parse(sessionData)
          });
        }
      });

      return sessions;
    } catch (error) {
      console.error('Error retrieving sessions:', error);
      return [];
    }
  };

  const deleteSession = (sessionId) => {
    localStorage.removeItem(sessionId);

    // Remove from the list of session IDs
    const allSessions = JSON.parse(localStorage.getItem('thesis-sessions') || '[]');
    const updatedSessions = allSessions.filter(id => id !== sessionId);
    localStorage.setItem('thesis-sessions', JSON.stringify(updatedSessions));
  };

  const restoreSession = (sessionData) => {
    setThesisContent(sessionData.thesisContent);
    setLiteratureReviewContent(sessionData.literatureReviewContent || {});
    setFilledVariables(sessionData.filledVariables || {});
    setCurrentChapter(sessionData.currentChapter || 1);

    // Restore guideData to ensure the thesis interface shows
    if (sessionData.guideData) {
      setGuideData(sessionData.guideData);
    }

    // Mark as initialized to ensure the content doesn't get reset
    hasInitializedContent.current = true;
  };

  // Use a ref to track if there are unsaved changes
  const hasUnsavedChangesRef = useRef(false);

  // Update the ref whenever thesisContent changes
  useEffect(() => {
    const hasContent = Object.keys(thesisContent).length > 0 &&
           Object.values(thesisContent).some(chapter =>
             Object.values(chapter).some(section =>
               Object.values(section).some(content => {
                 // Handle different types of content
                 if (typeof content === 'string') {
                   return content && content.trim() !== '';
                 } else if (typeof content === 'object' && content !== null) {
                   // For table data or other objects, check if they have meaningful content
                   if (content.data) {
                     // This is likely table data
                     return content.data && Object.keys(content.data).length > 0;
                   } else if (Array.isArray(content)) {
                     // This is an array
                     return content.length > 0;
                   } else {
                     // For other objects, check if they have any properties
                     return Object.keys(content).length > 0;
                   }
                 }
                 return false;
               })
             )
           );
    hasUnsavedChangesRef.current = hasContent;
  }, [thesisContent]);

  // Auto-save functionality triggered by beforeunload event
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (hasUnsavedChangesRef.current) {
        // Show browser's default warning about unsaved changes
        event.preventDefault();
        event.returnValue = 'Your work will be lost if you leave this page without exporting.';
      }
    };

    // Listen for beforeunload event
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup the event listener when component unmounts
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // Empty dependency array since we're using the ref

  // Import thesis from JSON
  const importThesis = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          // Check if the JSON has the new structure with guideStructure and variables
          if (jsonData.guideStructure) {
            // This is an exported file that contains guide structure, thesis content and variables
            setGuideData(jsonData.guideStructure);
            // Convert content from 1-based to 0-based indexing if needed for backward compatibility
            setThesisContent(convertContentToZeroBased(jsonData.thesisContent || {}));
            setFilledVariables(jsonData.variables || {});
            // Clear all sessions when importing new content
            localStorage.removeItem('thesis-sessions');
            const allSessionKeys = Object.keys(localStorage).filter(key => key.startsWith('thesis-session-'));
            allSessionKeys.forEach(key => localStorage.removeItem(key));
          } else if (jsonData.thesisContent) {
            // This is an exported file with just thesis content and variables
            const convertedContent = convertContentToZeroBased(jsonData.thesisContent);
            setThesisContent(convertedContent);

            // Initialize literatureReviewContent based on imported data
            if (guideData) {
              const importedLiteratureContent = {};

              // Identify literature review sections and initialize their content
              guideData.chapters.forEach((chapter, chapterIndex) => {
                const chapterKey = `chapter-${chapterIndex}`;
                if (convertedContent[chapterKey]) {
                  chapter.sections.forEach((section, sectionIndex) => {
                    // Check if this is a literature review section (by title)
                    if (section.sectionTitle && section.sectionTitle.includes("Review of Related Literature")) {
                      const sectionKey = `section-${sectionIndex}`;
                      const sectionContent = convertedContent[chapterKey][sectionKey];

                      if (sectionContent) {
                        // Process each content block in the literature review section
                        section.contentBlocks.forEach((block, blockIndex) => {
                          const blockKey = `block-${blockIndex}`;
                          const blockContentKey = `${chapterKey}-${sectionKey}-${blockKey}`;

                          // Get the content for this specific block
                          const content = sectionContent[blockKey] || '';

                          // Check if content is an object (new format with textp-x fields) or a string (old format)
                          if (typeof content === 'object' && content !== null) {
                            // New format: content is an object with textp-x fields
                            // Extract textp-x fields into an array of textbox objects
                            const textboxArray = [];
                            Object.keys(content)
                              .filter(key => key.startsWith('textp-'))
                              .sort((a, b) => {
                                // Sort by the number after 'textp-' to maintain order
                                const numA = parseInt(a.split('-')[1]);
                                const numB = parseInt(b.split('-')[1]);
                                return numA - numB;
                              })
                              .forEach((key, idx) => {
                                textboxArray.push({
                                  id: idx,
                                  content: content[key] || ''
                                });
                              });

                            importedLiteratureContent[blockContentKey] = textboxArray;
                          } else {
                            // Old format: content is a string, split by \n\n
                            // Split the content into multiple textboxes if it contains our separator
                            // Check if content is a string before calling split
                            const textboxContents = typeof content === 'string' ?
                              content.split('\n\n').filter(text => text.trim() !== '') :
                              [];

                            // Convert to array format for literature review textboxes
                            importedLiteratureContent[blockContentKey] = textboxContents.map((text, idx) => ({
                              id: idx,
                              content: text
                            }));
                          }
                        });
                      }
                    }
                  });
                }
              });

              setLiteratureReviewContent(importedLiteratureContent);
            }

            if (jsonData.variables) {
              setFilledVariables(jsonData.variables);
            }
            // Clear all sessions when importing new content
            localStorage.removeItem('thesis-sessions');
            const allSessionKeys = Object.keys(localStorage).filter(key => key.startsWith('thesis-session-'));
            allSessionKeys.forEach(key => localStorage.removeItem(key));
          } else {
            // For backward compatibility, if it's the old format
            const convertedContent = convertContentToZeroBased(jsonData);
            setThesisContent(convertedContent);

            // Initialize literatureReviewContent based on imported data
            if (guideData) {
              const importedLiteratureContent = {};

              // Identify literature review sections and initialize their content
              guideData.chapters.forEach((chapter, chapterIndex) => {
                const chapterKey = `chapter-${chapterIndex}`;
                if (convertedContent[chapterKey]) {
                  chapter.sections.forEach((section, sectionIndex) => {
                    // Check if this is a literature review section (by title)
                    if (section.sectionTitle && section.sectionTitle.includes("Review of Related Literature")) {
                      const sectionKey = `section-${sectionIndex}`;
                      const sectionContent = convertedContent[chapterKey][sectionKey];

                      if (sectionContent) {
                        // Process each content block in the literature review section
                        section.contentBlocks.forEach((block, blockIndex) => {
                          const blockKey = `block-${blockIndex}`;
                          const blockContentKey = `${chapterKey}-${sectionKey}-${blockKey}`;

                          // Get the content for this specific block
                          const content = sectionContent[blockKey] || '';

                          // Check if content is an object (new format with textp-x fields) or a string (old format)
                          if (typeof content === 'object' && content !== null) {
                            // New format: content is an object with textp-x fields
                            // Extract textp-x fields into an array of textbox objects
                            const textboxArray = [];
                            Object.keys(content)
                              .filter(key => key.startsWith('textp-'))
                              .sort((a, b) => {
                                // Sort by the number after 'textp-' to maintain order
                                const numA = parseInt(a.split('-')[1]);
                                const numB = parseInt(b.split('-')[1]);
                                return numA - numB;
                              })
                              .forEach((key, idx) => {
                                textboxArray.push({
                                  id: idx,
                                  content: content[key] || ''
                                });
                              });

                            importedLiteratureContent[blockContentKey] = textboxArray;
                          } else {
                            // Old format: content is a string, split by \n\n
                            // Split the content into multiple textboxes if it contains our separator
                            // Check if content is a string before calling split
                            const textboxContents = typeof content === 'string' ?
                              content.split('\n\n').filter(text => text.trim() !== '') :
                              [];

                            // Convert to array format for literature review textboxes
                            importedLiteratureContent[blockContentKey] = textboxContents.map((text, idx) => ({
                              id: idx,
                              content: text
                            }));
                          }
                        });
                      }
                    }
                  });
                }
              });

              setLiteratureReviewContent(importedLiteratureContent);
            }

            // Clear all sessions when importing new content
            localStorage.removeItem('thesis-sessions');
            const allSessionKeys = Object.keys(localStorage).filter(key => key.startsWith('thesis-session-'));
            allSessionKeys.forEach(key => localStorage.removeItem(key));
          }
        } catch (error) {
          alert('Error parsing JSON file: ' + error.message);
        }
      };
      reader.readAsText(file);
    } else {
      alert('Please upload a valid JSON file.');
    }
  };

  // Helper function to convert content from 1-based to 0-based indexing for backward compatibility
  const convertContentToZeroBased = (content) => {
    // Check if we have 1-based indexed content that needs conversion
    const hasOneBasedIndexing = Object.keys(content).some(key =>
      key.startsWith('chapter-') && parseInt(key.split('-')[1]) >= 1
    );

    if (!hasOneBasedIndexing) {
      // Already using 0-based indexing, return as is
      return content;
    }

    // Convert from 1-based to 0-based
    const converted = {};
    Object.entries(content).forEach(([key, value]) => {
      if (key.startsWith('chapter-')) {
        const chapterNum = parseInt(key.split('-')[1]);
        if (!isNaN(chapterNum) && chapterNum >= 1) {
          const newKey = `chapter-${chapterNum - 1}`;
          const newSections = {};
          Object.entries(value).forEach(([sectionKey, sectionValue]) => {
            if (sectionKey.startsWith('section-')) {
              const sectionNum = parseInt(sectionKey.split('-')[1]);
              if (!isNaN(sectionNum) && sectionNum >= 1) {
                const newSectionKey = `section-${sectionNum - 1}`;
                const newBlocks = {};
                Object.entries(sectionValue).forEach(([blockKey, blockValue]) => {
                  if (blockKey.startsWith('block-')) {
                    const blockNum = parseInt(blockKey.split('-')[1]);
                    if (!isNaN(blockNum) && blockNum >= 1) {
                      const newBlockKey = `block-${blockNum - 1}`;
                      newBlocks[newBlockKey] = blockValue;
                    } else {
                      newBlocks[blockKey] = blockValue;
                    }
                  } else {
                    newBlocks[blockKey] = blockValue;
                  }
                });
                newSections[newSectionKey] = newBlocks;
              } else {
                newSections[sectionKey] = sectionValue;
              }
            } else {
              newSections[sectionKey] = sectionValue;
            }
          });
          converted[newKey] = newSections;
        } else {
          converted[key] = value;
        }
      } else {
        converted[key] = value;
      }
    });
    return converted;
  };

  return (
    <div className={`App ${!showBottomControls ? 'bottom-controls-hidden' : ''}`}>
      <header className="bg-primary text-white p-3 mb-4">
        <div className="container d-flex justify-content-between align-items-center">
          <h1 className="h3 mb-0"><i className="fas fa-book me-2"></i>Thesis Maker</h1>
          <button
            className="btn btn-sm btn-light"
            onClick={toggleBottomControls}
            title={showBottomControls ? "Hide Controls" : "Show Controls"}
          >
            <i className={`fas ${showBottomControls ? 'fa-chevron-down' : 'fa-chevron-up'} me-1`}></i>
            {showBottomControls ? "Hide" : "Show"} Controls
          </button>
        </div>
      </header>

      <div className="container">
        {!guideData ? (
          <UploadThesisGuide onGuideProcessed={handleGuideProcessed} />
        ) : (
          <div className="thesis-app">
            {/* Navigation */}
            <div className="card mb-4">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <h3 className="mb-0">{guideData.chapters[currentChapter - 1]?.chapterTitle || 'Chapter'}</h3>
                  <div>
                    <button
                      className="btn btn-outline-secondary me-2"
                      onClick={() => {
                        setCurrentChapter(Math.max(1, currentChapter - 1));
                        setCurrentSectionIndex(0); // Reset to first section when changing chapters
                      }}
                      disabled={currentChapter <= 1}
                    >
                      <i className="fas fa-arrow-left"></i> Previous
                    </button>
                    <span className="mx-2">
                      Chapter {currentChapter} of {guideData.chapters.length}
                    </span>
                    <button
                      className="btn btn-outline-secondary ms-2"
                      onClick={() => {
                        setCurrentChapter(Math.min(guideData.chapters.length, currentChapter + 1));
                        setCurrentSectionIndex(0); // Reset to first section when changing chapters
                      }}
                      disabled={currentChapter >= guideData.chapters.length}
                    >
                      Next <i className="fas fa-arrow-right"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Navigation Controls */}
            <div className="card mb-3">
              <div className="card-body d-flex justify-content-between align-items-center">
                <div>
                  <span className="me-3">
                    <strong>Section {currentSectionIndex + 1} of {guideData.chapters[currentChapter - 1]?.sections.length}</strong>
                  </span>
                  <span>
                    {guideData.chapters[currentChapter - 1]?.sections[currentSectionIndex]?.sectionTitle}
                  </span>
                </div>
                <div>
                  <button
                    className="btn btn-outline-secondary me-2"
                    onClick={() => setCurrentSectionIndex(Math.max(0, currentSectionIndex - 1))}
                    disabled={currentSectionIndex <= 0}
                  >
                    <i className="fas fa-arrow-left"></i> Previous
                  </button>
                  <button
                    className="btn btn-outline-secondary ms-2"
                    onClick={() => setCurrentSectionIndex(Math.min(guideData.chapters[currentChapter - 1].sections.length - 1, currentSectionIndex + 1))}
                    disabled={currentSectionIndex >= (guideData.chapters[currentChapter - 1]?.sections.length - 1)}
                  >
                    Next <i className="fas fa-arrow-right"></i>
                  </button>
                </div>
              </div>
            </div>

            {/* Current Section Content */}
            <div className={`chapter-content ${!showBottomControls ? 'bottom-controls-hidden' : ''}`}>
              {guideData.chapters[currentChapter - 1]?.sections[currentSectionIndex] && (
                <div className="section mb-4">
                  <div className="card">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">{guideData.chapters[currentChapter - 1].sections[currentSectionIndex].sectionTitle}</h5>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => checkSectionRequirements(guideData.chapters[currentChapter - 1].sections[currentSectionIndex])}
                        title="Check section requirements"
                      >
                        <i className="fas fa-clipboard-check"></i> Check Requirements
                      </button>
                    </div>
                    <div className="card-body">
                      {guideData.chapters[currentChapter - 1].sections[currentSectionIndex].sectionGuide && (
                        <div className="section-guide alert alert-info">
                          <strong>Guide:</strong> {guideData.chapters[currentChapter - 1].sections[currentSectionIndex].sectionGuide}
                        </div>
                      )}

                      {/* Content Blocks */}
                      {(() => {
                        const isLiteratureReviewSection = guideData.chapters[currentChapter - 1].sections[currentSectionIndex].sectionTitle &&
                          guideData.chapters[currentChapter - 1].sections[currentSectionIndex].sectionTitle.includes("Review of Related Literature");

                        if (isLiteratureReviewSection) {
                          // Handle Literature Review section with multiple textboxes within subsections
                          const chapterKey = `chapter-${currentChapter - 1}`;
                          const sectionKey = `section-${currentSectionIndex}`;
                          const lrKey = `${chapterKey}-${sectionKey}`;

                          // Get the current content block based on the current literature subsection index
                          const contentBlocks = guideData.chapters[currentChapter - 1].sections[currentSectionIndex].contentBlocks;
                          const currentBlockIndex = Math.min(currentLiteratureSubsection, contentBlocks.length - 1);
                          const currentBlock = contentBlocks[currentBlockIndex];

                          // Initialize textbox array for this block if not already done
                          const currentBlockKey = `block-${currentBlockIndex}`;
                          const blockContentKey = `${lrKey}-${currentBlockKey}`;

                          if (!literatureReviewContent[blockContentKey]) {
                            // Initialize with one empty textbox
                            setLiteratureReviewContent(prev => ({
                              ...prev,
                              [blockContentKey]: [{ id: 0, content: thesisContent[chapterKey]?.[sectionKey]?.[currentBlockKey] || '' }]
                            }));
                          }

                          const baseTextboxArray = literatureReviewContent[blockContentKey] || [{ id: 0, content: '' }];
                          // For paragraph blocks, ensure exactly one textbox is always present
                          const textboxArray = currentBlock.contentType === 'paragraph'
                            ? [{ id: 0, content: baseTextboxArray[0]?.content || '' }]
                            : baseTextboxArray;
                          const textboxCount = contentBlocks.length; // Number of subsections

                          return (
                            <div className="content-block mb-3">
                              {/* Literature Review Subsection Navigation Controls */}
                              <div className="card mb-3">
                                <div className="card-body d-flex justify-content-between align-items-center">
                                  <div>
                                    <span className="me-3">
                                      <strong>Subsection {currentLiteratureSubsection + 1} of {textboxCount}: {currentBlock?.subsectionTitle || `Block ${currentBlockIndex + 1}`}</strong>
                                    </span>
                                  </div>
                                  <div>
                                    <button
                                      className="btn btn-outline-secondary me-2"
                                      onClick={() => goToPreviousLiteratureSubsection(chapterKey, sectionKey)}
                                      disabled={currentLiteratureSubsection <= 0}
                                    >
                                      <i className="fas fa-arrow-left"></i> Previous Subsection
                                    </button>
                                    <button
                                      className="btn btn-outline-secondary"
                                      onClick={() => goToNextLiteratureSubsection(chapterKey, sectionKey)}
                                      disabled={currentLiteratureSubsection >= (textboxCount - 1)}
                                    >
                                      Next Subsection <i className="fas fa-arrow-right"></i>
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <label className="form-label">
                                <strong>{currentBlock.contentType} {currentBlock.contentNumber}:</strong>
                                {currentBlock.subsectionTitle && <span> {currentBlock.subsectionTitle}</span>}
                              </label>

                              {/* Display all textboxes in this subsection with add textbox button */}
                              {textboxArray.map((textbox, textboxIdx) => (
                                <div key={textbox.id} className="d-flex flex-column flex-md-row align-items-start mb-3">
                                  <div className="flex-grow-1 mb-2 mb-md-0 me-md-2">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                      <label className="form-label fw-bold">Textbox {textboxIdx + 1} Content:</label>
                                      <small className="text-muted">
                                        {textbox.content?.length || 0} / 11,000 characters
                                      </small>
                                    </div>
                                    <textarea
                                      className="form-control"
                                      rows="12"
                                      value={textbox.content || ''}
                                      onChange={(e) => updateLiteratureSubsectionContent(
                                        chapterKey,
                                        blockContentKey,
                                        textbox.id,
                                        e.target.value,
                                        currentBlock.contentType
                                      )}
                                    />
                                  </div>
                                  {(checkedBlocks[chapterKey]?.[sectionKey]?.[`${currentBlockKey}-lr-${textbox.id}`]) && (
                                    <div className="flex-grow-1 mb-2 mb-md-0 ms-md-2">
                                      <label className="form-label fw-bold">Evaluation Results:</label>
                                      <textarea
                                        className="form-control"
                                        rows="12"
                                        value={apiResults[chapterKey]?.[sectionKey]?.[`${currentBlockKey}-lr-${textbox.id}`] || ''}
                                        readOnly
                                      />
                                    </div>
                                  )}
                                  <div className="ms-md-2 mt-4 d-flex align-items-start">
                                    <button
                                      className="btn btn-sm btn-success"
                                      onClick={() => checkContent(
                                        textbox.content || '',
                                        currentBlock.content?.text || '',
                                        currentBlock.requirements,
                                        `${chapterKey}|${sectionKey}|${currentBlockKey}-lr-${textbox.id}`
                                      )}
                                    >
                                      <i className="fas fa-check-circle"></i> Check
                                    </button>
                                  </div>
                                </div>
                              ))}

                              {/* Add textbox button for this content block - only show for subsections */}
                              {currentBlock.contentType === 'subsection' && (
                                <div className="d-flex justify-content-center mt-3">
                                  <button
                                    className="btn btn-outline-primary"
                                    onClick={() => addLiteratureSubsection(chapterKey, blockContentKey)}
                                  >
                                    <i className="fas fa-plus"></i> Add Textbox
                                  </button>
                                </div>
                              )}

                              {/* Display textbox management buttons when more than one textbox exists */}
                              {textboxArray.length > 1 && (
                                <div className="mt-2">
                                  <div className="d-flex flex-wrap gap-2">
                                    {textboxArray.map((textbox, idx) => (
                                      <div key={textbox.id} className="d-flex align-items-center">
                                        <span className="me-2">Textbox {idx + 1}</span>
                                        {currentBlock.contentType !== 'paragraph' && ( // Only allow removal for non-paragraph blocks
                                          <button
                                            className="btn btn-sm btn-outline-danger"
                                            onClick={() => removeLiteratureSubsection(chapterKey, blockContentKey, textbox.id)}
                                            title="Remove textbox"
                                          >
                                            <i className="fas fa-times"></i>
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        } else {
                          // Handle all other sections normally
                          return guideData.chapters[currentChapter - 1].sections[currentSectionIndex].contentBlocks.map((block, blockIndex) => (
                            <div key={blockIndex} className="content-block mb-3">
                              <label className="form-label">
                                <strong>{block.contentType} {block.contentNumber}:</strong>
                                {block.subsectionTitle && <span> {block.subsectionTitle}</span>}
                              </label>

                              {block.contentType === 'paragraph' || block.contentType === 'subsection' ? (
                                <div>
                                  {block.content.text && (
                                    <div className="initial-content mb-2">
                                      <label className="form-label fw-bold">Initial Content Text:</label>
                                      <p className="form-control-plaintext">{block.content.text}</p>
                                    </div>
                                  )}
                                  <div className="d-flex flex-column flex-md-row">
                                    <div className="flex-grow-1 mb-2 mb-md-0 me-md-2">
                                      <label className="form-label fw-bold">Content Text:</label>
                                      <textarea
                                        className="form-control"
                                        rows="12"
                                        value={thesisContent[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`] || ''}
                                        onChange={(e) => handleTextChange(currentChapter - 1, currentSectionIndex, blockIndex, e.target.value)}
                                      />
                                    </div>
                                    {(checkedBlocks[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`]) && (
                                      <div className="flex-grow-1 mb-2 mb-md-0 ms-md-2">
                                        <label className="form-label fw-bold">Evaluation Results:</label>
                                        <textarea
                                          className="form-control"
                                          rows="12"
                                          value={apiResults[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`] || ''}
                                          readOnly
                                        />
                                      </div>
                                    )}
                                    <div className="ms-md-2 mt-4 d-flex align-items-start">
                                      <button
                                        className="btn btn-sm btn-success"
                                        onClick={() => checkContent(
                                          thesisContent[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`] || '',
                                          block.content?.text || '',
                                          block.requirements,
                                          `chapter-${currentChapter - 1}|section-${currentSectionIndex}|block-${blockIndex}`
                                        )}
                                      >
                                        <i className="fas fa-check-circle"></i> Check
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : block.contentType === 'combo' ? (
                                <div>
                                  {block.content.pText && (
                                    <div className="initial-content mb-2">
                                      <label className="form-label fw-bold">Initial Content Text:</label>
                                      <p className="form-control-plaintext">{block.content.pText}</p>
                                    </div>
                                  )}
                                  <div className="d-flex flex-column flex-md-row">
                                    <div className="flex-grow-1 mb-2 mb-md-0 me-md-2">
                                      <label className="form-label fw-bold">Content Text:</label>
                                      <textarea
                                        className="form-control mb-2"
                                        rows="12"
                                        value={thesisContent[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`] || ''}
                                        onChange={(e) => handleTextChange(currentChapter - 1, currentSectionIndex, blockIndex, e.target.value)}
                                      />
                                    </div>
                                    {(checkedBlocks[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`]) && (
                                      <div className="flex-grow-1 mb-2 mb-md-0 ms-md-2">
                                        <label className="form-label fw-bold">Evaluation Results:</label>
                                        <textarea
                                          className="form-control mb-2"
                                          rows="12"
                                          value={apiResults[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`] || ''}
                                          readOnly
                                        />
                                      </div>
                                    )}
                                    <div className="ms-md-2 mt-4 d-flex align-items-start">
                                      <button
                                        className="btn btn-sm btn-success"
                                        onClick={() => checkContent(
                                          thesisContent[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`] || '',
                                          block.content?.pText || '',
                                          block.requirements,
                                          `chapter-${currentChapter - 1}|section-${currentSectionIndex}|block-${blockIndex}`
                                        )}
                                      >
                                        <i className="fas fa-check-circle"></i> Check
                                      </button>
                                    </div>
                                  </div>
                                  {block.content.lText && block.content.lText.map((listItem, idx) => (
                                    <div key={idx} className="d-flex flex-column flex-md-row">
                                      <div className="flex-grow-1 mb-2 mb-md-0 me-md-2">
                                        <div className="initial-content mb-2">
                                          <label className="form-label fw-bold">Initial Content Text:</label>
                                          <p className="form-control-plaintext">{listItem}</p>
                                        </div>
                                        <div>
                                          <label className="form-label fw-bold">List Item {idx + 1}:</label>
                                          <textarea
                                            className="form-control"
                                            rows="2"
                                            value={thesisContent[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}-list-${idx}`] || ''}
                                            onChange={(e) => handleTextChange(currentChapter - 1, currentSectionIndex, `${blockIndex}-list-${idx}`, e.target.value)}
                                          />
                                        </div>
                                      </div>
                                      {(checkedBlocks[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}-list-${idx}`]) && (
                                        <div className="flex-grow-1 mb-2 mb-md-0 ms-md-2">
                                          <label className="form-label fw-bold">Evaluation Results:</label>
                                          <textarea
                                            className="form-control"
                                            rows="2"
                                            value={apiResults[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}-list-${idx}`] || ''}
                                            readOnly
                                          />
                                        </div>
                                      )}
                                      <div className="ms-md-2 mt-4 d-flex align-items-start">
                                        <button
                                          className="btn btn-sm btn-success"
                                          onClick={() => checkContent(
                                            thesisContent[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}-list-${idx}`] || '',
                                            listItem, // Pass the initial content as the list item text
                                            block.requirements,
                                            `chapter-${currentChapter - 1}|section-${currentSectionIndex}|block-${blockIndex}-list-${idx}`
                                          )}
                                        >
                                          <i className="fas fa-check-circle"></i> Check
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : block.contentType === 'list' ? (
                                <div>
                                  {block.content.items && block.content.items.map((listItem, idx) => (
                                    <div key={idx} className="d-flex flex-column flex-md-row">
                                      <div className="flex-grow-1 mb-2 mb-md-0 me-md-2">
                                        <label className="form-label fw-bold">List Item {idx + 1}:</label>
                                        <textarea
                                          className="form-control"
                                          rows="2"
                                          value={thesisContent[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}-item-${idx}`] || ''}
                                          onChange={(e) => handleTextChange(currentChapter - 1, currentSectionIndex, `${blockIndex}-item-${idx}`, e.target.value)}
                                        />
                                      </div>
                                      {(checkedBlocks[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}-item-${idx}`]) && (
                                        <div className="flex-grow-1 mb-2 mb-md-0 ms-md-2">
                                          <label className="form-label fw-bold">Evaluation Results:</label>
                                          <textarea
                                            className="form-control"
                                            rows="2"
                                            value={apiResults[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}-item-${idx}`] || ''}
                                            readOnly
                                          />
                                        </div>
                                      )}
                                      <div className="ms-md-2 mt-4 d-flex align-items-start">
                                        <button
                                          className="btn btn-sm btn-success"
                                          onClick={() => checkContent(
                                            thesisContent[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}-item-${idx}`] || '',
                                            listItem, // Pass the initial content as the list item text
                                            block.requirements,
                                            `chapter-${currentChapter - 1}|section-${currentSectionIndex}|block-${blockIndex}-item-${idx}`
                                          )}
                                        >
                                          <i className="fas fa-check-circle"></i> Check
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : block.contentType === 'table' ? (
                                <div className="table-container">
                                  <p className="fw-bold">{block.content.tableTitle || 'Table'}</p>
                                  <p>{block.content.description}</p>
                                  <div className="d-flex flex-column flex-md-row">
                                    <div className="flex-grow-1 mb-2 mb-md-0 me-md-2">
                                      <label className="form-label fw-bold">Table Content:</label>
                                      {/* Table Editor */}
                                      <TableEditor
                                        blockId={`chapter-${currentChapter - 1}|section-${currentSectionIndex}|block-${blockIndex}`}
                                        initialTableData={thesisContent[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`] || { rows: 2, cols: 2, data: [] }}
                                        onTableChange={(tableData) => handleTableChange(currentChapter - 1, currentSectionIndex, blockIndex, tableData)}
                                      />
                                    </div>
                                    {(checkedBlocks[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`]) && (
                                      <div className="flex-grow-1 mb-2 mb-md-0 ms-md-2">
                                        <label className="form-label fw-bold">Evaluation Results:</label>
                                        <textarea
                                          className="form-control"
                                          rows="12"
                                          value={apiResults[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`] || ''}
                                          readOnly
                                        />
                                      </div>
                                    )}
                                    <div className="ms-md-2 mt-4 d-flex align-items-start">
                                      <button
                                        className="btn btn-sm btn-success"
                                        onClick={() => checkContent(
                                          JSON.stringify(thesisContent[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`] || { rows: 2, cols: 2, data: [] }),
                                          block.content?.tableTitle || block.content?.text || '',
                                          block.requirements,
                                          `chapter-${currentChapter - 1}|section-${currentSectionIndex}|block-${blockIndex}`
                                        )}
                                      >
                                        <i className="fas fa-check-circle"></i> Check
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : block.contentType === 'image' ? (
                                // Only show image upload for Conceptual Framework sections
                                guideData.chapters[currentChapter - 1].sections[currentSectionIndex].sectionTitle.toLowerCase().includes('conceptual framework') ? (
                                  <div className="image-container">
                                    <p className="fw-bold">{block.content.title || 'Image'}</p>
                                    <p>{block.content.description}</p>
                                    <div className="d-flex flex-column flex-md-row">
                                      <div className="flex-grow-1 mb-2 mb-md-0 me-md-2">
                                        <label className="form-label fw-bold">Image Content:</label>
                                        {/* Image Upload */}
                                        <ImageUpload
                                          blockId={`chapter-${currentChapter - 1}|section-${currentSectionIndex}|block-${blockIndex}`}
                                          initialImageData={thesisContent[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`] || null}
                                          onImageChange={(imageData) => handleImageChange(currentChapter - 1, currentSectionIndex, blockIndex, imageData)}
                                        />
                                      </div>
                                      {(checkedBlocks[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`]) && (
                                        <div className="flex-grow-1 mb-2 mb-md-0 ms-md-2">
                                          <label className="form-label fw-bold">Evaluation Results:</label>
                                          <textarea
                                            className="form-control"
                                            rows="12"
                                            value={apiResults[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`] || ''}
                                            readOnly
                                          />
                                        </div>
                                      )}
                                      <div className="ms-md-2 mt-4 d-flex align-items-start">
                                        <button
                                          className="btn btn-sm btn-success"
                                          onClick={() => checkContent(
                                            JSON.stringify(thesisContent[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`] || {}),
                                            block.content?.title || block.content?.text || '',
                                            block.requirements,
                                            `chapter-${currentChapter - 1}|section-${currentSectionIndex}|block-${blockIndex}`
                                          )}
                                        >
                                          <i className="fas fa-check-circle"></i> Check
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  // For non-Conceptual Framework sections, treat as regular content
                                  <div>
                                    {block.content.text && (
                                      <div className="initial-content mb-2">
                                        <label className="form-label fw-bold">Initial Content Text:</label>
                                        <p className="form-control-plaintext">{block.content.text}</p>
                                      </div>
                                    )}
                                    <div className="d-flex flex-column flex-md-row">
                                      <div className="flex-grow-1 mb-2 mb-md-0 me-md-2">
                                        <label className="form-label fw-bold">Content Text:</label>
                                        <textarea
                                          className="form-control"
                                          rows="12"
                                          value={thesisContent[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`] || ''}
                                          onChange={(e) => handleTextChange(currentChapter - 1, currentSectionIndex, blockIndex, e.target.value)}
                                        />
                                      </div>
                                      {(checkedBlocks[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`]) && (
                                        <div className="flex-grow-1 mb-2 mb-md-0 ms-md-2">
                                          <label className="form-label fw-bold">Evaluation Results:</label>
                                          <textarea
                                            className="form-control"
                                            rows="12"
                                            value={apiResults[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`] || ''}
                                            readOnly
                                          />
                                        </div>
                                      )}
                                      <div className="ms-md-2 mt-4 d-flex align-items-start">
                                        <button
                                          className="btn btn-sm btn-success"
                                          onClick={() => checkContent(
                                            thesisContent[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`] || '',
                                            block.content?.text || '',
                                            block.requirements,
                                            `chapter-${currentChapter - 1}|section-${currentSectionIndex}|block-${blockIndex}`
                                          )}
                                        >
                                          <i className="fas fa-check-circle"></i> Check
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              ) : (block.contentType && typeof block.contentType === 'string' && block.contentType.trim().toLowerCase() === 'figure') ? (
                                <div className="figure-container">
                                  <p className="fw-bold">{block.content.figureTitle || 'Figure'}</p>
                                  <p>{block.content.description}</p>
                                  <div className="alert alert-info">
                                    <p><strong>Figure is in the Docx</strong></p>
                                    <small>The figure will be included in the exported document.</small>
                                  </div>
                                  {/* FigureEditor to maintain data structure for export - renders nothing visible */}
                                  <FigureEditor
                                    blockId={`chapter-${currentChapter - 1}|section-${currentSectionIndex}|block-${blockIndex}`}
                                    initialFigureData={thesisContent[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`] || { type: block.content.type || 'IV, DV, MODV', iv: '', dv: '', modv: '', iv1: '', iv2: '' }}
                                    onFigureChange={(figureData) => {
                                      // Update thesis content when figure data changes
                                      const newContent = { ...thesisContent };
                                      const chapterKey = `chapter-${currentChapter - 1}`;
                                      const sectionKey = `section-${currentSectionIndex}`;
                                      const blockKey = `block-${blockIndex}`;

                                      if (!newContent[chapterKey]) {
                                        newContent[chapterKey] = {};
                                      }
                                      if (!newContent[chapterKey][sectionKey]) {
                                        newContent[chapterKey][sectionKey] = {};
                                      }
                                      newContent[chapterKey][sectionKey][blockKey] = figureData;
                                      setThesisContent(newContent);
                                    }}
                                  />
                                </div>
                              ) : (
                                <div>
                                  {block.content.text && (
                                    <div className="initial-content mb-2">
                                      <label className="form-label fw-bold">Initial Content Text:</label>
                                      <p className="form-control-plaintext">{block.content.text}</p>
                                    </div>
                                  )}
                                  <div className="d-flex flex-column flex-md-row">
                                    <div className="flex-grow-1 mb-2 mb-md-0 me-md-2">
                                      <label className="form-label fw-bold">Content Text:</label>
                                      <textarea
                                        className="form-control"
                                        rows="12"
                                        value={thesisContent[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`] || ''}
                                        onChange={(e) => handleTextChange(currentChapter - 1, currentSectionIndex, blockIndex, e.target.value)}
                                      />
                                    </div>
                                    {(checkedBlocks[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`]) && (
                                      <div className="flex-grow-1 mb-2 mb-md-0 ms-md-2">
                                        <label className="form-label fw-bold">Evaluation Results:</label>
                                        <textarea
                                          className="form-control"
                                          rows="12"
                                          value={apiResults[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`] || ''}
                                          readOnly
                                        />
                                      </div>
                                    )}
                                    <div className="ms-md-2 mt-4 d-flex align-items-start">
                                      <button
                                        className="btn btn-sm btn-success"
                                        onClick={() => checkContent(
                                          thesisContent[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}`] || '',
                                          block.content?.text || '',
                                          block.requirements,
                                          `chapter-${currentChapter - 1}|section-${currentSectionIndex}|block-${blockIndex}`
                                        )}
                                      >
                                        <i className="fas fa-check-circle"></i> Check
                                      </button>
                                    </div>
                                  </div>

                                  {/* Add image upload after content text for Conceptual Framework sections, but only if there isn't already an explicit image content type */}
                                  {guideData.chapters[currentChapter - 1].sections[currentSectionIndex].sectionTitle.toLowerCase().includes('conceptual framework') &&
                                   !guideData.chapters[currentChapter - 1].sections[currentSectionIndex].contentBlocks.some(cb => cb.contentType === 'image') && (
                                    <div className="mt-3">
                                      <label className="form-label fw-bold">Conceptual Framework Image:</label>
                                      <ImageUpload
                                        blockId={`chapter-${currentChapter - 1}|section-${currentSectionIndex}|block-${blockIndex}-image`}
                                        initialImageData={thesisContent[`chapter-${currentChapter - 1}`]?.[`section-${currentSectionIndex}`]?.[`block-${blockIndex}-image`] || null}
                                        onImageChange={(imageData) => handleImageChange(currentChapter - 1, currentSectionIndex, `${blockIndex}-image`, imageData)}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}

                              {block.specialInstructions && (
                                <div className="special-instructions mt-2">
                                  <label className="form-label fw-bold">Special Instructions:</label>
                                  <p className="text-muted">{block.specialInstructions}</p>
                                </div>
                              )}

                              {block.notes && (
                                <div className="notes mt-2">
                                  <label className="form-label fw-bold">Notes:</label>
                                  <p className="text-muted">{block.notes}</p>
                                </div>
                              )}

                              {block.requirements && block.requirements.length > 0 && (
                                <div className="requirements mt-2">
                                  <label className="form-label fw-bold">Requirements:</label>
                                  <ul className="list-group list-group-flush">
                                    {block.requirements.map((req, idx) => (
                                      <li key={idx} className="list-group-item py-1 px-2">
                                        <small className="text-muted">{req}</small>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Individual check buttons are added within each content area */}
                            </div>
                          ));
                        }
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top Controls - Always visible */}
        {showBottomControls && (
          <div className="controls fixed-bottom bg-light border-top p-2">
            <div className="container">
              <div className="d-flex justify-content-between">
                <div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={importThesis}
                    className="form-control form-control-sm d-inline-block me-2"
                    style={{width: '200px'}}
                  />
                  <button
                    className={`btn btn-sm ${hasUnsavedChangesRef.current ? 'btn-warning' : 'btn-primary'} me-2`}
                    onClick={exportThesis}
                  >
                    <i className="fas fa-download"></i> {hasUnsavedChangesRef.current ? 'Export JSON (Modified!)' : 'Export JSON'}
                  </button>
                  <div className="d-flex align-items-center me-2">
                    <label htmlFor="docxTemplateSelect" className="me-2 mb-0" style={{fontSize: '0.9rem'}}>DOCX Template:</label>
                    <select
                      id="docxTemplateSelect"
                      className="form-select form-select-sm me-2"
                      value={docxTemplate}
                      onChange={(e) => setDocxTemplate(e.target.value)}
                      style={{minWidth: '120px'}}
                    >
                      <option value="standard">Standard</option>
                      <option value="academic">Academic</option>
                      <option value="modern">Modern</option>
                      <option value="arial">Arial</option>
                    </select>
                  </div>
                  <button
                    className="btn btn-sm btn-outline-secondary me-2"
                    onClick={exportToDocx}
                    title="Export to DOCX format"
                  >
                    <i className="fas fa-file-word"></i> Export DOCX
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary me-2"
                    onClick={() => setShowApiKeyModal(true)}
                  >
                    <i className="fas fa-key"></i> API Key
                  </button>
                  <div className="d-flex align-items-center me-2">
                    <label htmlFor="modelSelect" className="me-2 mb-0" style={{fontSize: '0.9rem'}}>Model:</label>
                    <select
                      id="modelSelect"
                      className="form-select form-select-sm"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      style={{minWidth: '160px'}}
                    >
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                      <option value="gemini-flash-2">Latest Gemini Flash</option>
                    </select>
                  </div>
                </div>
                <div>
                  <small className="text-muted">Chapter {currentChapter} of {guideData?.chapters.length || 0}</small>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Session Recovery Modal */}
        {showSessionModal && (
          <div className="modal-backdrop fade show" style={{zIndex: 1050}}></div>
        )}
        <div className={`modal ${showSessionModal ? 'show d-block' : ''}`} style={{zIndex: 1051}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Recover Previous Work</h5>
                <button type="button" className="btn-close" onClick={() => setShowSessionModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>You have previous work saved. Please select an option:</p>
                <div className="list-group">
                  {availableSessions.map((session, index) => (
                    <div key={session.id} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">Session {index + 1}</h6>
                          <small className="text-muted">
                            Saved at: {new Date(session.data.savedAt).toLocaleString()}
                          </small>
                          {session.data.projectTitle && (
                            <div>
                              <small className="text-muted">Project: {session.data.projectTitle}</small>
                            </div>
                          )}
                        </div>
                        <div>
                          <button
                            className="btn btn-sm btn-success me-2"
                            onClick={() => {
                              restoreSession(session.data);
                              setShowSessionModal(false);
                            }}
                          >
                            Restore
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => {
                              deleteSession(session.id);
                              setAvailableSessions(prev => prev.filter(s => s.id !== session.id));
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setAvailableSessions([]);
                    localStorage.removeItem('thesis-sessions');
                    const allSessionKeys = Object.keys(localStorage).filter(key => key.startsWith('thesis-session-'));
                    allSessionKeys.forEach(key => localStorage.removeItem(key));
                    setShowSessionModal(false);
                  }}
                >
                  Clear All Sessions
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowSessionModal(false)}
                >
                  Continue Without Restoring
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* API Key Modal */}
        {showApiKeyModal && (
          <div className="modal-backdrop fade show" style={{zIndex: 1051}}></div>
        )}
        <div className={`modal ${showApiKeyModal ? 'show d-block' : ''}`} style={{zIndex: 1052}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Enter Gemini API Key</h5>
                <button type="button" className="btn-close" onClick={() => setShowApiKeyModal(false)}></button>
              </div>
              <div className="modal-body">
                <p className="text-muted small">
                  To get a Gemini API key:
                  <ol className="small">
                    <li>Go to <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></li>
                    <li>Create an account or sign in</li>
                    <li>Click "Get API Key"</li>
                    <li>Copy the API key and paste it below</li>
                  </ol>
                </p>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter your Gemini API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowApiKeyModal(false)}>Close</button>
                <button type="button" className="btn btn-primary" onClick={() => setShowApiKeyModal(false)}>Save</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;