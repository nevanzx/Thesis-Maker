// server.js - Simple static server for deployment
const path = require('path');
const express = require('express');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Media, ParagraphProperties, Indent } = require('docx');

const app = express();

// Middleware to parse JSON bodies - place this early
app.use(express.json({ limit: '50mb' }));

// Serve static files FIRST, but exclude API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    // Skip static file serving for API routes
    next();
  } else {
    // Serve static files for non-API routes
    express.static(path.join(__dirname, 'build'))(req, res, next);
  }
});

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

// Define API routes for methods other than POST to return appropriate errors
app.get('/api/*', (req, res) => {
  res.status(405).json({ error: 'GET method not allowed for API endpoints' });
});

// Export to DOCX endpoint
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
        titleFont: 'Arial',
        bodyFont: 'Arial',
        fontSize: 24,  // Font size in docx is in half-points, so 24 = 12pt
        heading1Size: 24, // 12pt = 24 half-points (all headings should be 12pt)
        heading2Size: 24, // 12pt = 24 half-points (all headings should be 12pt)
        heading3Size: 24, // 12pt = 24 half-points (all headings should be 12pt)
        lineSpacing: 480, // In twentieths of a point (480 = double spacing)
        pageMargins: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // In twentieths of a point (720 = 0.5", 1440 = 1")
      },
      academic: {
        titleFont: 'Arial',
        bodyFont: 'Arial',
        fontSize: 24,  // Font size in docx is in half-points, so 24 = 12pt
        heading1Size: 24, // 12pt = 24 half-points (all headings should be 12pt)
        heading2Size: 24, // 12pt = 24 half-points (all headings should be 12pt)
        heading3Size: 24, // 12pt = 24 half-points (all headings should be 12pt)
        lineSpacing: 480, // In twentieths of a point (480 = double spacing)
        pageMargins: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
      modern: {
        titleFont: 'Arial',
        bodyFont: 'Arial',
        fontSize: 24,  // Font size in docx is in half-points, so 24 = 12pt
        heading1Size: 24, // 12pt = 24 half-points (all headings should be 12pt)
        heading2Size: 24, // 12pt = 24 half-points (all headings should be 12pt)
        heading3Size: 24, // 12pt = 24 half-points (all headings should be 12pt)
        lineSpacing: 480, // In twentieths of a point (480 = double spacing)
        pageMargins: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
      arial: {
        titleFont: 'Arial',
        bodyFont: 'Arial',
        fontSize: 24,  // Font size in docx is in half-points, so 24 = 12pt
        heading1Size: 24, // 12pt = 24 half-points (all headings should be 12pt)
        heading2Size: 24, // 12pt = 24 half-points (all headings should be 12pt)
        heading3Size: 24, // 12pt = 24 half-points (all headings should be 12pt)
        lineSpacing: 480, // In twentieths of a point (480 = double spacing)
        pageMargins: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      }
    };

    const selectedTemplate = templates[template] || templates.arial; // Use Arial as default

    // Create a new document
    // Add content to document
    const paragraphs = [];

    // Skip project title - removed as requested

    // Skip variables section - only include title and context text

    // Process chapters
    if (guideData.chapters) {
      for (let i = 0; i < guideData.chapters.length; i++) {
        const chapter = guideData.chapters[i];
        const chapterKey = `chapter-${i}`;

        // Add the chapter title with "Chapter X" on one line and the chapter name in all caps on the next line, both centered
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Chapter ${i + 1}`,
                font: selectedTemplate.bodyFont,
                size: selectedTemplate.heading1Size,
                color: "000000", // Black color
                bold: true,
              })
            ],
            spacing: {
              line: selectedTemplate.lineSpacing,  // Double line spacing
              after: 0, // No spacing after header
            },
            alignment: AlignmentType.CENTER, // Center align chapter number
          })
        );

        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${chapter.chapterTitle.toUpperCase()}`,
                font: selectedTemplate.bodyFont,
                size: selectedTemplate.heading1Size,
                color: "000000", // Black color
                bold: true,
              })
            ],
            spacing: {
              line: selectedTemplate.lineSpacing,  // Double line spacing
              after: 0, // No spacing after header
            },
            alignment: AlignmentType.CENTER, // Center align chapter title in all caps
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
                children: [
                  new TextRun({
                    text: `${section.sectionTitle}`,
                    font: selectedTemplate.bodyFont,
                    size: selectedTemplate.heading2Size,
                    color: "000000", // Black color
                    bold: true,
                  })
                ],
                heading: HeadingLevel.HEADING_2,
                spacing: {
                  line: selectedTemplate.lineSpacing,  // Double line spacing
                  before: 120, // 6pt before spacing (120 TWIPS = 6pt)
                  after: 0, // No spacing after header
                },
                alignment: AlignmentType.LEFT, // Left align headings
              })
            );

            // Skip section guide - only include title and context text

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
                      // Handle image content - add actual image to document
                      try {
                        const image = addImageToDoc(doc, content.data, 600, 400); // Default width x height
                        if (image) {
                          paragraphs.push(
                            new Paragraph({
                              children: [image],
                              spacing: {
                                line: selectedTemplate.lineSpacing,  // Double line spacing
                              },
                              alignment: AlignmentType.CENTER, // Center align image
                            })
                          );
                        } else {
                          // If image insertion failed, add a placeholder
                          paragraphs.push(
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: "[Image Failed to Insert]",
                                  font: selectedTemplate.bodyFont,
                                  size: selectedTemplate.fontSize,
                                  color: "000000", // Black color
                                })
                              ],
                              spacing: {
                                line: selectedTemplate.lineSpacing,  // Double line spacing
                              },
                              alignment: AlignmentType.JUSTIFIED, // Justify text
                              indent: { // Add 0.5 inch first line indentation
                                firstLine: 720, // 720 TWIPS = 0.5 inches first line indent (1440 TWIPS = 1 inch)
                              },
                            })
                          );
                        }
                      } catch (error) {
                        console.error('Error inserting image:', error);
                        // If there's an error, add a placeholder
                        paragraphs.push(
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: "[Error Inserting Image]",
                                font: selectedTemplate.bodyFont,
                                size: selectedTemplate.fontSize,
                                color: "000000", // Black color
                              })
                            ],
                            spacing: {
                              line: selectedTemplate.lineSpacing,  // Double line spacing
                            },
                            alignment: AlignmentType.JUSTIFIED, // Justify text
                            indent: { // Add 0.5 inch first line indentation
                              firstLine: 720, // 720 TWIPS = 0.5 inches first line indent (1440 TWIPS = 1 inch)
                            },
                          })
                        );
                      }
                    }
                    // Check if this is a figure object
                    else if (block.contentType === 'figure' && content.figureTitle) {
                      // Handle figure content - add figure title and description
                      paragraphs.push(
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: content.figureTitle,
                              font: selectedTemplate.bodyFont,
                              size: selectedTemplate.fontSize,
                              color: "000000", // Black color
                              bold: true,
                            })
                          ],
                          spacing: {
                            line: selectedTemplate.lineSpacing,  // Double line spacing
                          },
                          alignment: AlignmentType.CENTER, // Center align figure title
                        })
                      );

                      // Add description if available
                      if (content.description) {
                        paragraphs.push(
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: content.description,
                                font: selectedTemplate.bodyFont,
                                size: selectedTemplate.fontSize,
                                color: "000000", // Black color
                              })
                            ],
                            spacing: {
                              line: selectedTemplate.lineSpacing,  // Double line spacing
                            },
                            alignment: AlignmentType.JUSTIFIED, // Justify text
                          })
                        );
                      }

                      // Add figure type information if available (for reference)
                      if (content.type) {
                        paragraphs.push(
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: `(Type: ${content.type})`,
                                font: selectedTemplate.bodyFont,
                                size: selectedTemplate.fontSize - 4, // Slightly smaller font for type info
                                color: "000000", // Black color
                                italics: true,
                              })
                            ],
                            spacing: {
                              line: selectedTemplate.lineSpacing,  // Double line spacing
                            },
                            alignment: AlignmentType.CENTER, // Center align type info
                          })
                        );
                      }

                      // Add variable information if available (from FigureEditor)
                      const variableInfo = [];
                      if (content.iv) variableInfo.push(`IV: ${content.iv}`);
                      if (content.dv) variableInfo.push(`DV: ${content.dv}`);
                      if (content.modv) variableInfo.push(`MODV: ${content.modv}`);
                      if (content.iv1) variableInfo.push(`IV1: ${content.iv1}`);
                      if (content.iv2) variableInfo.push(`IV2: ${content.iv2}`);

                      if (variableInfo.length > 0) {
                        paragraphs.push(
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: variableInfo.join(', '),
                                font: selectedTemplate.bodyFont,
                                size: selectedTemplate.fontSize - 4, // Slightly smaller font
                                color: "000000", // Black color
                                italics: true,
                              })
                            ],
                            spacing: {
                              line: selectedTemplate.lineSpacing,  // Double line spacing
                            },
                            alignment: AlignmentType.CENTER, // Center align variable info
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
                              new TextRun({
                                text: tableText,
                                font: selectedTemplate.bodyFont,
                                size: selectedTemplate.fontSize,
                                color: "000000", // Black color
                              })
                            ],
                            spacing: {
                              line: selectedTemplate.lineSpacing,  // Double line spacing
                            },
                            alignment: AlignmentType.JUSTIFIED, // Justify text
                            indent: { // Add 0.5 inch first line indentation
                              firstLine: 720, // 720 TWIPS = 0.5 inches first line indent (1440 TWIPS = 1 inch)
                            },
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
                                new TextRun({
                                  text: content[textpKey] ? content[textpKey].toString() : '',
                                  font: selectedTemplate.bodyFont,
                                  size: selectedTemplate.fontSize,
                                  color: "000000", // Black color
                                })
                              ],
                              spacing: {
                                line: selectedTemplate.lineSpacing,  // Double line spacing
                              },
                              alignment: AlignmentType.JUSTIFIED, // Justify text
                              indent: { // Add 0.5 inch first line indentation
                                firstLine: 720, // 720 TWIPS = 0.5 inches first line indent (1440 TWIPS = 1 inch)
                              },
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
                          new TextRun({
                            text: content ? content.toString() : '',
                            font: selectedTemplate.bodyFont,
                            size: selectedTemplate.fontSize,
                            color: "000000", // Black color
                          })
                        ],
                        spacing: {
                          line: selectedTemplate.lineSpacing,  // Double line spacing
                        },
                        alignment: AlignmentType.JUSTIFIED, // Justify text
                        indent: { // Add 0.5 inch first line indentation
                          firstLine: 720, // 720 TWIPS = 0.5 inches first line indent (1440 TWIPS = 1 inch)
                        },
                      })
                    );
                  }
                }

                // Check for associated conceptual framework image (block-${blockIndex}-image)
                const imageBlockKey = `${blockKey}-image`;
                const imageContent = thesisContent[chapterKey]?.[sectionKey]?.[imageBlockKey];
                if (imageContent && typeof imageContent === 'object' && imageContent.type === 'image' && imageContent.data) {
                  // Add actual image to document
                  try {
                    const image = addImageToDoc(doc, imageContent.data, 600, 400); // Default width x height
                    if (image) {
                      paragraphs.push(
                        new Paragraph({
                          children: [image],
                          spacing: {
                            line: selectedTemplate.lineSpacing,  // Double line spacing
                          },
                          alignment: AlignmentType.CENTER, // Center align image
                        })
                      );
                    } else {
                      // If image insertion failed, add a placeholder
                      paragraphs.push(
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "[Image Failed to Insert]",
                              font: selectedTemplate.bodyFont,
                              size: selectedTemplate.fontSize,
                              color: "000000", // Black color
                            })
                          ],
                          spacing: {
                            line: selectedTemplate.lineSpacing,  // Double line spacing
                          },
                          alignment: AlignmentType.JUSTIFIED, // Justify text
                          indent: { // Add 0.5 inch first line indentation
                            firstLine: 720, // 720 TWIPS = 0.5 inches first line indent (1440 TWIPS = 1 inch)
                          },
                        })
                      );
                    }
                  } catch (error) {
                    console.error('Error inserting image:', error);
                    // If there's an error, add a placeholder
                    paragraphs.push(
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "[Error Inserting Image]",
                            font: selectedTemplate.bodyFont,
                            size: selectedTemplate.fontSize,
                            color: "000000", // Black color
                          })
                        ],
                        spacing: {
                          line: selectedTemplate.lineSpacing,  // Double line spacing
                        },
                        alignment: AlignmentType.JUSTIFIED, // Justify text
                        indent: { // Add 0.5 inch first line indentation
                          firstLine: 720, // 720 TWIPS = 0.5 inches first line indent (1440 TWIPS = 1 inch)
                        },
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
                            new TextRun({
                              text: `• ${listItemContent ? listItemContent.toString() : ''}`,
                              font: selectedTemplate.bodyFont,
                              size: selectedTemplate.fontSize,
                              color: "000000", // Black color
                            })
                          ],
                          spacing: {
                            line: selectedTemplate.lineSpacing,  // Double line spacing
                          },
                          alignment: AlignmentType.JUSTIFIED, // Justify text
                          indent: { // Add 0.5 inch first line indentation
                            firstLine: 720, // 720 TWIPS = 0.5 inches first line indent (1440 TWIPS = 1 inch)
                          },
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
                          new TextRun({
                            text: blockContent ? blockContent.toString() : '',
                            font: selectedTemplate.bodyFont,
                            size: selectedTemplate.fontSize,
                            color: "000000", // Black color
                          })
                        ],
                        spacing: {
                          line: selectedTemplate.lineSpacing,  // Double line spacing
                        },
                        alignment: AlignmentType.JUSTIFIED, // Justify text
                        indent: { // Add 0.5 inch first line indentation
                          firstLine: 720, // 720 TWIPS = 0.5 inches first line indent (1440 TWIPS = 1 inch)
                        },
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
                              new TextRun({
                                text: `• ${listContent ? listContent.toString() : ''}`,
                                font: selectedTemplate.bodyFont,
                                size: selectedTemplate.fontSize,
                                color: "000000", // Black color
                              })
                            ],
                            spacing: {
                              line: selectedTemplate.lineSpacing,  // Double line spacing
                            },
                            alignment: AlignmentType.JUSTIFIED, // Justify text
                            indent: { // Add 0.5 inch first line indentation
                              firstLine: 720, // 720 TWIPS = 0.5 inches first line indent (1440 TWIPS = 1 inch)
                            },
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

    // Create document with the populated paragraphs
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: selectedTemplate.pageMargins
          }
        },
        children: paragraphs
      }],
      styles: {
        default: {
          heading1: {
            run: {
              font: selectedTemplate.bodyFont,
              size: selectedTemplate.heading1Size,
              color: "000000", // Black color
              bold: true,
            },
            paragraph: {
              spacing: {
                after: selectedTemplate.lineSpacing, // Double spacing
                line: selectedTemplate.lineSpacing,  // Double line spacing
              },
            },
          },
          heading2: {
            run: {
              font: selectedTemplate.bodyFont,
              size: selectedTemplate.heading2Size,
              color: "000000", // Black color
              bold: true,
            },
            paragraph: {
              spacing: {
                after: selectedTemplate.lineSpacing, // Double spacing
                line: selectedTemplate.lineSpacing,  // Double line spacing
              },
            },
          },
          heading3: {
            run: {
              font: selectedTemplate.bodyFont,
              size: selectedTemplate.heading3Size,
              color: "000000", // Black color
              bold: true,
            },
            paragraph: {
              spacing: {
                after: selectedTemplate.lineSpacing, // Double spacing
                line: selectedTemplate.lineSpacing,  // Double line spacing
              },
            },
          },
          paragraph: {
            run: {
              font: selectedTemplate.bodyFont,
              size: selectedTemplate.fontSize,
              color: "000000", // Black color
            },
            paragraph: {
              spacing: {
                line: selectedTemplate.lineSpacing,  // Double line spacing
              },
              indent: { // Add 0.5 inch first line indentation for default paragraphs
                firstLine: 720, // 720 TWIPS = 0.5 inches first line indent (1440 TWIPS = 1 inch)
              },
            },
          },
        },
      },
    });

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

// Catch-all route for non-API routes (for React Router)
// This should come after all API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});