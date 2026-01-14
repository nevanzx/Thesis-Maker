import React, { useState, useEffect } from 'react';

const TableEditor = ({ initialTableData, onTableChange, blockId }) => {
  // Initialize state with the initial table data
  const [tableData, setTableData] = useState(initialTableData);
  const [rows, setRows] = useState(initialTableData.rows || 2);
  const [cols, setCols] = useState(initialTableData.cols || 2);
  const [cellData, setCellData] = useState(initialTableData.data || []);

  // Update local state when initialTableData changes
  useEffect(() => {
    setTableData(initialTableData);
    setRows(initialTableData.rows || 2);
    setCols(initialTableData.cols || 2);
    setCellData(initialTableData.data || []);
  }, [initialTableData]);

  // Update the parent component when table data changes
  useEffect(() => {
    const updatedTableData = {
      rows,
      cols,
      data: cellData
    };
    setTableData(updatedTableData);
    onTableChange(updatedTableData);
  }, [rows, cols, cellData, onTableChange]);

  // Initialize cell data when rows or cols change
  useEffect(() => {
    const newCellData = [];
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const cellKey = `${i}-${j}`;
        newCellData[cellKey] = cellData[cellKey] || '';
      }
    }
    setCellData(newCellData);
  }, [rows, cols, cellData]);

  // Handle cell value change
  const handleCellChange = (rowIndex, colIndex, value) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    setCellData(prevData => ({
      ...prevData,
      [cellKey]: value
    }));
  };

  // Add a new row
  const addRow = () => {
    setRows(prevRows => prevRows + 1);
  };

  // Remove a row
  const removeRow = () => {
    if (rows > 1) {
      setRows(prevRows => prevRows - 1);
      // Remove the last row's data
      const newCellData = { ...cellData };
      for (let j = 0; j < cols; j++) {
        delete newCellData[`${rows - 1}-${j}`];
      }
      setCellData(newCellData);
    }
  };

  // Add a new column
  const addColumn = () => {
    setCols(prevCols => prevCols + 1);
  };

  // Remove a column
  const removeColumn = () => {
    if (cols > 1) {
      setCols(prevCols => prevCols - 1);
      // Remove the last column's data
      const newCellData = { ...cellData };
      for (let i = 0; i < rows; i++) {
        delete newCellData[`${i}-${cols - 1}`];
      }
      setCellData(newCellData);
    }
  };

  return (
    <div className="table-editor">
      <div className="table-controls mb-3">
        <button className="btn btn-sm btn-outline-secondary me-2" onClick={addRow}>
          Add Row
        </button>
        <button 
          className="btn btn-sm btn-outline-secondary me-2" 
          onClick={removeRow} 
          disabled={rows <= 1}
        >
          Remove Row
        </button>
        <button className="btn btn-sm btn-outline-secondary me-2" onClick={addColumn}>
          Add Column
        </button>
        <button 
          className="btn btn-sm btn-outline-secondary me-2" 
          onClick={removeColumn} 
          disabled={cols <= 1}
        >
          Remove Column
        </button>
        <small className="text-muted">Current: {rows} × {cols}</small>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered">
          <tbody>
            {Array.from({ length: rows }, (_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: cols }, (_, colIndex) => {
                  const cellKey = `${rowIndex}-${colIndex}`;
                  return (
                    <td key={colIndex} className="p-1">
                      <textarea
                        className="form-control"
                        rows="2"
                        value={cellData[cellKey] || ''}
                        onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                        placeholder={`Row ${rowIndex + 1}, Col ${colIndex + 1}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableEditor;