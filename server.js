// server.js - Simple static server for deployment
const path = require('path');
const express = require('express');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Media } = require('docx');

const app = express();

// Middleware to parse JSON bodies
app.use(express.json({ limit: '50mb' }));

// Helper function to convert base64 image to docx Media
function addImageToDoc(doc, base64Image, width = 600, height = 400) {
  try {
    // Extract image type from base64 string
    const matches = base64Image.match(/^data:image\/([A-Za-z-+1-9]*);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      console.error('Invalid image format');
      return null;
    }

    const imageType = matches[1].toLowerCase();
    const base64Data = matches[2];

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Add image to document
    const image = Media.addImage(doc, imageBuffer, width, height);
    return image;
  } catch (error) {
    console.error('Error adding image to document:', error);
    return null;
  }
}

// Export to DOCX endpoint - needs to be defined BEFORE static middleware
app.post('/api/export-docx', async (req, res) => {
  try {
    const { thesisContent, guideData, filledVariables, template = 'standard' } = req.body;

    if (!thesisContent || !guideData) {
      return res.status(400).json({ error: 'Missing thesis content or guide data' });
    }

    console.log('Received export request with thesisContent keys:', Object.keys(thesisContent || {}));
    console.log('Received guideData with', (guideData.chapters || []).length, 'chapters');
    console.log('Received filledVariables keys:', Object.keys(filledVariables || {}));

    // Define formatting templates
    const templates = {
      standard: {
        titleFont: 'Times New Roman',
        bodyFont: 'Times New Roman',
        fontSize: 12,
        heading1Size: 16,
        heading2Size: 14,
        heading3Size: 12,
        lineSpacing: 240, // In twentieths of a point
        pageMargins: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // In twentieths of a point (720 = 0.5", 1440 = 1")
      },
      academic: {
        titleFont: 'Times New Roman',
        bodyFont: 'Times New Roman',
        fontSize: 12,
        heading1Size: 16,
        heading2Size: 14,
        heading3Size: 12,
        lineSpacing: 240,
        pageMargins: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
      modern: {
        titleFont: 'Arial',
        bodyFont: 'Arial',
        fontSize: 11,
        heading1Size: 14,
        heading2Size: 12,
        heading3Size: 11,
        lineSpacing: 200,
        pageMargins: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
      arial: {
        titleFont: 'Arial',
        bodyFont: 'Arial',
        fontSize: 12,
        heading1Size: 16,
        heading2Size: 14,
        heading3Size: 12,
        lineSpacing: 240,
        pageMargins: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      }
    };

    const selectedTemplate = templates[template] || templates.standard;

    // Create a new document
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: selectedTemplate.pageMargins
          }
        },
        children: []
      }]
    });

    // Add content to document
    const paragraphs = [];

    // Add project title if available
    if (guideData.projectTitle) {
      paragraphs.push(
        new Paragraph({
          text: guideData.projectTitle,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        })
      );
      // Add a blank line
      paragraphs.push(new Paragraph(""));
    }

    // Add variables if available
    if (filledVariables && Object.keys(filledVariables).length > 0) {
      paragraphs.push(
        new Paragraph({
          text: "Variables Used",
          heading: HeadingLevel.HEADING_2,
        })
      );

      for (const [key, value] of Object.entries(filledVariables)) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${key}: `, bold: true }),
              new TextRun(value.toString()),
            ]
          })
        );
      }

      paragraphs.push(new Paragraph(""));
    }

    // Process chapters
    if (guideData.chapters) {
      for (let i = 0; i < guideData.chapters.length; i++) {
        const chapter = guideData.chapters[i];
        const chapterKey = `chapter-${i}`;

        // Add chapter heading
        paragraphs.push(
          new Paragraph({
            text: `${chapter.chapterTitle}`,
            heading: HeadingLevel.HEADING_1,
          })
        );

        // Process sections in the chapter
        if (chapter.sections) {
          for (let j = 0; j < chapter.sections.length; j++) {
            const section = chapter.sections[j];
            const sectionKey = `section-${j}`;

            // Add section heading
            paragraphs.push(
              new Paragraph({
                text: `${section.sectionTitle}`,
                heading: HeadingLevel.HEADING_2,
              })
            );

            // Add section guide if available
            if (section.sectionGuide) {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({ text: section.sectionGuide })
                  ]
                })
              );
            }

            // Process content blocks in the section
            if (section.contentBlocks) {
              for (let k = 0; k < section.contentBlocks.length; k++) {
                const block = section.contentBlocks[k];
                const blockKey = `block-${k}`;

                // Get content for this block
                const content = thesisContent[chapterKey]?.[sectionKey]?.[blockKey] || '';

                // Add content based on its type
                if (content) {
                  // Check if content is an object (for literature review sections, tables, or images)
                  if (typeof content === 'object' && content !== null) {
                    // Check if this is an image object
                    if (content.type === 'image' && content.data) {
                      // Handle image content
                      const image = addImageToDoc(doc, content.data, content.width || 600, content.height || 400);
                      if (image) {
                        paragraphs.push(
                          new Paragraph({
                            children: [image]
                          })
                        );
                      }
                    }
                    // Check if this is a table object
                    else if (content.type === 'table' && content.data) {
                      // Handle table content - you already have table processing in your frontend
                      // For now, we'll add a placeholder or convert to text
                      const tableData = content.data;
                      if (tableData.rows && tableData.cols) {
                        // Convert table to text representation as a simple fallback
                        let tableText = "Table:\n";
                        for (let i = 0; i < tableData.rows; i++) {
                          for (let j = 0; j < tableData.cols; j++) {
                            const cellKey = `${i}-${j}`;
                            tableText += (tableData.data && tableData.data[cellKey]) ? tableData.data[cellKey] : '';
                            if (j < tableData.cols - 1) tableText += "\t";
                          }
                          tableText += "\n";
                        }
                        paragraphs.push(
                          new Paragraph({
                            children: [
                              new TextRun(tableText)
                            ]
                          })
                        );
                      }
                    }
                    // Handle literature review content (object with textp-x fields)
                    else {
                      const textpKeys = Object.keys(content).filter(key => key.startsWith('textp-')).sort();
                      for (const textpKey of textpKeys) {
                        if (content[textpKey]) {
                          paragraphs.push(
                            new Paragraph({
                              children: [
                                new TextRun(content[textpKey])
                              ]
                            })
                          );
                        }
                      }
                    }
                  } else {
                    // Handle regular content (string)
                    paragraphs.push(
                      new Paragraph({
                        children: [
                          new TextRun(content)
                        ]
                      })
                    );
                  }
                }

                // Check for associated conceptual framework image (block-${blockIndex}-image)
                const imageBlockKey = `${blockKey}-image`;
                const imageContent = thesisContent[chapterKey]?.[sectionKey]?.[imageBlockKey];
                if (imageContent && typeof imageContent === 'object' && imageContent.type === 'image' && imageContent.data) {
                  const image = addImageToDoc(doc, imageContent.data, imageContent.width || 600, imageContent.height || 400);
                  if (image) {
                    paragraphs.push(
                      new Paragraph({
                        children: [image]
                      })
                    );
                  }
                }

                // Handle special content block types (list, table, etc.)
                if (block.contentType === 'list' && block.content && Array.isArray(block.content.items)) {
                  // Add list items if they exist in thesis content
                  for (let m = 0; m < block.content.items.length; m++) {
                    const listItemKey = `block-${k}-item-${m}`;
                    const listItemContent = thesisContent[chapterKey]?.[sectionKey]?.[listItemKey] || '';

                    if (listItemContent) {
                      paragraphs.push(
                        new Paragraph({
                          children: [
                            new TextRun(`• ${listItemContent}`)
                          ]
                        })
                      );
                    }
                  }
                } else if (block.contentType === 'combo') {
                  // Handle combo blocks with both paragraph and list content
                  const blockContent = thesisContent[chapterKey]?.[sectionKey]?.[blockKey] || '';

                  if (blockContent) {
                    paragraphs.push(
                      new Paragraph({
                        children: [
                          new TextRun(blockContent)
                        ]
                      })
                    );
                  }

                  // Handle list items in combo blocks
                  if (block.content && Array.isArray(block.content.lText)) {
                    for (let m = 0; m < block.content.lText.length; m++) {
                      const listKey = `block-${k}-list-${m}`;
                      const listContent = thesisContent[chapterKey]?.[sectionKey]?.[listKey] || '';

                      if (listContent) {
                        paragraphs.push(
                          new Paragraph({
                            children: [
                              new TextRun(`• ${listContent}`)
                            ]
                          })
                        );
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Update document with generated paragraphs
    doc.sections[0].children = paragraphs;

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    // Set headers for file download
    res.setHeader('Content-Disposition', 'attachment; filename="thesis.docx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    // Send the buffer
    res.send(buffer);
  } catch (error) {
    console.error('Error generating DOCX:', error);
    res.status(500).json({
      error: 'Failed to generate DOCX document',
      details: error.message
    });
  }
});

// Define API routes BEFORE static file serving to ensure they take precedence
app.get('/api/*', (req, res) => {
  res.status(404).json({ error: 'GET method not allowed for API endpoints' });
});

// Serve static files from all directories except /api/*
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    // If it's an API route, skip static file serving and continue to the next middleware
    // which will allow our API route handlers to process the request
    next();
  } else {
    // Otherwise, serve static files
    express.static('build')(req, res, next);
  }
});

// Catch-all route for non-API routes (for React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});